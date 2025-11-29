# ADR 001: Technology Stack Selection

## Status
Accepted

## Date
2025-11-28

## Context
We need to build an AI-powered terminology mapping service that:
- Maps India's NAMASTE codes to WHO ICD-11 TM2
- Provides FHIR R4 compliant APIs
- Handles semantic similarity search
- Supports batch processing

## Decision

### Runtime: Node.js 22+ with ES Modules
**Rationale:**
- Native ES module support
- Excellent async/await performance
- Rich ecosystem for AI/ML libraries
- LangChain.js compatibility

### Framework: Hono
**Rationale:**
- Lightweight and fast
- TypeScript-first design
- Built-in middleware support
- Easy to test

**Alternatives Considered:**
- Express.js: Too heavy, legacy patterns
- Fastify: Good but more complex
- Koa: Less middleware ecosystem

### Database: PostgreSQL + Prisma 7
**Rationale:**
- pgvector extension for embeddings
- Prisma 7 with adapter pattern
- Strong ACID compliance
- JSON support for FHIR resources

### LLM: Google Gemini via LangChain
**Rationale:**
- Cost-effective (Flash model)
- Good reasoning capabilities
- Native JSON output
- LangChain integration

**Alternatives Considered:**
- OpenAI GPT-4: More expensive
- Claude: Limited availability
- Local LLMs: Insufficient quality

### Workflow: LangGraph.js
**Rationale:**
- State machine for complex flows
- Conditional routing
- Easy debugging
- LangChain ecosystem

### Embeddings: text-embedding-004
**Rationale:**
- 768 dimensions (efficient)
- Good semantic quality
- Fast inference
- Free tier available

## Consequences

### Positive
- Modern, maintainable codebase
- Good performance characteristics
- Strong AI capabilities
- FHIR compliance achievable

### Negative
- Prisma 7 adapter pattern is new
- pgvector requires PostgreSQL 15+
- Gemini rate limits on free tier

### Risks
- Vendor lock-in to Google AI
- pgvector scaling for large datasets
