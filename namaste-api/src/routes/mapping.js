import { Hono } from 'hono';
import { z } from 'zod';
import { getPrisma } from '../db/client.js';
import { logger } from '../config/logger.js';
import { mapNamasteToTm2, batchMapNamasteToTm2 } from '../workflows/mapping-graph.js';
import { 
  createBatchJob, 
  getJobStatus, 
  getJobResults, 
  cancelJob 
} from '../services/batch-processor.js';
import { recordMappingMetrics } from '../middleware/metrics.js';

/**
 * Mapping Routes
 * AI-powered NAMASTE to ICD-11 TM2 mapping
 * Functional approach - factory function returning Hono router
 */

// Request validation schemas
const mapRequestSchema = z.object({
  code: z.string().min(1),
  system: z.enum(['ayurveda', 'siddha', 'unani']),
  term: z.string().optional(),
  context: z.string().optional(),
});

const batchMapRequestSchema = z.object({
  codes: z.array(mapRequestSchema).min(1).max(100),
});

export const createMappingRoutes = () => {
  const router = new Hono();

  // Single code mapping
  router.post('/', async (c) => {
    const body = await c.req.json();
    
    // Validate request
    const parseResult = mapRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json({
        error: 'Validation Error',
        details: parseResult.error.errors,
      }, 400);
    }

    const { code, system, term, context } = parseResult.data;
    const prisma = getPrisma();

    try {
      // Check for existing mapping
      const systemEnum = system.toUpperCase();
      const existingMapping = await prisma.mapping.findFirst({
        where: {
          namasteCode: {
            code,
            system: systemEnum,
          },
        },
        include: {
          namasteCode: true,
          tm2Code: true,
        },
        orderBy: { confidence: 'desc' },
      });

      if (existingMapping) {
        return c.json({
          success: true,
          source: 'cached',
          mapping: {
            namasteCode: {
              code: existingMapping.namasteCode.code,
              system: existingMapping.namasteCode.system,
              term: existingMapping.namasteCode.term,
            },
            tm2Code: {
              code: existingMapping.tm2Code.code,
              title: existingMapping.tm2Code.title,
              category: existingMapping.tm2Code.category,
            },
            equivalence: existingMapping.equivalence,
            confidence: existingMapping.confidence,
            mappingSource: existingMapping.mappingSource,
            reasoning: existingMapping.reasoning,
          },
        });
      }

      // Fetch the NAMASTE code from database
      const namasteCode = await prisma.namasteCode.findFirst({
        where: { code, system: systemEnum },
      });

      if (!namasteCode) {
        return c.json({
          error: 'Not Found',
          message: `NAMASTE code ${code} not found in ${system} system`,
        }, 404);
      }

      // Invoke LangGraph mapping workflow
      logger.info({ code, system }, 'Invoking AI mapping workflow');
      const mappingResult = await mapNamasteToTm2(namasteCode);

      // Store the mapping if successful
      if (mappingResult.success && mappingResult.tm2Code) {
        const tm2Code = await prisma.tm2Code.findFirst({
          where: { code: mappingResult.tm2Code },
        });

        if (tm2Code) {
          await prisma.mapping.upsert({
            where: {
              namasteCodeId_tm2CodeId: {
                namasteCodeId: namasteCode.id,
                tm2CodeId: tm2Code.id,
              },
            },
            update: {
              equivalence: mappingResult.equivalence.toUpperCase(),
              confidence: mappingResult.confidence,
              mappingSource: 'AI_VALIDATED',
              reasoning: mappingResult.reasoning,
            },
            create: {
              namasteCodeId: namasteCode.id,
              tm2CodeId: tm2Code.id,
              equivalence: mappingResult.equivalence.toUpperCase(),
              confidence: mappingResult.confidence,
              mappingSource: 'AI_VALIDATED',
              reasoning: mappingResult.reasoning,
            },
          });
        }
      }

      return c.json({
        success: mappingResult.success,
        source: 'ai_workflow',
        mapping: {
          namasteCode: {
            code: namasteCode.code,
            system: namasteCode.system,
            term: namasteCode.term,
            englishName: namasteCode.englishName,
          },
          tm2Code: mappingResult.tm2Code ? {
            code: mappingResult.tm2Code,
            title: mappingResult.tm2Title,
          } : null,
          equivalence: mappingResult.equivalence,
          confidence: mappingResult.confidence,
          reasoning: mappingResult.reasoning,
        },
        processingTime: mappingResult.processingTime,
      });

    } catch (error) {
      logger.error({ error: error.message, code, system }, 'Mapping failed');
      return c.json({
        error: 'Mapping Error',
        message: error.message,
      }, 500);
    }
  });

  // Batch mapping
  router.post('/batch', async (c) => {
    const body = await c.req.json();
    
    const parseResult = batchMapRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json({
        error: 'Validation Error',
        details: parseResult.error.errors,
      }, 400);
    }

    const { codes } = parseResult.data;
    const prisma = getPrisma();

    try {
      const results = await Promise.all(
        codes.map(async ({ code, system }) => {
          const systemEnum = system.toUpperCase();
          const mapping = await prisma.mapping.findFirst({
            where: {
              namasteCode: { code, system: systemEnum },
            },
            include: {
              namasteCode: true,
              tm2Code: true,
            },
            orderBy: { confidence: 'desc' },
          });

          return {
            code,
            system,
            mapped: !!mapping,
            mapping: mapping ? {
              tm2Code: mapping.tm2Code.code,
              tm2Title: mapping.tm2Code.title,
              confidence: mapping.confidence,
              equivalence: mapping.equivalence,
            } : null,
          };
        })
      );

      const mapped = results.filter(r => r.mapped).length;
      const unmapped = results.filter(r => !r.mapped).length;

      return c.json({
        success: true,
        summary: { total: codes.length, mapped, unmapped },
        results,
      });

    } catch (error) {
      logger.error({ error: error.message }, 'Batch mapping failed');
      return c.json({
        error: 'Batch Mapping Error',
        message: error.message,
      }, 500);
    }
  });

  // Create async batch job
  router.post('/batch/async', async (c) => {
    const body = await c.req.json();
    
    const parseResult = batchMapRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json({
        error: 'Validation Error',
        details: parseResult.error.errors,
      }, 400);
    }

    const { codes } = parseResult.data;
    const { callbackUrl, saveResults = true } = body;

    try {
      const job = await createBatchJob(codes, {
        userId: c.req.header('x-user-id'),
        callbackUrl,
        saveResults,
      });

      return c.json(job, 202);
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to create batch job');
      return c.json({
        error: 'Batch Job Error',
        message: error.message,
      }, 500);
    }
  });

  // Get batch job status
  router.get('/batch/:jobId', async (c) => {
    const { jobId } = c.req.param();
    const status = getJobStatus(jobId);

    if (!status) {
      return c.json({
        error: 'Not Found',
        message: `Job ${jobId} not found`,
      }, 404);
    }

    return c.json(status);
  });

  // Get batch job results
  router.get('/batch/:jobId/results', async (c) => {
    const { jobId } = c.req.param();
    const results = getJobResults(jobId);

    if (!results) {
      return c.json({
        error: 'Not Found',
        message: `Job ${jobId} not found`,
      }, 404);
    }

    return c.json(results);
  });

  // Cancel batch job
  router.delete('/batch/:jobId', async (c) => {
    const { jobId } = c.req.param();
    const cancelled = cancelJob(jobId);

    if (!cancelled) {
      return c.json({
        error: 'Not Found',
        message: `Job ${jobId} not found or already completed`,
      }, 404);
    }

    return c.json({ message: 'Job cancelled', jobId });
  });

  // Get mapping by ID
  router.get('/:id', async (c) => {
    const { id } = c.req.param();
    const prisma = getPrisma();

    const mapping = await prisma.mapping.findUnique({
      where: { id },
      include: {
        namasteCode: true,
        tm2Code: true,
      },
    });

    if (!mapping) {
      return c.json({
        error: 'Not Found',
        message: `Mapping ${id} not found`,
      }, 404);
    }

    return c.json({
      id: mapping.id,
      namasteCode: {
        code: mapping.namasteCode.code,
        system: mapping.namasteCode.system,
        term: mapping.namasteCode.term,
        englishName: mapping.namasteCode.englishName,
      },
      tm2Code: {
        code: mapping.tm2Code.code,
        title: mapping.tm2Code.title,
        category: mapping.tm2Code.category,
        definition: mapping.tm2Code.definition,
      },
      equivalence: mapping.equivalence,
      confidence: mapping.confidence,
      mappingSource: mapping.mappingSource,
      validationStatus: mapping.validationStatus,
      reasoning: mapping.reasoning,
      createdAt: mapping.createdAt,
      updatedAt: mapping.updatedAt,
    });
  });

  // List all mappings with pagination
  router.get('/', async (c) => {
    const { 
      system, 
      minConfidence = '0',
      status,
      page = '1', 
      limit = '20',
    } = c.req.query();

    const prisma = getPrisma();
    const take = Math.min(parseInt(limit, 10), 100);
    const skip = (parseInt(page, 10) - 1) * take;

    const where = {};
    
    if (system) {
      where.namasteCode = { system: system.toUpperCase() };
    }
    
    if (minConfidence) {
      where.confidence = { gte: parseFloat(minConfidence) };
    }

    if (status) {
      where.validationStatus = status.toUpperCase();
    }

    const [mappings, total] = await Promise.all([
      prisma.mapping.findMany({
        where,
        include: {
          namasteCode: { select: { code: true, system: true, term: true } },
          tm2Code: { select: { code: true, title: true, category: true } },
        },
        orderBy: { confidence: 'desc' },
        take,
        skip,
      }),
      prisma.mapping.count({ where }),
    ]);

    return c.json({
      data: mappings.map(m => ({
        id: m.id,
        namasteCode: m.namasteCode.code,
        namasteSystem: m.namasteCode.system,
        namasteTerm: m.namasteCode.term,
        tm2Code: m.tm2Code.code,
        tm2Title: m.tm2Code.title,
        equivalence: m.equivalence,
        confidence: m.confidence,
        status: m.validationStatus,
      })),
      pagination: {
        page: parseInt(page, 10),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  });

  // Validate/approve a mapping
  router.patch('/:id/validate', async (c) => {
    const { id } = c.req.param();
    const body = await c.req.json();
    const { status, validatedBy } = body;

    if (!['APPROVED', 'REJECTED', 'NEEDS_REVIEW'].includes(status)) {
      return c.json({
        error: 'Invalid status',
        message: 'Status must be APPROVED, REJECTED, or NEEDS_REVIEW',
      }, 400);
    }

    const prisma = getPrisma();

    const mapping = await prisma.mapping.update({
      where: { id },
      data: {
        validationStatus: status,
        validatedBy,
        validatedAt: new Date(),
      },
    });

    return c.json({
      success: true,
      mapping: {
        id: mapping.id,
        validationStatus: mapping.validationStatus,
        validatedBy: mapping.validatedBy,
        validatedAt: mapping.validatedAt,
      },
    });
  });

  // Statistics
  router.get('/stats/summary', async (c) => {
    const prisma = getPrisma();

    const [
      totalMappings,
      bySystem,
      byStatus,
      avgConfidence,
    ] = await Promise.all([
      prisma.mapping.count(),
      prisma.mapping.groupBy({
        by: ['mappingSource'],
        _count: true,
      }),
      prisma.mapping.groupBy({
        by: ['validationStatus'],
        _count: true,
      }),
      prisma.mapping.aggregate({
        _avg: { confidence: true },
      }),
    ]);

    return c.json({
      totalMappings,
      byMappingSource: Object.fromEntries(
        bySystem.map(s => [s.mappingSource, s._count])
      ),
      byValidationStatus: Object.fromEntries(
        byStatus.map(s => [s.validationStatus, s._count])
      ),
      averageConfidence: avgConfidence._avg.confidence || 0,
    });
  });

  return router;
};
