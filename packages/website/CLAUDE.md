# CLAUDE.md - Effect Models Backend API Server

This file provides guidance for Claude Code when working on the Effect Models backend API server codebase.

## Overview

**Effect Models** is a pure backend REST API server for AI model discovery and comparison. It:
- Aggregates real-time data from 4 external APIs (models.dev, OpenRouter, HuggingFace, ArtificialAnalysis)
- Provides type-safe REST endpoints using Effect Platform HTTP
- Stores aggregated model data in PostgreSQL
- Implements functional programming patterns with Effect.js for error handling and dependency injection

**Architecture**: Backend-only API server (no web UI, no Next.js)
**Framework**: Effect Platform HTTP
**Runtime**: Bun 1.3+
**Language**: TypeScript 5.8+
**Database**: PostgreSQL with Drizzle ORM

## Project Structure

```
packages/website/
├── src/
│   ├── server.ts                    # Main server entry point
│   ├── db/                          # Database
│   │   ├── index.ts                 # Database connection
│   │   ├── schema.ts                # Table exports
│   │   ├── schema.models.ts         # Models table
│   │   └── schema.syncHistory.ts    # Sync history table
│   ├── lib/
│   │   ├── services/                # Effect.Service implementations (6+ services)
│   │   │   ├── ModelService.ts      # Service interface
│   │   │   ├── ModelServiceLive.ts  # Live implementation
│   │   │   ├── ModelDataService.ts  # Data fetching
│   │   │   ├── CacheService.ts      # Redis caching
│   │   │   └── ... (other services)
│   │   ├── middleware/              # Authentication & validation
│   │   │   ├── logger.ts
│   │   │   ├── cors.ts
│   │   │   └── error-handler.ts
│   │   ├── http/                    # HTTP utilities
│   │   │   ├── responses.ts         # Response formatting
│   │   │   └── pagination.ts        # Pagination helpers
│   │   ├── layers.ts                # Service dependency injection
│   │   ├── types.ts                 # Core types
│   │   ├── errors.ts                # Custom error types
│   │   ├── config/                  # Configuration
│   │   └── transformers/            # Data transformation
│   ├── routes/                      # API route handlers
│   │   ├── models.ts                # GET /v1/models
│   │   └── admin-sync.ts            # POST/GET /v1/admin/sync*
│   ├── middleware/                  # HTTP middleware
│   │   ├── logger.ts
│   │   ├── cors.ts
│   │   └── error-handler.ts
│   └── scripts/                     # CLI scripts
│       ├── sync-models.ts           # Manual data sync
│       └── check-sync-health.ts     # Health check
├── tests/                           # Test files
│   ├── api/                         # API route tests
│   └── services/                    # Service tests
├── docs/                            # Documentation
│   ├── API.md                       # REST API reference
│   ├── Architecture.md              # System design
│   └── DATABASE_SETUP.md            # Database guide
├── db/                              # Database migrations
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── drizzle.config.ts
└── README.md
```

## Essential Commands

### Server Management
```bash
# Start development server with hot reload
bun run dev

# Run directly (useful for debugging)
bun run src/server.ts

# Build for production
bun run build

# Start production server
bun run start
```

### Database
```bash
# Generate migration from schema changes
bun run db:generate

# Apply schema to database (creates/modifies tables)
bun run db:push

# Reset database (caution: deletes all data)
bun run db:reset
```

### Testing
```bash
# Run all tests
bun run test

# Run in watch mode
bun run test:watch

# Run with coverage
bun run test:coverage

# Run specific test file
bun run test -- tests/api/models.test.ts
```

### Data Operations
```bash
# Sync models from all APIs
bun run sync-models

# Check sync health status
bun run check-sync-health
```

### Code Quality
```bash
# Type check
bun run check

# Lint and format
bun run lint

# Build
bun run build
```

## Important Patterns

### API Response Format

All successful responses follow this format:
```typescript
{
  "data": T,                    // The actual response data
  "meta": { /* pagination */ }, // Optional metadata
  "timestamp": "2025-01-27T..." // ISO 8601 timestamp
}
```

All error responses follow this format:
```typescript
{
  "error": {
    "code": "ERROR_CODE",       // Machine-readable code
    "message": "...",           // Human-readable message
    "details": {}               // Optional additional context
  },
  "timestamp": "2025-01-27T..."
}
```

### Admin Authentication

Admin endpoints require the `x-admin: true` header. Use the `requireAdmin()` middleware to validate:
```typescript
const isAdmin = request.headers.get("x-admin") === "true"
if (!isAdmin) {
  return yield* unauthorizedError("Admin access required")
}
```

### Service Pattern (Effect.js)

All services extend `Effect.Service<Interface>()`:

```typescript
export class ModelService extends Effect.Service<ModelService>()(
  "ModelService",
  {
    sync: () => ({
      fetchModels: Effect.gen(function* () {
        // Implementation
      })
    })
  }
) {}
```

Access services in routes:
```typescript
const getModels = HttpRouter.get(
  "/v1/models",
  (Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const modelService = yield* ModelService

    const models = yield* modelService.fetchModels()
    return yield* createSuccessResponse(models)
  }) as any)
)
```

### Error Handling

Define custom errors using `Data.TaggedError`:

```typescript
import { Data } from "effect"

class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly resource: string
  readonly id: string
}> {}

class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string
  readonly message: string
}> {}
```

Handle errors in routes with `catchTags`:

```typescript
Effect.gen(function* () {
  // Route logic
}).pipe(
  Effect.catchTags({
    NotFoundError: (error) => notFoundError(error.resource),
    ValidationError: (error) => validationError(error)
  })
)
```

### Request/Response Handling

```typescript
const handler = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest

  // Access request properties
  const url = request.url
  const method = request.method

  // Parse JSON body
  const body = (yield* request.json) as any

  // Return response
  return yield* createSuccessResponse(data)
})
```

## Data Aggregation Flow

1. **API Request**: `GET /v1/models` from client
2. **Service Call**: Routes call `ModelService.fetchModels()`
3. **Data Fetching**: Service fetches from 4 external APIs in parallel:
   - models.dev (pricing, specs)
   - OpenRouter (availability, pricing)
   - HuggingFace (metrics, download counts)
   - ArtificialAnalysis (intelligence scores)
4. **Error Handling**: Partial failures handled gracefully (some APIs can fail)
5. **Transformation**: Raw API responses transformed to internal Model format
6. **Caching**: Results cached in Redis (if configured)
7. **Response**: Combined and deduplicated models returned to client

## Database Schema

### models
- id (string, primary key)
- name, provider
- contextWindow, maxOutputTokens
- inputCost, outputCost
- modalities (array), capabilities (array)
- releaseDate, lastUpdated
- And 10+ other model properties

### model_syncs (sync history)
- id (string, primary key)
- status, message
- startedAt, completedAt
- totalFetched, totalStored

## Common Development Tasks

### Adding a New API Endpoint

1. **Create route handler** in `src/routes/new-endpoint.ts`:
```typescript
import { HttpRouter } from "@effect/platform"
import { Effect } from "effect"

const getResource = HttpRouter.get(
  "/v1/resource",
  (Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    // Implementation
    return yield* createSuccessResponse(data)
  }) as any)
)

export const resourceRouter = HttpRouter.concat(getResource as any)
```

2. **Mount in** `src/server.ts`:
```typescript
import { resourceRouter } from "./routes/new-endpoint"

app = HttpRouter.concat(app, resourceRouter as any)
```

3. **Add tests** in `tests/api/new-endpoint.test.ts`

4. **Document** in `docs/API.md`

### Adding a New Service

1. **Create service interface** in `lib/services/NewService.ts`:
```typescript
export abstract class NewService extends Effect.Service<NewService>()(
  "NewService",
  {}
) {
  abstract doSomething(): Effect.Effect<Result>
}
```

2. **Create live implementation** in same file:
```typescript
export class NewServiceLive extends NewService {
  doSomething() {
    return Effect.gen(function* () {
      // Implementation
    })
  }
}

export const NewServiceLive = Layer.succeed(NewService, new NewServiceLive())
```

3. **Add to** `lib/layers.ts`:
```typescript
export const AppLayer = Layer.merge(
  // ... existing services ...
  NewServiceLive
)
```

4. **Use in routes**:
```typescript
const service = yield* NewService
const result = yield* service.doSomething()
```

### Modifying Database Schema

1. **Update schema file** in `src/db/schema*.ts`
2. **Generate migration**: `bun run db:generate`
3. **Review migration** in `db/migrations/`
4. **Apply changes**: `bun run db:push`
5. **Update types** in `lib/types.ts` if needed

## TypeScript Configuration

- **Strict mode**: Enabled
- **Target**: ES2017
- **Path aliases** in `tsconfig.json`:
  - `@services` → `lib/services`
  - `@api` → `lib/api`
  - `@type` → `lib/types`
  - `@db` → `src/db`
  - And others for clean imports

## Known Type Issues & Workarounds

Due to Effect Platform HTTP's strict generic typing, some workarounds are needed:

1. **Route handlers**: Wrap with parentheses and cast to `any`:
```typescript
const handler = HttpRouter.get(
  "/endpoint",
  (Effect.gen(function* () {
    // Implementation
  }) as any)
)
```

2. **Router composition**: Cast after concat:
```typescript
app = HttpRouter.concat(app, router as any)
```

These are temporary workarounds. As Effect Platform HTTP matures, these casts can be removed.

## Deployment

### Production Checklist
- [ ] All tests pass: `bun run test`
- [ ] Types check: `bun run check`
- [ ] Code formatted: `bun run lint`
- [ ] Environment variables configured
- [ ] PostgreSQL database created and migrated
- [ ] Redis (optional) configured for caching
- [ ] Build succeeds: `bun run build`

### Environment Variables for Production
```env
DATABASE_URL=postgresql://user:password@host:5432/effect_models
NODE_ENV=production
PORT=3000
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

## Testing

### Test Structure
- **Unit tests**: Test individual functions in isolation
- **Integration tests**: Test services with real database/APIs
- **API tests**: Test HTTP endpoints

### Running Tests
```bash
# All tests
bun run test

# Watch mode (re-run on changes)
bun run test:watch

# Coverage report
bun run test:coverage

# Specific test file
bun run test -- tests/api/models.test.ts

# Specific test name
bun run test -- --grep "should list models"
```

### Test Environment
- **Framework**: Vitest
- **Environment**: Node.js
- **Database**: Use test database or in-memory alternatives
- **APIs**: Mock or use test instances

## Debugging

### Development Server Debugging
```bash
# Run with verbose logging
bun run dev

# Or use Node debugger
bun --inspect-brk run src/server.ts
```

### Common Issues

**Issue**: Database connection fails
- Check `DATABASE_URL` environment variable
- Ensure PostgreSQL is running and accessible
- Verify credentials

**Issue**: TypeScript errors about generic types
- These are mostly harmless type checker limitations
- Use `as any` casts as shown in Known Type Issues section
- Code will still run correctly

**Issue**: External API calls timeout
- Check network connectivity
- Verify API endpoints are accessible
- Review retry configuration in `lib/config/retry.ts`

## Resources

- **Effect.js**: https://effect.website/
- **Effect Platform HTTP**: https://effect.website/docs/guides/http/
- **Bun**: https://bun.sh/
- **Drizzle ORM**: https://orm.drizzle.team/
- **PostgreSQL**: https://www.postgresql.org/
- **Vitest**: https://vitest.dev/

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/server.ts` | Server entry point, route mounting |
| `src/db/index.ts` | Database connection |
| `lib/layers.ts` | Service dependency injection setup |
| `lib/http/responses.ts` | Response formatting helpers |
| `lib/middleware/auth.ts` | Authentication middleware |
| `docs/API.md` | Complete API reference |

## Future Improvements

- [ ] WebSocket support for real-time updates
- [ ] GraphQL interface alongside REST API
- [ ] Advanced filtering/search syntax
- [ ] Webhook notifications for model updates
- [ ] Rate limiting per IP/user
- [ ] API key authentication (in addition to headers)
- [ ] Batch operations for bulk updates
- [ ] Custom model transformations
