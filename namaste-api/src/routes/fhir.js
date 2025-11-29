import { Hono } from 'hono';
import { getPrisma } from '../db/client.js';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

/**
 * FHIR R4 Terminology Routes
 * Implements FHIR terminology operations
 * Functional approach - factory function returning Hono router
 */
export const createFhirRoutes = () => {
  const router = new Hono();

  // FHIR metadata (CapabilityStatement)
  router.get('/metadata', (c) => {
    return c.json({
      resourceType: 'CapabilityStatement',
      status: 'active',
      date: new Date().toISOString(),
      kind: 'instance',
      software: {
        name: 'NAMASTE-ICD Terminology Service',
        version: '1.0.0',
      },
      implementation: {
        description: 'FHIR R4 Terminology Service for NAMASTE to ICD-11 TM2 mapping',
        url: config.fhir.baseUrl,
      },
      fhirVersion: '4.0.1',
      format: ['application/fhir+json', 'application/json'],
      rest: [{
        mode: 'server',
        resource: [
          {
            type: 'CodeSystem',
            interaction: [{ code: 'read' }, { code: 'search-type' }],
            operation: [
              { name: 'lookup', definition: 'http://hl7.org/fhir/OperationDefinition/CodeSystem-lookup' },
              { name: 'validate-code', definition: 'http://hl7.org/fhir/OperationDefinition/CodeSystem-validate-code' },
            ],
          },
          {
            type: 'ValueSet',
            interaction: [{ code: 'read' }, { code: 'search-type' }],
            operation: [
              { name: 'expand', definition: 'http://hl7.org/fhir/OperationDefinition/ValueSet-expand' },
            ],
          },
          {
            type: 'ConceptMap',
            interaction: [{ code: 'read' }, { code: 'search-type' }],
            operation: [
              { name: 'translate', definition: 'http://hl7.org/fhir/OperationDefinition/ConceptMap-translate' },
            ],
          },
        ],
      }],
    });
  });

  // CodeSystem routes
  router.get('/CodeSystem', async (c) => {
    const systems = [
      createNamasteCodeSystem('ayurveda'),
      createNamasteCodeSystem('siddha'),
      createNamasteCodeSystem('unani'),
      createTm2CodeSystem(),
    ];

    return c.json({
      resourceType: 'Bundle',
      type: 'searchset',
      total: systems.length,
      entry: systems.map(system => ({
        resource: system,
      })),
    });
  });

  router.get('/CodeSystem/:id', async (c) => {
    const { id } = c.req.param();
    
    if (id === 'namaste-ayurveda') {
      return c.json(createNamasteCodeSystem('ayurveda'));
    } else if (id === 'namaste-siddha') {
      return c.json(createNamasteCodeSystem('siddha'));
    } else if (id === 'namaste-unani') {
      return c.json(createNamasteCodeSystem('unani'));
    } else if (id === 'icd11-tm2') {
      return c.json(createTm2CodeSystem());
    }

    return c.json({
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'not-found',
        diagnostics: `CodeSystem ${id} not found`,
      }],
    }, 404);
  });

  // CodeSystem $lookup operation
  router.get('/CodeSystem/$lookup', async (c) => {
    const { system, code } = c.req.query();
    
    if (!system || !code) {
      return c.json({
        resourceType: 'OperationOutcome',
        issue: [{
          severity: 'error',
          code: 'required',
          diagnostics: 'system and code parameters are required',
        }],
      }, 400);
    }

    const prisma = getPrisma();
    let result = null;

    // Determine which system to query
    if (system.includes('namaste') || system.includes('ayurveda') || system.includes('siddha') || system.includes('unani')) {
      const systemType = system.includes('ayurveda') ? 'AYURVEDA' 
        : system.includes('siddha') ? 'SIDDHA' 
        : 'UNANI';
      
      result = await prisma.namasteCode.findFirst({
        where: { code, system: systemType },
      });

      if (result) {
        return c.json({
          resourceType: 'Parameters',
          parameter: [
            { name: 'name', valueString: result.term },
            { name: 'display', valueString: result.englishName || result.term },
            { name: 'definition', valueString: result.shortDefinition },
            { name: 'designation', valueCoding: {
              language: 'sa', // Sanskrit for Ayurveda
              value: result.nativeScript,
            }},
          ],
        });
      }
    } else if (system.includes('icd') || system.includes('tm2')) {
      result = await prisma.tm2Code.findFirst({
        where: { code },
      });

      if (result) {
        return c.json({
          resourceType: 'Parameters',
          parameter: [
            { name: 'name', valueString: result.title },
            { name: 'display', valueString: result.title },
            { name: 'definition', valueString: result.definition },
          ],
        });
      }
    }

    return c.json({
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'not-found',
        diagnostics: `Code ${code} not found in system ${system}`,
      }],
    }, 404);
  });

  // ConceptMap $translate operation
  router.post('/ConceptMap/$translate', async (c) => {
    const body = await c.req.json();
    const { code, system, target } = body;

    if (!code || !system) {
      return c.json({
        resourceType: 'OperationOutcome',
        issue: [{
          severity: 'error',
          code: 'required',
          diagnostics: 'code and system parameters are required',
        }],
      }, 400);
    }

    const prisma = getPrisma();

    // Find mappings for the code
    const systemType = system.includes('ayurveda') ? 'AYURVEDA'
      : system.includes('siddha') ? 'SIDDHA'
      : system.includes('unani') ? 'UNANI'
      : null;

    if (!systemType) {
      return c.json({
        resourceType: 'Parameters',
        parameter: [
          { name: 'result', valueBoolean: false },
          { name: 'message', valueString: 'Unknown source system' },
        ],
      });
    }

    const namasteCode = await prisma.namasteCode.findFirst({
      where: { code, system: systemType },
      include: {
        mappings: {
          include: { tm2Code: true },
          orderBy: { confidence: 'desc' },
        },
      },
    });

    if (!namasteCode || namasteCode.mappings.length === 0) {
      return c.json({
        resourceType: 'Parameters',
        parameter: [
          { name: 'result', valueBoolean: false },
          { name: 'message', valueString: 'No mappings found' },
        ],
      });
    }

    const matches = namasteCode.mappings.map(mapping => ({
      name: 'match',
      part: [
        { name: 'equivalence', valueCode: mapping.equivalence.toLowerCase() },
        { name: 'concept', valueCoding: {
          system: config.fhir.icd11.tm2System,
          code: mapping.tm2Code.code,
          display: mapping.tm2Code.title,
        }},
        { name: 'source', valueString: mapping.mappingSource },
        { name: 'confidence', valueDecimal: mapping.confidence },
      ],
    }));

    return c.json({
      resourceType: 'Parameters',
      parameter: [
        { name: 'result', valueBoolean: true },
        ...matches,
      ],
    });
  });

  // ValueSet $expand operation
  router.get('/ValueSet/$expand', async (c) => {
    const { url, filter, count = '20', offset = '0' } = c.req.query();
    const prisma = getPrisma();
    const limit = parseInt(count, 10);
    const skip = parseInt(offset, 10);

    let codes = [];
    let total = 0;

    if (url?.includes('namaste') || !url) {
      // Search NAMASTE codes
      const where = filter ? {
        OR: [
          { term: { contains: filter, mode: 'insensitive' } },
          { englishName: { contains: filter, mode: 'insensitive' } },
          { searchableText: { contains: filter, mode: 'insensitive' } },
        ],
      } : {};

      [codes, total] = await Promise.all([
        prisma.namasteCode.findMany({
          where,
          take: limit,
          skip,
          orderBy: { term: 'asc' },
        }),
        prisma.namasteCode.count({ where }),
      ]);
    }

    return c.json({
      resourceType: 'ValueSet',
      status: 'active',
      expansion: {
        timestamp: new Date().toISOString(),
        total,
        offset: skip,
        contains: codes.map(code => ({
          system: config.fhir.namaste[`${code.system.toLowerCase()}System`],
          code: code.code,
          display: code.englishName || code.term,
          designation: [{
            language: getLanguageCode(code.system),
            value: code.nativeScript || code.term,
          }],
        })),
      },
    });
  });

  return router;
};

// Helper functions

const createNamasteCodeSystem = (system) => ({
  resourceType: 'CodeSystem',
  id: `namaste-${system}`,
  url: config.fhir.namaste[`${system}System`],
  version: '1.0.0',
  name: `NAMASTE_${system.toUpperCase()}`,
  title: `National ${system.charAt(0).toUpperCase() + system.slice(1)} Morbidity Codes`,
  status: 'active',
  experimental: false,
  date: new Date().toISOString(),
  publisher: 'Ministry of AYUSH, Government of India',
  description: `National ${system.charAt(0).toUpperCase() + system.slice(1)} Morbidity and Standardized Terminologies`,
  hierarchyMeaning: 'is-a',
  content: 'complete',
});

const createTm2CodeSystem = () => ({
  resourceType: 'CodeSystem',
  id: 'icd11-tm2',
  url: config.fhir.icd11.tm2System,
  version: '2024-01',
  name: 'ICD11_TM2',
  title: 'ICD-11 Traditional Medicine Module 2',
  status: 'active',
  experimental: false,
  date: new Date().toISOString(),
  publisher: 'World Health Organization',
  description: 'WHO ICD-11 Supplementary Chapter Traditional Medicine Conditions (Module II)',
  hierarchyMeaning: 'is-a',
  content: 'complete',
});

const getLanguageCode = (system) => {
  switch (system) {
    case 'AYURVEDA': return 'sa'; // Sanskrit
    case 'SIDDHA': return 'ta'; // Tamil
    case 'UNANI': return 'ur'; // Urdu
    default: return 'en';
  }
};
