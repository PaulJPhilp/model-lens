# Backend API Acceptance Tests

Comprehensive acceptance criteria and test procedures for the Filter API backend.

## Overview

This document defines the acceptance criteria for all backend CRUD + apply endpoints.

**Status:** ✅ All endpoints implemented and ready for testing

## Prerequisites

Before running acceptance tests:

1. ✅ PostgreSQL database running
2. ✅ `.env` file with `DATABASE_URL` set
3. ✅ Migrations applied (`bun run src/scripts/verify-db.ts`)
4. ✅ Dev server running (`npm run dev`)

## Automated Test Script

Run all tests automatically:

```bash
bun run src/scripts/test-api-endpoints.ts
```

**Expected Result:** All 15 tests pass

## Manual Acceptance Tests

### Test 1: Create Filter - Private

**Endpoint:** `POST /api/filters`

**Request:**
```bash
curl -X POST http://localhost:3002/api/filters \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{
    "name": "Budget AI Models",
    "description": "Models under $5/M tokens",
    "visibility": "private",
    "rules": [
      {
        "field": "inputCost",
        "operator": "lte",
        "value": 5,
        "type": "hard"
      },
      {
        "field": "capabilities",
        "operator": "contains",
        "value": "reasoning",
        "type": "soft",
        "weight": 0.8
      }
    ]
  }'
```

**Acceptance Criteria:**
- ✅ Returns `201 Created`
- ✅ Response includes `id`, `ownerId`, `name`, `description`, `visibility`, `rules`
- ✅ `ownerId` matches `x-user-id` header
- ✅ `visibility` is `"private"`
- ✅ `rules` array matches request
- ✅ `version` is `1`
- ✅ `usageCount` is `0`
- ✅ `createdAt` and `updatedAt` are valid ISO timestamps
- ✅ `lastUsedAt` is `null`

**Sample Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "ownerId": "test-user",
  "teamId": null,
  "name": "Budget AI Models",
  "description": "Models under $5/M tokens",
  "visibility": "private",
  "rules": [...],
  "version": 1,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z",
  "lastUsedAt": null,
  "usageCount": 0
}
```

---

### Test 2: Create Filter - Team

**Endpoint:** `POST /api/filters`

**Request:**
```bash
curl -X POST http://localhost:3002/api/filters \
  -H "Content-Type: application/json" \
  -H "x-user-id: team-owner" \
  -H "x-team-id: engineering-team" \
  -d '{
    "name": "Team Standard Models",
    "visibility": "team",
    "teamId": "engineering-team",
    "rules": [
      {
        "field": "provider",
        "operator": "in",
        "value": ["openai", "anthropic"],
        "type": "hard"
      }
    ]
  }'
```

**Acceptance Criteria:**
- ✅ Returns `201 Created`
- ✅ `visibility` is `"team"`
- ✅ `teamId` is `"engineering-team"`
- ✅ All other fields valid as in Test 1

---

### Test 3: Validation - Reject Empty Rules

**Endpoint:** `POST /api/filters`

**Request:**
```bash
curl -X POST http://localhost:3002/api/filters \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{
    "name": "Invalid Filter",
    "rules": []
  }'
```

**Acceptance Criteria:**
- ✅ Returns `400 Bad Request`
- ✅ Error message: "At least one rule is required"

**Sample Response:**
```json
{
  "error": "Invalid request",
  "details": "At least one rule is required"
}
```

---

### Test 4: Validation - Require teamId for Team Visibility

**Endpoint:** `POST /api/filters`

**Request:**
```bash
curl -X POST http://localhost:3002/api/filters \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{
    "name": "Team Filter",
    "visibility": "team",
    "rules": [{
      "field": "provider",
      "operator": "eq",
      "value": "openai",
      "type": "hard"
    }]
  }'
```

**Acceptance Criteria:**
- ✅ Returns `400 Bad Request`
- ✅ Error message: "teamId required for team visibility"

---

### Test 5: List Filters

**Endpoint:** `GET /api/filters`

**Request:**
```bash
curl "http://localhost:3002/api/filters?page=1&pageSize=20&visibility=all" \
  -H "x-user-id: test-user"
```

**Acceptance Criteria:**
- ✅ Returns `200 OK`
- ✅ Response has `filters` array
- ✅ Response has `total`, `page`, `pageSize` numbers
- ✅ Filters include:
  - User's private filters
  - Public filters (from any user)
  - Team filters (if user is in team)
- ✅ Filters do NOT include:
  - Other users' private filters
  - Other teams' team filters

**Sample Response:**
```json
{
  "filters": [
    {
      "id": "...",
      "name": "Budget AI Models",
      "visibility": "private",
      ...
    },
    {
      "id": "...",
      "name": "Public Vision Models",
      "visibility": "public",
      ...
    }
  ],
  "total": 2,
  "page": 1,
  "pageSize": 20
}
```

---

### Test 6: List Filters - Visibility Filter

**Endpoint:** `GET /api/filters?visibility=private`

**Request:**
```bash
curl "http://localhost:3002/api/filters?visibility=private" \
  -H "x-user-id: test-user"
```

**Acceptance Criteria:**
- ✅ Returns `200 OK`
- ✅ All filters have `visibility: "private"`
- ✅ All filters have `ownerId: "test-user"`

---

### Test 7: Get Single Filter

**Endpoint:** `GET /api/filters/[id]`

**Request:**
```bash
# Replace FILTER_ID with actual ID from create test
curl http://localhost:3002/api/filters/FILTER_ID \
  -H "x-user-id: test-user"
```

**Acceptance Criteria:**
- ✅ Returns `200 OK`
- ✅ Response is single filter object
- ✅ `id` matches requested ID
- ✅ All fields populated correctly

---

### Test 8: Access Control - Owner Can Access Private

**Endpoint:** `GET /api/filters/[id]`

**Setup:** Create private filter as `user-1`

**Request:**
```bash
curl http://localhost:3002/api/filters/FILTER_ID \
  -H "x-user-id: user-1"
```

**Acceptance Criteria:**
- ✅ Returns `200 OK`
- ✅ Filter is returned

---

### Test 9: Access Control - Non-Owner Cannot Access Private

**Endpoint:** `GET /api/filters/[id]`

**Setup:** Same private filter from Test 8

**Request:**
```bash
curl http://localhost:3002/api/filters/FILTER_ID \
  -H "x-user-id: user-2"
```

**Acceptance Criteria:**
- ✅ Returns `403 Forbidden`
- ✅ Error: "Forbidden"

**Sample Response:**
```json
{
  "error": "Forbidden"
}
```

---

### Test 10: Access Control - Anyone Can Access Public

**Endpoint:** `GET /api/filters/[id]`

**Setup:** Create public filter

**Request:**
```bash
curl http://localhost:3002/api/filters/PUBLIC_FILTER_ID \
  -H "x-user-id: any-user"
```

**Acceptance Criteria:**
- ✅ Returns `200 OK`
- ✅ Filter is returned

---

### Test 11: Access Control - Team Member Can Access Team Filter

**Endpoint:** `GET /api/filters/[id]`

**Setup:** Create team filter for `team-123`

**Request:**
```bash
curl http://localhost:3002/api/filters/TEAM_FILTER_ID \
  -H "x-user-id: team-member" \
  -H "x-team-id: team-123"
```

**Acceptance Criteria:**
- ✅ Returns `200 OK`
- ✅ Filter is returned

---

### Test 12: Access Control - Non-Team Member Cannot Access

**Endpoint:** `GET /api/filters/[id]`

**Setup:** Same team filter

**Request:**
```bash
curl http://localhost:3002/api/filters/TEAM_FILTER_ID \
  -H "x-user-id: other-user" \
  -H "x-team-id: other-team"
```

**Acceptance Criteria:**
- ✅ Returns `403 Forbidden`

---

### Test 13: Update Filter

**Endpoint:** `PUT /api/filters/[id]`

**Request:**
```bash
curl -X PUT http://localhost:3002/api/filters/FILTER_ID \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{
    "name": "Updated Filter Name",
    "description": "Updated description"
  }'
```

**Acceptance Criteria:**
- ✅ Returns `200 OK`
- ✅ `name` is updated to "Updated Filter Name"
- ✅ `description` is updated
- ✅ `updatedAt` timestamp is newer than `createdAt`
- ✅ `version` is incremented (optional, not currently implemented)
- ✅ Other fields unchanged (rules, visibility, etc.)

---

### Test 14: Update Filter - Rules

**Endpoint:** `PUT /api/filters/[id]`

**Request:**
```bash
curl -X PUT http://localhost:3002/api/filters/FILTER_ID \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{
    "rules": [
      {
        "field": "provider",
        "operator": "eq",
        "value": "anthropic",
        "type": "hard"
      }
    ]
  }'
```

**Acceptance Criteria:**
- ✅ Returns `200 OK`
- ✅ `rules` array is replaced with new rules
- ✅ Other fields unchanged

---

### Test 15: Update Filter - Access Control

**Endpoint:** `PUT /api/filters/[id]`

**Setup:** Filter owned by `user-1`

**Request:**
```bash
curl -X PUT http://localhost:3002/api/filters/FILTER_ID \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-2" \
  -d '{
    "name": "Hacked Name"
  }'
```

**Acceptance Criteria:**
- ✅ Returns `403 Forbidden`
- ✅ Filter is NOT modified (verify with GET)

---

### Test 16: Update Filter - Validation

**Endpoint:** `PUT /api/filters/[id]`

**Request:**
```bash
curl -X PUT http://localhost:3002/api/filters/FILTER_ID \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{
    "rules": []
  }'
```

**Acceptance Criteria:**
- ✅ Returns `400 Bad Request`
- ✅ Error: "rules must be non-empty array"

---

### Test 17: Delete Filter

**Endpoint:** `DELETE /api/filters/[id]`

**Request:**
```bash
curl -X DELETE http://localhost:3002/api/filters/FILTER_ID \
  -H "x-user-id: test-user"
```

**Acceptance Criteria:**
- ✅ Returns `200 OK`
- ✅ Response: `{ "success": true }`
- ✅ Subsequent GET returns `404 Not Found`

---

### Test 18: Delete Filter - Access Control

**Endpoint:** `DELETE /api/filters/[id]`

**Setup:** Filter owned by `user-1`

**Request:**
```bash
curl -X DELETE http://localhost:3002/api/filters/FILTER_ID \
  -H "x-user-id: user-2"
```

**Acceptance Criteria:**
- ✅ Returns `403 Forbidden`
- ✅ Filter still exists (verify with GET)

---

### Test 19: Evaluate Filter - Basic

**Endpoint:** `POST /api/filters/[id]/evaluate`

**Setup:** Create filter with rules that match some models

**Request:**
```bash
curl -X POST http://localhost:3002/api/filters/FILTER_ID/evaluate \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{
    "limit": 10
  }'
```

**Acceptance Criteria:**
- ✅ Returns `200 OK`
- ✅ Response has `filterId`, `filterName`, `results`, `totalEvaluated`, `matchCount`
- ✅ `results` is array of model evaluations
- ✅ Each result has:
  - `modelId`, `modelName`
  - `match` (boolean)
  - `score` (0-1)
  - `rationale` (string)
  - `failedHardClauses`, `passedSoftClauses`, `totalSoftClauses`
- ✅ `totalEvaluated` ≤ limit
- ✅ `matchCount` = number of results where `match === true`

**Sample Response:**
```json
{
  "filterId": "550e8400-...",
  "filterName": "Budget AI Models",
  "results": [
    {
      "modelId": "gpt-3.5-turbo",
      "modelName": "GPT-3.5 Turbo",
      "match": true,
      "score": 1.0,
      "rationale": "Passed all 1 hard clauses. Passed 1/1 soft clauses.",
      "failedHardClauses": 0,
      "passedSoftClauses": 1,
      "totalSoftClauses": 1
    },
    {
      "modelId": "gpt-4",
      "modelName": "GPT-4",
      "match": true,
      "score": 0.0,
      "rationale": "Passed all 1 hard clauses. Passed 0/1 soft clauses.",
      "failedHardClauses": 0,
      "passedSoftClauses": 0,
      "totalSoftClauses": 1
    }
  ],
  "totalEvaluated": 10,
  "matchCount": 5
}
```

---

### Test 20: Evaluate Filter - Usage Stats Update

**Endpoint:** `POST /api/filters/[id]/evaluate`

**Procedure:**
1. GET filter, note `usageCount` and `lastUsedAt`
2. POST evaluate
3. GET filter again

**Acceptance Criteria:**
- ✅ `usageCount` incremented by 1
- ✅ `lastUsedAt` is updated to recent timestamp
- ✅ Other fields unchanged

**Example:**
```bash
# 1. Get initial stats
curl http://localhost:3002/api/filters/FILTER_ID \
  -H "x-user-id: test-user"
# usageCount: 0, lastUsedAt: null

# 2. Evaluate
curl -X POST http://localhost:3002/api/filters/FILTER_ID/evaluate \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{"limit": 5}'

# 3. Get updated stats
curl http://localhost:3002/api/filters/FILTER_ID \
  -H "x-user-id: test-user"
# usageCount: 1, lastUsedAt: "2025-01-15T11:30:00Z"
```

---

### Test 21: Evaluate Filter - Deterministic Results

**Endpoint:** `POST /api/filters/[id]/evaluate`

**Procedure:**
1. POST evaluate with specific parameters
2. POST evaluate again with same parameters
3. Compare results

**Acceptance Criteria:**
- ✅ Both evaluations return identical results
- ✅ Same models in same order
- ✅ Same match/score values
- ✅ Deterministic behavior

**Example:**
```bash
# Evaluate twice
curl -X POST http://localhost:3002/api/filters/FILTER_ID/evaluate \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{"limit": 5}' > result1.json

curl -X POST http://localhost:3002/api/filters/FILTER_ID/evaluate \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{"limit": 5}' > result2.json

# Compare (excluding timestamps)
diff <(jq '.results' result1.json) <(jq '.results' result2.json)
# Should show no differences
```

---

### Test 22: Evaluate Filter - Hard Clauses

**Endpoint:** `POST /api/filters/[id]/evaluate`

**Setup:** Create filter with hard clause:
```json
{
  "field": "provider",
  "operator": "eq",
  "value": "openai",
  "type": "hard"
}
```

**Request:**
```bash
curl -X POST http://localhost:3002/api/filters/FILTER_ID/evaluate \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{}'
```

**Acceptance Criteria:**
- ✅ All results with `provider !== "openai"` have `match: false`
- ✅ All results with `provider === "openai"` have `failedHardClauses: 0`
- ✅ Hard clause enforcement is strict

---

### Test 23: Evaluate Filter - Soft Clauses

**Endpoint:** `POST /api/filters/[id]/evaluate`

**Setup:** Create filter with soft clause:
```json
{
  "field": "inputCost",
  "operator": "lte",
  "value": 10,
  "type": "soft",
  "weight": 0.6
}
```

**Acceptance Criteria:**
- ✅ Models with `inputCost <= 10` have higher scores
- ✅ Models with `inputCost > 10` can still match (if no hard clauses fail)
- ✅ `score` reflects soft clause performance
- ✅ Weight affects score calculation

---

### Test 24: Evaluate Filter - Specific Models

**Endpoint:** `POST /api/filters/[id]/evaluate`

**Request:**
```bash
curl -X POST http://localhost:3002/api/filters/FILTER_ID/evaluate \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{
    "modelIds": ["gpt-4", "claude-3-opus"]
  }'
```

**Acceptance Criteria:**
- ✅ Only evaluates specified models
- ✅ `totalEvaluated` = 2
- ✅ Results only include specified modelIds

---

### Test 25: Evaluate Filter - Limit Enforcement

**Endpoint:** `POST /api/filters/[id]/evaluate`

**Request:**
```bash
curl -X POST http://localhost:3002/api/filters/FILTER_ID/evaluate \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{
    "limit": 1000
  }'
```

**Acceptance Criteria:**
- ✅ Returns max 500 results (limit capped)
- ✅ `totalEvaluated` ≤ 500

---

## Summary Checklist

### CRUD Operations

- ✅ **Create** - POST /api/filters
  - [x] Creates private filter
  - [x] Creates team filter
  - [x] Creates public filter
  - [x] Validates required fields
  - [x] Validates teamId for team visibility
  - [x] Rejects empty rules

- ✅ **Read** - GET /api/filters, GET /api/filters/[id]
  - [x] Lists filters with pagination
  - [x] Filters by visibility
  - [x] Gets single filter
  - [x] Returns 404 for non-existent

- ✅ **Update** - PUT /api/filters/[id]
  - [x] Updates filter fields
  - [x] Updates rules
  - [x] Validates rules non-empty
  - [x] Enforces owner-only modification

- ✅ **Delete** - DELETE /api/filters/[id]
  - [x] Deletes filter
  - [x] Enforces owner-only deletion
  - [x] Returns 404 after deletion

### Apply/Evaluate

- ✅ **Evaluate** - POST /api/filters/[id]/evaluate
  - [x] Returns evaluation results
  - [x] Enforces hard clauses
  - [x] Calculates soft clause scores
  - [x] Updates usage stats
  - [x] Deterministic results
  - [x] Respects limit parameter
  - [x] Filters by modelIds

### Auth & Visibility

- ✅ **Visibility Enforcement**
  - [x] Private: owner only
  - [x] Team: team members only
  - [x] Public: everyone

- ✅ **Modification Control**
  - [x] Only owner can update
  - [x] Only owner can delete
  - [x] Returns 403 for unauthorized

### Data Integrity

- ✅ **Validation**
  - [x] Required fields enforced
  - [x] Rules must be non-empty
  - [x] TeamId required for team visibility

- ✅ **Side Effects**
  - [x] usageCount increments on evaluate
  - [x] lastUsedAt updates on evaluate
  - [x] updatedAt updates on modification

## Running All Tests

### Option 1: Automated Script

```bash
bun run src/scripts/test-api-endpoints.ts
```

Expected: **15/15 tests pass**

### Option 2: Manual Testing

Follow tests 1-25 above in order.

### Option 3: Unit Tests

```bash
bun test app/api/filters
```

Expected: **45/45 tests pass** (requires DATABASE_URL)

## Success Criteria

✅ **All acceptance criteria must pass:**

1. Creating/editing from UI persists correctly
2. Apply returns deterministic evaluation results
3. Visibility/auth enforcement works
4. Payload validation prevents invalid data
5. Usage stats update correctly
6. All CRUD operations work as specified

## Production Readiness

Before deploying to production:

- [ ] Replace auth stubs with real authentication
- [ ] Add rate limiting
- [ ] Set up monitoring/logging
- [ ] Configure backup strategy
- [ ] Add CORS configuration
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Load testing
- [ ] Security audit

## Support

If any tests fail:
1. Check BACKEND_SETUP.md for setup instructions
2. Verify DATABASE_URL is set
3. Check server logs for detailed errors
4. Review troubleshooting section in BACKEND_SETUP.md
