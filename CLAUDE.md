# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**Effect **Effect Models** - Open-source REST API for AI model discovery and comparison 🧠✨platform for AI engineers. It aggregates real-time data from multiple AI provider APIs (models.dev, OpenRouter, HuggingFace, ArtificialAnalysis) and provides a web-based dashboard with advanced filtering, cost estimation, and comparative analytics for 50+ AI providers and 1000+ models.

## Project Structure

```
effect-models/
├── packages/
│   ├── website/                    # Main Next.js 15 application
│   │   ├── app/                    # Next.js App Router (pages & API routes)
│   │   │   ├── api/                # API routes (models, filters, admin, chat)
│   │   │   ├── chat/               # Chat interface page
│   │   │   ├── models/             # Models explorer (main dashboard)
│   │   │   ├── filters/            # Filter management page
│   │   │   ├── timeline/           # Timeline visualization
│   │   │   └── api-docs/           # Swagger UI documentation
│   │   ├── src/
│   │   │   ├── db/                 # Drizzle ORM schema & database
│   │   │   │   ├── schema.ts       # Base table exports
│   │   │   │   ├── schema.models.ts    # Models table
│   │   │   │   ├── schema.filterRuns.ts # Filter runs
│   │   │   │   └── index.ts        # DB connection
│   │   │   ├── lib/                # Business logic & utilities
│   │   │   │   ├── services/       # 23+ Effect-based services
│   │   │   │   │   ├── ModelService.ts      # Data aggregation
│   │   │   │   │   ├── FilterService.ts     # Filter logic
│   │   │   │   │   ├── CacheService.ts      # Redis caching
│   │   │   │   │   └── ...other services
│   │   │   │   ├── api/            # API utilities & helpers
│   │   │   │   ├── config/         # Retry & environment config
│   │   │   │   ├── middleware/     # Validation & rate limiting
│   │   │   │   ├── schemas/        # Zod & Effect validation
│   │   │   │   ├── transformers/   # Data transformation
│   │   │   │   ├── hooks/          # React hooks
│   │   │   │   ├── layers.ts       # Service dependency injection
│   │   │   │   ├── errors.ts       # Custom error types
│   │   │   │   └── types.ts        # Core TypeScript types
│   │   │   └── scripts/            # CLI scripts
│   │   │       ├── sync-models.ts      # Data sync from APIs
│   │   │       ├── db-cli.ts          # Database inspection
│   │   │       ├── check-sync-health.ts # Sync monitoring
│   │   │       ├── analytics.ts        # Analytics generation
│   │   │       └── test-api-endpoints.ts
│   │   ├── components/             # React components
│   │   │   ├── ModelTable.tsx       # Main model table
│   │   │   ├── Chat.tsx            # Chat interface
│   │   │   ├── FilterEditor.tsx     # Filter creation
│   │   │   ├── FilterList.tsx       # Filter management
│   │   │   ├── ModelTableFilters.tsx # Advanced filtering
│   │   │   └── ui/                 # shadcn/ui components
│   │   ├── tests/                  # Test suites
│   │   │   ├── api/                # API route tests
│   │   │   ├── components/         # Component tests
│   │   │   ├── services/           # Service tests
│   │   │   ├── e2e/                # End-to-end tests
│   │   │   └── setup/              # Test configuration
│   │   ├── docs/                   # Architecture & setup documentation
│   │   ├── db/                     # Database migrations
│   │   ├── globals.css             # Global styles
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   ├── drizzle.config.ts
│   │   ├── next.config.js
│   │   └── tailwind.config.js
│   └── lib/                        # Shared internal library (minimal)
├── package.json                    # Workspace root
├── turbo.json                      # Build orchestration
├── bun.lock                        # Bun lockfile
├── tsconfig.tsbuildinfo
├── README.md                       # Project overview
├── DATA_SYNC_WORKFLOW.md          # Sync automation guide
├── AGENTS.md                       # Agent framework docs
├── GEMINI.md                       # Gemini integration docs
└── .env.example                    # Environment template
```

## Technology Stack

| Category | Technology | Version |
|----------|-----------|---------|
| **Framework** | Next.js | 15.5.4 |
| **UI Framework** | React | 19.2.0 |
| **Language** | TypeScript | 5.8.2 |
| **Runtime & Package Manager** | Bun | 1.3.1-canary.43 |
| **Functional Programming** | Effect | 3.18.2 |
| **Database** | PostgreSQL | (via pg 8.16.3) |
| **ORM** | Drizzle ORM | 0.44.6 |
| **Styling** | Tailwind CSS | 4.1.14 |
| **UI Component Library** | shadcn/ui + Radix UI | Latest |
| **Data Tables** | TanStack React Table | 8.21.3 |
| **Charts/Timeline** | Vis.js | 7.7.4 |
| **AI Integration** | Vercel AI SDK | 5.0.60 |
| **Testing** | Vitest | 3.2.4 |
| **Code Quality** | Biome | 2.2.5 |
| **Caching** | Upstash Redis | 1.35.4 |
| **Rate Limiting** | Upstash Rate Limit | 2.0.6 |
| **Build Orchestration** | Turbo | Latest |

## Essential Commands

### Development

```bash
bun install              # Install dependencies
bun run dev             # Start development server (Next.js on port 3000)
bun run build           # Production build
bun run start           # Start production server
```

### Code Quality

```bash
bun run lint            # Format and lint with Biome
bun run test            # Run test suite (single run)
bun run test:watch      # Run tests in watch mode
bun run test:coverage   # Run tests with coverage report
bun run test:ui         # Run tests with interactive UI
```

### Running Specific Tests

```bash
bun run test:api        # API route tests only
bun run test:components # React component tests only
bun run test:services   # Effect service tests only
bun run test:e2e        # End-to-end tests only
bun run test:all        # Full suite with verbose output
```

### Database Management

```bash
cd packages/website
bun run db:generate     # Generate new migrations from schema changes
bun run db:push         # Apply schema to database (creates tables, modifies schema)
bun run db:migrate      # Run pending migrations
```

### Data Synchronization

```bash
bun run sync-models               # Sync models from all APIs to database
bun run sync-models:dry-run       # Test sync without database writes
bun run check-sync-health         # Monitor sync status and logs
bun run analytics                 # Generate analytics and reports
bun run db                        # Interactive database CLI
```

## Architecture Patterns

### Service Layer (Effect.js)

The application uses **Effect.js** for functional programming and dependency injection. All business logic is organized as **Effect.Service** classes:

**Service Pattern**:
- Located in `lib/services/`
- All services extend `Effect.Service<Interface>()`
- Services use `Effect.gen()` for composition
- Dependency injection via `lib/layers.ts`

**Key Services**:
- **ModelService**: Aggregates data from 4 external APIs
- **FilterService**: Manages saved filters and filter runs
- **CacheService**: Redis caching with TTL
- **RateLimitService**: Request rate limiting
- **ProviderService**: Provider metadata and mapping
- **DatabaseService**: PostgreSQL operations via Drizzle

**Service Usage Pattern**:
```typescript
import { Effect } from 'effect'
import { ModelService } from '@services/ModelService'

export const getModels = Effect.gen(function* () {
  const service = yield* ModelService
  const models = yield* service.fetchAll()
  return models
})
```

### API Routes & Validation

API routes in `app/api/` follow this pattern:
- **Validation**: Zod or Effect Schema validation for request bodies
- **Error Handling**: Custom error types in `lib/errors.ts`
- **Service Calls**: Compose services via `lib/layers.ts`
- **Response Format**: Standardized JSON with error codes

### Database (Drizzle ORM)

- Schema defined in `src/db/schema*.ts` files
- Migrations in `db/migrations/`
- PostgreSQL dialect
- Relationships: Models (main table) linked to FilterRuns and analytics data

### Data Sync Architecture

Real-time data fetching from multiple sources:
- **models.dev**: 50+ provider pricing and specs
- **OpenRouter**: Real-time model availability
- **HuggingFace**: Open-source model metrics
- **ArtificialAnalysis**: Performance benchmarks

Sync runs via:
1. Automated daily cron (GitHub Actions or self-hosted)
2. Manual trigger via `/api/admin/sync-models`
3. CLI: `bun run sync-models`

## Important Development Notes

### Using Bun

This project is configured for **Bun** exclusively:
- `bun install` instead of `npm install`
- `bun run <script>` instead of `npm run <script>`
- `bun <filename.ts>` for running TypeScript scripts
- All scripts in package.json assume Bun

### TypeScript Configuration

- **Strict mode**: Enabled
- **Target**: ES2017
- **Module**: ESNext
- **Path aliases** defined in `tsconfig.json`:
  - `@services/*` → `lib/services/*`
  - `@components/*` → `components/*`
  - `@type/*` → `lib/types.ts`
  - `@api/*` → `lib/api/*`
  - `@tests/*` → `tests/*`
  - And 10+ others for clean imports

### Testing Framework

**Vitest Configuration**:
- Environment: jsdom (browser simulation)
- Test files: `**/*.{test,spec}.{ts,tsx}`
- Setup: `tests/setup/test-setup.ts`
- Coverage thresholds: 80% (branches, functions, lines, statements)
- Timeout: 10 seconds per test

**Running Tests**:
- Single run: `bun run test`
- Watch mode: `bun run test:watch`
- Coverage: `bun run test:coverage`
- Interactive UI: `bun run test:ui`

### Build System (Turbo)

Monorepo task orchestration:
- `turbo dev` - Development with caching disabled
- `turbo build` - Builds all packages, outputs cached in `.next/`
- `turbo lint` - Code quality checks
- `turbo test` - Test suite with coverage outputs

## Environment Variables

**Required** (for development):
```env
DATABASE_URL=postgresql://username:password@localhost:5432/model_lens
NODE_ENV=development
```

**Optional** (for enhanced features):
```env
# Redis (Upstash) for caching and rate limiting
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# API Keys for external services (if using their features)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
HUGGINGFACE_API_KEY=hf_...
OPENROUTER_API_KEY=sk-or-...

# Configuration
API_RETRY_MS=1000
MODEL_SERVICE_RETRY_MS=1000
DB_RETRY_MS=1000
```

Copy `.env.example` to `.env.local` and populate with your values.

## Project-Specific Documentation

- **README.md** - High-level project overview and features
- **docs/API.md** - Complete API reference with examples
- **docs/Architecture.md** - System design and data flow
- **docs/DATABASE_SETUP.md** - PostgreSQL configuration
- **DATA_SYNC_WORKFLOW.md** - Automated sync scheduling and monitoring
- **packages/website/QUICK_START.md** - Quick start guide
- **packages/website/FILTERS_SETUP_SUMMARY.md** - Filter feature overview
- **packages/website/components/README.filters.md** - Filter component details

## Common Development Tasks

### Adding a New Data Source

1. Create a new service in `lib/services/` extending `Effect.Service`
2. Implement data fetching logic
3. Add transformation functions
4. Update `lib/layers.ts` to include the new service
5. Integrate into `sync-models.ts` script
6. Add database schema changes if needed

### Creating a New API Endpoint

1. Create a new file in `app/api/` following the route structure
2. Define request/response types and Zod/Effect Schema validation
3. Use services from `lib/layers.ts` for business logic
4. Handle errors using custom error types from `lib/errors.ts`
5. Return standardized JSON response
6. Add tests in `tests/api/`

### Modifying the Database Schema

1. Update the relevant schema file in `src/db/schema*.ts`
2. Run `bun run db:generate` to create migration file
3. Review the generated migration
4. Run `bun run db:push` to apply changes
5. Update affected services and types

### Running a Single Test File

```bash
# Run a specific test file
bun run test -- tests/api/models.test.ts

# Run tests matching a pattern
bun run test -- --grep "ModelService"

# Watch mode for specific file
bun run test:watch -- tests/services/ModelService.test.ts
```

## Key Files to Know

**Core Configuration**:
- `package.json` - Workspace scripts and root dependencies
- `packages/website/package.json` - Website-specific scripts and dependencies
- `turbo.json` - Build orchestration tasks
- `packages/website/tsconfig.json` - TypeScript configuration with path aliases
- `packages/website/vitest.config.ts` - Test framework configuration
- `packages/website/drizzle.config.ts` - Database configuration

**Service Composition**:
- `packages/website/lib/layers.ts` - Service dependency injection setup
- `packages/website/lib/services/` - All Effect.Service implementations

**API Routes**:
- `packages/website/app/api/models/route.ts` - Main models endpoint
- `packages/website/app/api/filters/route.ts` - Filter management
- `packages/website/app/api/admin/sync-models/route.ts` - Sync trigger

**Database**:
- `packages/website/src/db/schema.ts` - Main schema exports
- `packages/website/src/db/index.ts` - Database connection

**Data Sync**:
- `packages/website/src/scripts/sync-models.ts` - Main sync script
- `packages/website/lib/services/ModelService.ts` - Data aggregation logic

## Development Workflow

1. **Before starting work**: Run `bun install` to ensure dependencies are up to date
2. **During development**: Use `bun run dev` for live reloading
3. **Before committing**: Run `bun run lint` to format code and `bun run test` to verify
4. **Database changes**: Always use `bun run db:generate` and `bun run db:push`
5. **Code review**: Check that tests pass and type checking passes

## Troubleshooting

### Build Issues
```bash
bun install              # Reinstall dependencies
bun run build           # Rebuild
```

### Database Connection Issues
- Verify `DATABASE_URL` is correct and database is running
- Check PostgreSQL is accessible: `psql $DATABASE_URL`
- Run migrations: `bun run db:push`

### Test Failures
```bash
# Run with verbose output
bun run test:all

# Run specific test file
bun run test -- tests/path/to/test.test.ts

# Check coverage
bun run test:coverage
```

### Type Errors
- TypeScript errors are caught at build time
- Check `tsconfig.json` path aliases match imports
- Strict mode is enabled - all type errors must be fixed

## Resources

- **Next.js**: https://nextjs.org/docs
- **React 19**: https://react.dev/
- **Effect.js**: https://effect.website/
- **Drizzle ORM**: https://orm.drizzle.team/
- **Tailwind CSS**: https://tailwindcss.com/
- **Vitest**: https://vitest.dev/
- **Bun**: https://bun.sh/

## Effect-TS Pattern Rules

This project uses **Effect-TS** extensively. Here are essential patterns and best practices for working with Effect in effect-models:

### Core Concepts

#### Create Pre-resolved Effects with succeed and fail

```typescript
import { Effect, Data } from "effect";

// Create a success effect
const success = Effect.succeed(42);

// Create a failure effect with a custom error type
class ModelError extends Data.TaggedError("ModelError")<{
  readonly message: string;
}> {}

const failure = Effect.fail(new ModelError({ message: "Model not found" }));
```

**Rule**: Use `Effect.succeed()` for known values and `Effect.fail()` for immediate errors.

#### Write Sequential Code with Effect.gen

Use generators to write sequential, readable async code:

```typescript
export const getModel = (id: number) =>
  Effect.gen(function* () {
    const db = yield* Database;
    const model = yield* db.query(`SELECT * FROM models WHERE id = ${id}`);
    if (!model) {
      return yield* Effect.fail(new ModelError({ message: "Not found" }));
    }
    return model;
  });
```

**Rule**: Always use `Effect.gen()` for composing effects. Avoid deep nesting of `.flatMap()` and `.andThen()`.

#### Transform Effect Values with map and flatMap

```typescript
// Simple transformation with map
const doubled = Effect.succeed(5).pipe(
  Effect.map((n) => n * 2) // Effect<number>
);

// Chaining effects with flatMap
const getModelName = (id: number) =>
  Effect.succeed({ id, name: "GPT-4" }).pipe(
    Effect.flatMap((model) =>
      Effect.succeed(model.name) // Effect<string>
    )
  );
```

**Rule**: Use `map()` for pure transformations, `flatMap()` to chain dependent effects.

#### Use .pipe for Composition

```typescript
const program = Effect.succeed(5).pipe(
  Effect.map((n) => n * 2),
  Effect.tap((n) => Effect.log(`Result: ${n}`)),
  Effect.map((n) => n.toString())
);
```

**Rule**: Always use `.pipe()` for chaining operations. Never nest function calls.

### Error Handling

#### Define Type-Safe Errors with Data.TaggedError

```typescript
// Define specific error types
class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly url: string;
  readonly statusCode: number;
}> {}

class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly message: string;
}> {}

// Use in effects
const fetchModels = (url: string): Effect.Effect<Model[], NetworkError> =>
  Effect.tryPromise({
    try: () => fetch(url).then((res) => res.json()),
    catch: (error) =>
      new NetworkError({
        url,
        statusCode: (error as Response).status || 500,
      }),
  });
```

**Rule**: Always use `Data.TaggedError` for custom errors. Never use generic `Error` types. Each error type should have a literal `_tag` for type-safe pattern matching.

#### Handle Errors with catchTag and catchTags

```typescript
const program = fetchModels("/api/models").pipe(
  Effect.catchTags({
    NetworkError: (error) =>
      Effect.gen(function* () {
        yield* Effect.log(`Network error: ${error.statusCode} from ${error.url}`);
        return [];
      }),
    ValidationError: (error) =>
      Effect.gen(function* () {
        yield* Effect.log(`Validation error in ${error.field}: ${error.message}`);
        return [];
      }),
  })
);
```

**Rule**: Use `catchTag()` for single error types, `catchTags()` for multiple. Avoid `catchAll()` without inspecting the error type.

#### Use Conditional Branching with filterOrFail

```typescript
const validateModel = (model: Model): Effect.Effect<Model, ValidationError> =>
  Effect.succeed(model).pipe(
    Effect.filterOrFail(
      (m) => m.name.length > 0,
      () => new ValidationError({ field: "name", message: "Name is required" })
    ),
    Effect.filterOrFail(
      (m) => m.provider.length > 0,
      () =>
        new ValidationError({
          field: "provider",
          message: "Provider is required",
        })
    )
  );
```

**Rule**: Use `filterOrFail()` for validation instead of imperative if statements. Keeps error handling type-safe.

### Dependency Injection & Services

#### Define Services with Effect.Service

```typescript
export class DatabaseService extends Effect.Service<DatabaseService>()(
  "DatabaseService",
  {
    sync: () => ({
      query: (sql: string): Effect.Effect<unknown> =>
        Effect.succeed(`Results for: ${sql}`),
    }),
  }
) {}
```

**Rule**: All services must extend `Effect.Service<T>()` with a descriptive tag name. Never use class constructors directly.

#### Access Services with yield*

```typescript
const getModels = Effect.gen(function* () {
  const db = yield* DatabaseService;
  const results = yield* db.query("SELECT * FROM models");
  return results;
});
```

**Rule**: Always access services with `yield* ServiceName` inside `Effect.gen()`. Never pass services as parameters.

#### Compose Services with lib/layers.ts

```typescript
// in lib/layers.ts
import { Layer } from "effect";

export const AppLayer = Layer.merge(
  DatabaseService.Default,
  CacheService.Default,
  ModelService.Default,
  FilterService.Default
);

// in a component or route
const program = Effect.gen(function* () {
  const modelService = yield* ModelService;
  // All dependencies are available through the composed layer
});
```

**Rule**: Always compose services in `lib/layers.ts`. Provide the single `AppLayer` to all effects.

### Async & Effects

#### Wrap Synchronous Code with sync

```typescript
const parseJson = (input: string) =>
  Effect.sync(() => JSON.parse(input));
```

**Rule**: Use `Effect.sync()` for pure synchronous operations guaranteed not to throw.

#### Handle Sync Operations that May Throw with try

```typescript
const safeParseJson = (input: string) =>
  Effect.try({
    try: () => JSON.parse(input),
    catch: (error) => new JsonParseError({ error: String(error) }),
  });
```

**Rule**: Use `Effect.try()` when wrapping code that might throw. Always provide a `catch` handler that returns a typed error.

#### Wrap Promises with tryPromise

```typescript
const fetchModels = () =>
  Effect.tryPromise({
    try: () => fetch("/api/models").then((res) => res.json()),
    catch: (error) => new NetworkError({ message: String(error) }),
  });
```

**Rule**: Use `Effect.tryPromise()` for Promise-based APIs. Always handle rejection with a typed error.

#### Execute Effects with runPromise

```typescript
// In a Next.js API route
const result = await Effect.runPromise(
  program.pipe(Effect.provide(AppLayer))
);
```

**Rule**: `Effect.runPromise()` is the only way to execute effects outside the Effect world. Always provide all required layers.

### Concurrency & Performance

#### Run Independent Effects in Parallel with Effect.all

```typescript
// Fetch from multiple APIs concurrently
const results = yield* Effect.all(
  [
    fetchFromModelsdev(),
    fetchFromOpenRouter(),
    fetchFromHuggingFace(),
  ],
  { concurrency: "unbounded" } // Important: always specify concurrency
);
```

**Rule**: Always specify the `concurrency` option in `Effect.all()`. Never omit it. Use `"unbounded"` for I/O operations, or a number for CPU-bound work.

#### Process Collections with forEach

```typescript
const processModels = (ids: number[]) =>
  Effect.forEach(
    ids,
    (id) => ModelService.pipe(Effect.flatMap((svc) => svc.getModel(id))),
    { concurrency: 5 } // Process 5 models concurrently
  );
```

**Rule**: Use `Effect.forEach()` for batch processing with explicit concurrency limits.

#### Retry Failed Operations with Schedule

```typescript
import { Schedule, Duration } from "effect";

const fetchWithRetry = () =>
  fetchModels().pipe(
    Effect.retry(
      Schedule.exponential(Duration.millis(100)).pipe(
        Schedule.compose(Schedule.recurs(3)) // Retry 3 times with exponential backoff
      )
    )
  );
```

**Rule**: Always wrap external API calls with retry logic using `Schedule`. Use exponential backoff to avoid overwhelming servers.

#### Add Timeouts to Prevent Hanging

```typescript
const fetchWithTimeout = () =>
  fetchModels().pipe(
    Effect.timeout(Duration.seconds(10)), // Fail if takes > 10s
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.log("Fetch timed out");
        return [];
      })
    )
  );
```

**Rule**: Always add timeouts to external operations. Never let operations hang indefinitely.

### Observability

#### Log with Effect.log

```typescript
const program = Effect.gen(function* () {
  yield* Effect.log("Starting model sync...");
  yield* Effect.logInfo("Fetching from OpenRouter...");
  yield* Effect.logWarning("Rate limit approaching");
  yield* Effect.logError("Failed to fetch from models.dev");
});
```

**Rule**: Use `Effect.log*()` functions instead of `console.log()`. These integrate with Effect's logging system.

#### Add Context with tap

```typescript
const getModel = (id: number) =>
  database.query(`SELECT * FROM models WHERE id = ${id}`).pipe(
    Effect.tap((model) =>
      Effect.log(`Found model: ${model.name} by ${model.provider}`)
    )
  );
```

**Rule**: Use `.tap()` to add side effects (logging, metrics) without changing the value.

### Anti-Patterns to Avoid

❌ **Never use `.unsafeRunSync()` or `.unsafeRunPromise()`** - These bypass Effect's guarantees. Always use typed runners.

❌ **Never use `try/catch` in `Effect.gen()`** - Use `Effect.try()` to lift exceptions into the effect world.

❌ **Never pass services as parameters** - Always access them with `yield*` from the context.

❌ **Never use `.getOrElse()` on Options** - Use pattern matching with `Option.match()` instead.

❌ **Never nest effects** - Use `flatMap` to flatten `Effect<Effect<A>>` into `Effect<A>`.

❌ **Never use generic `Error` types** - Always define `Data.TaggedError` subclasses.

❌ **Never use `Effect.all()` without specifying concurrency** - This can cause resource exhaustion.

❌ **Never forget to handle failures** - Every `yield*` could fail; always use `catchTag` or similar.

## Key Architecture Decisions

1. **Effect.js for Services**: All business logic uses Effect.js service pattern for functional error handling and dependency injection
2. **Next.js App Router**: Uses modern App Router (not Pages Router) with server components by default
3. **PostgreSQL with Drizzle**: Type-safe database access with migrations
4. **Monorepo with Turbo**: Allows scaling to multiple packages while maintaining shared configuration
5. **Real-time Multi-Source Aggregation**: Fetches from 4+ APIs simultaneously with retry logic and caching
6. **Redis Caching**: Optional Upstash Redis for production caching and rate limiting

