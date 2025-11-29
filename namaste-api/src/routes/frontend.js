/**
 * Frontend API Routes
 * 
 * Optimized endpoints for frontend consumption
 * Provides dashboard data, statistics, and simplified responses
 */

import { Hono } from 'hono';
import { getPrisma } from '../db/client.js';
import { logger } from '../config/logger.js';
import { getCacheStats } from '../middleware/cache.js';
import { getMetricsJson } from '../middleware/metrics.js';
import { getQueueStats } from '../services/batch-processor.js';

export const createFrontendRoutes = () => {
  const router = new Hono();

  // ============================================================================
  // Dashboard Data
  // ============================================================================

  /**
   * Get dashboard overview statistics
   * Single endpoint for all dashboard widgets
   */
  router.get('/dashboard', async (c) => {
    const prisma = getPrisma();

    try {
      // Parallel queries for performance
      const [
        namasteStats,
        tm2Stats,
        mappingStats,
        recentMappings,
      ] = await Promise.all([
        // NAMASTE code counts by system
        prisma.namasteCode.groupBy({
          by: ['system'],
          _count: { id: true },
        }),
        // TM2 code counts by category
        prisma.tm2Code.groupBy({
          by: ['category'],
          _count: { id: true },
        }),
        // Mapping statistics
        prisma.mapping.groupBy({
          by: ['equivalence'],
          _count: { id: true },
          _avg: { confidence: true },
        }),
        // Recent mappings
        prisma.mapping.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            namasteCode: { select: { code: true, system: true, term: true } },
            tm2Code: { select: { code: true, title: true } },
          },
        }),
      ]);

      // Calculate totals
      const totalNamaste = namasteStats.reduce((sum, s) => sum + s._count.id, 0);
      const totalTm2 = tm2Stats.reduce((sum, s) => sum + s._count.id, 0);
      const totalMappings = mappingStats.reduce((sum, s) => sum + s._count.id, 0);

      // Get cache and queue stats
      const cacheStats = getCacheStats();
      const queueStats = getQueueStats();

      return c.json({
        overview: {
          totalNamasteCodes: totalNamaste,
          totalTm2Codes: totalTm2,
          totalMappings,
          mappingCoverage: totalNamaste > 0 
            ? ((totalMappings / totalNamaste) * 100).toFixed(1) + '%' 
            : '0%',
        },
        namasteSystems: namasteStats.map(s => ({
          system: s.system.toLowerCase(),
          count: s._count.id,
          label: s.system === 'AYURVEDA' ? 'Ayurveda' 
               : s.system === 'SIDDHA' ? 'Siddha' 
               : 'Unani',
        })),
        tm2Categories: tm2Stats.slice(0, 10).map(s => ({
          category: s.category || 'Unknown',
          count: s._count.id,
        })),
        mappingsByEquivalence: mappingStats.map(s => ({
          equivalence: s.equivalence,
          count: s._count.id,
          avgConfidence: s._avg.confidence?.toFixed(2) || 0,
        })),
        recentMappings: recentMappings.map(m => ({
          id: m.id,
          namasteCode: m.namasteCode.code,
          namasteSystem: m.namasteCode.system.toLowerCase(),
          namasteTerm: m.namasteCode.term,
          tm2Code: m.tm2Code?.code,
          tm2Title: m.tm2Code?.title,
          equivalence: m.equivalence,
          confidence: m.confidence,
          createdAt: m.createdAt,
        })),
        systemHealth: {
          cache: {
            mappings: cacheStats.mappings?.hitRate || '0%',
            embeddings: cacheStats.embeddings?.hitRate || '0%',
          },
          queue: {
            pending: queueStats.pending || 0,
            processing: queueStats.processing || 0,
          },
        },
      });
    } catch (error) {
      logger.error({ error: error.message }, 'Dashboard query failed');
      return c.json({ error: 'Failed to load dashboard' }, 500);
    }
  });

  // ============================================================================
  // Code Browser
  // ============================================================================

  /**
   * Browse NAMASTE codes with pagination and filtering
   */
  router.get('/codes/namaste', async (c) => {
    const { 
      system, 
      search, 
      page = '1', 
      limit = '20',
      hasMappings,
    } = c.req.query();

    const prisma = getPrisma();
    const take = Math.min(parseInt(limit), 100);
    const skip = (parseInt(page) - 1) * take;

    const where = {};
    
    if (system) {
      where.system = system.toUpperCase();
    }
    
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { term: { contains: search, mode: 'insensitive' } },
        { englishName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (hasMappings === 'true') {
      where.mappings = { some: {} };
    } else if (hasMappings === 'false') {
      where.mappings = { none: {} };
    }

    try {
      const [codes, total] = await Promise.all([
        prisma.namasteCode.findMany({
          where,
          include: {
            mappings: {
              take: 1,
              orderBy: { confidence: 'desc' },
              include: {
                tm2Code: { select: { code: true, title: true } },
              },
            },
          },
          orderBy: { code: 'asc' },
          take,
          skip,
        }),
        prisma.namasteCode.count({ where }),
      ]);

      return c.json({
        data: codes.map(code => ({
          id: code.id,
          code: code.code,
          system: code.system.toLowerCase(),
          term: code.term,
          englishName: code.englishName,
          shortDefinition: code.shortDefinition,
          hasMappings: code.mappings.length > 0,
          bestMapping: code.mappings[0] ? {
            tm2Code: code.mappings[0].tm2Code?.code,
            tm2Title: code.mappings[0].tm2Code?.title,
            equivalence: code.mappings[0].equivalence,
            confidence: code.mappings[0].confidence,
          } : null,
        })),
        pagination: {
          page: parseInt(page),
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
          hasNext: skip + take < total,
          hasPrev: parseInt(page) > 1,
        },
      });
    } catch (error) {
      logger.error({ error: error.message }, 'NAMASTE codes query failed');
      return c.json({ error: 'Failed to load codes' }, 500);
    }
  });

  /**
   * Browse TM2 codes with pagination and filtering
   */
  router.get('/codes/tm2', async (c) => {
    const { 
      category, 
      search, 
      page = '1', 
      limit = '20',
    } = c.req.query();

    const prisma = getPrisma();
    const take = Math.min(parseInt(limit), 100);
    const skip = (parseInt(page) - 1) * take;

    const where = {};
    
    if (category) {
      where.category = category;
    }
    
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { definition: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      const [codes, total, categories] = await Promise.all([
        prisma.tm2Code.findMany({
          where,
          orderBy: { code: 'asc' },
          take,
          skip,
        }),
        prisma.tm2Code.count({ where }),
        prisma.tm2Code.groupBy({
          by: ['category'],
          _count: { id: true },
        }),
      ]);

      return c.json({
        data: codes.map(code => ({
          id: code.id,
          code: code.code,
          title: code.title,
          definition: code.definition,
          category: code.category,
          chapter: code.chapter,
          icdUri: code.icdUri,
        })),
        categories: categories.map(c => ({
          name: c.category || 'Unknown',
          count: c._count.id,
        })),
        pagination: {
          page: parseInt(page),
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
          hasNext: skip + take < total,
          hasPrev: parseInt(page) > 1,
        },
      });
    } catch (error) {
      logger.error({ error: error.message }, 'TM2 codes query failed');
      return c.json({ error: 'Failed to load codes' }, 500);
    }
  });

  // ============================================================================
  // Mapping Explorer
  // ============================================================================

  /**
   * Get detailed mapping information
   */
  router.get('/mappings', async (c) => {
    const { 
      system,
      equivalence,
      minConfidence,
      maxConfidence,
      search,
      page = '1', 
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = c.req.query();

    const prisma = getPrisma();
    const take = Math.min(parseInt(limit), 100);
    const skip = (parseInt(page) - 1) * take;

    const where = {};
    
    if (system) {
      where.namasteCode = { system: system.toUpperCase() };
    }
    
    if (equivalence) {
      where.equivalence = equivalence.toUpperCase();
    }

    if (minConfidence) {
      where.confidence = { ...where.confidence, gte: parseFloat(minConfidence) };
    }

    if (maxConfidence) {
      where.confidence = { ...where.confidence, lte: parseFloat(maxConfidence) };
    }

    if (search) {
      where.OR = [
        { namasteCode: { code: { contains: search, mode: 'insensitive' } } },
        { namasteCode: { term: { contains: search, mode: 'insensitive' } } },
        { tm2Code: { code: { contains: search, mode: 'insensitive' } } },
        { tm2Code: { title: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    try {
      const [mappings, total] = await Promise.all([
        prisma.mapping.findMany({
          where,
          include: {
            namasteCode: true,
            tm2Code: true,
          },
          orderBy,
          take,
          skip,
        }),
        prisma.mapping.count({ where }),
      ]);

      return c.json({
        data: mappings.map(m => ({
          id: m.id,
          namaste: {
            code: m.namasteCode.code,
            system: m.namasteCode.system.toLowerCase(),
            term: m.namasteCode.term,
            englishName: m.namasteCode.englishName,
            definition: m.namasteCode.shortDefinition,
          },
          tm2: m.tm2Code ? {
            code: m.tm2Code.code,
            title: m.tm2Code.title,
            definition: m.tm2Code.definition,
            category: m.tm2Code.category,
          } : null,
          equivalence: m.equivalence,
          confidence: m.confidence,
          confidencePercent: Math.round(m.confidence * 100),
          reasoning: m.reasoning,
          source: m.mappingSource,
          status: m.validationStatus,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        })),
        pagination: {
          page: parseInt(page),
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
          hasNext: skip + take < total,
          hasPrev: parseInt(page) > 1,
        },
        filters: {
          equivalences: ['EQUIVALENT', 'WIDER', 'NARROWER', 'INEXACT', 'UNMATCHED'],
          systems: ['ayurveda', 'siddha', 'unani'],
        },
      });
    } catch (error) {
      logger.error({ error: error.message }, 'Mappings query failed');
      return c.json({ error: 'Failed to load mappings' }, 500);
    }
  });

  /**
   * Get single mapping details
   */
  router.get('/mappings/:id', async (c) => {
    const { id } = c.req.param();
    const prisma = getPrisma();

    try {
      const mapping = await prisma.mapping.findUnique({
        where: { id },
        include: {
          namasteCode: true,
          tm2Code: true,
        },
      });

      if (!mapping) {
        return c.json({ error: 'Mapping not found' }, 404);
      }

      return c.json({
        id: mapping.id,
        namaste: {
          id: mapping.namasteCode.id,
          code: mapping.namasteCode.code,
          system: mapping.namasteCode.system.toLowerCase(),
          term: mapping.namasteCode.term,
          englishName: mapping.namasteCode.englishName,
          definition: mapping.namasteCode.shortDefinition,
          longDefinition: mapping.namasteCode.longDefinition,
        },
        tm2: mapping.tm2Code ? {
          id: mapping.tm2Code.id,
          code: mapping.tm2Code.code,
          title: mapping.tm2Code.title,
          definition: mapping.tm2Code.definition,
          category: mapping.tm2Code.category,
          chapter: mapping.tm2Code.chapter,
          icdUri: mapping.tm2Code.icdUri,
        } : null,
        equivalence: mapping.equivalence,
        equivalenceLabel: getEquivalenceLabel(mapping.equivalence),
        confidence: mapping.confidence,
        confidencePercent: Math.round(mapping.confidence * 100),
        reasoning: mapping.reasoning,
        source: mapping.mappingSource,
        status: mapping.validationStatus,
        createdAt: mapping.createdAt,
        updatedAt: mapping.updatedAt,
      });
    } catch (error) {
      logger.error({ error: error.message }, 'Mapping detail query failed');
      return c.json({ error: 'Failed to load mapping' }, 500);
    }
  });

  // ============================================================================
  // Statistics & Analytics
  // ============================================================================

  /**
   * Get detailed statistics for charts
   */
  router.get('/stats', async (c) => {
    const prisma = getPrisma();

    try {
      const [
        systemStats,
        equivalenceStats,
        confidenceDistribution,
        dailyMappings,
      ] = await Promise.all([
        // Mappings by system
        prisma.$queryRaw`
          SELECT nc.system, COUNT(m.id)::int as count
          FROM mappings m
          JOIN namaste_codes nc ON m.namaste_code_id = nc.id
          GROUP BY nc.system
        `,
        // Mappings by equivalence
        prisma.mapping.groupBy({
          by: ['equivalence'],
          _count: { id: true },
        }),
        // Confidence distribution
        prisma.$queryRaw`
          SELECT 
            CASE 
              WHEN confidence >= 0.9 THEN 'high'
              WHEN confidence >= 0.7 THEN 'medium'
              WHEN confidence >= 0.5 THEN 'low'
              ELSE 'very_low'
            END as bucket,
            COUNT(*)::int as count
          FROM mappings
          GROUP BY bucket
        `,
        // Daily mappings (last 7 days)
        prisma.$queryRaw`
          SELECT DATE(created_at) as date, COUNT(*)::int as count
          FROM mappings
          WHERE created_at > NOW() - INTERVAL '7 days'
          GROUP BY DATE(created_at)
          ORDER BY date
        `,
      ]);

      return c.json({
        bySystem: systemStats,
        byEquivalence: equivalenceStats.map(s => ({
          equivalence: s.equivalence,
          count: s._count.id,
          color: getEquivalenceColor(s.equivalence),
        })),
        byConfidence: confidenceDistribution,
        dailyTrend: dailyMappings,
        summary: {
          totalMappings: equivalenceStats.reduce((sum, s) => sum + s._count.id, 0),
          avgConfidence: await prisma.mapping.aggregate({ _avg: { confidence: true } })
            .then(r => r._avg.confidence?.toFixed(2) || 0),
        },
      });
    } catch (error) {
      logger.error({ error: error.message }, 'Stats query failed');
      return c.json({ error: 'Failed to load stats' }, 500);
    }
  });

  // ============================================================================
  // Quick Actions
  // ============================================================================

  /**
   * Quick map - simplified mapping for demo
   */
  router.post('/quick-map', async (c) => {
    const { term, system = 'ayurveda' } = await c.req.json();

    if (!term) {
      return c.json({ error: 'Term is required' }, 400);
    }

    const prisma = getPrisma();

    try {
      // Find NAMASTE code by term
      const namasteCode = await prisma.namasteCode.findFirst({
        where: {
          system: system.toUpperCase(),
          OR: [
            { term: { contains: term, mode: 'insensitive' } },
            { englishName: { contains: term, mode: 'insensitive' } },
            { code: { equals: term, mode: 'insensitive' } },
          ],
        },
        include: {
          mappings: {
            take: 1,
            orderBy: { confidence: 'desc' },
            include: { tm2Code: true },
          },
        },
      });

      if (!namasteCode) {
        return c.json({
          found: false,
          message: 'No matching NAMASTE code found',
          suggestions: await getSuggestions(prisma, term, system),
        });
      }

      const existingMapping = namasteCode.mappings[0];

      return c.json({
        found: true,
        namaste: {
          code: namasteCode.code,
          system: namasteCode.system.toLowerCase(),
          term: namasteCode.term,
          englishName: namasteCode.englishName,
        },
        mapping: existingMapping ? {
          tm2Code: existingMapping.tm2Code?.code,
          tm2Title: existingMapping.tm2Code?.title,
          equivalence: existingMapping.equivalence,
          confidence: existingMapping.confidence,
          reasoning: existingMapping.reasoning,
          cached: true,
        } : null,
        needsMapping: !existingMapping,
        mapUrl: `/api/v1/mapping`,
      });
    } catch (error) {
      logger.error({ error: error.message }, 'Quick map failed');
      return c.json({ error: 'Quick map failed' }, 500);
    }
  });

  /**
   * Get system info for frontend
   */
  router.get('/system-info', async (c) => {
    const metrics = getMetricsJson();
    const cache = getCacheStats();
    const queue = getQueueStats();

    return c.json({
      version: '1.0.0',
      status: 'operational',
      uptime: process.uptime(),
      features: {
        vectorSearch: true,
        batchProcessing: true,
        aiMapping: true,
        fhirCompliant: true,
      },
      metrics: {
        totalRequests: metrics.requests?.total || 0,
        mappingsProcessed: metrics.mappings?.total || 0,
        avgLatency: metrics.latency?.avg || 0,
      },
      cache: {
        hitRate: cache.mappings?.hitRate || '0%',
        size: cache.mappings?.size || 0,
      },
      queue: {
        pending: queue.pending || 0,
        processing: queue.processing || 0,
      },
    });
  });

  return router;
};

// Helper functions
function getEquivalenceLabel(equivalence) {
  const labels = {
    EQUIVALENT: 'Exact Match',
    WIDER: 'Broader Concept',
    NARROWER: 'Narrower Concept',
    INEXACT: 'Related',
    UNMATCHED: 'No Match',
  };
  return labels[equivalence] || equivalence;
}

function getEquivalenceColor(equivalence) {
  const colors = {
    EQUIVALENT: '#22c55e', // green
    WIDER: '#3b82f6',      // blue
    NARROWER: '#8b5cf6',   // purple
    INEXACT: '#f59e0b',    // amber
    UNMATCHED: '#ef4444',  // red
  };
  return colors[equivalence] || '#6b7280';
}

async function getSuggestions(prisma, term, system) {
  const suggestions = await prisma.namasteCode.findMany({
    where: {
      system: system.toUpperCase(),
      OR: [
        { term: { contains: term.substring(0, 3), mode: 'insensitive' } },
        { englishName: { contains: term.substring(0, 3), mode: 'insensitive' } },
      ],
    },
    take: 5,
    select: { code: true, term: true, englishName: true },
  });
  return suggestions;
}
