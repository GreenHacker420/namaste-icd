# ADR 002: AI Mapping Workflow Design

## Status
Accepted

## Date
2025-11-28

## Context
We need to map NAMASTE codes (Sanskrit/Tamil/Arabic terms) to ICD-11 TM2 codes (English medical terminology). This requires:
- Semantic understanding across languages
- Confidence scoring
- Equivalence determination (FHIR ConceptMap)
- Explainable reasoning

## Decision

### Use LangGraph for Workflow Orchestration

```
Preprocess → Embed → Search → Route → Validate → Store
```

### Node Design

1. **Preprocess Node**
   - Normalize text (lowercase, trim)
   - Prioritize English content (shortDefinition, englishName)
   - Extract features for search

2. **Embed Node**
   - Generate 768-dim embedding via text-embedding-004
   - Cache embeddings for reuse

3. **Search Node**
   - Primary: PostgreSQL full-text search
   - Fallback: ILIKE keyword search
   - Future: pgvector cosine similarity

4. **Route Node**
   - High confidence (>0.9): Skip AI validation
   - Low confidence: Use AI validation
   - No candidates: Return unmapped

5. **Validate Node**
   - Gemini Flash for reasoning
   - JSON structured output
   - FHIR equivalence codes

### Equivalence Types (FHIR ConceptMap)
- `EQUIVALENT`: Exact semantic match
- `WIDER`: TM2 is broader
- `NARROWER`: TM2 is more specific
- `INEXACT`: Related but not equivalent
- `UNMATCHED`: No suitable match

## Consequences

### Positive
- Explainable AI decisions
- Cached mappings for speed
- Flexible routing logic
- FHIR compliance

### Negative
- 15-25 second latency for new mappings
- Gemini rate limits
- Text search less accurate than vector

### Mitigations
- Pre-compute embeddings
- Use Gemini Flash (faster, no limits)
- Implement pgvector for production
