/**
 * Admin Routes
 * 
 * Administrative endpoints for system management
 */

import { Hono } from 'hono';
import { logger } from '../config/logger.js';
import { 
  initializeVectorSearch, 
  batchGenerateEmbeddings, 
  getEmbeddingStats,
  checkPgvectorInstalled,
} from '../services/vector-search.js';
import { 
  createBatchJob, 
  getJobStatus, 
  getJobResults, 
  cancelJob, 
  listJobs,
  getQueueStats,
} from '../services/batch-processor.js';
import { getCacheStats, clearAllCaches, invalidateCache } from '../middleware/cache.js';
import { getAuditLogs, exportAuditLogsAsFhirBundle } from '../middleware/audit.js';
import { getMetrics, getMetricsJson, resetMetrics } from '../middleware/metrics.js';
import { getRateLimitStats } from '../middleware/rate-limiter.js';

export const createAdminRoutes = () => {
  const router = new Hono();

  // ============================================================================
  // Vector Search / Embeddings
  // ============================================================================

  // Initialize pgvector
  router.post('/vector/init', async (c) => {
    try {
      const success = await initializeVectorSearch();
      return c.json({
        success,
        message: success ? 'Vector search initialized' : 'Failed to initialize vector search',
      });
    } catch (error) {
      logger.error({ error: error.message }, 'Vector init failed');
      return c.json({ error: error.message }, 500);
    }
  });

  // Check pgvector status
  router.get('/vector/status', async (c) => {
    const installed = await checkPgvectorInstalled();
    const stats = await getEmbeddingStats();
    
    return c.json({
      pgvectorInstalled: installed,
      embeddings: stats,
    });
  });

  // Generate embeddings
  router.post('/embeddings/generate', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { type = 'all', batchSize = 50 } = body;

    // Start async generation
    const jobId = `emb_${Date.now()}`;
    
    // Run in background
    setImmediate(async () => {
      try {
        if (type === 'all' || type === 'namaste') {
          await batchGenerateEmbeddings('namaste', batchSize, (progress) => {
            logger.info({ jobId, type: 'namaste', ...progress }, 'Embedding progress');
          });
        }
        if (type === 'all' || type === 'tm2') {
          await batchGenerateEmbeddings('tm2', batchSize, (progress) => {
            logger.info({ jobId, type: 'tm2', ...progress }, 'Embedding progress');
          });
        }
      } catch (error) {
        logger.error({ jobId, error: error.message }, 'Embedding generation failed');
      }
    });

    return c.json({
      message: 'Embedding generation started',
      jobId,
      type,
      batchSize,
    }, 202);
  });

  // Get embedding stats
  router.get('/embeddings/stats', async (c) => {
    const stats = await getEmbeddingStats();
    return c.json(stats || { error: 'Failed to get stats' });
  });

  // ============================================================================
  // Batch Processing
  // ============================================================================

  // List batch jobs
  router.get('/jobs', async (c) => {
    const { status, limit, offset } = c.req.query();
    const jobs = listJobs({
      status,
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0,
    });
    return c.json(jobs);
  });

  // Get queue stats
  router.get('/jobs/stats', async (c) => {
    return c.json(getQueueStats());
  });

  // ============================================================================
  // Cache Management
  // ============================================================================

  // Get cache stats
  router.get('/cache/stats', async (c) => {
    return c.json(getCacheStats());
  });

  // Clear all caches
  router.post('/cache/clear', async (c) => {
    clearAllCaches();
    return c.json({ message: 'All caches cleared' });
  });

  // Invalidate specific cache pattern
  router.post('/cache/invalidate', async (c) => {
    const { pattern, cache } = await c.req.json();
    const count = invalidateCache(pattern || '', cache || 'all');
    return c.json({ invalidated: count });
  });

  // ============================================================================
  // Audit Logs
  // ============================================================================

  // Get audit logs
  router.get('/audit', async (c) => {
    const { startDate, endDate, action, resourceType, userId, page, limit } = c.req.query();
    
    const logs = await getAuditLogs({
      startDate,
      endDate,
      action,
      resourceType,
      userId,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
    });
    
    return c.json(logs);
  });

  // Export audit logs as FHIR Bundle
  router.get('/audit/export', async (c) => {
    const { startDate, endDate, action } = c.req.query();
    
    const bundle = await exportAuditLogsAsFhirBundle({
      startDate,
      endDate,
      action,
    });
    
    c.header('Content-Type', 'application/fhir+json');
    return c.json(bundle);
  });

  // ============================================================================
  // Metrics & Monitoring
  // ============================================================================

  // Get metrics as JSON
  router.get('/metrics/json', async (c) => {
    return c.json(getMetricsJson());
  });

  // Reset metrics
  router.post('/metrics/reset', async (c) => {
    resetMetrics();
    return c.json({ message: 'Metrics reset' });
  });

  // Get rate limit stats
  router.get('/rate-limits', async (c) => {
    return c.json(getRateLimitStats());
  });

  // ============================================================================
  // System Info
  // ============================================================================

  router.get('/info', async (c) => {
    return c.json({
      service: 'namaste-api',
      version: '1.0.0',
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: process.env.NODE_ENV || 'development',
    });
  });

  return router;
};
