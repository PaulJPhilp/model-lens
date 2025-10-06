# Architecture Document for ModelLens v1

## Document Version
- **Version**: 2.0
- **Date**: 2025-01-27
- **Author**: Paul Philp (with collaboration via T3 Chat)
- **Status**: Updated to reflect current implementation

## Overview
ModelLens v1's architecture is designed for simplicity, testability, and extensibility, leveraging Effect 3.1.9 as the core runtime for managing side effects (e.g., API fetches, data transformation). Every component involving side effects, dependencies, or coordination will be modeled as an `Effect.Service` where applicable, enabling dependency injection (DI), mocking for tests, and composable layers. This aligns with functional programming principles: pure functions for business logic, services for impure operations (e.g., HTTP calls), and structured errors for failure handling.

The architecture is monolith-focused for v1 (single Next.js app, no monorepo yet), with clear separation of concerns:
- **Server-Side**: Effect services for data fetching and transformation (SSR in Next.js App Router).
- **Client-Side**: Effect for lightweight coordination (e.g., filter state updates), integrated with React 19 hooks.
- **UI Layer**: Shadcn/ui + TanStack React Table, styled with Tailwind 4 and the provided config/globals.css.
- **Data Flow**: Multiple APIs (models.dev, OpenRouter, HuggingFace, ArtificialAnalysis) → Effect Services (fetch/transform) → TanStack Table (render/sort/filter/search).
- **Database**: PostgreSQL with Drizzle ORM for model data persistence and caching.
- **Error Philosophy**: All Effects use standardized error types (defined below) for consistent handling—no raw exceptions; failures surface as typed errors in UI (e.g., "Failed to load models: Network error").

This setup ensures v1 is lean, performant (<2s load), and ready for v2 expansions (e.g., TokenLens service).

## Tech Stack
- **Runtime**: Effect 3.1.9 (all services/layers); `@effect/experimental` for React hooks (e.g., `useRun` for client Effects).
- **Framework**: Next.js 15 (App Router for SSR pages/API routes); React 19 (concurrent features for smooth interactions).
- **Data/Table**: TanStack React Table v8 (headless for custom UI); no additional state libs (use React state for filters).
- **Styling**: Tailwind CSS 4 (provided config with OKLCH colors, fonts, plugins); globals.css (verbatim integration for base styles, custom utilities).
- **UI Primitives**: Shadcn/ui (Table, Select, Input, Slider – styled with brand classes like `.text-brand`, `.bg-elevated`).
- **Fonts/Icons**: Next/font (Montserrat, Merriweather, Fira Code); Lucide React or SVGs for modalities/capabilities icons.
- **Package Management**: pnpm (workspace-ready for future monorepo).
- **Database**: PostgreSQL with Drizzle ORM for model data persistence and caching.
- **Other**: TypeScript 5.5+ strict mode; Bun for development and scripts.

## High-Level Architecture Diagram (Text-Based)
```
[User Request]
     |
[Next.js App Router]  <-- SSR Page (/models): Runs Server Effects
     |
     +-- [ModelService]  <-- Effect.Service: Fetches/transforms from multiple APIs
           |                (models.dev, OpenRouter, HuggingFace, ArtificialAnalysis)
           |                (Layer: HttpClient + DataTransformer + Database)
           +-- Standardized Errors (e.g., ApiError, ValidationError)
           +-- [ModelDataService] <-- Effect.Service: Database persistence/caching
                |
     +-- [Table Data Provider]  <-- Passes enriched data to RSC
                |
Client-Side ('use client'):
     |
[React 19 + TanStack Table]  <-- Renders table, handles sort/filter/search
     |                           (useEffect for client Effects like FilterValidator)
     +-- [FilterService]  <-- Effect.Service: Validates/Applies filters (Layer: StateCoordinator)
     +-- [ModeService]    <-- Effect.Service: Toggles light/dark (Layer: Storage for localStorage)
           |
[Shadcn/UI + Tailwind 4]  <-- Styles (globals.css base, config for colors/fonts/z-index)
     |
[Browser]  <-- Responsive, modes via class/darkMode: "class"
```

## Core Modules and Services
All services are defined as `Effect.Service` interfaces with tags for DI. Use `Effect.gen` for procedural Effects, `pipe` for composition, and `Layer` for merging (e.g., `layer.merge(HttpLayer).provideTo(App)`). Services are scoped: Server-only for fetches, Client-only for UI state.

### 1. Data Layer (Server-Side Focus)
- **ModelService** (`Effect.Service` Tag: `ModelService`):
  - **Purpose**: Handles fetching, transformation, and error wrapping from multiple AI model APIs.
  - **Methods**:
    - `fetchModels(): Effect<ModelService.FetchModels, ModelService.Error>`: Async Effect to fetch from multiple APIs (models.dev, OpenRouter, HuggingFace, ArtificialAnalysis), transform responses to unified `Model[]` format, handle retries (3x with exponential backoff), and optionally store in database.
    - `fetchModelsFromAPI(): Effect<ModelService.FetchModelsFromAPI, ModelService.Error>`: Direct API fetch for real-time data without database dependency.
    - `getModelStats(): Effect<ModelService.GetModelStats, ModelService.Error>`: Returns statistics about available models.
  - **Dependencies**: Inject `ModelDataService` for optional database persistence; uses shared transformer utilities.
  - **Layer**: `ModelServiceLive`: Merges HttpLayer + Transformer + Database; provides to Next.js SSR and API routes.
  - **Why Service?**: Mockable for tests (e.g., stub API responses); composable for v2 joins (e.g., TokenLens).

- **ModelDataService** (`Effect.Service` Tag: `ModelDataService`):
  - **Purpose**: Handles database persistence and caching of model data.
  - **Methods**:
    - `storeModelBatch(models: Model[]): Effect<ModelDataService.StoreModelBatch, ModelDataService.Error>`: Batch insert/update models in PostgreSQL.
    - `getModelsFromDB(): Effect<ModelDataService.GetModels, ModelDataService.Error>`: Retrieve models from database.
  - **Dependencies**: PostgreSQL connection via Drizzle ORM.
  - **Layer**: `ModelDataServiceLive`: Provides database operations to other services.
  - **Why Service?**: Enables background data persistence; mockable for tests.

- **Types** (in `@myorg/core/types.ts` for shared):
  - `Model`: Interface as PRD (name: string, provider: string, contextWindow: number, inputCost: number, modalities: string[], capabilities: string[], releaseDate: string).
  - `RawModel`: From API (any, for mapping).

### 2. UI/Interaction Layer (Client-Side Focus)
- **FilterService** (`Effect.Service` Tag: `FilterService`):
  - **Purpose**: Coordinates search/filter/sort state; validates inputs to prevent invalid states.
  - **Methods**:
    - `applyFilters(models: Model[], search: string, filters: Filters): Effect<FilterService.Apply, FilterService.Error>`: Sync Effect to filter/sort array (e.g., fuzzy search via simple string includes; sort via TanStack logic wrapped in Effect for composability).
    - `validateFilter(filter: Partial<Filters>): Effect<FilterService.Validate, FilterService.Error>`: Ensures valid ranges (e.g., cost slider 0-$10).
  - **Dependencies**: Inject optional `Validator` (e.g., Zod wrapped in Effect for type-safe filters: { provider: string[], costRange: [number, number], modalities: string[] }).
  - **Layer**: `FilterServiceLive`: Provides to TanStack `useReactTable` via custom hook (e.g., `useTableData` running the Effect on state change).
  - **Integration**: In `ClientTable.tsx`, use `useRun(FilterService.applyFilters)` for real-time updates without re-renders.
  - **Why Service?**: Reusable for v2 (e.g., add search debouncing); easy to test filter logic in isolation.

- **ModeService** (`Effect.Service` Tag: `ModeService`):
  - **Purpose**: Manages light/dark mode state and persistence.
  - **Methods**:
    - `getMode(): Effect<ModeService.Get, never>`: Reads from localStorage or `prefers-color-scheme`.
    - `setMode(mode: 'light' | 'dark'): Effect<ModeService.Set, ModeService.Error>`: Updates class on `<html>`, persists to storage.
    - `toggleMode(): Effect<ModeService.Toggle, ModeService.Error>`: Switches and persists.
  - **Dependencies**: None (uses DOM APIs wrapped in Effect.sync).
  - **Layer**: `ModeServiceLive`: Provides to a custom hook in layout (e.g., `useMode` with `useRun(ModeService.getMode)`).
  - **Integration**: Apply `dark` class in `app/layout.tsx`; toggle via navbar switch (onClick runs Effect).
  - **Why Service?**: Future-proof for v2 (e.g., persist user prefs across sessions); mock for testing mode transitions.

### 3. Shared Utilities (Pure or Lightweight Effects)
- **ValidatorService** (`Effect.Service` Tag optional, if needed for complex logic):
  - Pure functions for data (e.g., `validateModel(m: Model): Result<Model, Error>` via Effect.either).
- **IconMapper**: Non-Service (pure map): Modalities/capabilities to icons (e.g., { vision: <EyeIcon className="text-orange" /> }).

## Standardized Error Handling with Effect
All Effects use a unified error union type, surfaced via `Effect.catchAll` or `orElse` for graceful degradation. Errors are typed, logged (console.error), and rendered in UI (e.g., toast or inline message).

- **Core Error Type** (`lib/errors.ts`):
  ```typescript
  import { Effect } from 'effect';

  export class ApiError extends Effect.TaggedError("ApiError")<{
    readonly error: string;
    readonly status?: number;
  }>() {}

  export class ValidationError extends Effect.TaggedError("ValidationError")<{
    readonly field: string;
    readonly message: string;
  }>() {}

  export class NetworkError extends Effect.TaggedError("NetworkError")<{
    readonly error: unknown;
  }>() {}

  export class UnknownError extends Effect.TaggedError("UnknownError")<{
    readonly error: unknown;
  }>() {}

  export type AppErrorCause =
    | ApiError
    | ValidationError
    | NetworkError
    | UnknownError;

  export class AppError extends Effect.TaggedError("AppError")<{
    readonly cause: AppErrorCause;
  }>() {}
  ```
- **Usage Standards**:
  - **Fetching**: `Effect.tryPromise({ try: () => fetch(url), catch: (e) => new AppError(new NetworkError(e)) })`.
  - **Validation**: `Effect.fail(new AppError(new ValidationError('cost', 'Range must be 0-10')))`.
  - **Handling**: In services, `Effect.tapErrorCause((cause) => Effect.logError(JSON.stringify(cause)))`; in UI, `orElseSucceed(fallback)` (e.g., empty array for models, "Data unavailable" message).
  - **Retry Policy**: For API calls, use `withRetryAndLogging` helper with exponential backoff and configurable retry counts.
  - **Testing**: Mock with `Effect.fail(new AppError(...))` for error paths.
  - **Global Provider**: Wrap app in `Effect.Runtime` (Next.js provider); use `Effect.provide(modelServiceLayer)` in pages.

## Deployment and Runtime
- **Next.js Integration**:
  - Server Components (e.g., /models/page.tsx): `const models = await Effect.runPromise(ModelService.fetchModels, { onError: (e) => [] });` → Pass to ClientTable.
  - Client Components: Use `@effect/experimental/Run` hooks (e.g., `useRun(FilterService.applyFilters)`).
  - API Routes: Not needed for v1 (SSR only), but if added: Route handlers run Effects similarly.
- **Build**: pnpm build; Vercel auto-deploys from GitHub (root dir: ./, install: pnpm i).
- **Layers Composition** (in lib/layers.ts): `const AppLayer = Layer.mergeAll(ModelServiceLive, FilterServiceLive, ModeServiceLive, ModelDataServiceLive);` – Provide to root in _app or page.
- **Testing**: Vitest for services (mock layers: `Layer.succeed(ModelService, mockImpl)`); comprehensive test coverage for all service implementations.
- **Environment**: Centralized environment validation with required variables (DATABASE_URL, NODE_ENV) and optional configuration (retry policies).
- **Scripts**: Daily sync script (`src/scripts/sync-models.ts`) for automated data updates.

## Implementation Status vs Original Plan

### ✅ **Completed Features**
- **Multiple API Sources**: Successfully integrated models.dev, OpenRouter, HuggingFace, and ArtificialAnalysis APIs
- **Database Integration**: PostgreSQL with Drizzle ORM for model data persistence and caching
- **Shared Transformers**: Centralized model transformation logic in `lib/transformers/model-transformer.ts`
- **Environment Validation**: Comprehensive environment variable validation with proper error handling
- **Retry Policies**: Standardized retry mechanisms with exponential backoff for all external API calls
- **Error Handling**: Proper Effect-TS error types with structured error propagation
- **Component Architecture**: Refactored ModelTable into focused, reusable components
- **Test Coverage**: Comprehensive unit tests for all service implementations
- **API Routes**: Public endpoints for models and admin endpoints for data synchronization

### 🔄 **Architecture Decisions Made**
1. **Database Addition**: Added PostgreSQL for data persistence (originally planned as stateless)
2. **Multiple APIs**: Expanded from single models.dev API to four sources for comprehensive coverage
3. **Background Sync**: Implemented automated daily synchronization with database storage
4. **Component Splitting**: Broke down monolithic ModelTable into specialized hooks and components
5. **Effect-TS Integration**: Full Effect-TS adoption with proper service composition and dependency injection

### 📋 **Current Architecture Benefits**
- **Resilience**: Partial failure handling with graceful degradation
- **Performance**: Background data persistence with real-time API fallback
- **Maintainability**: Modular components with clear separation of concerns
- **Testability**: Comprehensive mocking and isolated unit tests
- **Scalability**: Ready for v2 expansions (TokenLens, additional APIs)