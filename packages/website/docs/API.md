# Effect Models API Documentation

## Overview

The Effect Models API is a backend-only REST API server for AI model discovery and comparison. Built with **Effect.js** and **Effect Platform HTTP**, it provides type-safe endpoints for accessing aggregated AI model data from multiple sources (models.dev, OpenRouter, HuggingFace, ArtificialAnalysis).

**Architecture**: Pure backend API server using Bun + Effect.js with PostgreSQL database and Drizzle ORM.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: (to be deployed)

## Authentication

Admin endpoints require the `x-admin: true` header.

### Optional Headers

```bash
# Optional admin header for admin-only endpoints:
-H "x-admin: true"
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

### Models

#### GET /v1/models

List all aggregated AI models with pagination.

**Query Parameters**:
| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `limit` | integer | 20 | 100 | Results per page |
| `offset` | integer | 0 | - | Number of results to skip |
| `provider` | string | - | - | Filter by provider name (optional) |

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "openai/gpt-4",
      "name": "GPT-4",
      "provider": "OpenAI",
      "contextWindow": 128000,
      "maxOutputTokens": 4096,
      "inputCost": 0.03,
      "outputCost": 0.06,
      "modalities": ["text", "image"],
      "capabilities": ["function-calling", "vision"],
      "releaseDate": "2023-03-14",
      "lastUpdated": "2025-01-27T12:00:00Z",
      "openWeights": false,
      "supportsTemperature": true,
      "supportsAttachments": true,
      "new": false
    }
  ],
  "meta": {
    "total": 1250,
    "limit": 20,
    "offset": 0
  },
  "timestamp": "2025-01-27T16:40:00.000Z"
}
```

**Example**:
```bash
# Get first 50 models
curl "http://localhost:3000/v1/models?limit=50&offset=0"

# Get next 50
curl "http://localhost:3000/v1/models?limit=50&offset=50"

# Filter by provider
curl "http://localhost:3000/v1/models?provider=OpenAI&limit=20"
```

**Errors**:
- `400 VALIDATION_ERROR`: Invalid parameters

---

### Admin Operations

#### POST /v1/admin/sync

Trigger manual model data synchronization (admin only).

**Headers Required**:
- `x-admin: true`

**Request Body** (optional):
```json
{
  // No body parameters required
}
```

**Response** (202 Accepted):
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
- `403 FORBIDDEN`: Admin privileges required

**Example**:
```bash
curl -X POST "http://localhost:3000/v1/admin/sync" \
  -H "x-admin: true" \
  -H "Content-Type: application/json"
```

---

#### GET /v1/admin/sync/history

Get model synchronization history (admin only).

**Headers Required**:
- `x-admin: true`

**Query Parameters**:
| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `limit` | integer | 10 | 100 | Number of records to return |

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "sync_1706370000000",
      "status": "completed",
      "startedAt": "2025-01-27T17:00:00Z",
      "completedAt": "2025-01-27T17:15:30Z",
      "totalFetched": 1250,
      "totalStored": 1245,
      "message": "Sync completed successfully"
    },
    {
      "id": "sync_1706283600000",
      "status": "completed",
      "startedAt": "2025-01-26T17:00:00Z",
      "completedAt": "2025-01-26T17:12:45Z",
      "totalFetched": 1200,
      "totalStored": 1198,
      "message": "Sync completed successfully"
    }
  ],
  "meta": {
    "total": 42
  },
  "timestamp": "2025-01-27T17:00:00.000Z"
}
```

**Errors**:
- `403 FORBIDDEN`: Admin privileges required

**Example**:
```bash
# Get last 10 sync operations
curl "http://localhost:3000/v1/admin/sync/history?limit=10" \
  -H "x-admin: true"

# Get last 50
curl "http://localhost:3000/v1/admin/sync/history?limit=50" \
  -H "x-admin: true"
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
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `BAD_REQUEST` | 400 | Invalid request format |
| `UNAUTHORIZED` | 401 | Authentication required or invalid |
| `FORBIDDEN` | 403 | User lacks permission for resource |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `CONFLICT` | 409 | Resource already exists or state conflict |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Example Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid limit parameter",
    "details": {
      "limit": "must be between 1 and 100"
    }
  },
  "timestamp": "2025-01-27T17:00:00.000Z"
}
```

---

## Data Sources

The API aggregates model data from multiple sources:

| Source | Data |
|--------|------|
| **models.dev** | Pricing, specifications, capabilities |
| **OpenRouter** | Real-time availability, routing pricing |
| **HuggingFace** | Open-source model metadata, download metrics |
| **ArtificialAnalysis** | Intelligence benchmarks, performance evaluations |

---

## Development

### Running the Server

```bash
# Development server with hot reload
bun run dev

# Or run directly
bun run src/server.ts
```

Server will start on `http://localhost:3000` by default.

### Environment Variables

```env
# Required
DATABASE_URL=postgresql://username:password@localhost:5432/effect_models

# Optional
PORT=3000
NODE_ENV=development
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
- **model_syncs** - Synchronization history and status

---

## API Examples

### Example 1: List All Models

```bash
# Get first 20 models
curl "http://localhost:3000/v1/models"

# Get specific page
curl "http://localhost:3000/v1/models?limit=50&offset=50"

# Filter by provider
curl "http://localhost:3000/v1/models?provider=OpenAI"
```

### Example 2: Trigger Manual Sync

```bash
# Trigger sync operation
curl -X POST "http://localhost:3000/v1/admin/sync" \
  -H "x-admin: true"

# Check sync status
curl "http://localhost:3000/v1/admin/sync/history?limit=5" \
  -H "x-admin: true"
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

## Caching

- **Database caching** of model data
- **In-memory caching** via Upstash Redis (optional, for production)
- **TTL-based expiration** for cached data

---

## Rate Limiting

Currently no rate limiting is implemented. For production deployments, consider implementing:

- Rate limiting per IP address
- Rate limiting per admin user
- Exponential backoff for external API calls

---

## Future Enhancements

- [ ] Rate limiting per IP/user
- [ ] Webhooks for data updates
- [ ] GraphQL interface
- [ ] Batch operations
- [ ] Advanced search syntax
- [ ] Custom model transformations
- [ ] Historical trend analysis
