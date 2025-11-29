# WHO ICD-11 API Reference (Version 2)

## Overview

The ICD-11 API is an HTTP-based REST API providing programmatic access to the International Classification of Diseases (ICD-11).

**Base URL**: `https://id.who.int`

**API Version Header**: All requests must include `API-Version: v2`

## Authentication

OAuth 2.0 Client Credentials flow:

```
Token Endpoint: https://icdaccessmanagement.who.int/connect/token
Grant Type: client_credentials
Scope: icdapi_access
```

### Getting Access Token

```javascript
const params = new URLSearchParams({
  grant_type: 'client_credentials',
  client_id: 'YOUR_CLIENT_ID',
  client_secret: 'YOUR_CLIENT_SECRET',
  scope: 'icdapi_access',
});

const response = await fetch('https://icdaccessmanagement.who.int/connect/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: params.toString(),
});

const { access_token, expires_in } = await response.json();
// Token valid for ~3600 seconds (1 hour)
```

## Required Headers

| Header | Value | Description |
|--------|-------|-------------|
| `Authorization` | `Bearer {token}` | OAuth 2.0 access token |
| `API-Version` | `v2` | API version (required) |
| `Accept` | `application/json` | Response format |
| `Accept-Language` | `en` | Language (en, es, fr, etc.) |

## Key Endpoints

### 1. Foundation Component

The Foundation is the complete ICD-11 universe with all entities.

```
GET /icd/entity/{entityId}
```

Example:
```
GET https://id.who.int/icd/entity/257068234
```

### 2. Linearizations (MMS)

Linearizations are subsets for specific purposes. **MMS** (Mortality and Morbidity Statistics) is the main linearization.

```
GET /icd/release/11/mms
GET /icd/release/11/mms/{entityId}
```

### 3. Search

Search across ICD-11 content:

```
GET /icd/entity/search?q={query}
GET /icd/release/11/mms/search?q={query}
```

**Search Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query (required) |
| `subtreeFilterUsesFoundationDescendants` | boolean | Include foundation descendants |
| `includeKeywordResult` | boolean | Include keyword matches |
| `useFlexisearch` | boolean | Enable flexible matching |
| `flatResults` | boolean | Flatten hierarchy in results |
| `highlightingEnabled` | boolean | Highlight matches |
| `propertiesToBeSearched` | string | Properties to search (Title, Synonym, etc.) |

### 4. Code Lookup

Get entity by ICD-11 code:

```
GET /icd/release/11/mms/codeinfo/{code}
```

Example:
```
GET https://id.who.int/icd/release/11/mms/codeinfo/1A00
```

### 5. Autocode

Get coding suggestions for clinical text:

```
POST /icd/release/11/mms/autocode
Content-Type: application/json

{
  "searchText": "diabetes mellitus type 2"
}
```

## ICD-11 Structure

### Chapters (1-26)

| Chapter | Code Range | Title |
|---------|------------|-------|
| 1 | 1A00-1H0Z | Certain infectious or parasitic diseases |
| 2 | 2A00-2F9Z | Neoplasms |
| ... | ... | ... |
| **26** | **SA00-ST2Z** | **Supplementary Chapter Traditional Medicine Conditions** |

### Chapter 26: Traditional Medicine

**Module I (SA00-SJ1Z)**: Traditional Medicine conditions from Chinese, Japanese, Korean medicine

**Module II (SK00-ST2Z)**: Traditional Medicine disorders (TM2) - **Our focus**

#### TM2 Code Ranges

| Range | Category |
|-------|----------|
| SK00-SK5Z | Head, brain, nerve and movement disorders |
| SK60-SL2Z | Eye, ear, nose, throat and neck disorders |
| SL40-SL4Z | Respiratory system disorders |
| SL60-SM0Z | Heart, blood and circulatory disorders |
| SM10-SM7Z | Gastro-intestinal disorders |
| SM80-SN3Z | Urinary and reproductive system disorders |
| SN40-SN9Z | Skin, nail and hair disorders |
| SP00-SP4Z | Bone, joint and muscle disorders |
| SP50-SP9Z | Disorders affecting the whole body |
| SQ00-SQ4Z | Mental, emotional and behavioural disorders |
| SQ50-SQ8Z | External factors disorders |
| SR00-SR0Z | Childhood disorders |
| SS00-ST2Z | Traditional medicine patterns |

## Response Format

Responses are in JSON-LD format:

```json
{
  "@context": "http://id.who.int/icd/contexts/contextForFoundationEntity.json",
  "@id": "http://id.who.int/icd/entity/257068234",
  "title": { "@language": "en", "@value": "Cholera" },
  "definition": { "@language": "en", "@value": "..." },
  "longDefinition": { "@language": "en", "@value": "..." },
  "fullySpecifiedName": { "@language": "en", "@value": "..." },
  "synonym": [...],
  "narrowerTerm": [...],
  "parent": [...],
  "child": [...]
}
```

### Linearization Entity Response

```json
{
  "@context": "http://id.who.int/icd/contexts/contextForLinearizationEntity.json",
  "@id": "http://id.who.int/icd/release/11/mms/...",
  "title": { "@language": "en", "@value": "..." },
  "code": "1A00",
  "codingNote": "...",
  "blockId": "...",
  "codeRange": "1A00-1A0Z",
  "classKind": "category",
  "child": [...],
  "parent": [...]
}
```

## Error Handling

| Status | Description |
|--------|-------------|
| 200 | Success |
| 400 | Bad request |
| 401 | Unauthorized (invalid/expired token) |
| 404 | Entity not found |
| 429 | Rate limit exceeded |
| 500 | Server error |

## Rate Limits

- Respect rate limits (429 responses)
- Implement exponential backoff
- Cache responses when possible
- Token valid for 1 hour - reuse until expiry

## Swagger Documentation

Full API reference: https://id.who.int/swagger/index.html

## References

- [ICD-11 Reference Guide](https://icdcdn.who.int/icd11referenceguide/en/html/index.html)
- [ICD-11 Browser](https://icd.who.int/browse11)
- [API Home](https://icd.who.int/icdapi)
- [Supported Classifications](https://icd.who.int/docs/icd-api/SupportedClassifications/)
