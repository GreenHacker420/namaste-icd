# NAMASTE-ICD Architecture

## System Overview

The NAMASTE-ICD Intelligent Mapping Engine is a FHIR R4-compliant terminology microservice that maps India's traditional medicine codes (NAMASTE) to WHO ICD-11 TM2 codes using AI-powered semantic matching.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NAMASTE-ICD Mapping Engine                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │   Client    │───▶│   Hono      │───▶│   Routes    │───▶│  Services   │   │
│  │  (EMR/EHR)  │    │   Server    │    │             │    │             │   │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘   │
│                                              │                   │          │
│                                              ▼                   ▼          │
│                     ┌────────────────────────────────────────────────────┐  │
│                     │                    LangGraph                       │  │
│                     │              Mapping Workflow                      │  │
│                     │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │  │
│                     │  │Preprocess│─▶│ Semantic │─▶│ Validate │          │  │
│                     │  │   Node   │  │  Search  │  │   Node   │          │  │
│                     │  └──────────┘  └──────────┘  └──────────┘          │  │
│                     └────────────────────────────────────────────────────┘  │
│                                              │                              │
│         ┌────────────────────────────────────┼────────────────────────┐     │
│         ▼                                    ▼                        ▼     │
│  ┌─────────────┐                    ┌─────────────┐           ┌──────────┐  │
│  │ PostgreSQL  │                    │   Gemini    │           │ WHO ICD  │  │
│  │  (Prisma)   │                    │   + Embed   │           │   API    │  │
│  └─────────────┘                    └─────────────┘           └──────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Runtime** | Node.js 22+ | ES Modules, functional programming |
| **Framework** | Hono | Ultra-lightweight HTTP server |
| **Database** | PostgreSQL + Prisma 7 | Persistent storage with type-safe ORM |
| **LLM** | Google Gemini (via LangChain) | AI reasoning and validation |
| **Embeddings** | text-embedding-004 | Semantic similarity (768 dims) |
| **Orchestration** | LangGraph.js | Multi-step AI workflow |
| **External API** | WHO ICD-11 API v2 | TM2 code lookup and search |

## Data Flow

### 1. Code Mapping Request

```
Client Request
     │
     ▼
┌─────────────────┐
│  POST /mapping  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Check Cache    │────▶│  Return Cached  │
│  (PostgreSQL)   │ hit │    Mapping      │
└────────┬────────┘     └─────────────────┘
         │ miss
         ▼
┌─────────────────┐
│  LangGraph      │
│  Workflow       │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│           Mapping Cascade               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │ Level 1 │─▶│ Level 2 │─▶│ Level 3 │  │
│  │Preproc. │  │Semantic │  │   AI    │  │
│  └─────────┘  └─────────┘  └─────────┘  │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────┐     ┌─────────────────┐
│  Store Mapping  │────▶│ Return Result   │
│  (PostgreSQL)   │     │   to Client     │
└─────────────────┘     └─────────────────┘
```

### 2. Mapping Cascade Levels

| Level | Method | Confidence | Description |
|-------|--------|------------|-------------|
| **1** | Preprocessing | - | Normalize text, extract features |
| **2** | Semantic Search | 0.7-0.9 | Embedding similarity matching |
| **3** | AI Validation | 0.8-0.99 | Gemini Pro reasoning |
| **4** | Human Review | 1.0 | Expert validation (optional) |

## Database Schema

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  NamasteCode    │     │    Mapping      │     │    Tm2Code      │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id              │     │ id              │     │ id              │
│ code            │◀────│ namasteCodeId   │     │ code            │
│ system          │     │ tm2CodeId       │────▶│ title           │
│ term            │     │ equivalence     │     │ definition      │
│ termNormalized  │     │ confidence      │     │ category        │
│ nativeScript    │     │ mappingSource   │     │ parentCode      │
│ shortDefinition │     │ validationStatus│     │ synonyms[]      │
│ longDefinition  │     │ reasoning       │     │ inclusions[]    │
│ englishName     │     │ metadata        │     │ exclusions[]    │
│ searchableText  │     └─────────────────┘     │ metadata        │
│ metadata        │                             └─────────────────┘
└─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│   Embedding     │     │   AuditLog      │
├─────────────────┤     ├─────────────────┤
│ id              │     │ id              │
│ sourceType      │     │ action          │
│ sourceCode      │     │ resourceType    │
│ sourceSystem    │     │ resourceId      │
│ embedding[]     │     │ userId          │
│ modelName       │     │ requestId       │
└─────────────────┘     │ metadata        │
                        └─────────────────┘
```

## FHIR R4 Compliance

### Supported Resources

| Resource | Operations | Description |
|----------|------------|-------------|
| **CodeSystem** | read, search | NAMASTE and TM2 code systems |
| **ValueSet** | $expand | Searchable code sets |
| **ConceptMap** | $translate | NAMASTE ↔ TM2 mappings |
| **Parameters** | - | Operation responses |

### FHIR Operations

```
GET  /fhir/metadata              → CapabilityStatement
GET  /fhir/CodeSystem            → Bundle of CodeSystems
GET  /fhir/CodeSystem/:id        → Single CodeSystem
GET  /fhir/CodeSystem/$lookup    → Code details
POST /fhir/ConceptMap/$translate → Translate code
GET  /fhir/ValueSet/$expand      → Expand with filter
```

## LangGraph Workflow

```javascript
// Mapping workflow state
const MappingState = Annotation.Root({
  namasteCode: Annotation<NamasteCode>,
  namasteEmbedding: Annotation<number[]>,
  tm2Candidates: Annotation<Tm2Candidate[]>,
  selectedMapping: Annotation<Mapping>,
  confidence: Annotation<number>,
  reasoning: Annotation<string>,
});

// Workflow graph
const workflow = new StateGraph(MappingState)
  .addNode("preprocess", preprocessNode)
  .addNode("embed", embedNode)
  .addNode("search", semanticSearchNode)
  .addNode("validate", aiValidationNode)
  .addEdge("__start__", "preprocess")
  .addEdge("preprocess", "embed")
  .addEdge("embed", "search")
  .addConditionalEdges("search", routeByConfidence, {
    high: "__end__",
    low: "validate",
  })
  .addEdge("validate", "__end__")
  .compile();
```

## API Endpoints

### Health & Status
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness with dependencies
- `GET /health/live` - Liveness probe

### FHIR Terminology
- `GET /fhir/metadata` - CapabilityStatement
- `GET /fhir/CodeSystem` - List code systems
- `GET /fhir/CodeSystem/$lookup` - Lookup code
- `POST /fhir/ConceptMap/$translate` - Translate
- `GET /fhir/ValueSet/$expand` - Expand ValueSet

### Mapping
- `POST /api/v1/mapping` - Map single code
- `POST /api/v1/mapping/batch` - Batch mapping
- `GET /api/v1/mapping` - List mappings
- `GET /api/v1/mapping/:id` - Get mapping
- `PATCH /api/v1/mapping/:id/validate` - Validate
- `GET /api/v1/mapping/stats/summary` - Statistics

### Autocomplete
- `GET /api/v1/autocomplete/namaste` - Search NAMASTE
- `GET /api/v1/autocomplete/tm2` - Search TM2
- `GET /api/v1/autocomplete/all` - Combined search

### Documentation
- `GET /docs` - Swagger UI
- `GET /openapi.json` - OpenAPI spec

## Security

### Authentication
- OAuth 2.0 for WHO ICD-11 API
- API keys for client access (planned)
- ABHA token support (planned)

### Audit Logging
- All mapping operations logged
- Request/response tracking
- User attribution

## Performance

### Caching Strategy
- PostgreSQL for persistent cache
- In-memory LRU for hot paths
- Token caching (1 hour TTL)

### Optimization
- Batch embedding generation
- Connection pooling
- Lazy initialization

## Deployment

### Requirements
- Node.js 22+
- PostgreSQL 15+
- Google Cloud API key
- WHO ICD-11 API credentials

### Environment Variables
```env
DATABASE_URL=postgresql://...
WHO_ICD_CLIENT_ID=...
WHO_ICD_CLIENT_SECRET=...
GOOGLE_API_KEY=...
```

## Future Enhancements

1. **Vector Database** - pgvector for embedding storage
2. **Redis Cache** - Distributed caching
3. **Batch Processing** - Async job queue
4. **Multi-language** - Hindi, Tamil, Arabic support
5. **ABDM Integration** - ABHA token validation
