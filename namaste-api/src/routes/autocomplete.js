import { Hono } from 'hono';
import { getPrisma } from '../db/client.js';
import { logger } from '../config/logger.js';

/**
 * Autocomplete Routes
 * Fast prefix search for NAMASTE and TM2 codes
 * Functional approach - factory function returning Hono router
 */
export const createAutocompleteRoutes = () => {
  const router = new Hono();

  // Search NAMASTE codes
  router.get('/namaste', async (c) => {
    const { 
      q, 
      system, 
      limit = '10',
    } = c.req.query();

    if (!q || q.length < 2) {
      return c.json({
        results: [],
        message: 'Query must be at least 2 characters',
      });
    }

    const prisma = getPrisma();
    const take = Math.min(parseInt(limit, 10), 50);

    const where = {
      OR: [
        { code: { startsWith: q.toUpperCase() } },
        { term: { contains: q, mode: 'insensitive' } },
        { englishName: { contains: q, mode: 'insensitive' } },
        { searchableText: { contains: q.toLowerCase() } },
      ],
    };

    if (system) {
      where.system = system.toUpperCase();
    }

    try {
      const results = await prisma.namasteCode.findMany({
        where,
        take,
        select: {
          id: true,
          code: true,
          system: true,
          term: true,
          englishName: true,
          shortDefinition: true,
        },
        orderBy: [
          { code: 'asc' },
        ],
      });

      return c.json({
        query: q,
        count: results.length,
        results: results.map(r => ({
          id: r.id,
          code: r.code,
          system: r.system.toLowerCase(),
          term: r.term,
          englishName: r.englishName,
          display: r.englishName || r.term,
          definition: r.shortDefinition,
        })),
      });
    } catch (error) {
      logger.error({ error: error.message, query: q }, 'Autocomplete failed');
      return c.json({
        error: 'Search Error',
        message: error.message,
      }, 500);
    }
  });

  // Search TM2 codes
  router.get('/tm2', async (c) => {
    const { 
      q, 
      category,
      limit = '10',
    } = c.req.query();

    if (!q || q.length < 2) {
      return c.json({
        results: [],
        message: 'Query must be at least 2 characters',
      });
    }

    const prisma = getPrisma();
    const take = Math.min(parseInt(limit, 10), 50);

    const where = {
      OR: [
        { code: { startsWith: q.toUpperCase() } },
        { title: { contains: q, mode: 'insensitive' } },
        { definition: { contains: q, mode: 'insensitive' } },
      ],
    };

    if (category) {
      where.category = category;
    }

    try {
      const results = await prisma.tm2Code.findMany({
        where,
        take,
        select: {
          id: true,
          code: true,
          title: true,
          category: true,
          definition: true,
        },
        orderBy: [
          { code: 'asc' },
        ],
      });

      return c.json({
        query: q,
        count: results.length,
        results: results.map(r => ({
          id: r.id,
          code: r.code,
          title: r.title,
          category: r.category,
          display: `${r.code} - ${r.title}`,
          definition: r.definition,
        })),
      });
    } catch (error) {
      logger.error({ error: error.message, query: q }, 'TM2 autocomplete failed');
      return c.json({
        error: 'Search Error',
        message: error.message,
      }, 500);
    }
  });

  // Combined search (both NAMASTE and TM2)
  router.get('/all', async (c) => {
    const { 
      q, 
      limit = '10',
    } = c.req.query();

    if (!q || q.length < 2) {
      return c.json({
        results: [],
        message: 'Query must be at least 2 characters',
      });
    }

    const prisma = getPrisma();
    const take = Math.min(parseInt(limit, 10), 25);

    try {
      const [namasteResults, tm2Results] = await Promise.all([
        prisma.namasteCode.findMany({
          where: {
            OR: [
              { code: { startsWith: q.toUpperCase() } },
              { term: { contains: q, mode: 'insensitive' } },
              { englishName: { contains: q, mode: 'insensitive' } },
            ],
          },
          take,
          select: {
            id: true,
            code: true,
            system: true,
            term: true,
            englishName: true,
          },
        }),
        prisma.tm2Code.findMany({
          where: {
            OR: [
              { code: { startsWith: q.toUpperCase() } },
              { title: { contains: q, mode: 'insensitive' } },
            ],
          },
          take,
          select: {
            id: true,
            code: true,
            title: true,
            category: true,
          },
        }),
      ]);

      return c.json({
        query: q,
        namaste: {
          count: namasteResults.length,
          results: namasteResults.map(r => ({
            id: r.id,
            code: r.code,
            system: r.system.toLowerCase(),
            display: r.englishName || r.term,
            type: 'namaste',
          })),
        },
        tm2: {
          count: tm2Results.length,
          results: tm2Results.map(r => ({
            id: r.id,
            code: r.code,
            display: r.title,
            category: r.category,
            type: 'tm2',
          })),
        },
      });
    } catch (error) {
      logger.error({ error: error.message, query: q }, 'Combined autocomplete failed');
      return c.json({
        error: 'Search Error',
        message: error.message,
      }, 500);
    }
  });

  return router;
};
