# NAMASTE-ICD Intelligent Mapping Engine

> AI-powered FHIR R4 terminology microservice for mapping India's traditional medicine codes to WHO ICD-11

[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![FHIR](https://img.shields.io/badge/FHIR-R4-blue.svg)](https://hl7.org/fhir/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🎯 What is This?

This project creates an intelligent mapping system between:

- **NAMASTE** (National AYUSH Morbidity and Standardized Terminologies Electronic Portal)
  - Ayurveda: 2,910 codes (Sanskrit)
  - Siddha: 1,926 codes (Tamil)
  - Unani: 2,522 codes (Arabic/Urdu)

- **WHO ICD-11 TM2** (Traditional Medicine Module 2)
  - 529 disorder categories
  - 196 pattern codes
  - Code range: SK00-ST2Z

## 🏗️ Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    NAMASTE-ICD Engine                       │
├─────────────────────────────────────────────────────────────┤
│  Client → Hono Server → Routes → LangGraph Workflow         │
│                                        ↓                    │
│              ┌─────────────────────────────────────┐        │
│              │  Preprocess → Embed → Search → AI   │        │
│              └─────────────────────────────────────┘        │
│                    ↓              ↓           ↓             │
│              PostgreSQL      Gemini      WHO API            │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Runtime** | Node.js 22+ | ES Modules, functional programming |
| **Framework** | Hono | Ultra-lightweight HTTP server |
| **Database** | PostgreSQL + Prisma 7 | Persistent storage |
| **LLM** | Google Gemini | AI reasoning via LangChain |
| **Embeddings** | text-embedding-004 | Semantic similarity (768 dims) |
| **Orchestration** | LangGraph.js | Multi-step AI workflow |
| **External API** | WHO ICD-11 API v2 | TM2 code lookup |

## Quick Start

### Prerequisites

- Node.js 22+
- PostgreSQL 15+
- Google Cloud API Key (for Gemini)
- WHO ICD-11 API credentials

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your credentials

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Import NAMASTE codes
npm run import:namaste

# Fetch TM2 codes from WHO API
npm run fetch:tm2

# Start development server
npm run dev
```

## API Endpoints

### Health
- `GET /health` - Basic health check
- `GET /health/ready` - Detailed readiness check
- `GET /health/live` - Liveness probe

### FHIR R4 Terminology
- `GET /fhir/metadata` - FHIR CapabilityStatement
- `GET /fhir/CodeSystem` - List all code systems
- `GET /fhir/CodeSystem/:id` - Get specific code system
- `GET /fhir/CodeSystem/$lookup` - Lookup code details
- `POST /fhir/ConceptMap/$translate` - Translate between systems
- `GET /fhir/ValueSet/$expand` - Expand value set with filter

### Mapping
- `POST /api/v1/mapping` - Map single NAMASTE code to TM2
- `POST /api/v1/mapping/batch` - Batch mapping
- `GET /api/v1/mapping` - List all mappings
- `GET /api/v1/mapping/:id` - Get mapping details
- `PATCH /api/v1/mapping/:id/validate` - Validate/approve mapping
- `GET /api/v1/mapping/stats/summary` - Mapping statistics

### Autocomplete
- `GET /api/v1/autocomplete/namaste` - Search NAMASTE codes
- `GET /api/v1/autocomplete/tm2` - Search TM2 codes
- `GET /api/v1/autocomplete/all` - Combined search

## Project Structure

```
namaste-api/
├── prisma/
│   └── schema.prisma       # Database schema
├── scripts/
│   ├── import-namaste.js   # Import NAMASTE codes
│   └── fetch-tm2.js        # Fetch TM2 from WHO API
├── src/
│   ├── config/             # Configuration
│   ├── db/                 # Database client
│   ├── generated/          # Prisma generated client
│   ├── routes/             # API routes
│   │   ├── health.js
│   │   ├── fhir.js
│   │   ├── mapping.js
│   │   └── autocomplete.js
│   ├── services/           # Business logic
│   │   ├── icd11-api.js    # WHO ICD-11 API client
│   │   ├── llm.js          # LangChain Gemini integration
│   │   └── namaste-loader.js
│   └── index.js            # Entry point
├── data/
│   └── tm2/                # TM2 data cache
├── package.json
└── README.md
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `WHO_ICD_CLIENT_ID` | WHO ICD-11 API client ID |
| `WHO_ICD_CLIENT_SECRET` | WHO ICD-11 API client secret |
| `GOOGLE_API_KEY` | Google Gemini API key |
| `GOOGLE_PROJECT_ID` | Google Cloud project ID |
| `LANGSMITH_API_KEY` | LangSmith API key (optional) |

## NAMASTE Code Systems

| System | Codes | Language |
|--------|-------|----------|
| Ayurveda | ~2,888 | Sanskrit (Devanagari) |
| Siddha | ~1,926 | Tamil |
| Unani | ~2,500 | Arabic/Urdu |

## ICD-11 TM2 Categories

| Range | Category |
|-------|----------|
| SK00-SK5Z | Head, brain, nerve, movement disorders |
| SK60-SL2Z | Eye, ear, nose, throat, neck disorders |
| SL40-SL4Z | Respiratory system disorders |
| SL60-SM0Z | Heart, blood, circulatory disorders |
| SM10-SM7Z | Gastro-intestinal disorders |
| SM80-SN3Z | Urinary and reproductive disorders |
| SN40-SN9Z | Skin, nail, hair disorders |
| SP00-SP4Z | Bone, joint, muscle disorders |
| SP50-SP9Z | Disorders affecting whole body |
| SQ00-SQ4Z | Mental, emotional, behavioural disorders |
| SQ50-SQ8Z | External factors disorders |
| SR00-SR0Z | Childhood disorders |
| SS00-ST2Z | Traditional medicine patterns |

## License
MIT
