# Model-Lens Agent Guidelines

## Build/Lint/Test Commands

### Monorepo Commands (from root)
- `bun dev` - Start development servers for all packages
- `bun build` - Build all packages
- `bun lint` - Lint all packages with Biome
- `bun test` - Run all tests with Vitest

### Website Package Commands (cd packages/website)
- `bun run dev` - Start Next.js development server
- `bun run build` - Build Next.js app
- `bun run start` - Start production server
- `bun run lint` - Run Biome linter and formatter
- `bun run test` - Run all tests
- `bun run test:watch` - Run tests in watch mode
- `bun run test:coverage` - Run tests with coverage
- `bun run test:ui` - Run tests with UI
- `bun run test:api` - Run API tests only
- `bun run test:components` - Run component tests only
- `bun run test:services` - Run service tests only
- `bun run test:e2e` - Run E2E tests only

### Single Test Execution
```bash
# Run specific test file
bun test tests/api/models.test.ts

# Run tests in specific directory
bun test tests/components/
```

### Database Commands
- `bun run db:migrate` - Run database migrations
- `bun run db:generate` - Generate migrations from schema
- `bun run db:push` - Push schema changes to database
- `bun run sync:models` - Sync model data from external APIs

## Architecture & Codebase Structure

### Monorepo Structure
- **packages/lib/** - Shared utilities and types
- **packages/website/** - Next.js application
  - **app/** - Next.js App Router (API routes, pages)
  - **lib/** - Application-specific utilities, services, config
  - **src/db/** - Database schemas and migrations
  - **components/** - React components
  - **tests/** - Comprehensive test suite

### Tech Stack
- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: PostgreSQL with Drizzle ORM
- **Caching**: Upstash Redis with rate limiting
- **AI Integration**: AI SDK (@ai-sdk/react) for model interactions
- **Functional Programming**: Effect library for side effects
- **Testing**: Vitest with jsdom, coverage thresholds at 80%
- **Linting/Formatting**: Biome (double quotes, semicolons as needed)
- **Package Manager**: Bun

### Key Directories & APIs
- **API Routes**: `/api/models`, `/api/chat`, `/api/filters/*`
- **Services**: Model service (external API integration), Filter service (business logic)
- **Database**: Models table, saved_filters table with rule-based filtering
- **Types**: Model interface, filter rule clauses, saved filter configurations

## Code Style Guidelines

### TypeScript
- Strict mode enabled
- Use explicit types over inference for public APIs
- Prefer interfaces over types for object shapes
- Use `unknown` over `any` for untyped data

### Imports & Path Aliases
```typescript
// Use path aliases instead of relative imports
import { Model } from '@/lib/types'
import { apiClient } from '@/lib/api/client'
import { ModelTable } from '@/components/ModelTable'
import { FilterService } from '@/services/FilterService'
```

### Naming Conventions
- **Files**: kebab-case for components, camelCase for utilities
- **Components**: PascalCase
- **Functions/Variables**: camelCase
- **Types/Interfaces**: PascalCase
- **Constants**: UPPER_SNAKE_CASE

### Formatting (Biome)
- Double quotes for strings
- Semicolons only when needed
- 2-space indentation
- Trailing commas in multiline structures

### Error Handling
- Use Effect library for functional error handling
- Prefer typed errors over generic Error
- Handle async operations with proper error boundaries

### Testing
- Write tests alongside implementation
- Use descriptive test names with AAA pattern
- Mock external dependencies
- Maintain 80% coverage threshold across all metrics
- Use test utilities from `@/tests/setup/test-utils`

### Database & Schema
- Use Drizzle ORM for type-safe queries
- Define schemas in `src/db/schema.ts`
- Use migrations for schema changes
- Follow PostgreSQL best practices

### AI/Model Integration
- Use AI SDK for consistent model interactions
- Handle streaming responses appropriately
- Implement proper error handling for external APIs
- Cache responses when appropriate

### Effect Library Patterns
- **ONLY use `Context.Tag` class pattern**: `export class MyService extends Context.Tag("ServiceName")<MyService, ServiceInterface>() {}`
- Use `Layer.succeed(MyService, implementation)` for service implementations
- Use `yield* MyService` to access services in effects
