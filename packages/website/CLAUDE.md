# CLAUDE.md - ModelLens Backend API Server

This file provides guidance for Claude Code when working on the ModelLens backend API server codebase.

## Overview

**ModelLens** is a pure backend REST API server for AI model discovery and comparison. It:
- Aggregates real-time data from 4 external APIs (models.dev, OpenRouter, HuggingFace, ArtificialAnalysis)
- Provides type-safe REST endpoints using Effect Platform HTTP
- Manages saved filters and filter evaluation runs with PostgreSQL
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
│   │   ├── schema.filterRuns.ts     # Filter runs table
│   │   ├── schema.filters.ts        # Saved filters table
│   │   └── schema.syncHistory.ts    # Sync history table
│   ├── lib/
│   │   ├── services/                # Effect.Service implementations (23+ services)
│   │   │   ├── ModelService.ts      # Service interface
│   │   │   ├── ModelServiceLive.ts  # Live implementation
│   │   │   ├── CacheService.ts      # Redis caching
│   │   │   ├── FilterService.ts     # Filter logic
│   │   │   └── ... (other services)
│   │   ├── middleware/              # Authentication & validation
│   │   │   ├── auth.ts              # requireAuth middleware
│   │   │   └── admin.ts             # Admin check
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
│   │   ├── filters.ts               # GET/POST /v1/filters
│   │   ├── filter-detail.ts         # GET/PUT/DELETE /v1/filters/:id
│   │   ├── filter-evaluate.ts       # POST /v1/filters/:id/evaluate
│   │   ├── filter-runs.ts           # GET /v1/filters/:id/runs*
│   │   └── admin-sync.ts            # POST/GET /v1/admin/sync*
│   ├── middleware/                  # Express-like middleware
│   │   └── auth.ts                  # Authentication
│   └── scripts/                     # CLI scripts
│       └── sync-models.ts           # Manual data sync
├── tests/                           # Test files
│   ├── api/                         # API route tests
│   ├── services/                    # Service tests
│   └── setup/                       # Test configuration
├── docs/                            # Documentation
│   ├── API.md                       # REST API reference
│   ├── Architecture.md              # System design
│   └── DATABASE_SETUP.md            # Database guide
├── db/                              # Database migrations
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── drizzle.config.ts
├── next.config.js                   # Kept for compatibility but unused
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

### Authentication

All endpoints require the `x-user-id` header. Optional headers:
- `x-team-id`: For team-based access control
- `x-admin: true`: For admin-only endpoints

Use the `requireAuth()` middleware to validate:
```typescript
const auth = yield* requireAuth(request)
// auth.userId: string
// auth.teamId: string | undefined
// auth.isAdmin: boolean
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
    const auth = yield* requireAuth(request)
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

  // Parse JSON body (it's a property, not a method)
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

### saved_filters
- id (string, primary key)
- ownerId, teamId
- name, description
- visibility ('private' | 'team' | 'public')
- rules (JSON array of filter conditions)
- createdAt, updatedAt

### filter_runs
- id (string, primary key)
- filterId (foreign key)
- executedBy, executedAt
- matchCount, totalEvaluated
- results (JSON array of matched models)
- durationMs

### sync_history
- id (string, primary key)
- status, message
- startedAt, completedAt
- modelsProcessed, newModels, updatedModels

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
    const auth = yield* requireAuth(request)
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

2. **Generic method calls**: Cast service before calling:
```typescript
const cached = yield* (cacheService.get as any)(CACHE_KEYS.MODELS)
```

3. **Router composition**: Cast after concat:
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
DATABASE_URL=postgresql://user:password@host:5432/model_lens
NODE_ENV=production
PORT=3000
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

## Testing

### Test Structure
- **Unit tests**: Test individual functions in isolation
- **Integration tests**: Test services with real database/APIs
- **API tests**: Test HTTP endpoints with curl or test client

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
- **Environment**: Node.js (jsdom not needed for backend)
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
- [ ] Advanced filter syntax with DSL
- [ ] Webhook notifications for filter matches
- [ ] Rate limiting per user/team
- [ ] API key authentication (in addition to headers)
- [ ] Batch operations for bulk updates
- [ ] Custom model transformations
