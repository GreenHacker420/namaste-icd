# API Testing Examples

Complete collection of API requests for testing the NAMASTE-ICD Intelligent Mapping Engine.

---

## 🏥 Health Check Endpoints

### Basic Health Check
```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-27T14:30:00.000Z",
  "service": "namaste-api",
  "version": "1.0.0"
}
```

### Readiness Check (with dependencies)
```bash
curl http://localhost:3000/health/ready
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-27T14:30:00.000Z",
  "checks": {
    "database": true,
    "icd11Api": true
  }
}
```

### Liveness Probe
```bash
curl http://localhost:3000/health/live
```

---

## 🔍 Autocomplete / Search Endpoints

### Search NAMASTE Codes (All Systems)
```bash
curl "http://localhost:3000/api/v1/autocomplete/namaste?q=fever&limit=10"
```

### Search NAMASTE Codes (Specific System)
```bash
# Ayurveda only
curl "http://localhost:3000/api/v1/autocomplete/namaste?q=headache&system=ayurveda&limit=5"

# Siddha only
curl "http://localhost:3000/api/v1/autocomplete/namaste?q=pain&system=siddha&limit=5"

# Unani only
curl "http://localhost:3000/api/v1/autocomplete/namaste?q=cough&system=unani&limit=5"
```

**Response:**
```json
{
  "query": "fever",
  "count": 5,
  "results": [
    {
      "id": "uuid-here",
      "code": "AAA-1",
      "system": "ayurveda",
      "term": "ज्वर",
      "englishName": "Fever",
      "display": "Fever",
      "definition": "Elevated body temperature"
    }
  ]
}
```

### Search TM2 Codes
```bash
curl "http://localhost:3000/api/v1/autocomplete/tm2?q=fever&limit=10"
```

### Search TM2 by Category
```bash
curl "http://localhost:3000/api/v1/autocomplete/tm2?q=pain&category=disorder&limit=5"
```

**Response:**
```json
{
  "query": "fever",
  "count": 3,
  "results": [
    {
      "id": "uuid-here",
      "code": "SK00.0",
      "title": "Fever patterns",
      "category": "disorder",
      "display": "SK00.0 - Fever patterns",
      "definition": "Traditional medicine fever classifications"
    }
  ]
}
```

### Combined Search (NAMASTE + TM2)
```bash
curl "http://localhost:3000/api/v1/autocomplete/all?q=headache&limit=10"
```

**Response:**
```json
{
  "query": "headache",
  "namaste": {
    "count": 5,
    "results": [
      {
        "id": "uuid",
        "code": "AAA-10",
        "system": "ayurveda",
        "display": "Headache",
        "type": "namaste"
      }
    ]
  },
  "tm2": {
    "count": 3,
    "results": [
      {
        "id": "uuid",
        "code": "SK01.2",
        "display": "Cephalalgia",
        "category": "disorder",
        "type": "tm2"
      }
    ]
  }
}
```

---

## 🔄 Mapping Endpoints

### Map Single NAMASTE Code to TM2
```bash
curl -X POST http://localhost:3000/api/v1/mapping \
  -H "Content-Type: application/json" \
  -d '{
    "code": "AAA-1",
    "system": "ayurveda"
  }'
```

**Response:**
```json
{
  "success": true,
  "source": "ai_workflow",
  "mapping": {
    "namasteCode": {
      "code": "AAA-1",
      "system": "AYURVEDA",
      "term": "ज्वर",
      "englishName": "Fever"
    },
    "tm2Code": {
      "code": "SK00.0",
      "title": "Fever patterns"
    },
    "equivalence": "equivalent",
    "confidence": 0.85,
    "reasoning": "Direct semantic match based on fever symptoms"
  },
  "processingTime": 1234
}
```

### Map with Additional Context
```bash
curl -X POST http://localhost:3000/api/v1/mapping \
  -H "Content-Type: application/json" \
  -d '{
    "code": "AAA-1",
    "system": "ayurveda",
    "context": "Patient presents with intermittent fever and chills"
  }'
```

### Batch Mapping
```bash
curl -X POST http://localhost:3000/api/v1/mapping/batch \
  -H "Content-Type: application/json" \
  -d '{
    "codes": [
      {"code": "AAA-1", "system": "ayurveda"},
      {"code": "SSS-10", "system": "siddha"},
      {"code": "UUU-5", "system": "unani"}
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "total": 3,
    "mapped": 2,
    "unmapped": 1
  },
  "results": [
    {
      "code": "AAA-1",
      "system": "ayurveda",
      "mapped": true,
      "mapping": {
        "tm2Code": "SK00.0",
        "tm2Title": "Fever patterns",
        "confidence": 0.85,
        "equivalence": "EQUIVALENT"
      }
    }
  ]
}
```

### List All Mappings
```bash
# Default pagination
curl "http://localhost:3000/api/v1/mapping"

# With filters
curl "http://localhost:3000/api/v1/mapping?system=ayurveda&minConfidence=0.7&page=1&limit=20"
```

**Response:**
```json
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
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Get Mapping by ID
```bash
curl "http://localhost:3000/api/v1/mapping/{mapping-id}"
```

### Validate/Approve Mapping
```bash
curl -X PATCH http://localhost:3000/api/v1/mapping/{mapping-id}/validate \
  -H "Content-Type: application/json" \
  -d '{
    "status": "APPROVED",
    "validatedBy": "Dr. Smith"
  }'
```

**Status Options:**
- `APPROVED` - Mapping is correct
- `REJECTED` - Mapping is incorrect
- `NEEDS_REVIEW` - Requires expert review

### Get Mapping Statistics
```bash
curl "http://localhost:3000/api/v1/mapping/stats/summary"
```

**Response:**
```json
{
  "totalMappings": 150,
  "byMappingSource": {
    "AI_LANGGRAPH": 120,
    "HUMAN_VALIDATED": 30
  },
  "byValidationStatus": {
    "PENDING": 100,
    "APPROVED": 40,
    "REJECTED": 10
  },
  "averageConfidence": 0.72
}
```

---

## 🏥 FHIR R4 Endpoints

### Get FHIR Metadata (CapabilityStatement)
```bash
curl http://localhost:3000/fhir/metadata
```

**Response:**
```json
{
  "resourceType": "CapabilityStatement",
  "status": "active",
  "fhirVersion": "4.0.1",
  "kind": "instance",
  "software": {
    "name": "NAMASTE-ICD Terminology Service",
    "version": "1.0.0"
  },
  "rest": [
    {
      "mode": "server",
      "resource": [
        {
          "type": "CodeSystem",
          "interaction": [{"code": "read"}, {"code": "search-type"}]
        }
      ]
    }
  ]
}
```

### List All Code Systems
```bash
curl http://localhost:3000/fhir/CodeSystem
```

**Response:**
```json
{
  "resourceType": "Bundle",
  "type": "searchset",
  "total": 4,
  "entry": [
    {
      "resource": {
        "resourceType": "CodeSystem",
        "id": "namaste-ayurveda",
        "url": "https://namaste.ayush.gov.in/ayurveda",
        "name": "NAMASTE_AYURVEDA",
        "title": "National Ayurveda Morbidity Codes",
        "status": "active"
      }
    }
  ]
}
```

### Get Specific Code System
```bash
# Ayurveda
curl http://localhost:3000/fhir/CodeSystem/namaste-ayurveda

# Siddha
curl http://localhost:3000/fhir/CodeSystem/namaste-siddha

# Unani
curl http://localhost:3000/fhir/CodeSystem/namaste-unani

# ICD-11 TM2
curl http://localhost:3000/fhir/CodeSystem/icd11-tm2
```

### CodeSystem $lookup Operation
```bash
# Lookup NAMASTE code
curl "http://localhost:3000/fhir/CodeSystem/\$lookup?system=https://namaste.ayush.gov.in/ayurveda&code=AAA-1"

# Lookup TM2 code
curl "http://localhost:3000/fhir/CodeSystem/\$lookup?system=http://id.who.int/icd/release/11/mms&code=SK00.0"
```

**Response:**
```json
{
  "resourceType": "Parameters",
  "parameter": [
    {
      "name": "name",
      "valueString": "ज्वर"
    },
    {
      "name": "display",
      "valueString": "Fever"
    },
    {
      "name": "definition",
      "valueString": "Elevated body temperature"
    },
    {
      "name": "designation",
      "valueCoding": {
        "language": "sa",
        "value": "ज्वर"
      }
    }
  ]
}
```

### ConceptMap $translate Operation
```bash
curl -X POST http://localhost:3000/fhir/ConceptMap/\$translate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "AAA-1",
    "system": "https://namaste.ayush.gov.in/ayurveda",
    "target": "http://id.who.int/icd/release/11/mms"
  }'
```

**Response:**
```json
{
  "resourceType": "Parameters",
  "parameter": [
    {
      "name": "result",
      "valueBoolean": true
    },
    {
      "name": "match",
      "part": [
        {
          "name": "equivalence",
          "valueCode": "equivalent"
        },
        {
          "name": "concept",
          "valueCoding": {
            "system": "http://id.who.int/icd/release/11/mms",
            "code": "SK00.0",
            "display": "Fever patterns"
          }
        },
        {
          "name": "source",
          "valueString": "AI_LANGGRAPH"
        },
        {
          "name": "confidence",
          "valueDecimal": 0.85
        }
      ]
    }
  ]
}
```

### ValueSet $expand Operation
```bash
# Expand with filter
curl "http://localhost:3000/fhir/ValueSet/\$expand?url=https://namaste.ayush.gov.in&filter=fever&count=10"

# No filter (all codes)
curl "http://localhost:3000/fhir/ValueSet/\$expand?count=20&offset=0"
```

**Response:**
```json
{
  "resourceType": "ValueSet",
  "status": "active",
  "expansion": {
    "timestamp": "2025-11-27T14:30:00.000Z",
    "total": 150,
    "offset": 0,
    "contains": [
      {
        "system": "https://namaste.ayush.gov.in/ayurveda",
        "code": "AAA-1",
        "display": "Fever",
        "designation": [
          {
            "language": "sa",
            "value": "ज्वर"
          }
        ]
      }
    ]
  }
}
```

---

## 📊 Documentation Endpoints

### Swagger UI
```bash
# Open in browser
open http://localhost:3000/docs
```

### OpenAPI Specification
```bash
curl http://localhost:3000/openapi.json
```

### Root Endpoint
```bash
curl http://localhost:3000/
```

**Response:**
```json
{
  "name": "NAMASTE-ICD Intelligent Mapping Engine",
  "version": "1.0.0",
  "description": "FHIR R4 Terminology Service for NAMASTE to ICD-11 TM2 mapping",
  "endpoints": {
    "health": "/health",
    "fhir": "/fhir",
    "mapping": "/api/v1/mapping",
    "autocomplete": "/api/v1/autocomplete",
    "docs": "/docs",
    "openapi": "/openapi.json"
  }
}
```

---

## 🧪 Testing Workflows

### Complete Mapping Workflow Test
```bash
# 1. Search for a NAMASTE code
curl "http://localhost:3000/api/v1/autocomplete/namaste?q=fever&system=ayurveda&limit=1"

# 2. Map the code to TM2
curl -X POST http://localhost:3000/api/v1/mapping \
  -H "Content-Type: application/json" \
  -d '{"code": "AAA-1", "system": "ayurveda"}'

# 3. Verify the mapping
curl "http://localhost:3000/api/v1/mapping?system=ayurveda&limit=1"

# 4. Get statistics
curl "http://localhost:3000/api/v1/mapping/stats/summary"
```

### FHIR Workflow Test
```bash
# 1. Get metadata
curl http://localhost:3000/fhir/metadata

# 2. List code systems
curl http://localhost:3000/fhir/CodeSystem

# 3. Lookup a code
curl "http://localhost:3000/fhir/CodeSystem/\$lookup?system=ayurveda&code=AAA-1"

# 4. Translate to TM2
curl -X POST http://localhost:3000/fhir/ConceptMap/\$translate \
  -H "Content-Type: application/json" \
  -d '{"code": "AAA-1", "system": "https://namaste.ayush.gov.in/ayurveda"}'
```

---

## 🔧 Using with Postman

### Import Collection

1. Create new Postman collection
2. Set base URL variable: `{{baseUrl}}` = `http://localhost:3000`
3. Import requests from this document

### Example Environment Variables
```json
{
  "baseUrl": "http://localhost:3000",
  "namasteSystem": "ayurveda",
  "testCode": "AAA-1"
}
```

---

## 🐍 Using with Python

```python
import requests

BASE_URL = "http://localhost:3000"

# Health check
response = requests.get(f"{BASE_URL}/health")
print(response.json())

# Search NAMASTE codes
response = requests.get(
    f"{BASE_URL}/api/v1/autocomplete/namaste",
    params={"q": "fever", "limit": 5}
)
print(response.json())

# Map code
response = requests.post(
    f"{BASE_URL}/api/v1/mapping",
    json={"code": "AAA-1", "system": "ayurveda"}
)
print(response.json())
```

---

## 📝 Notes

- All endpoints return JSON
- Default pagination: 20 items per page
- Max autocomplete results: 50
- Max batch mapping: 100 codes
- Confidence scores: 0.0 to 1.0
- Processing time in milliseconds

---

## ✅ Testing Checklist

- [ ] Health endpoints respond
- [ ] NAMASTE search returns results
- [ ] TM2 search returns results
- [ ] Single mapping works
- [ ] Batch mapping works
- [ ] FHIR metadata accessible
- [ ] FHIR lookup works
- [ ] FHIR translate works
- [ ] Swagger UI loads
- [ ] Statistics endpoint works

**Happy Testing! 🚀**
