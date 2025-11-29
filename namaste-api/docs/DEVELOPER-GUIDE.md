# NAMASTE-ICD Developer Guide

## Quick Start

### Prerequisites
- Node.js 22+
- PostgreSQL 15+ with pgvector extension
- Google Cloud API key (for Gemini)
- WHO ICD-11 API credentials

### Installation

```bash
cd namaste-api
npm install
cp .env.example .env
# Edit .env with your credentials
```

### Database Setup

```bash
# Create database
createdb namaste_icd

# Run migrations
npx prisma migrate deploy

# Import NAMASTE codes
npm run import:namaste

# Fetch TM2 codes from WHO API
npm run fetch:tm2
```

### Running the Server

```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

---

## Architecture

### Tech Stack
| Component | Technology |
|-----------|------------|
| Runtime | Node.js 22+ (ES Modules) |
| Framework | Hono |
| Database | PostgreSQL + Prisma 7 |
| Vector Search | pgvector |
| LLM | Google Gemini (via LangChain) |
| Embeddings | text-embedding-004 |
| Workflow | LangGraph.js |

### Project Structure

```
src/
├── config/           # Configuration
│   ├── index.js      # Environment config
│   ├── logger.js     # Pino logger
│   └── openapi.js    # OpenAPI spec
├── db/               # Database
│   ├── client.js     # Prisma client
│   └── schema.sql    # Raw SQL
├── middleware/       # Middleware
│   ├── audit.js      # FHIR AuditEvent logging
│   ├── cache.js      # LRU cache
│   ├── metrics.js    # Prometheus metrics
│   └── rate-limiter.js
├── routes/           # API routes
│   ├── admin.js      # Admin endpoints
│   ├── autocomplete.js
│   ├── fhir.js       # FHIR R4 operations
│   ├── health.js
│   └── mapping.js    # AI mapping
├── services/         # Business logic
│   ├── batch-processor.js
│   ├── icd11-api.js  # WHO API client
│   ├── llm.js        # Gemini integration
│   └── vector-search.js
├── workflows/        # LangGraph
│   └── mapping-graph.js
└── index.js          # Entry point
```

---

## API Endpoints

### Health & Monitoring
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness with dependencies
- `GET /metrics` - Prometheus metrics

### FHIR R4
- `GET /fhir/metadata` - CapabilityStatement
- `GET /fhir/CodeSystem` - List code systems
- `GET /fhir/CodeSystem/$lookup` - Lookup code
- `POST /fhir/ConceptMap/$translate` - Translate code
- `GET /fhir/ValueSet/$expand` - Expand ValueSet

### Mapping
- `POST /api/v1/mapping` - Map single code
- `GET /api/v1/mapping` - List mappings
- `POST /api/v1/mapping/batch` - Sync batch mapping
- `POST /api/v1/mapping/batch/async` - Async batch job
- `GET /api/v1/mapping/batch/:jobId` - Job status
- `GET /api/v1/mapping/batch/:jobId/results` - Job results

### Autocomplete
- `GET /api/v1/autocomplete/namaste` - Search NAMASTE
- `GET /api/v1/autocomplete/tm2` - Search TM2
- `GET /api/v1/autocomplete/all` - Search both

### Admin
- `POST /api/v1/admin/vector/init` - Initialize pgvector
- `POST /api/v1/admin/embeddings/generate` - Generate embeddings
- `GET /api/v1/admin/embeddings/stats` - Embedding stats
- `GET /api/v1/admin/cache/stats` - Cache stats
- `POST /api/v1/admin/cache/clear` - Clear caches
- `GET /api/v1/admin/audit` - Audit logs

---

## Configuration

### Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/namaste_icd

# WHO ICD-11 API
WHO_ICD_CLIENT_ID=your_client_id
WHO_ICD_CLIENT_SECRET=your_client_secret

# Google AI
GOOGLE_API_KEY=your_api_key

# LangSmith (optional)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_key
LANGCHAIN_PROJECT=namaste-icd
```

---

## LangGraph Workflow

The mapping workflow uses LangGraph for orchestration:

```
┌─────────────┐
│   START     │
└──────┬──────┘
       ▼
┌─────────────┐
│ Preprocess  │ Normalize text, extract features
└──────┬──────┘
       ▼
┌─────────────┐
│   Embed     │ Generate query embedding
└──────┬──────┘
       ▼
┌─────────────┐
│   Search    │ Find TM2 candidates
└──────┬──────┘
       ▼
   ┌───┴───┐
   │ Route │
   └───┬───┘
  High │ Low
   ▼   │   ▼
┌─────┐│┌─────────┐
│Skip │││Validate │ AI reasoning
└──┬──┘│└────┬────┘
   │   │     │
   └───┴─────┘
       ▼
┌─────────────┐
│    END      │ Return mapping
└─────────────┘
```

---

## Coding Standards

### Functional Programming
- No classes, only pure functions
- Use factory functions for stateful modules
- Prefer immutable data

### ES Modules
```javascript
// ✅ Correct
import { something } from './module.js';
export const myFunction = () => {};

// ❌ Wrong
const something = require('./module');
module.exports = myFunction;
```

### Prisma 7 Adapter Pattern
```javascript
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

---

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm test -- --grep "mapping"
```

---

## Deployment

### Docker

```bash
docker build -t namaste-api .
docker run -p 3000:3000 --env-file .env namaste-api
```

### Docker Compose

```bash
docker-compose up -d
```

---

## Troubleshooting

### Common Issues

1. **Prisma adapter error**
   - Ensure you're using Prisma 7+
   - Check DATABASE_URL format

2. **WHO API 401**
   - Verify client credentials
   - Token may have expired

3. **Gemini rate limit**
   - Using Flash instead of Pro
   - Add delays between requests

4. **pgvector not found**
   - Run: `CREATE EXTENSION vector;`
   - Check PostgreSQL version (15+)
