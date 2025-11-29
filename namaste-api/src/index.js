import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { swaggerUI } from '@hono/swagger-ui';
import { config, validateConfig, logConfig } from './config/index.js';
import { logger } from './config/logger.js';
import { openApiSpec } from './config/openapi.js';
import { connectDb, disconnectDb } from './db/client.js';
import { testConnection as testIcdConnection } from './services/icd11-api.js';

// Import middleware
import { metricsMiddleware, getMetrics } from './middleware/metrics.js';
import { auditMiddleware } from './middleware/audit.js';
import { rateLimitMiddleware } from './middleware/rate-limiter.js';
import { cacheMiddleware, getCacheStats } from './middleware/cache.js';

// Import routes
import { createHealthRoutes } from './routes/health.js';
import { createFhirRoutes } from './routes/fhir.js';
import { createMappingRoutes } from './routes/mapping.js';
import { createAutocompleteRoutes } from './routes/autocomplete.js';
import { createAdminRoutes } from './routes/admin.js';
import { createFrontendRoutes } from './routes/frontend.js';

// OpenAPI spec is now in ./config/openapi.js

/**
 * Create and configure Hono application
 * Functional approach - factory function for app creation
 */
const createApp = () => {
  const app = new Hono();

  // ============================================================================
  // Core Middleware
  // ============================================================================
  
  app.use('*', cors());
  app.use('*', honoLogger());
  app.use('*', prettyJSON());

  // Request ID middleware
  app.use('*', async (c, next) => {
    const requestId = crypto.randomUUID();
    c.set('requestId', requestId);
    c.header('X-Request-ID', requestId);
    await next();
  });

  // Metrics collection (skip for health/metrics endpoints)
  app.use('*', async (c, next) => {
    if (!c.req.path.startsWith('/health') && c.req.path !== '/metrics') {
      return metricsMiddleware(c, next);
    }
    await next();
  });

  // Audit logging (async, non-blocking)
  app.use('*', auditMiddleware);

  // ============================================================================
  // Rate Limiting
  // ============================================================================
  
  // Apply rate limits to specific routes
  app.use('/api/v1/mapping', rateLimitMiddleware.mapping);
  app.use('/api/v1/mapping/batch/*', rateLimitMiddleware.batch);
  app.use('/api/v1/autocomplete/*', rateLimitMiddleware.search);
  app.use('/fhir/*', rateLimitMiddleware.standard);

  // ============================================================================
  // Error Handling
  // ============================================================================

  app.onError((err, c) => {
    logger.error({ 
      error: err.message, 
      stack: err.stack,
      requestId: c.get('requestId'),
    }, 'Unhandled error');

    return c.json({
      error: 'Internal Server Error',
      message: config.isDev ? err.message : 'An unexpected error occurred',
      requestId: c.get('requestId'),
    }, 500);
  });

  app.notFound((c) => {
    return c.json({
      error: 'Not Found',
      message: `Route ${c.req.method} ${c.req.path} not found`,
      requestId: c.get('requestId'),
    }, 404);
  });

  // ============================================================================
  // Routes
  // ============================================================================

  // Health & Monitoring
  app.route('/health', createHealthRoutes());
  
  // Prometheus metrics endpoint
  app.get('/metrics', (c) => {
    c.header('Content-Type', 'text/plain; version=0.0.4');
    return c.text(getMetrics());
  });

  // FHIR R4 endpoints
  app.route('/fhir', createFhirRoutes());
  
  // Core API
  app.route('/api/v1/mapping', createMappingRoutes());
  app.route('/api/v1/autocomplete', createAutocompleteRoutes());
  
  // Admin endpoints
  app.route('/api/v1/admin', createAdminRoutes());
  
  // Frontend-optimized endpoints
  app.route('/api/v1/frontend', createFrontendRoutes());

  // ============================================================================
  // Documentation
  // ============================================================================

  // OpenAPI spec endpoint
  app.get('/openapi.json', (c) => c.json(openApiSpec));

  // Swagger UI
  app.get('/docs', swaggerUI({ url: '/openapi.json' }));
  app.get('/docs/*', swaggerUI({ url: '/openapi.json' }));

  // ============================================================================
  // Root Route
  // ============================================================================

  app.get('/', (c) => {
    return c.json({
      name: 'NAMASTE-ICD Intelligent Mapping Engine',
      version: '1.0.0',
      description: 'FHIR R4 Terminology Service for NAMASTE to ICD-11 TM2 mapping',
      documentation: '/docs',
      endpoints: {
        health: '/health',
        metrics: '/metrics',
        fhir: '/fhir',
        mapping: '/api/v1/mapping',
        autocomplete: '/api/v1/autocomplete',
        admin: '/api/v1/admin',
        docs: '/docs',
        openapi: '/openapi.json',
      },
      features: [
        'AI-powered NAMASTE to ICD-11 TM2 mapping',
        'FHIR R4 terminology operations',
        'Vector similarity search (pgvector)',
        'Batch processing with job queue',
        'Prometheus metrics',
        'Audit logging (DISHA compliant)',
      ],
    });
  });

  return app;
};

/**
 * Start the server
 */
const startServer = async () => {
  // Validate configuration
  const { valid, errors } = validateConfig();
  if (!valid) {
    logger.error({ errors }, 'Invalid configuration');
    process.exit(1);
  }

  logConfig(logger);

  // Connect to database
  const dbConnected = await connectDb();
  if (!dbConnected) {
    logger.error('Failed to connect to database');
    process.exit(1);
  }

  // Test ICD-11 API connection (optional)
  if (config.whoIcd.clientId) {
    const icdConnected = await testIcdConnection();
    if (!icdConnected) {
      logger.warn('ICD-11 API connection failed - some features may be unavailable');
    }
  }

  // Create and start app
  const app = createApp();

  serve({
    fetch: app.fetch,
    port: config.port,
  }, (info) => {
    logger.info({ 
      port: info.port,
      address: info.address,
    }, `🚀 NAMASTE-ICD API running at http://localhost:${info.port}`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info({ signal }, 'Shutting down...');
    await disconnectDb();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

// Start the server
startServer().catch((error) => {
  logger.error({ error: error.message }, 'Failed to start server');
  process.exit(1);
});
