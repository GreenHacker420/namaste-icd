import { Hono } from 'hono';
import { getPrisma } from '../db/client.js';
import { testConnection as testIcdConnection } from '../services/icd11-api.js';
import { config } from '../config/index.js';

/**
 * Health check routes
 * Functional approach - factory function returning Hono router
 */
export const createHealthRoutes = () => {
  const router = new Hono();

  // Basic health check
  router.get('/', (c) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'namaste-api',
      version: '1.0.0',
    });
  });

  // Detailed health check
  router.get('/ready', async (c) => {
    const checks = {
      database: false,
      icd11Api: false,
    };

    // Check database
    try {
      const prisma = getPrisma();
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      checks.database = false;
    }

    // Check ICD-11 API (only if configured)
    if (config.whoIcd.clientId) {
      try {
        checks.icd11Api = await testIcdConnection();
      } catch (error) {
        checks.icd11Api = false;
      }
    } else {
      checks.icd11Api = null; // Not configured
    }

    const allHealthy = checks.database && (checks.icd11Api !== false);

    return c.json({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    }, allHealthy ? 200 : 503);
  });

  // Liveness probe
  router.get('/live', (c) => {
    return c.json({ status: 'alive' });
  });

  return router;
};
