# ModelLens API Documentation

## Overview

The ModelLens API provides access to AI model data from multiple sources including models.dev, OpenRouter, HuggingFace, and ArtificialAnalysis. The API is built with Next.js 15 and Effect-TS for robust error handling and type safety.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://modellens.vercel.app`

## Authentication

Most endpoints are public and require no authentication. Admin endpoints (like `/api/admin/sync-models`) require a Bearer token.

## Interactive Documentation

Visit `/api-docs` for an interactive Swagger UI interface to explore the API endpoints.

## Endpoints

### GET /api/models

Fetches AI models from multiple sources with optional filtering.

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `limit` | integer | Maximum number of models to return (1-1000) | 500 |
| `provider` | string | Filter by provider name | - |

#### Response

```json
{
  "data": {
    "models": [
      {
        "id": "openai/gpt-4",
        "name": "GPT-4",
        "provider": "OpenAI",
        "contextWindow": 128000,
        "maxOutputTokens": 4096,
        "inputCost": 0.03,
        "outputCost": 0.06,
        "cacheReadCost": 0.015,
        "cacheWriteCost": 0.03,
        "modalities": ["text", "image"],
        "capabilities": ["tools", "reasoning"],
        "releaseDate": "2023-03-14",
        "lastUpdated": "2024-01-01",
        "knowledge": "2023-04",
        "openWeights": false,
        "supportsTemperature": true,
        "supportsAttachments": false,
        "new": false
      }
    ]
  },
  "metadata": {
    "duration": 1250,
    "timestamp": "2025-01-27T16:40:00.000Z",
    "totalModels": 1
  }
}
```

#### Example Usage

```bash
# Get all models
curl "http://localhost:3000/api/models"

# Get models with limit
curl "http://localhost:3000/api/models?limit=100"

# Filter by provider
curl "http://localhost:3000/api/models?provider=openai"
```

### GET /api/models/{id}

Get detailed information about a specific model.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Model ID (e.g., 'openai/gpt-4') |

#### Response

```json
{
  "data": {
    "model": {
      "id": "openai/gpt-4",
      "name": "GPT-4",
      "provider": "OpenAI",
      // ... other model properties
    }
  },
  "metadata": {
    "duration": 250,
    "timestamp": "2025-01-27T16:40:00.000Z"
  }
}
```

#### Example Usage

```bash
curl "http://localhost:3000/api/models/openai/gpt-4"
```

### POST /api/admin/sync-models

Trigger manual synchronization of model data from external APIs (admin only).

#### Headers

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <token>` |

#### Response

```json
{
  "data": {
    "message": "Models synchronized successfully",
    "stats": {
      "totalModels": 1250,
      "newModels": 45,
      "updatedModels": 123,
      "failedFetches": 1
    }
  },
  "metadata": {
    "duration": 15000,
    "timestamp": "2025-01-27T16:40:00.000Z"
  }
}
```

#### Example Usage

```bash
curl -X POST "http://localhost:3000/api/admin/sync-models" \
  -H "Authorization: Bearer <your-token>"
```

## Data Sources

The API aggregates data from multiple sources:

### models.dev
- **URL**: `https://models.dev/api.json`
- **Description**: Comprehensive database of AI models
- **Data**: Provider info, pricing, capabilities, specifications

### OpenRouter
- **URL**: `https://openrouter.ai/api/v1/models`
- **Description**: Unified API access to multiple model providers
- **Data**: Model availability, pricing, context limits

### HuggingFace
- **URL**: `https://huggingface.co/api/models`
- **Description**: Open source model repository
- **Data**: Model metadata, download counts, tags

### ArtificialAnalysis
- **URL**: `https://artificialanalysis.ai/api/models`
- **Description**: Model intelligence and performance metrics
- **Data**: Intelligence scores, lab evaluations

## Error Handling

The API uses structured error responses with appropriate HTTP status codes:

### Error Response Format

```json
{
  "error": "Error message",
  "field": "field_name", // Optional, for validation errors
  "message": "Detailed error message" // Optional
}
```

### Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (admin endpoints) |
| 404 | Not Found |
| 500 | Internal Server Error |
| 503 | Service Unavailable (external APIs down) |

### Example Error Responses

```json
// 400 - Validation Error
{
  "error": "Invalid provider specified",
  "field": "provider",
  "message": "Provider must be one of: openai, anthropic, google, ..."
}

// 404 - Not Found
{
  "error": "Model not found"
}

// 503 - Service Unavailable
{
  "error": "Network error"
}
```

## TypeScript Client

The API includes a generated TypeScript client for type-safe usage:

```typescript
import { ModelLensApiClient } from '@/lib/api/client';

const client = new ModelLensApiClient();

// Get all models
const models = await client.getModels();

// Get specific model
const model = await client.getModelById('openai/gpt-4');

// Trigger sync (admin)
const syncResult = await client.syncModels('your-token');
```

## Rate Limiting

Currently, the API has no rate limiting implemented. This may be added in future versions for production use.

## Caching

The API implements several caching strategies:

1. **Database Caching**: Model data is stored in PostgreSQL for fast retrieval
2. **Background Sync**: Daily synchronization keeps data fresh
3. **Real-time Fallback**: Direct API calls when database is unavailable

## Development

### Running the API

```bash
# Development server
bun run dev

# Production build
bun run build
bun run start
```

### Testing

```bash
# Run API tests
bun run test:api

# Run all tests
bun run test:all
```

### Generating API Client

```bash
# Regenerate TypeScript client from OpenAPI spec
bun run generate:api-client
```

## Monitoring

The API includes comprehensive logging and monitoring:

- **Request/Response Logging**: All API calls are logged with timing
- **Error Tracking**: Structured error logging with context
- **Performance Metrics**: Response time tracking
- **Health Checks**: Database and external API status monitoring

## Future Enhancements

- **Rate Limiting**: Per-IP and per-user limits
- **Webhooks**: Real-time notifications for data updates
- **GraphQL**: Alternative query interface
- **Batch Operations**: Bulk model operations
- **Advanced Filtering**: Complex query capabilities
- **Caching Headers**: HTTP caching for better performance
