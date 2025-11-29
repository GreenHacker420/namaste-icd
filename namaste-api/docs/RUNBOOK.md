# NAMASTE-ICD Operations Runbook

## Service Overview

| Property | Value |
|----------|-------|
| Service Name | namaste-api |
| Port | 3000 |
| Health Check | GET /health |
| Metrics | GET /metrics |
| Logs | stdout (JSON format) |

---

## Starting the Service

### Development
```bash
cd /Users/harsh/Desktop/namaste/namaste-api
npm run dev
```

### Production
```bash
npm start
# or
node src/index.js
```

### Docker
```bash
docker run -p 3000:3000 --env-file .env namaste-api
```

---

## Health Checks

### Basic Health
```bash
curl http://localhost:3000/health
```
Expected: `{"status":"ok"}`

### Readiness (with dependencies)
```bash
curl http://localhost:3000/health/ready
```
Expected: `{"status":"ok","database":"connected","icd11Api":"connected"}`

---

## Common Operations

### Clear All Caches
```bash
curl -X POST http://localhost:3000/api/v1/admin/cache/clear
```

### View Cache Stats
```bash
curl http://localhost:3000/api/v1/admin/cache/stats
```

### Generate Embeddings
```bash
curl -X POST http://localhost:3000/api/v1/admin/embeddings/generate \
  -H "Content-Type: application/json" \
  -d '{"type": "all", "batchSize": 50}'
```

### View Embedding Stats
```bash
curl http://localhost:3000/api/v1/admin/embeddings/stats
```

### Initialize pgvector
```bash
curl -X POST http://localhost:3000/api/v1/admin/vector/init
```

---

## Monitoring

### Prometheus Metrics
```bash
curl http://localhost:3000/metrics
```

Key metrics:
- `namaste_requests_total` - Total HTTP requests
- `namaste_mappings_total` - Mapping operations
- `namaste_mapping_confidence_avg` - Average confidence
- `namaste_request_duration_seconds` - Latency histogram

### View Metrics as JSON
```bash
curl http://localhost:3000/api/v1/admin/metrics/json
```

---

## Troubleshooting

### Service Won't Start

1. **Check port availability**
   ```bash
   lsof -i :3000
   kill -9 <PID>
   ```

2. **Check database connection**
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

3. **Check environment variables**
   ```bash
   cat .env
   ```

### Mapping Returns "UNMATCHED"

1. **Check TM2 codes exist**
   ```bash
   curl "http://localhost:3000/api/v1/autocomplete/tm2?q=headache"
   ```

2. **Check NAMASTE code exists**
   ```bash
   curl "http://localhost:3000/api/v1/autocomplete/namaste?q=A-1"
   ```

3. **Check embeddings generated**
   ```bash
   curl http://localhost:3000/api/v1/admin/embeddings/stats
   ```

### High Latency

1. **Check cache hit rate**
   ```bash
   curl http://localhost:3000/api/v1/admin/cache/stats
   ```

2. **Check Gemini API status**
   - Visit: https://status.cloud.google.com/

3. **Check database performance**
   ```sql
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   ```

### Rate Limit Errors (429)

1. **Check rate limit stats**
   ```bash
   curl http://localhost:3000/api/v1/admin/rate-limits
   ```

2. **Wait for window reset** (usually 60 seconds)

3. **For batch operations**, use async endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/v1/mapping/batch/async \
     -H "Content-Type: application/json" \
     -d '{"codes": [...]}'
   ```

### Gemini API Errors

1. **Check API key**
   ```bash
   echo $GOOGLE_API_KEY
   ```

2. **Check quota**
   - Visit: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas

3. **Switch to Flash model** (already default)

---

## Database Operations

### Check Database Size
```sql
SELECT pg_size_pretty(pg_database_size('namaste_icd'));
```

### Check Table Counts
```sql
SELECT 
  (SELECT COUNT(*) FROM namaste_codes) as namaste,
  (SELECT COUNT(*) FROM tm2_codes) as tm2,
  (SELECT COUNT(*) FROM mappings) as mappings;
```

### Check Embedding Coverage
```sql
SELECT 
  COUNT(*) as total,
  COUNT(embedding) as with_embedding
FROM namaste_codes;
```

### Vacuum Database
```sql
VACUUM ANALYZE;
```

---

## Backup & Recovery

### Backup Database
```bash
pg_dump namaste_icd > backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
psql namaste_icd < backup_20251128.sql
```

### Export Mappings
```bash
curl "http://localhost:3000/api/v1/mapping?limit=1000" > mappings.json
```

---

## Scaling

### Horizontal Scaling
- Run multiple instances behind load balancer
- Use Redis for shared cache (not implemented)
- Use external job queue (Bull/Redis)

### Vertical Scaling
- Increase PostgreSQL connections
- Add more memory for embeddings
- Use GPU for local embeddings (optional)

---

## Contacts

| Role | Contact |
|------|---------|
| On-call | TBD |
| Database | TBD |
| AI/ML | TBD |
