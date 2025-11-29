# NAMASTE-ICD Architecture

## System Overview

The NAMASTE-ICD Intelligent Mapping Engine is a full-stack application designed to bridge Traditional Medicine (Ayurveda, Siddha, Unani) with the WHO ICD-11 TM2 classification system. It leverages modern web technologies and advanced AI models to provide a robust terminology service and mapping tool.

## High-Level Architecture

```mermaid
graph TD
    User[User] -->|HTTPS| CDN[CDN / Edge]
    CDN -->|Next.js App| FE[Frontend (Namaste UI)]
    
    subgraph "Client Side"
        FE
    end
    
    FE -->|REST API| API[Backend API (Namaste API)]
    
    subgraph "Server Side"
        API
        Worker[Background Jobs]
    end
    
    API -->|Query/Mutation| DB[(PostgreSQL)]
    API -->|Vector Search| DB
    
    API -->|Generative AI| AI[Google Gemini / Vertex AI]
    
    subgraph "Data & AI"
        DB
        AI
    end
```

## Component Details

### 1. Frontend (`namaste-ui`)
- **Framework**: Next.js 16 (App Router)
- **Language**: JavaScript / React 19
- **Styling**: Tailwind CSS, Framer Motion
- **State Management**: React Query (TanStack Query)
- **Key Features**:
  - Semantic Search Interface
  - Interactive Mapping Dashboard
  - Hierarchical Browser for ICD-11 and NAMASTE codes
  - Real-time Validation UI

### 2. Backend (`namaste-api`)
- **Runtime**: Node.js (>=22.0.0)
- **Framework**: Hono (Lightweight, Edge-compatible web framework)
- **Language**: JavaScript (ES Modules)
- **Validation**: Zod
- **Documentation**: Swagger UI / OpenAPI (via `@hono/zod-openapi`)
- **Key Responsibilities**:
  - API Endpoints for Search, Mapping, and Code Management
  - Orchestration of AI Mapping Workflows
  - Authentication & Authorization (planned)

### 3. Database Layer
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Schema**:
  - `NamasteCode`: Stores Ayurveda, Siddha, Unani terms.
  - `Tm2Code`: Stores WHO ICD-11 TM2 terms.
  - `Mapping`: Stores relationships (Equivalent, Wider, Narrower) with confidence scores.
  - `Embedding`: Stores vector embeddings for semantic search.
  - `AuditLog`: Tracks user actions and system events.

### 4. AI & Intelligence Layer
- **LLM**: Google Gemini Pro / Flash
- **Platform**: Vertex AI / Google AI Studio
- **Framework**: LangChain & LangGraph
- **Functions**:
  - **Embedding Generation**: Converting medical terms to vector space.
  - **Semantic Search**: Finding relevant codes based on meaning, not just keywords.
  - **AI Judge**: Evaluating potential mappings and assigning confidence scores.
  - **Reasoning**: Providing explanations for why a mapping was chosen.

## Data Flow

### Mapping Pipeline
1. **Ingestion**: NAMASTE and TM2 codes are imported from Excel/CSV sources.
2. **Embedding**: Text descriptions are sent to the embedding model to generate vector representations.
3. **Candidate Retrieval**: For a given NAMASTE code, the system queries the vector store to find the top-k most similar TM2 codes.
4. **AI Evaluation**: An LLM "Judge" analyzes the candidates against the source term, considering definitions and context.
5. **Scoring**: The LLM assigns a confidence score and equivalence type (e.g., "Equivalent", "Narrower").
6. **Storage**: The best mapping is stored in the database with its reasoning.
7. **Human Review**: Domain experts review low-confidence mappings via the UI.

## Deployment Architecture

- **Unified Deployment**: The **Frontend** is built as a static export and served by the **Backend** (Hono) on **Vercel**.
- **Database**: Managed PostgreSQL (e.g., Supabase, Neon) accessible via connection string.
