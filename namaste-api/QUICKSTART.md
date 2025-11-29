# NAMASTE-ICD API Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js 22+
- PostgreSQL 15+
- Google Gemini API key
- WHO ICD-11 API credentials (optional)

---

## Step 1: Clone & Install

```bash
cd /Users/nityajain/Desktop/hackathons\ projects/namaste/namaste-api
npm install
```

---

## Step 2: Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/namaste_icd
GOOGLE_API_KEY=your_gemini_api_key_here

# Optional (for TM2 fetching)
WHO_ICD_CLIENT_ID=your_who_client_id
WHO_ICD_CLIENT_SECRET=your_who_client_secret

# Server
PORT=3000
NODE_ENV=development
```

### Get API Keys:

1. **Google Gemini API Key**:
   - Visit: https://makersuite.google.com/app/apikey
   - Click "Create API Key"
   - Copy and paste into `.env`

2. **WHO ICD-11 API** (optional):
   - Visit: https://icd.who.int/icdapi
   - Register for API access
   - Get Client ID and Secret

---

## Step 3: Setup Database

### Create PostgreSQL Database

```bash
# Using psql
createdb namaste_icd

# Or using SQL
psql -U postgres -c "CREATE DATABASE namaste_icd;"
```

### Run Migrations

```bash
npm run db:generate
npm run db:migrate
```

---

## Step 4: Import Data

### Import NAMASTE Codes (7,358 codes)

```bash
npm run import:namaste
```

Expected output:
```
✅ Imported 2,910 Ayurveda codes
✅ Imported 1,926 Siddha codes
✅ Imported 2,522 Unani codes
Total: 7,358 codes
```

### Import TM2 Codes (728 codes) - Optional

```bash
npm run fetch:tm2
```

---

## Step 5: Start Server

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

Server starts at: **http://localhost:3000**

---

## 🧪 Test the API

### 1. Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-27T14:30:00.000Z",
  "service": "namaste-api",
  "version": "1.0.0"
}
```

### 2. View API Documentation

Open in browser: **http://localhost:3000/docs**

### 3. Search NAMASTE Codes

```bash
curl "http://localhost:3000/api/v1/autocomplete/namaste?q=fever&limit=5"
```

### 4. Map NAMASTE Code to TM2

```bash
curl -X POST http://localhost:3000/api/v1/mapping \
  -H "Content-Type: application/json" \
  -d '{
    "code": "AAA-1",
    "system": "ayurveda"
  }'
```

Response:
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
    "reasoning": "Direct match based on symptom description"
  },
  "processingTime": 1234
}
```

### 5. FHIR Operations

```bash
# Get CodeSystem
curl http://localhost:3000/fhir/CodeSystem/namaste-ayurveda

# Lookup a code
curl "http://localhost:3000/fhir/CodeSystem/\$lookup?system=ayurveda&code=AAA-1"

# Translate (FHIR ConceptMap)
curl -X POST http://localhost:3000/fhir/ConceptMap/\$translate \
  -H "Content-Type: application/json" \
  -d '{"code": "AAA-1", "system": "https://namaste.ayush.gov.in/ayurveda"}'
```

---

## 📊 Available Endpoints

### Health
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness check
- `GET /health/live` - Liveness probe

### FHIR R4
- `GET /fhir/metadata` - CapabilityStatement
- `GET /fhir/CodeSystem` - List code systems
- `GET /fhir/CodeSystem/:id` - Get code system
- `GET /fhir/CodeSystem/$lookup` - Lookup code
- `POST /fhir/ConceptMap/$translate` - Translate code
- `GET /fhir/ValueSet/$expand` - Expand value set

### Mapping
- `POST /api/v1/mapping` - Map single code
- `GET /api/v1/mapping` - List mappings
- `GET /api/v1/mapping/:id` - Get mapping
- `POST /api/v1/mapping/batch` - Batch mapping
- `PATCH /api/v1/mapping/:id/validate` - Validate mapping
- `GET /api/v1/mapping/stats/summary` - Statistics

### Autocomplete
- `GET /api/v1/autocomplete/namaste` - Search NAMASTE
- `GET /api/v1/autocomplete/tm2` - Search TM2
- `GET /api/v1/autocomplete/all` - Search both

### Documentation
- `GET /docs` - Swagger UI
- `GET /openapi.json` - OpenAPI spec

---

## 🔍 Database Inspection

### View data in Prisma Studio

```bash
npm run db:studio
```

Opens at: **http://localhost:5555**

### Query database directly

```bash
psql namaste_icd

# Count codes
SELECT system, COUNT(*) FROM namaste_codes GROUP BY system;

# View mappings
SELECT * FROM mappings LIMIT 10;
```

---

## 🐛 Troubleshooting

### Database Connection Error

```bash
# Check PostgreSQL is running
pg_isready

# Check connection string
echo $DATABASE_URL
```

### Prisma Client Error

```bash
# Regenerate Prisma client
npm run db:generate
```

### Port Already in Use

```bash
# Change port in .env
PORT=3001
```

### API Key Issues

```bash
# Verify API keys are set
node -e "console.log(process.env.GOOGLE_API_KEY)"
```

---

## 📁 Project Structure

```
namaste-api/
├── src/
│   ├── index.js              # Main server
│   ├── config/               # Configuration
│   ├── db/                   # Database client
│   ├── routes/               # API routes
│   │   ├── health.js
│   │   ├── fhir.js
│   │   ├── mapping.js
│   │   └── autocomplete.js
│   ├── services/             # External services
│   │   ├── llm.js           # Gemini AI
│   │   ├── icd11-api.js     # WHO API
│   │   └── namaste-loader.js
│   └── workflows/            # LangGraph workflows
│       └── mapping-graph.js
├── prisma/
│   └── schema.prisma         # Database schema
├── scripts/
│   ├── import-namaste.js     # Data import
│   └── fetch-tm2.js          # TM2 fetching
├── docs/                     # Documentation
├── .env                      # Environment config
└── package.json
```

---

## 🎯 Next Steps

1. **Explore API**: Visit http://localhost:3000/docs
2. **Test Mappings**: Try mapping different NAMASTE codes
3. **View Data**: Use Prisma Studio to inspect database
4. **Read Docs**: Check `docs/` folder for detailed documentation
5. **Customize**: Modify workflows in `src/workflows/`

---

## 📚 Additional Resources

- **Implementation Status**: `docs/IMPLEMENTATION-STATUS.md`
- **Backend Summary**: `docs/BACKEND-IMPLEMENTATION-SUMMARY.md`
- **Architecture**: `docs/ARCHITECTURE.md`
- **ICD-11 API Reference**: `docs/ICD11-API-REFERENCE.md`

---

## 🆘 Need Help?

1. Check logs for errors
2. Review `.env` configuration
3. Verify database connection
4. Check API key validity
5. Review documentation in `docs/`

---

## ✅ Success Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file configured
- [ ] Database created and migrated
- [ ] NAMASTE codes imported (7,358 codes)
- [ ] Server running on port 3000
- [ ] Health check returns 200 OK
- [ ] Swagger UI accessible at `/docs`
- [ ] Test mapping endpoint works

**You're ready to go! 🚀**
