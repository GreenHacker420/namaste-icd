/**
 * OpenAPI 3.0 Specification
 * 
 * Complete API documentation for NAMASTE-ICD Mapping Engine
 * Updated: Nov 28, 2025
 */

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'NAMASTE-ICD Intelligent Mapping Engine',
    version: '1.0.0',
    description: `
# NAMASTE-ICD API

FHIR R4-compliant terminology microservice for mapping India's **NAMASTE codes** 
(Ayurveda, Siddha, Unani) to **WHO ICD-11 TM2** (Traditional Medicine Module 2).

## Features
- **AI Mapping**: LangGraph workflow with Google Gemini
- **Vector Search**: pgvector-based semantic similarity (768-dim)
- **FHIR R4**: CodeSystem, ValueSet, ConceptMap operations
- **Batch Processing**: Async job queue for bulk operations
- **Dual Coding**: NAMASTE + ICD-11 TM2 in single response

## Code Systems
| System | Codes | Language | Script |
|--------|-------|----------|--------|
| NAMASTE Ayurveda | 2,910 | Sanskrit | Devanagari |
| NAMASTE Siddha | 1,926 | Tamil | Tamil |
| NAMASTE Unani | 2,522 | Arabic/Urdu | Arabic |
| ICD-11 TM2 | 728 | English | Latin |
| **Total** | **8,086** | | |

## Mapping Equivalences (FHIR ConceptMap)

| Code | Meaning | Color |
|------|---------|-------|
| EQUIVALENT | Exact semantic match | Green |
| WIDER | TM2 concept is broader | Blue |
| NARROWER | TM2 concept is more specific | Purple |
| INEXACT | Related but not equivalent | Amber |
| UNMATCHED | No suitable match found | Red |

## Quick Start

\`\`\`bash
# Map a single code
curl -X POST http://localhost:3000/api/v1/mapping \\
  -H "Content-Type: application/json" \\
  -d '{"code": "A-1", "system": "unani"}'

# Search NAMASTE codes
curl "http://localhost:3000/api/v1/autocomplete/namaste?q=headache"

# Get dashboard data
curl http://localhost:3000/api/v1/frontend/dashboard
\`\`\`

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Standard | 100 req | 1 min |
| Mapping | 20 req | 1 min |
| Batch | 5 req | 1 min |
| Search | 50 req | 1 min |

## Authentication

Currently open for development. Production will require API keys via \`X-API-Key\` header.
    `,
    contact: {
      name: 'NAMASTE-ICD Team',
      url: 'https://github.com/GreenHacker420/namaste',
      email: 'support@namaste.ayush.gov.in',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Development Server' },
  ],
  tags: [
    { name: 'Frontend', description: 'Frontend-optimized endpoints for UI consumption' },
    { name: 'Mapping', description: 'AI-powered NAMASTE to TM2 mapping' },
    { name: 'Autocomplete', description: 'Code search and autocomplete' },
    { name: 'Batch', description: 'Batch processing operations' },
    { name: 'FHIR', description: 'FHIR R4 terminology operations' },
    { name: 'Health', description: 'Health check and monitoring' },
    { name: 'Admin', description: 'Administrative operations' },
  ],
  paths: {
    // Health endpoints
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Basic health check',
        description: 'Returns service status',
        operationId: 'healthCheck',
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness check',
        description: 'Checks all dependencies (database, external APIs)',
        operationId: 'readinessCheck',
        responses: {
          200: { description: 'All dependencies healthy' },
          503: { description: 'Some dependencies unhealthy' },
        },
      },
    },
    '/metrics': {
      get: {
        tags: ['Health'],
        summary: 'Prometheus metrics',
        description: 'Returns metrics in Prometheus format',
        operationId: 'getMetrics',
        responses: {
          200: {
            description: 'Metrics in Prometheus format',
            content: { 'text/plain': { schema: { type: 'string' } } },
          },
        },
      },
    },

    // FHIR endpoints
    '/fhir/metadata': {
      get: {
        tags: ['FHIR'],
        summary: 'FHIR CapabilityStatement',
        description: 'Returns server capabilities as FHIR CapabilityStatement',
        operationId: 'getCapabilityStatement',
        responses: {
          200: {
            description: 'CapabilityStatement resource',
            content: { 'application/fhir+json': { schema: { type: 'object' } } },
          },
        },
      },
    },
    '/fhir/CodeSystem': {
      get: {
        tags: ['FHIR'],
        summary: 'List code systems',
        description: 'Returns all available code systems',
        operationId: 'listCodeSystems',
        responses: {
          200: { description: 'Bundle of CodeSystem resources' },
        },
      },
    },
    '/fhir/CodeSystem/$lookup': {
      get: {
        tags: ['FHIR'],
        summary: 'Lookup code details',
        description: 'Look up details for a specific code',
        operationId: 'lookupCode',
        parameters: [
          { name: 'system', in: 'query', required: true, schema: { type: 'string' }, description: 'Code system URL' },
          { name: 'code', in: 'query', required: true, schema: { type: 'string' }, description: 'Code value' },
        ],
        responses: {
          200: { description: 'Parameters with code details' },
          404: { description: 'Code not found' },
        },
      },
    },
    '/fhir/ConceptMap/$translate': {
      post: {
        tags: ['FHIR'],
        summary: 'Translate code',
        description: 'Translate NAMASTE code to TM2 using AI mapping',
        operationId: 'translateCode',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TranslateRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Translation result' },
        },
      },
    },
    '/fhir/ValueSet/$expand': {
      get: {
        tags: ['FHIR'],
        summary: 'Expand ValueSet',
        description: 'Expand a ValueSet with optional filter',
        operationId: 'expandValueSet',
        parameters: [
          { name: 'url', in: 'query', schema: { type: 'string' } },
          { name: 'filter', in: 'query', schema: { type: 'string' } },
          { name: 'count', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: { description: 'Expanded ValueSet' },
        },
      },
    },

    // Mapping endpoints
    '/api/v1/mapping': {
      post: {
        tags: ['Mapping'],
        summary: 'Map single code',
        description: 'Map a single NAMASTE code to TM2 using AI workflow',
        operationId: 'mapSingleCode',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MappingRequest' },
              example: {
                code: 'A-1',
                system: 'unani',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Mapping result',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MappingResponse' },
              },
            },
          },
          404: { description: 'Code not found' },
          429: { description: 'Rate limit exceeded' },
        },
      },
      get: {
        tags: ['Mapping'],
        summary: 'List mappings',
        description: 'List all stored mappings with filtering',
        operationId: 'listMappings',
        parameters: [
          { name: 'system', in: 'query', schema: { type: 'string', enum: ['ayurveda', 'siddha', 'unani'] } },
          { name: 'equivalence', in: 'query', schema: { type: 'string', enum: ['EQUIVALENT', 'WIDER', 'NARROWER', 'INEXACT', 'UNMATCHED'] } },
          { name: 'minConfidence', in: 'query', schema: { type: 'number', minimum: 0, maximum: 1 } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: {
          200: { description: 'Paginated mappings' },
        },
      },
    },

    // Batch endpoints
    '/api/v1/mapping/batch': {
      post: {
        tags: ['Batch'],
        summary: 'Create batch job',
        description: 'Create a batch mapping job for multiple codes',
        operationId: 'createBatchJob',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BatchRequest' },
            },
          },
        },
        responses: {
          202: {
            description: 'Job created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BatchJobCreated' },
              },
            },
          },
        },
      },
    },
    '/api/v1/mapping/batch/{jobId}': {
      get: {
        tags: ['Batch'],
        summary: 'Get job status',
        description: 'Get the status of a batch job',
        operationId: 'getJobStatus',
        parameters: [
          { name: 'jobId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Job status' },
          404: { description: 'Job not found' },
        },
      },
      delete: {
        tags: ['Batch'],
        summary: 'Cancel job',
        description: 'Cancel a pending or processing job',
        operationId: 'cancelJob',
        parameters: [
          { name: 'jobId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Job cancelled' },
          404: { description: 'Job not found' },
        },
      },
    },
    '/api/v1/mapping/batch/{jobId}/results': {
      get: {
        tags: ['Batch'],
        summary: 'Get job results',
        description: 'Get the results of a completed batch job',
        operationId: 'getJobResults',
        parameters: [
          { name: 'jobId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Job results' },
          404: { description: 'Job not found' },
        },
      },
    },

    // Autocomplete endpoints
    '/api/v1/autocomplete/namaste': {
      get: {
        tags: ['Autocomplete'],
        summary: 'Search NAMASTE codes',
        description: 'Search NAMASTE codes with autocomplete',
        operationId: 'searchNamaste',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string', minLength: 2 }, description: 'Search query' },
          { name: 'system', in: 'query', schema: { type: 'string', enum: ['ayurveda', 'siddha', 'unani'] } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 50 } },
        ],
        responses: {
          200: {
            description: 'Matching codes',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AutocompleteResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/autocomplete/tm2': {
      get: {
        tags: ['Autocomplete'],
        summary: 'Search TM2 codes',
        description: 'Search ICD-11 TM2 codes with autocomplete',
        operationId: 'searchTm2',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string', minLength: 2 } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 50 } },
        ],
        responses: {
          200: { description: 'Matching TM2 codes' },
        },
      },
    },

    // Admin endpoints
    '/api/v1/admin/embeddings/generate': {
      post: {
        tags: ['Admin'],
        summary: 'Generate embeddings',
        description: 'Batch generate embeddings for codes',
        operationId: 'generateEmbeddings',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['namaste', 'tm2', 'all'] },
                  batchSize: { type: 'integer', default: 50 },
                },
              },
            },
          },
        },
        responses: {
          202: { description: 'Embedding generation started' },
        },
      },
    },
    '/api/v1/admin/embeddings/stats': {
      get: {
        tags: ['Admin'],
        summary: 'Embedding statistics',
        description: 'Get embedding coverage statistics',
        operationId: 'getEmbeddingStats',
        responses: {
          200: { description: 'Embedding statistics' },
        },
      },
    },
    '/api/v1/admin/cache/stats': {
      get: {
        tags: ['Admin'],
        summary: 'Cache statistics',
        description: 'Get cache hit/miss statistics',
        operationId: 'getCacheStats',
        responses: {
          200: { description: 'Cache statistics' },
        },
      },
    },
    '/api/v1/admin/cache/clear': {
      post: {
        tags: ['Admin'],
        summary: 'Clear cache',
        description: 'Clear all caches',
        operationId: 'clearCache',
        responses: {
          200: { description: 'Cache cleared' },
        },
      },
    },
    '/api/v1/admin/audit': {
      get: {
        tags: ['Admin'],
        summary: 'Get audit logs',
        description: 'Get audit logs with filtering',
        operationId: 'getAuditLogs',
        parameters: [
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'action', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: {
          200: { description: 'Audit logs' },
        },
      },
    },

    // =========================================================================
    // Frontend API Endpoints
    // =========================================================================

    '/api/v1/frontend/dashboard': {
      get: {
        tags: ['Frontend'],
        summary: 'Dashboard overview',
        description: 'Get all dashboard statistics in a single call. Optimized for frontend consumption with pre-aggregated data.',
        operationId: 'getDashboard',
        responses: {
          200: {
            description: 'Dashboard data',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DashboardResponse' },
                example: {
                  overview: {
                    totalNamasteCodes: 7358,
                    totalTm2Codes: 728,
                    totalMappings: 150,
                    mappingCoverage: '2.0%',
                  },
                  namasteSystems: [
                    { system: 'ayurveda', count: 2910, label: 'Ayurveda' },
                    { system: 'siddha', count: 1926, label: 'Siddha' },
                    { system: 'unani', count: 2522, label: 'Unani' },
                  ],
                },
              },
            },
          },
        },
      },
    },

    '/api/v1/frontend/codes/namaste': {
      get: {
        tags: ['Frontend'],
        summary: 'Browse NAMASTE codes',
        description: 'Paginated list of NAMASTE codes with filtering and mapping status',
        operationId: 'browseNamasteCodes',
        parameters: [
          { name: 'system', in: 'query', schema: { type: 'string', enum: ['ayurveda', 'siddha', 'unani'] }, description: 'Filter by medical system' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search in code, term, or English name' },
          { name: 'hasMappings', in: 'query', schema: { type: 'string', enum: ['true', 'false'] }, description: 'Filter by mapping status' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: {
          200: {
            description: 'Paginated NAMASTE codes',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NamasteCodesResponse' },
              },
            },
          },
        },
      },
    },

    '/api/v1/frontend/codes/tm2': {
      get: {
        tags: ['Frontend'],
        summary: 'Browse TM2 codes',
        description: 'Paginated list of ICD-11 TM2 codes with category filtering',
        operationId: 'browseTm2Codes',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by TM2 category' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search in code, title, or definition' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: {
          200: {
            description: 'Paginated TM2 codes with categories',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Tm2CodesResponse' },
              },
            },
          },
        },
      },
    },

    '/api/v1/frontend/mappings': {
      get: {
        tags: ['Frontend'],
        summary: 'Browse mappings',
        description: 'Paginated list of NAMASTE to TM2 mappings with advanced filtering',
        operationId: 'browseMappings',
        parameters: [
          { name: 'system', in: 'query', schema: { type: 'string', enum: ['ayurveda', 'siddha', 'unani'] } },
          { name: 'equivalence', in: 'query', schema: { type: 'string', enum: ['EQUIVALENT', 'WIDER', 'NARROWER', 'INEXACT', 'UNMATCHED'] } },
          { name: 'minConfidence', in: 'query', schema: { type: 'number', minimum: 0, maximum: 1 } },
          { name: 'maxConfidence', in: 'query', schema: { type: 'number', minimum: 0, maximum: 1 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['createdAt', 'confidence', 'equivalence'], default: 'createdAt' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: {
          200: {
            description: 'Paginated mappings with full details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MappingsListResponse' },
              },
            },
          },
        },
      },
    },

    '/api/v1/frontend/mappings/{id}': {
      get: {
        tags: ['Frontend'],
        summary: 'Get mapping details',
        description: 'Get full details of a specific mapping including both codes and reasoning',
        operationId: 'getMappingDetails',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Mapping details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MappingDetailResponse' },
              },
            },
          },
          404: { description: 'Mapping not found' },
        },
      },
    },

    '/api/v1/frontend/stats': {
      get: {
        tags: ['Frontend'],
        summary: 'Analytics statistics',
        description: 'Get detailed statistics for charts and analytics dashboards',
        operationId: 'getStats',
        responses: {
          200: {
            description: 'Statistics for charts',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StatsResponse' },
              },
            },
          },
        },
      },
    },

    '/api/v1/frontend/quick-map': {
      post: {
        tags: ['Frontend'],
        summary: 'Quick mapping lookup',
        description: 'Quickly find a NAMASTE code by term and check if it has an existing mapping',
        operationId: 'quickMap',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['term'],
                properties: {
                  term: { type: 'string', description: 'Search term or code', example: 'headache' },
                  system: { type: 'string', enum: ['ayurveda', 'siddha', 'unani'], default: 'ayurveda' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Quick map result',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/QuickMapResponse' },
              },
            },
          },
        },
      },
    },

    '/api/v1/frontend/system-info': {
      get: {
        tags: ['Frontend'],
        summary: 'System information',
        description: 'Get system status, features, and health metrics for the frontend',
        operationId: 'getSystemInfo',
        responses: {
          200: {
            description: 'System information',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SystemInfoResponse' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          timestamp: { type: 'string', format: 'date-time' },
          service: { type: 'string', example: 'namaste-api' },
          version: { type: 'string', example: '1.0.0' },
        },
      },
      MappingRequest: {
        type: 'object',
        required: ['code', 'system'],
        properties: {
          code: { type: 'string', description: 'NAMASTE code', example: 'A-1' },
          system: { type: 'string', enum: ['ayurveda', 'siddha', 'unani'], example: 'unani' },
          term: { type: 'string', description: 'Optional term override' },
          context: { type: 'string', description: 'Additional context for mapping' },
        },
      },
      MappingResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          source: { type: 'string', enum: ['cached', 'ai_workflow'] },
          mapping: {
            type: 'object',
            properties: {
              namasteCode: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  system: { type: 'string' },
                  term: { type: 'string' },
                },
              },
              tm2Code: {
                type: 'object',
                nullable: true,
                properties: {
                  code: { type: 'string' },
                  title: { type: 'string' },
                },
              },
              equivalence: { type: 'string', enum: ['EQUIVALENT', 'WIDER', 'NARROWER', 'INEXACT', 'UNMATCHED'] },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              reasoning: { type: 'string' },
            },
          },
          processingTime: { type: 'integer', description: 'Processing time in ms' },
        },
      },
      BatchRequest: {
        type: 'object',
        required: ['codes'],
        properties: {
          codes: {
            type: 'array',
            items: {
              type: 'object',
              required: ['code', 'system'],
              properties: {
                code: { type: 'string' },
                system: { type: 'string', enum: ['ayurveda', 'siddha', 'unani'] },
              },
            },
            minItems: 1,
            maxItems: 100,
          },
          callbackUrl: { type: 'string', format: 'uri', description: 'Webhook URL for completion notification' },
          saveResults: { type: 'boolean', default: true },
        },
      },
      BatchJobCreated: {
        type: 'object',
        properties: {
          jobId: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'] },
          progress: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              completed: { type: 'integer' },
              percentage: { type: 'integer' },
            },
          },
          estimatedTime: { type: 'string' },
        },
      },
      AutocompleteResponse: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          count: { type: 'integer' },
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                system: { type: 'string' },
                term: { type: 'string' },
                display: { type: 'string' },
                definition: { type: 'string' },
              },
            },
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          requestId: { type: 'string' },
        },
      },
    },
    securitySchemes: {
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for authentication (production only)',
      },
    },
  },
};
