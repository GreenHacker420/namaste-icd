# Implementation Status

## Project: NAMASTE-ICD Intelligent Mapping Engine

**Last Updated**: November 27, 2025 (4:35 PM IST)

---

## 🎯 Project Overview

An AI-powered FHIR R4 terminology microservice that maps India's traditional medicine codes (NAMASTE - Ayurveda, Siddha, Unani) to WHO ICD-11 TM2 codes using LangGraph workflows and Google Gemini.

### Key Technologies
- **Runtime**: Node.js 22+ with ES Modules (functional programming, no classes)
- **Framework**: Hono (lightweight HTTP server)
- **Database**: PostgreSQL 15+ with Prisma 7 (requires adapter pattern)
- **LLM**: Google Gemini via LangChain.js (`@langchain/google-genai`)
- **Embeddings**: `text-embedding-004` (768 dimensions)
- **Orchestration**: LangGraph.js for multi-step AI workflows
- **External API**: WHO ICD-11 API v2 (OAuth 2.0)

---

## ✅ Completed Components

### 1. Project Setup
- [x] Node.js 22+ with ES Modules
- [x] Functional programming approach (no classes)
- [x] Package.json with all dependencies
- [x] Environment configuration (.env)
- [x] Git ignore patterns

### 2. Database Layer
- [x] PostgreSQL connection
- [x] Prisma 7 ORM with adapter pattern
- [x] Complete schema (5 models)
  - [x] NamasteCode
  - [x] Tm2Code
  - [x] Mapping
  - [x] Embedding
  - [x] AuditLog
- [x] Database migrations

### 3. Configuration
- [x] Environment variable loading
- [x] Configuration validation
- [x] Pino logger with pretty printing
- [x] Multi-environment support

### 4. WHO ICD-11 API Client
- [x] OAuth 2.0 authentication
- [x] Token caching (1 hour TTL)
- [x] API request wrapper
- [x] Error handling
- [x] Connection testing

### 5. LLM Integration (LangChain)
- [x] Gemini Flash model (fast)
- [x] Gemini Pro model (reasoning)
- [x] text-embedding-004 embeddings
- [x] Biomedical embedding configuration
- [x] Query vs Document task types

### 6. HTTP Server (Hono)
- [x] CORS middleware
- [x] Request logging
- [x] Pretty JSON responses
- [x] Request ID tracking
- [x] Error handling
- [x] 404 handler
- [x] Graceful shutdown

### 7. API Routes
- [x] Health check routes
  - [x] GET /health
  - [x] GET /health/ready
  - [x] GET /health/live
- [x] FHIR routes
  - [x] GET /fhir/metadata
  - [x] GET /fhir/CodeSystem
  - [x] GET /fhir/CodeSystem/:id
  - [x] GET /fhir/CodeSystem/$lookup
  - [x] POST /fhir/ConceptMap/$translate
  - [x] GET /fhir/ValueSet/$expand
- [x] Mapping routes
  - [x] POST /api/v1/mapping
  - [x] POST /api/v1/mapping/batch
  - [x] GET /api/v1/mapping
  - [x] GET /api/v1/mapping/:id
  - [x] PATCH /api/v1/mapping/:id/validate
  - [x] GET /api/v1/mapping/stats/summary
- [x] Autocomplete routes
  - [x] GET /api/v1/autocomplete/namaste
  - [x] GET /api/v1/autocomplete/tm2
  - [x] GET /api/v1/autocomplete/all

### 8. Documentation
- [x] Swagger UI at /docs
- [x] OpenAPI 3.0 spec at /openapi.json
- [x] README.md
- [x] ICD-11 API Reference
- [x] Architecture documentation

### 9. Data Import
- [x] NAMASTE JSON loader
- [x] Import script (7,358 codes imported)
  - [x] Ayurveda: 2,910 codes
  - [x] Siddha: 1,926 codes
  - [x] Unani: 2,522 codes

---

## ✅ Recently Completed

### TM2 Data Fetching
- [x] WHO ICD-11 API v2 integration
- [x] OAuth 2.0 authentication with token caching
- [x] Foundation entity search for TM2 codes
- [x] Parse and store TM2 data (728 codes imported)
- [x] Category classification for TM2 codes
- [x] HTML tag cleanup in titles

---

## ✅ Recently Completed

### LangGraph Mapping Workflow (`src/workflows/mapping-graph.js`)
- [x] State annotation definition (MappingState)
- [x] Preprocessing node - text normalization, prioritizes English definitions
- [x] Embedding node - generates embeddings via `text-embedding-004`
- [x] Semantic search node - PostgreSQL full-text + ILIKE fallback
- [x] AI validation node - Gemini Pro reasoning with JSON output
- [x] Conditional routing - high confidence skips AI validation
- [x] Workflow compilation with LangGraph StateGraph
- [x] Integration with `/api/v1/mapping` route

---

## ⚠️ Known Issues & Limitations

### 1. TM2 Code Quality
- **Issue**: WHO ICD-11 API search returns entity IDs, not actual TM2 codes (SK00-ST2Z)
- **Current State**: 728 TM2 entities stored with generated codes like `TM2-ENTITY-{id}`
- **Impact**: Codes don't match official ICD-11 TM2 format
- **Workaround**: Using entity titles for semantic matching
- **Solution Needed**: Direct access to ICD-11 TM2 linearization or manual code mapping

### 2. Semantic Search Matching
- **Issue**: NAMASTE codes use native scripts (Sanskrit, Tamil, Arabic) which don't match English TM2 titles
- **Current State**: Search relies on `shortDefinition` field (English) for matching
- **Impact**: Codes without English definitions may not find matches
- **Improvement Made**: Preprocessing now prioritizes English content

### 3. Mapping Accuracy
- **Issue**: Current text-based search has limited accuracy
- **Current State**: Many mappings return "unmapped" due to vocabulary mismatch
- **Solution Needed**: 
  - pgvector for true semantic similarity search
  - Pre-computed embeddings for all codes
  - Training data for fine-tuning

### 4. Gemini API Rate Limits
- **Issue**: Gemini 2.5 Pro has strict rate limits on free tier
- **Current State**: Using Gemini Flash instead (faster, no rate limits)
- **Impact**: Slightly less accurate reasoning, but much faster
- **Solution**: Upgrade to paid tier for production

### 5. Processing Time
- **Issue**: AI validation takes 15-25 seconds per mapping
- **Current State**: Acceptable for single mappings, slow for batch
- **Solution Needed**:
  - Pre-compute embeddings for all codes
  - Cache frequent mappings
  - Parallel processing for batch requests

---

## ✅ Recently Implemented (Nov 28, 2025)

### Vector Search Infrastructure
- [x] `src/services/vector-search.js` - pgvector integration
- [x] `initializeVectorSearch()` - Creates extension and indexes
- [x] `batchGenerateEmbeddings()` - Batch embedding generation
- [x] `searchTm2BySimilarity()` - Cosine similarity search
- [x] HNSW index configuration (m=16, ef_construction=64)

### Batch Processing
- [x] `src/services/batch-processor.js` - In-memory job queue
- [x] `POST /api/v1/mapping/batch/async` - Create async job
- [x] `GET /api/v1/mapping/batch/:jobId` - Job status
- [x] `GET /api/v1/mapping/batch/:jobId/results` - Job results
- [x] `DELETE /api/v1/mapping/batch/:jobId` - Cancel job
- [x] Progress tracking with events
- [x] Webhook callbacks on completion

### Audit & Compliance
- [x] `src/middleware/audit.js` - FHIR AuditEvent logging
- [x] Automatic request/response logging
- [x] `GET /api/v1/admin/audit` - Query audit logs
- [x] `GET /api/v1/admin/audit/export` - Export as FHIR Bundle
- [x] DISHA-compliant audit trail

### Performance Optimization
- [x] `src/middleware/cache.js` - LRU cache (mappings, embeddings, search)
- [x] `src/middleware/rate-limiter.js` - Token bucket rate limiting
- [x] `src/middleware/metrics.js` - Prometheus metrics
- [x] Cache stats endpoint: `GET /api/v1/admin/cache/stats`
- [x] Rate limit stats: `GET /api/v1/admin/rate-limits`

### Monitoring & Observability
- [x] `GET /metrics` - Prometheus format metrics
- [x] Request latency histogram
- [x] Mapping success/failure counters
- [x] Embedding generation metrics
- [x] AI request tracking

### Documentation
- [x] `docs/DEVELOPER-GUIDE.md` - Complete developer guide
- [x] `docs/ADR/001-tech-stack.md` - Technology decisions
- [x] `docs/ADR/002-mapping-workflow.md` - Workflow design
- [x] `docs/RUNBOOK.md` - Operations runbook
- [x] `src/config/openapi.js` - Complete OpenAPI 3.0 spec

### Admin Endpoints
- [x] `POST /api/v1/admin/vector/init` - Initialize pgvector
- [x] `POST /api/v1/admin/embeddings/generate` - Generate embeddings
- [x] `GET /api/v1/admin/embeddings/stats` - Embedding coverage
- [x] `POST /api/v1/admin/cache/clear` - Clear caches
- [x] `GET /api/v1/admin/info` - System info

---

## ⏳ Remaining Tasks

### 1. Vector Search Activation
- [ ] Run `POST /api/v1/admin/vector/init` to create pgvector extension
- [ ] Run `POST /api/v1/admin/embeddings/generate` to pre-compute embeddings
- [ ] Update workflow to use vector search instead of text search

### 2. Authentication & Authorization
- [ ] API key management
- [ ] ABHA token validation (ABDM integration)
- [ ] Role-based access control
- [ ] JWT token support

### 3. Testing
- [ ] Unit tests for all services
- [ ] Integration tests for API endpoints
- [ ] Mapping accuracy tests with ground truth
- [ ] Load testing with k6/Artillery

### 4. Deployment
- [ ] Docker containerization
- [ ] Docker Compose for local dev
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Production configuration

---

## 📊 Code Statistics

| Component | Files | Lines (approx) |
|-----------|-------|----------------|
| Config | 3 | 500 |
| Database | 2 | 120 |
| Middleware | 5 | 600 |
| Services | 5 | 800 |
| Routes | 5 | 800 |
| Workflows | 1 | 500 |
| Scripts | 2 | 400 |
| Docs | 6 | 800 |
| **Total** | **29** | **~4,520** |

---

## 🗄️ Database Statistics

| Table | Records | Notes |
|-------|---------|-------|
| namaste_codes | 7,358 | Ayurveda: 2,910 / Siddha: 1,926 / Unani: 2,522 |
| tm2_codes | 728 | Entity-based codes from WHO API search |
| mappings | 0 | Populated on-demand via AI workflow |
| embeddings | 0 | Pending pgvector implementation |
| audit_logs | 0 | Ready for use |

### Data Quality Notes
- **NAMASTE codes**: Complete with terms, definitions, native scripts
- **TM2 codes**: Partial - entity titles only, no official SK/SL/SM codes
- **Mappings**: Generated dynamically, stored after AI validation

---

## 📁 Project Structure

```
namaste-api/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── ICD11-API-REFERENCE.md
│   └── IMPLEMENTATION-STATUS.md
├── prisma/
│   └── schema.prisma
├── scripts/
│   ├── import-namaste.js      ✅
│   └── fetch-tm2.js           🔄
├── src/
│   ├── config/
│   │   ├── index.js           ✅ Environment config
│   │   └── logger.js          ✅ Pino logger
│   ├── db/
│   │   ├── client.js          ✅ Prisma client with pg adapter
│   │   ├── index.js           ✅ DB helpers
│   │   └── schema.sql         ✅ Raw SQL schema
│   ├── routes/
│   │   ├── autocomplete.js    ✅ Code search endpoints
│   │   ├── fhir.js            ✅ FHIR R4 operations
│   │   ├── health.js          ✅ Health checks
│   │   └── mapping.js         ✅ AI mapping endpoints
│   ├── services/
│   │   ├── icd11-api.js       ✅ WHO API client (OAuth 2.0)
│   │   ├── llm.js             ✅ Gemini + embeddings
│   │   └── namaste-loader.js  ✅ JSON/XLS loader
│   ├── workflows/
│   │   └── mapping-graph.js   ✅ LangGraph workflow
│   └── index.js               ✅ Main entry point
├── data/
│   └── tm2/                   🔄
├── .env                       ✅
├── .env.example               ✅
├── .gitignore                 ✅
├── package.json               ✅
├── prisma.config.ts           ✅
└── README.md                  ✅
```

Legend: ✅ Complete | 🔄 In Progress | ⏳ Pending

---

## 🎯 Next Steps (Priority Order)

1. **Improve TM2 Data Quality** - Get actual SK/SL/SM codes from WHO or manual mapping
2. **Implement pgvector** - True semantic similarity search with embeddings
3. **Pre-compute Embeddings** - Generate and store embeddings for all codes
4. **Add Tests** - Unit and integration tests
5. **Deploy** - Docker + production config

---

## 📝 Notes for AI Assistants

### Context
This project maps India's traditional medicine codes (NAMASTE - Ayurveda, Siddha, Unani) to WHO ICD-11 TM2 codes using AI-powered semantic matching.

### Key Files to Understand
1. `src/index.js` - Main entry point, Hono server setup
2. `src/workflows/mapping-graph.js` - **LangGraph workflow** (core mapping logic)
3. `src/services/icd11-api.js` - WHO API client (OAuth 2.0)
4. `src/services/llm.js` - LangChain Gemini + embeddings
5. `src/routes/mapping.js` - Mapping API endpoints
6. `prisma/schema.prisma` - Database models

### Important Patterns
- **Functional only** - No classes, pure functions
- **ES Modules** - Use `import`/`export`
- **Prisma 7** - Requires adapter pattern: `new PrismaClient({ adapter: new PrismaPg(pool) })`
- **LangChain** - Use `@langchain/google-genai` for Gemini
- **LangGraph** - Use `@langchain/langgraph` for workflows

### API Credentials (in .env)
- `WHO_ICD_CLIENT_ID` / `WHO_ICD_CLIENT_SECRET` - WHO API (OAuth 2.0)
- `GOOGLE_API_KEY` - Gemini LLM and embeddings
- `DATABASE_URL` - PostgreSQL connection string

### Running the Server
```bash
cd /Users/harsh/Desktop/namaste/namaste-api
npm run dev  # Development with hot reload
npm start    # Production
```

### Testing the Mapping API
```bash
# Map a NAMASTE code to TM2
curl -X POST http://localhost:3000/api/v1/mapping \
  -H "Content-Type: application/json" \
  -d '{"code": "A-1", "system": "unani"}'

# Search NAMASTE codes
curl "http://localhost:3000/api/v1/autocomplete/namaste?q=headache"

# Search TM2 codes
curl "http://localhost:3000/api/v1/autocomplete/tm2?q=cephalalgia"
```

### Current Workflow Flow
```
POST /api/v1/mapping
    ↓
Check cache (existing mapping in DB)
    ↓ (miss)
LangGraph Workflow:
    1. Preprocess → normalize text, prioritize English
    2. Embed → generate query embedding
    3. Search → PostgreSQL full-text + ILIKE
    4. Route → high confidence? skip AI : validate
    5. Validate → Gemini Flash reasoning
    ↓
Store mapping in DB
    ↓
Return result
```

### What's Working ✅
- ✅ Server starts at http://localhost:3000
- ✅ NAMASTE codes searchable (7,358 codes across 3 systems)
- ✅ TM2 codes searchable (728 entities from WHO API)
- ✅ LangGraph workflow executes end-to-end
- ✅ Gemini Flash AI validation with reasoning
- ✅ Mappings stored in PostgreSQL database
- ✅ FHIR R4 endpoints functional (CodeSystem, ValueSet, ConceptMap)
- ✅ Swagger UI documentation at /docs
- ✅ Health checks and status endpoints
- ✅ WHO ICD-11 API OAuth 2.0 authentication

### What Needs Improvement ⚠️
- ⚠️ TM2 codes are entity-based (TM2-ENTITY-xxx), not official SK/SL/SM codes
- ⚠️ Text-based search instead of vector similarity
- ⚠️ No pre-computed embeddings
- ⚠️ AI validation takes 15-25 seconds per mapping
- ⚠️ No caching layer for frequent queries
- ⚠️ No batch processing support yet

### Example Successful Mapping
```json
{
  "success": true,
  "mapping": {
    "namasteCode": {
      "code": "A-1",
      "system": "UNANI",
      "term": "Bayḍa-o-Khūdha"
    },
    "tm2Code": {
      "code": "TM2-ENTITY-1456177627",
      "title": "Headache due to internal Bukhārāt disorder (TM2)"
    },
    "equivalence": "NARROWER",
    "confidence": 0.85,
    "reasoning": "The NAMASTE term describes organic headache..."
  }
}
```
