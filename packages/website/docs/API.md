# ModelLens API Documentation

## Overview

The ModelLens API is a backend-only REST API server for AI model discovery and comparison. Built with **Effect-TS** and **Effect Platform HTTP**, it provides type-safe endpoints for managing and filtering AI models from multiple sources (models.dev, OpenRouter, HuggingFace, ArtificialAnalysis).

**Architecture**: Pure backend API server using Bun + Effect.js with PostgreSQL database and Drizzle ORM.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: (to be deployed)

## Authentication

All endpoints require the `x-user-id` header for authentication. Optional headers:
- `x-team-id`: For team-based access control
- `x-admin`: Set to `true` for admin-only endpoints

### Required Headers

```bash
# All requests must include:
-H "x-user-id: <user-id>"

# Optional headers:
-H "x-team-id: <team-id>"      # For team filters
-H "x-admin: true"             # For admin endpoints
```

## Endpoints

### Health & Status

#### GET /health

Health check endpoint.

**Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2025-01-27T16:40:00.000Z",
  "version": "1.0.0"
}
```

**Example**:
```bash
curl "http://localhost:3000/health"
```

---

### Models Management

#### GET /v1/models

List all available AI models with pagination.

**Query Parameters**:
| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | 1 | - | Page number (1-indexed) |
| `pageSize` | integer | 20 | 100 | Results per page |

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "openai/gpt-4",
      "name": "GPT-4",
      "provider": "OpenAI",
      "contextWindow": 128000,
      "costPerToken": 0.03,
      "releaseDate": "2023-03-14"
      // ... additional model properties
    }
  ],
  "meta": {
    "total": 1250,
    "page": 1,
    "pageSize": 20
  },
  "timestamp": "2025-01-27T16:40:00.000Z"
}
```

**Example**:
```bash
curl -H "x-user-id: user123" "http://localhost:3000/v1/models?page=1&pageSize=50"
```

---

### Filters Management

#### GET /v1/filters

List filters accessible to the current user.

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number |
| `pageSize` | integer | Results per page (max 100) |
| `visibility` | string | Filter by: `all`, `private`, `team`, `public` |

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "filter-123",
      "name": "Fast Models",
      "description": "Models with low latency",
      "visibility": "private",
      "ownerId": "user-123",
      "rules": [
        {
          "field": "contextWindow",
          "operator": "gte",
          "value": 8000
        }
      ],
      "usageCount": 5,
      "createdAt": "2025-01-20T10:00:00Z",
      "updatedAt": "2025-01-26T15:30:00Z"
    }
  ],
  "meta": {
    "total": 12,
    "page": 1,
    "pageSize": 20
  },
  "timestamp": "2025-01-27T16:40:00.000Z"
}
```

**Example**:
```bash
curl -H "x-user-id: user123" "http://localhost:3000/v1/filters?visibility=private"
```

---

#### POST /v1/filters

Create a new filter.

**Request Body**:
```json
{
  "name": "Affordable Models",
  "description": "Models under $0.001 per 1k tokens",
  "visibility": "private",
  "rules": [
    {
      "field": "inputCost",
      "operator": "lt",
      "value": 0.001
    }
  ],
  "teamId": "team-123"  // Optional, required if visibility is 'team'
}
```

**Response** (200 OK):
```json
{
  "data": {
    "id": "filter-456",
    "name": "Affordable Models",
    "description": "Models under $0.001 per 1k tokens",
    "visibility": "private",
    "ownerId": "user-123",
    "rules": [ /* ... */ ],
    "usageCount": 0,
    "createdAt": "2025-01-27T16:40:00Z",
    "updatedAt": "2025-01-27T16:40:00Z"
  },
  "timestamp": "2025-01-27T16:40:00.000Z"
}
```

**Example**:
```bash
curl -X POST "http://localhost:3000/v1/filters" \
  -H "x-user-id: user123" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Affordable Models",
    "visibility": "private",
    "rules": [{"field": "inputCost", "operator": "lt", "value": 0.001}]
  }'
```

---

#### GET /v1/filters/:id

Get a specific filter by ID.

**Path Parameters**:
| Parameter | Description |
|-----------|-------------|
| `id` | Filter ID |

**Response** (200 OK):
```json
{
  "data": {
    "id": "filter-123",
    "name": "Fast Models",
    "description": "...",
    "visibility": "private",
    "ownerId": "user-123",
    "rules": [ /* ... */ ],
    "usageCount": 5,
    "createdAt": "2025-01-20T10:00:00Z",
    "updatedAt": "2025-01-26T15:30:00Z"
  },
  "timestamp": "2025-01-27T16:40:00.000Z"
}
```

**Errors**:
- `404 NOT_FOUND`: Filter doesn't exist
- `403 FORBIDDEN`: No access to filter

**Example**:
```bash
curl -H "x-user-id: user123" "http://localhost:3000/v1/filters/filter-123"
```

---

#### PUT /v1/filters/:id

Update a filter (owner only).

**Request Body** (all fields optional):
```json
{
  "name": "Updated Name",
  "description": "New description",
  "visibility": "team",
  "rules": [ /* ... */ ]
}
```

**Response** (200 OK):
```json
{
  "data": {
    "id": "filter-123",
    "name": "Updated Name",
    // ... other fields
    "updatedAt": "2025-01-27T17:00:00Z"
  },
  "timestamp": "2025-01-27T17:00:00.000Z"
}
```

**Errors**:
- `403 FORBIDDEN`: Not filter owner
- `400 VALIDATION_ERROR`: Invalid field values

---

#### DELETE /v1/filters/:id

Delete a filter (owner only).

**Response** (200 OK):
```json
{
  "data": {
    "deleted": true,
    "id": "filter-123"
  },
  "timestamp": "2025-01-27T17:00:00.000Z"
}
```

---

### Filter Evaluation

#### POST /v1/filters/:id/evaluate

Evaluate a filter against the latest models.

**Response** (200 OK):
```json
{
  "data": {
    "runId": "run-789",
    "matchCount": 45,
    "totalEvaluated": 1250,
    "durationMs": 350,
    "results": [
      {
        "id": "openai/gpt-4",
        "name": "GPT-4",
        "provider": "OpenAI"
        // ... model details
      }
    ]
  },
  "timestamp": "2025-01-27T17:00:00.000Z"
}
```

**Example**:
```bash
curl -X POST "http://localhost:3000/v1/filters/filter-123/evaluate" \
  -H "x-user-id: user123"
```

---

#### GET /v1/filters/:id/runs

List all evaluation runs for a filter.

**Query Parameters**:
| Parameter | Type | Default |
|-----------|------|---------|
| `page` | integer | 1 |
| `pageSize` | integer | 20 |

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "run-789",
      "filterId": "filter-123",
      "executedBy": "user-123",
      "executedAt": "2025-01-27T17:00:00Z",
      "durationMs": 350,
      "matchCount": 45,
      "totalEvaluated": 1250,
      "results": [ /* ... */ ]
    }
  ],
  "meta": {
    "total": 15,
    "page": 1,
    "pageSize": 20
  },
  "timestamp": "2025-01-27T17:00:00.000Z"
}
```

---

#### GET /v1/filters/:id/runs/:runId

Get a specific filter evaluation run.

**Response** (200 OK):
```json
{
  "data": {
    "id": "run-789",
    "filterId": "filter-123",
    "executedBy": "user-123",
    "executedAt": "2025-01-27T17:00:00Z",
    "durationMs": 350,
    "matchCount": 45,
    "totalEvaluated": 1250,
    "results": [ /* ... */ ]
  },
  "timestamp": "2025-01-27T17:00:00.000Z"
}
```

---

### Admin Operations

#### POST /v1/admin/sync

Trigger manual model data synchronization (admin only).

**Headers Required**:
- `x-admin: true`

**Response** (200 OK):
```json
{
  "data": {
    "syncId": "sync_1706370000000",
    "status": "started",
    "message": "Model sync initiated. Check /v1/admin/sync/history for status."
  },
  "timestamp": "2025-01-27T17:00:00.000Z"
}
```

**Errors**:
- `401 UNAUTHORIZED`: Missing/invalid authentication
- `403 FORBIDDEN`: Admin privileges required

**Example**:
```bash
curl -X POST "http://localhost:3000/v1/admin/sync" \
  -H "x-user-id: user123" \
  -H "x-admin: true"
```

---

#### GET /v1/admin/sync/history

Get model synchronization history (admin only).

**Query Parameters**:
| Parameter | Type | Default | Max |
|-----------|------|---------|-----|
| `limit` | integer | 10 | 100 |

**Response** (200 OK):
```json
{
  "data": [
    {
      "syncId": "sync_1706370000000",
      "status": "started",
      "startedAt": "2025-01-27T17:00:00Z",
      "completedAt": "2025-01-27T17:15:30Z",
      "modelsProcessed": 1250,
      "newModels": 45,
      "updatedModels": 123,
      "failedFetches": 1
    }
  ],
  "meta": {
    "total": 42
  },
  "timestamp": "2025-01-27T17:00:00.000Z"
}
```

---

## Error Handling

All errors follow a standardized response format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}  // Optional additional context
  },
  "timestamp": "2025-01-27T17:00:00.000Z"
}
```

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required or invalid |
| `FORBIDDEN` | 403 | User lacks permission for resource |
| `RESOURCE_NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `BAD_REQUEST` | 400 | Invalid request format |
| `CONFLICT` | 409 | Resource already exists or state conflict |
| `UNPROCESSABLE_ENTITY` | 422 | Semantic validation error |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Example Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "name": "name must be a non-empty string"
    }
  },
  "timestamp": "2025-01-27T17:00:00.000Z"
}
```

---

## Development

### Running the Server

```bash
# Development server with hot reload
bun run src/server.ts

# Or use the package.json script
bun run dev
```

Server will start on `http://localhost:3000` by default.

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/model_lens

# Server
PORT=3000
NODE_ENV=development

# Optional: Redis caching
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### Type Checking

```bash
bun run check
```

### Building

```bash
bun run build
```

---

## Architecture

### Technology Stack

- **Runtime**: Bun
- **HTTP Framework**: Effect Platform HTTP
- **Functional Programming**: Effect.js
- **Database**: PostgreSQL + Drizzle ORM
- **Language**: TypeScript 5.8+

### Service Layer

All business logic is organized as Effect.Service classes:

```typescript
import { Effect } from 'effect'
import { ModelService } from '../services/ModelService'

export const getModels = Effect.gen(function* () {
  const service = yield* ModelService
  const models = yield* service.getLatestModels()
  return models
})
```

### Database Schema

- **models** - AI model information from multiple sources
- **saved_filters** - User-created filter definitions
- **filter_runs** - Historical filter evaluation runs

---

## Data Sources

The API aggregates model data from:

| Source | URL | Data |
|--------|-----|------|
| models.dev | `https://models.dev/api.json` | Pricing, specs, capabilities |
| OpenRouter | `https://openrouter.ai/api/v1/models` | Availability, pricing |
| HuggingFace | `https://huggingface.co/api/models` | Metadata, download counts |
| ArtificialAnalysis | `https://artificialanalysis.ai/api/models` | Intelligence scores, evaluations |

---

## API Examples

### Example 1: Create and Evaluate a Filter

```bash
# 1. Create a filter
FILTER_ID=$(curl -X POST "http://localhost:3000/v1/filters" \
  -H "x-user-id: user123" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Multimodal Models",
    "description": "Models supporting both text and image",
    "visibility": "private",
    "rules": [{"field": "modalities", "operator": "includes", "value": "image"}]
  }' | jq -r '.data.id')

# 2. Evaluate the filter
curl -X POST "http://localhost:3000/v1/filters/$FILTER_ID/evaluate" \
  -H "x-user-id: user123"

# 3. View evaluation results
curl "http://localhost:3000/v1/filters/$FILTER_ID/runs" \
  -H "x-user-id: user123"
```

### Example 2: List Models with Pagination

```bash
# Get first 50 models
curl "http://localhost:3000/v1/models?page=1&pageSize=50" \
  -H "x-user-id: user123"

# Get next page
curl "http://localhost:3000/v1/models?page=2&pageSize=50" \
  -H "x-user-id: user123"
```

---

## Monitoring & Logging

The server includes comprehensive logging:

- Request/response timing
- Error tracking with context
- Service health monitoring
- Database query logging

Monitor the console output for detailed information during development.

---

## Rate Limiting & Caching

Currently:
- **No rate limiting** (to be added in production)
- **Database caching** of model data
- **In-memory caching** of frequent queries via Upstash Redis (optional)

---

## Future Enhancements

- [ ] Rate limiting per user/IP
- [ ] Webhooks for data updates
- [ ] GraphQL interface
- [ ] Batch operations
- [ ] Advanced filter syntax
- [ ] Custom model transformations
- [ ] Historical trend analysis
