# Implementation Plan for ModelLens v1

## Overview
This plan outlines a phased, iterative approach to building ModelLens v1, prioritizing the Effect services (build/test first for a solid foundation) before layering on the UI. The focus is on incremental progress: get core data flowing through Effects, verify with tests, then integrate into React/Next.js step by step. Total estimated timeline: 3-5 days for a solo dev (assuming 4-6 hours/day), but adjustable.

- **Methodology**: TDD/BDD where feasible—write tests before implementation for services; manual/e2e for UI flows.
- **Tools**: pnpm for deps; VS Code/Editor with Effect/TS extensions; Vitest for unit tests (services); Storybook or manual for UI (no full E2E suite for v1).
- **Branching**: Use GitHub feature branches (e.g., `feat/model-service`); merge to `main` via PRs with self-review.
- **Milestones**: End of each phase: Commit, test run (`pnpm test`), local dev server check (`pnpm dev`).
- **Dependencies**: Node 20+; pnpm 9+; GitHub repo (`PaulJPhilp/model-lens`).

## Phase 1: Project Setup (1-2 hours)
Goal: Bootstrap the monorepo-like single Next.js app with configs, ensuring Tailwind/Effect basics work.

1. **Initialize Repo**:
   - `mkdir model-lens && cd model-lens`
   - `pnpm init` (root package.json: workspaces optional for v1 single-app).
   - `git init; git add .; git commit -m "Initial setup"`.

2. **Create Next.js App**:
   - `npx create-next-app@15 apps/web --typescript --tailwind --app --src-dir --no-eslint --app --import-alias "@/*" --use-pnpm`
   - Move to root: `mv apps/web/* .` (flatten for simplicity in v1; expand to monorepo later).
   - Update `package.json`: Add deps (`effect@3.1.9`, `@effect/experimental@3.1.9`, `@tanstack/react-table@^8.16.0`, `lucide-react@^0.263.1`, `class-variance-authority@^0.7.0`).
   - `pnpm add -D vitest jsdom @types/node` (tests); `pnpm add -D @tailwindcss/typography tailwindcss-fluid-typography` (plugins).
   - Fonts: `pnpm add @next/font-google` (Montserrat, Merriweather, Fira Code).

3. **Integrate Branding**:
   - `tailwind.config.ts`: Copy provided config verbatim.
   - `app/globals.css`: Copy provided CSS verbatim (import Tailwind directives).
   - `app/layout.tsx`: Add `<html className={mode ? 'dark' : ''}>` (placeholder for mode); font setup (e.g., `localFont({ src: Montserrat })`).

4. **Test Setup**:
   - `vitest.config.ts`: Basic config (environment: 'jsdom', test files: `**/*.{test,spec}.ts(x)}`).
   - Run `pnpm test` (empty pass).

5. **Commit**: Branch `setup/base`; PR to `main`.

## Phase 2: Build and Test Services (4-6 hours)
Goal: Implement all Effect.Services in isolation (`lib/services/`), with unit tests verifying logic/errors. Use `Effect.RunPromise` for sync testing.

1. **Core Types and Errors** (`lib/types.ts` and `lib/errors.ts`):
   - Define `Model` interface (as PRD).
   - Define `AppError` and `AppErrorCause` (union: ApiError, ValidationError, NetworkError, UnknownError).
   - Test: Vitest suite (`lib/errors.test.ts`): Instantiate/serialize errors (`expect(new AppError({ _tag: 'ApiError', error: 'test' })).toEqual(...)`).

2. **ModelService** (`lib/services/ModelService.ts`):
   - Interface: `fetchModels(): Effect<Model[], AppError>`.
   - Live Impl: Use `Effect.tryPromise(fetch('https://models.dev/api.json'))` → `pipe(flatMap(res => res.json()), map(data => data.models.map(transformModel)), retry({times:3, delay:1000}))`.
   - Transformer: `transformModel(raw): Model` (normalize costs, dates; map modalities to icons).
   - Layer: `ModelServiceLive = Layer.effect(ModelService, () => pipe(...))`.
   - Test (`services/ModelService.test.ts`): Mock fetch (vi.mock('node-fetch')), test happy path (returns Model[]), error paths (ApiError on 500, NetworkError on timeout), retry (simulate 2 fails, succeeds). Use `Effect.runSync` or `runPromise` in tests; assert `expect(models).toHaveLength(100);`.

3. **FilterService** (`lib/services/FilterService.ts`):
   - Interface: `applyFilters(models: Model[], search: string, filters: Filters): Effect<Model[], AppError>`; `validateFilters(filters: Partial<Filters>): Effect<Filters, AppError>`.
   - Impl: Sync `Effect.sync(() => { filter by search.includes; sort via array.sort; validate ranges }).pipe(orElseSucceed(defaultFilters))`.
   - Filters Type: `{ provider: string[], costRange: [number, number], modalities: string[], capabilities: string[] }`.
   - Layer: `FilterServiceLive`.
   - Test (`services/FilterService.test.ts`): Input models array, test search (e.g., "gpt" returns GPT models), sort (by cost), filters (cost 0-5 returns cheap), validation (invalid range → ValidationError).

4. **ModeService** (`lib/services/ModeService.ts`):
   - Interface: `getMode(): Effect<'light' | 'dark', never>`; `setMode(mode: 'light'|'dark'): Effect<void, AppError>`; `toggleMode(): Effect<'light'|'dark', AppError>`.
   - Impl: `getMode: Effect.sync(() => localStorage.getItem('mode') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))`; `setMode: Effect.sync(() => { document.documentElement.classList.toggle('dark', mode === 'dark'); localStorage.setItem('mode', mode); })`.
   - Layer: `ModeServiceLive`.
   - Test (`services/ModeService.test.ts`): Mock localStorage/DOM (`vi.spyOn(window.localStorage)`), test get from storage/system, set toggles class, toggle flips state.

5. **Integrated Layer** (`lib/layers.ts`):
   - `AppLayer = Layer.mergeAll(ModelServiceLive, FilterServiceLive, ModeServiceLive)`.
   - Test: Smoke test (`layers.test.ts`): `const program = AppLayer.pipe(Effect.provideTo(Effect.all([ModelService.fetchModels, FilterService.applyFilters(/*...*/)]))); expect(Effect.runSync(program)).toBeDefined();`.

6. **Run Tests**: `pnpm test --coverage` (aim 90%+ coverage for services).
7. **Commit**: Branch `feat/services`; PR to `main`.

## Phase 3: Build UI Step by Step (6-8 hours)
Goal: Integrate services into components incrementally; test visuals/manually.

1. **Layout and Navbar** (`app/layout.tsx` and `components/Navbar.tsx`):
   - Layout: Wrap `<body>` with Effect runtime context (via provider); load fonts; apply globals.css.
   - Navbar: Simple div with "ModelLens" (h1 in font-sans bold, primary color); mode toggle button (onClick runs `useRun(ModeService.toggleMode)`).
   - Integrate ModeService: Custom hook `useMode` (useState + useRun for get/set).
   - Test: Manual dev server (`pnpm dev`); toggle mode → class changes, persists on refresh.
   - Commit: Branch `feat/ui-layout`.

2. **Table Component** (`components/ModelTable.tsx` – 'use client'):
   - Use TanStack `useReactTable`: Columns def (accessorKey for each, header as string, cell renderer e.g., for icons: `({row}) => <IconMap modalities={row.modalities} />`).
   - Initial Data: Hardcode via Effect (run ModelService in useEffect, set state).
   - Render: Shadcn Table with rows/headers styled (e.g., th .font-sans font-bold text-primary, td .text-brand border-brand).
   - Test: Manual – load page, verify columns render (e.g., sample data if API down).
   - Commit: Branch `feat/ui-table`.

3. **Add Interactivity Step-by-Step**:
   - **Sort**: Expose TanStack getSortedRowModel; click headers → auto-sort.
   - **Search**: Input field onChange → update search state → re-run FilterService.applyFilters on models.
   - **Filters**: Separate components (ProviderSelect: shadcn Select multi; CostSlider: shadcn Slider; MultiSelect for modalities/capabilities).
     - onChange → validate via FilterService → applyFilters → update table data.
   - Toolbar: Div with Input, filters, reset button (onClick clears state).
   - Integrate FilterService: Custom hook `useFilteredModels` (useState for search/filters, useRun for apply/validate).
   - Test: Manual – input search "gpt" → filters to 5 rows; slider 0-2 → cheap models; sort cost → asc/desc arrows.
   - Pagination: If >50 rows, add TanStack pagination (simple 10/page).
   - Commit: Branches like `feat/ui-search`, `feat/ui-filters`, `feat/ui-pagination` (merge sequentially).

4. **Page Integration** (`app/models/page.tsx`):
   - Server Component: `const rawModels = await Effect.runPromise(ModelService.fetchModels);` (handle error → <div>Error loading...</div>).
   - Pass models to <ModelTable initialModels={rawModels} /> (client boundary).
   - Landing: This is the root page (/models).
   - Test: Full flow – dev server, search/filter/sort; error sim (mock API fail → fallback msg).
   - Commit: Branch `feat/ui-integration`.

5. **Polish and Manual QA**:
   - Responsive: Mobile stack (TanStack column visibility); dark/light toggle.
   - Accessibility: ARIA (table role="table", sortable aria-sort); keyboard nav for filters.
   - Performance: DevTools check load <2s; TanStack virtualization if needed (manual rows >100).
   - Run `pnpm dev` end-to-end: Filter to Google vision models → Sort by date → Toggle mode.

6. **Final Tests**:
   - Component: Vitest for table renders (`render(<ModelTable data={mockModels} />)` → screen.getByRole('table')).
   - Integration: Manual browser tests (Chrome/FF/Safari; light/dark; mobile via dev tools).
   - Coverage: `pnpm test --coverage` (80%+ overall).

7. **Commit**: Branch `feat/ui-complete`; PR to `main`.

## Phase 4: Final Integration, Deploy, and Launch (1-2 hours)
1. **Build/Verify**:
   - `pnpm build` (no errors); `pnpm start` (production check).
   - Lint: `pnpm eslint .` (fix any).

2. **Deploy**:
   - Push to GitHub (`git push origin main`).
   - Vercel: Connect repo; Framework: Next.js; Install: `pnpm i`; Build: `pnpm build`; Root: `/`.
   - Test Prod: /models loads table; filters work.

3. **Launch Prep**:
   - Update README.md: Install/run instructions, screenshots of table.
   - MIT License: Add LICENSE file.
   - Announce: GitHub release v1.0, share on X/Reddit if desired.

4. **Post-Launch**: Monitor Vercel logs; track issues.

This plan ensures services are rock-solid before UI, with testing at each step. If any phase needs more detail (e.g., test code snippets), or adjustments (e.g., timelines), let me know. Ready to start Phase 1?