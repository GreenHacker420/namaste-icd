# NAMASTE-ICD UI Developer Guide

**Version:** 1.0  
**Backend API:** http://localhost:3000  
**FHIR Compliant:** Yes (R4)

---

## 📋 Quick Overview

Build a React/Next.js UI with 5 pages showcasing AI-powered medical code mapping between NAMASTE (Indian traditional medicine) and WHO ICD-11 TM2.

### Pages to Build

1. **Home** (`/`) - Landing with stats
2. **Search** (`/search`) - Code search with autocomplete
3. **Mapping** (`/mapping`) - AI mapping visualization
4. **History** (`/history`) - Mapping management table
5. **Dashboard** (`/dashboard`) - Analytics charts

---

## 🛠️ Tech Stack

```bash
# Framework
Next.js 14+ with TypeScript, Tailwind CSS

# UI Components
shadcn/ui, Radix UI, Lucide icons

# Data & State
React Query (TanStack Query), Zustand

# Charts
Recharts or Chart.js

# HTTP Client
Axios
```

---

## 🎯 Page 1: Home (`/`)

### Layout
```
┌─────────────────────────────────────┐
│ HEADER: Logo | Nav | GitHub         │
├─────────────────────────────────────┤
│ HERO                                │
│  NAMASTE-ICD Mapping Engine         │
│  [Start Mapping] [Docs]             │
│                                     │
│ STATS CARDS (3)                     │
│  7,358 NAMASTE | 728 TM2 | 150 Maps│
│                                     │
│ FEATURES (4 cards with icons)       │
│  🔍 Search | 🤖 AI | 📊 Analytics  │
│                                     │
│ RECENT ACTIVITY (last 5 mappings)   │
└─────────────────────────────────────┘
```

### API Calls
```typescript
GET /api/v1/mapping/stats/summary
GET /api/v1/mapping?limit=5&page=1
```

---

## 🔍 Page 2: Search (`/search`)

### Layout
```
┌─────────────────────────────────────┐
│ SEARCH BAR (autocomplete)           │
│ [🔍 Search codes...]                │
│                                     │
│ FILTERS                             │
│ [Ayurveda] [Siddha] [Unani] [TM2]  │
│                                     │
│ RESULTS (2 columns)                 │
│ ┌──────────┐  ┌──────────┐         │
│ │ NAMASTE  │  │ TM2      │         │
│ │ AAA-1    │  │ SK00.0   │         │
│ │ ज्वर     │  │ Fever    │         │
│ │ [Map →]  │  │ [View]   │         │
│ └──────────┘  └──────────┘         │
└─────────────────────────────────────┘
```

### API Calls
```typescript
// Autocomplete (debounced)
GET /api/v1/autocomplete/namaste?q={query}&system={system}&limit=10
GET /api/v1/autocomplete/tm2?q={query}&limit=10
GET /api/v1/autocomplete/all?q={query}&limit=10

// FHIR alternative
GET /fhir/ValueSet/$expand?filter={query}&count=20
```

### Key Components
- **SearchBar** - Autocomplete dropdown
- **CodeCard** - Display code with native script
- **FilterTabs** - System filter buttons

---

## 🤖 Page 3: AI Mapping (`/mapping`)

### Layout
```
┌─────────────────────────────────────┐
│ SELECTED CODE                       │
│ AAA-1 - ज्वर (Fever) - Ayurveda    │
│                                     │
│ AI WORKFLOW (animated steps)        │
│ ✓ Preprocessing                     │
│ ✓ Embedding (768-dim vector)       │
│ ⏳ Semantic Search (5 candidates)   │
│ ⏳ AI Validation (Gemini Pro)       │
│                                     │
│ TM2 CANDIDATES                      │
│ ⭐ SK00.0 - Fever patterns          │
│    Confidence: 0.85 | EQUIVALENT    │
│                                     │
│ AI REASONING                        │
│ "The code AAA-1 maps to SK00.0..."  │
│                                     │
│ [✓ Approve] [✗ Reject] [🔄 Retry]  │
└─────────────────────────────────────┘
```

### API Calls
```typescript
// Create mapping
POST /api/v1/mapping
{
  "code": "AAA-1",
  "system": "ayurveda",
  "context": "optional"
}

// Response
{
  "success": true,
  "mapping": {
    "namasteCode": { "code": "AAA-1", "term": "ज्वर" },
    "tm2Code": { "code": "SK00.0", "title": "Fever patterns" },
    "equivalence": "equivalent",
    "confidence": 0.85,
    "reasoning": "AI explanation..."
  },
  "processingTime": 1234
}

// FHIR alternative
POST /fhir/ConceptMap/$translate
{
  "code": "AAA-1",
  "system": "https://namaste.ayush.gov.in/ayurveda"
}
```

### Key Components
- **WorkflowStepper** - Animated step progress
- **CandidateCard** - TM2 candidate with confidence
- **EquivalenceBadge** - Color-coded equivalence type
- **ReasoningPanel** - AI explanation display

### Equivalence Types & Colors
```typescript
EQUIVALENT → Green (≡) - Same meaning
WIDER → Blue (⊃) - Target is broader
NARROWER → Yellow (⊂) - Target is more specific
INEXACT → Orange (≈) - Similar but not exact
UNMATCHED → Red (∅) - No suitable match
```

---

## 📊 Page 4: History (`/history`)

### Layout
```
┌─────────────────────────────────────┐
│ FILTERS & EXPORT                    │
│ [System ▼] [Equiv. ▼] [Conf. ▼]    │
│ [Search...] [Export ▼]              │
│                                     │
│ TABLE                               │
│ NAMASTE | TM2 | Equiv | Conf | ... │
│ AAA-1   |SK00.0| ≡    | 0.85 | ✓  │
│ AAA-10  |SK01.2| ⊂    | 0.72 | ⏳ │
│                                     │
│ PAGINATION                          │
│ Page 1 of 10 [← Previous] [Next →] │
└─────────────────────────────────────┘
```

### API Calls
```typescript
// List mappings
GET /api/v1/mapping?system={sys}&minConfidence={min}&status={status}&page={p}&limit={l}

// Response
{
  "data": [
    {
      "id": "uuid",
      "namasteCode": "AAA-1",
      "namasteSystem": "AYURVEDA",
      "namasteTerm": "ज्वर",
      "tm2Code": "SK00.0",
      "tm2Title": "Fever patterns",
      "equivalence": "EQUIVALENT",
      "confidence": 0.85,
      "status": "PENDING"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
}

// Get details
GET /api/v1/mapping/{id}

// Validate
PATCH /api/v1/mapping/{id}/validate
{ "status": "APPROVED", "validatedBy": "Dr. Smith" }
```

### Export Formats

**1. FHIR ConceptMap (JSON)**
```json
{
  "resourceType": "ConceptMap",
  "id": "namaste-to-tm2",
  "group": [{
    "source": "https://namaste.ayush.gov.in/ayurveda",
    "target": "http://id.who.int/icd/release/11/mms",
    "element": [{
      "code": "AAA-1",
      "target": [{ "code": "SK00.0", "equivalence": "equivalent" }]
    }]
  }]
}
```

**2. CSV**
```csv
NAMASTE_Code,Term,System,TM2_Code,Title,Equivalence,Confidence,Status
AAA-1,ज्वर,AYURVEDA,SK00.0,Fever patterns,EQUIVALENT,0.85,APPROVED
```

**3. PDF** - Use jsPDF library

---

## 📈 Page 5: Dashboard (`/dashboard`)

### Layout
```
┌─────────────────────────────────────┐
│ KEY METRICS (4 cards)               │
│ 7,358 Total | 150 Mapped | 0.78 Avg│
│                                     │
│ CHARTS (2x2 grid)                   │
│ ┌──────────┐ ┌──────────┐          │
│ │ Code     │ │ Coverage │          │
│ │ Dist.    │ │ by System│          │
│ │ (Pie)    │ │ (Bar)    │          │
│ └──────────┘ └──────────┘          │
│ ┌──────────┐ ┌──────────┐          │
│ │ Conf.    │ │ Equiv.   │          │
│ │ Dist.    │ │ Types    │          │
│ │ (Hist.)  │ │ (Donut)  │          │
│ └──────────┘ └──────────┘          │
│                                     │
│ RECENT ACTIVITY                     │
│ • AAA-1 → SK00.0 (2m ago) ✓        │
└─────────────────────────────────────┘
```

### API Calls
```typescript
GET /api/v1/mapping/stats/summary

// Response
{
  "totalMappings": 150,
  "byMappingSource": { "AI_LANGGRAPH": 120, "HUMAN_VALIDATED": 30 },
  "byValidationStatus": { "PENDING": 85, "APPROVED": 50, "REJECTED": 15 },
  "averageConfidence": 0.78
}

GET /api/v1/mapping?limit=10&sortBy=createdAt&sortOrder=desc
```

### Chart Data Examples

**Pie Chart (Code Distribution)**
```typescript
[
  { name: 'Ayurveda', value: 2910, color: '#10b981' },
  { name: 'Siddha', value: 1926, color: '#3b82f6' },
  { name: 'Unani', value: 2522, color: '#f59e0b' }
]
```

**Bar Chart (Coverage)**
```typescript
[
  { system: 'Ayurveda', total: 2910, mapped: 45, percentage: 1.5 },
  { system: 'Siddha', total: 1926, mapped: 30, percentage: 1.6 },
  { system: 'Unani', total: 2522, mapped: 75, percentage: 3.0 }
]
```

---

## 🔌 Complete API Reference

### Base URL
```
http://localhost:3000
```

### All Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/fhir/metadata` | GET | FHIR CapabilityStatement |
| `/api/v1/autocomplete/namaste` | GET | Search NAMASTE codes |
| `/api/v1/autocomplete/tm2` | GET | Search TM2 codes |
| `/api/v1/autocomplete/all` | GET | Search both |
| `/fhir/ValueSet/$expand` | GET | FHIR search |
| `/fhir/CodeSystem/$lookup` | GET | Code details |
| `/api/v1/mapping` | POST | Create mapping |
| `/api/v1/mapping` | GET | List mappings |
| `/api/v1/mapping/{id}` | GET | Get mapping |
| `/api/v1/mapping/{id}/validate` | PATCH | Validate |
| `/api/v1/mapping/batch` | POST | Batch map |
| `/fhir/ConceptMap/$translate` | POST | FHIR translate |
| `/api/v1/mapping/stats/summary` | GET | Statistics |

---

## 📦 TypeScript Types

```typescript
// NAMASTE Code
interface NamasteCode {
  id: string;
  code: string;
  system: 'AYURVEDA' | 'SIDDHA' | 'UNANI';
  term: string;
  nativeScript?: string;
  englishName?: string;
  shortDefinition?: string;
}

// TM2 Code
interface Tm2Code {
  id: string;
  code: string;
  title: string;
  definition?: string;
  category?: string;
}

// Mapping
interface Mapping {
  id: string;
  namasteCode: string;
  namasteSystem: string;
  namasteTerm: string;
  tm2Code: string;
  tm2Title: string;
  equivalence: 'EQUIVALENT' | 'WIDER' | 'NARROWER' | 'INEXACT' | 'UNMATCHED';
  confidence: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_REVIEW';
  createdAt: string;
}

// API Response
interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

---

## 🎨 Color Palette

```css
/* System Colors */
--ayurveda: #10b981;  /* Green */
--siddha: #3b82f6;    /* Blue */
--unani: #f59e0b;     /* Orange */
--tm2: #8b5cf6;       /* Purple */

/* Equivalence Colors */
--equivalent: #10b981;  /* Green */
--wider: #3b82f6;       /* Blue */
--narrower: #fbbf24;    /* Yellow */
--inexact: #f97316;     /* Orange */
--unmatched: #ef4444;   /* Red */

/* Confidence Scale */
--conf-low: #ef4444;     /* Red: 0.0-0.5 */
--conf-medium: #f97316;  /* Orange: 0.5-0.7 */
--conf-good: #fbbf24;    /* Yellow: 0.7-0.85 */
--conf-high: #10b981;    /* Green: 0.85-1.0 */
```

---

## 🚀 Quick Start

```bash
# Create Next.js app
npx create-next-app@latest namaste-ui --typescript --tailwind --app

# Install dependencies
npm install axios @tanstack/react-query recharts lucide-react

# Install shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input table badge dialog select tabs toast

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > .env.local

# Start dev server
npm run dev
```

---

## 🔄 User Flows

### Flow 1: Search → Map
1. User searches "fever"
2. Selects AAA-1 code
3. Clicks "Map to TM2"
4. Watches AI workflow
5. Reviews candidates
6. Approves mapping

### Flow 2: Review History
1. Opens history page
2. Filters by system
3. Clicks mapping row
4. Views details
5. Approves/rejects
6. Exports as FHIR

### Flow 3: View Analytics
1. Opens dashboard
2. Views charts
3. Hovers for details
4. Clicks chart slice
5. Filters history

---

## 📚 Additional Resources

- **Backend Docs**: `docs/BACKEND-IMPLEMENTATION-SUMMARY.md`
- **API Testing**: `docs/API-TESTING-EXAMPLES.md`
- **Quick Start**: `QUICKSTART.md`
- **Swagger UI**: http://localhost:3000/docs

---

## ✅ Development Checklist

- [ ] Setup Next.js project
- [ ] Install dependencies
- [ ] Create API client
- [ ] Build Home page
- [ ] Build Search page
- [ ] Build Mapping page
- [ ] Build History page
- [ ] Build Dashboard page
- [ ] Add export functionality
- [ ] Test all flows
- [ ] Deploy demo

**Happy Coding! 🚀**
