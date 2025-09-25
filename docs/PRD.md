# Product Requirements Document (PRD) for ModelLens v1

## Document Version
- **Version**: 1.0
- **Date**: [Insert Current Date, e.g., 2025-09-24]
- **Author**: Paul Philp (with collaboration via T3 Chat)
- **Status**: Draft for Review (Finalized upon agreement)

## Overview
### Project Name
ModelLens

### Product Purpose
ModelLens is a developer-focused web dashboard designed to streamline the discovery and comparison of Large Language Models (LLMs) for AI engineers. It addresses the challenge of fragmented and hard-to-search model information across providers by offering a simple, interactive table that pulls metadata from the Models.dev API. By enabling quick filtering, searching, and sorting, ModelLens empowers users to identify models that align with their needs—such as affordable options with specific capabilities like vision support—without the overhead of manual documentation review or repeated API experiments.

For v1, ModelLens prioritizes core usability as a lightweight, open-source (MIT license) tool, serving as an accessible entry point for LLM exploration in development workflows. It focuses on reliability, speed, and a clean interface to build user trust and enable rapid iteration.

### Business Goals
- Provide immediate value to AI/ML developers by reducing time spent on model research from hours to minutes.
- Establish ModelLens as a foundational OSS project in the LLM tooling ecosystem, with potential for future integrations (e.g., TokenLens for estimates).
- Achieve quick MVP launch to gather feedback and validate the concept.

### Success Metrics (for v1 Post-Launch)
- User Engagement: 100+ unique visitors via GitHub/Vercel deployment within first month; 50+ stars/forks on GitHub.
- Performance: 95%+ table load under 2s (tracked via Vercel analytics).
- Feedback: 80% positive qualitative responses on usability (e.g., via GitHub issues/PRs).

## Target Audience
- **Primary Users**: AI engineers and software developers building LLM-powered apps (e.g., chatbots, agents) using TypeScript/Next.js stacks. They need fast, accurate model comparisons for prototyping and cost optimization.
- **User Pain Points**:
  - Scattered docs: Models.dev provides API access, but lacks easy visualization.
  - Overwhelm: Hundreds of models across providers; hard to filter by cost, modalities (text/vision), or capabilities (tool-calling).
  - Workflow Friction: Manual sorting in spreadsheets or browser tabs slows experimentation.
- **User Needs**: Intuitive search/filter/sort; responsive, dark/light modes; no sign-up required.
- **Persona Example**: "Alex, 28, AI Engineer at a startup—needs to pick a low-latency model under $2/1M tokens for a vision-enabled app; spends 30min researching weekly."

## Key Features for v1
v1 is scoped minimally to deliver a functional core: a single interactive table as the primary (and only) view. No timeline, exports, or advanced integrations yet.

### 1. Data Source and Table Content
- **Source**: Fetch model metadata directly from the Models.dev API (`https://models.dev/api.json`).
  - Expected Data: 100+ models covering providers like OpenAI, Anthropic, Google, and others.
  - Key Attributes Fetched and Handled:
    - Model name (e.g., "gpt-4o").
    - Provider (e.g., "OpenAI").
    - Context window (tokens, e.g., 128000).
    - Input/output costs ($/1M tokens, e.g., 5.00 for input).
    - Modalities (array, e.g., ["text", "vision"] – display as icons: text 📝, vision 👁️).
    - Capabilities (array, e.g., ["tool-calling"] – display as icons: 🔧 for tools).
    - Release date (e.g., "2024-05-13").
  - Error Handling: Graceful fallbacks (e.g., display "Loading..." during fetch; show "Unable to load data – try refreshing" with retry logic if API fails; optional static fallback data for offline testing).
- **Table Structure**:
  - **Columns** (Fixed Set, Non-Resizable for v1):
    - Model Name (string, left-aligned).
    - Provider (string, e.g., OpenAI logo/icon if available via CSS).
    - Context Window (number formatted as "128K tokens").
    - Input Cost (number as "$0.005/1M").
    - Modalities (icons/chips, e.g., 👁️ Vision).
    - Capabilities (icons/chips, e.g., 🔧 Tools).
    - Release Date (formatted as "May 2024").
  - **Row Behavior**: Hover effects (subtle background lift via Tailwind); click a row to highlight/expand basic description (if available from API, e.g., modal popover with short model summary).

### 2. Interactivity
- **Sorting**: Clickable column headers to sort ascending/descending (e.g., by input cost low-to-high). Initial default: Sorted by input cost ascending.
- **Global Search**: Text input in table toolbar (placeholder: "Search models...") – fuzzy search across model name, description, and provider.
- **Filters** (Toolbar Controls):
  - Provider Dropdown: Multi-select options populated from data (e.g., OpenAI, Anthropic, Google – filter to show only selected).
  - Cost Slider: Range selector for input cost (e.g., min $0, max $10/1M; steps of $0.50).
  - Modalities Multi-Select: Checkboxes (e.g., Text, Vision – show models supporting at least one selected).
  - Capabilities Multi-Select: Checkboxes (e.g., Tool-Calling, JSON Mode – similar to modalities).
  - Reset Button: Clears all filters/search.
- **Results Count**: Display "Showing X of Y models" in toolbar; paginate if >50 rows (10 rows/page, with prev/next arrows – simple for v1).

### 3. UI/UX and Branding
- **Design Principles**: Clean, minimal, dev-friendly (e.g., monospace for numbers, sans-serif for headers). Responsive (mobile: stack columns; desktop: full table).
- **Modes**: Light and dark mode support:
  - Auto-detect via `prefers-color-scheme: dark` (default to system preference).
  - Manual toggle via a simple switch in the navbar (e.g., sun/moon icon).
- **Branding and Styling** (Via Tailwind 4 + Provided Config and globals.css):
  - **Tailwind Config**: Use the exact provided config for custom colors (OKLCH space for perceptual uniformity), fonts (Montserrat sans, Merriweather serif, Fira Code mono), fluid typography (scalable h1-h6 for page title like "ModelLens Explorer"), extended font sizes (2xs/3xs for tooltips), z-index (e.g., 1000 for dropdown filters, 1050 for any modals), and plugins (@tailwindcss/typography for header prose, tailwindcss-fluid-typography for responsive scaling).
    - Custom Colors: Silver (#f8f8f8 light bg), Charcoal (#212121 text), Orange (#ff7a00 accents, e.g., for filter buttons or highlights).
    - Diagram Palette (If Used): Charcoal lines, orange accents for subtle borders.
  - **globals.css**: Integrate verbatim as the base stylesheet:
    - Layer Base: Brand colors (RGB vars for alpha), z-index vars, base typography (h1-h6 bold/tracking-tight), prose styling (sm/base scale, serif body, mono code blocks with orange highlights).
    - Custom Utilities: .text-brand (charcoal/silver), .bg-elevated (white/charcoal/50), .border-brand (charcoal/20), .link-brand (orange underlined), .focus-ring (orange/70), .divider-brand (border t).
    - Body/Layout: Min-height 100vh, smooth scrolling, font-smoothing, isolation for stacking.
    - Dark Mode: C-vars adjusted (e.g., silver for light elements, charcoal for bg, warmer orange #ff9603).
    - Other: * { box-sizing: border-box; }, a { color: inherit; }, .series-article-list { text-sm }.
  - **Layout**:
    - Navbar: Simple top bar with "ModelLens" logo (text in primary color, Montserrat bold), mode toggle, and link to GitHub.
    - Main Content: Dedicated /models page as landing (no routing needed for v1).
    - Table: Use shadcn/ui Table component styled with brand classes (e.g., headers .prose h3 in primary, rows .bg-elevated, borders .border-brand, focus .focus-ring on selects/sliders).
    - Footer: Minimal (e.g., "Powered by Models.dev" in muted text, divider-brand above).
  - **Icons**: Use Heroicons or SVGs for modalities/capabilities (e.g., eye for vision); orange accents for active filters.

## User Flows
1. **On Load (/models)**:
   - Server fetches Models.dev data → Renders table with initial sort (cost ascending).
   - User sees full table; toolbar shows search input, filters, and "Showing X of Y".
2. **Search/Filter**:
   - Type in search bar → Table updates instantly (client-side filtering).
   - Select provider/filter → Applies immediately; clear with reset.
3. **Sort**:
   - Click header (e.g., "Input Cost") → Toggles asc/desc; visual arrow indicator.
4. **Mode Switch**:
   - Toggle navbar switch → Smooth transition; persists via localStorage.
5. **Error State**:
   - API fail → Fallback message + retry button; no crash.

## Technical Requirements
- **Frontend**: Next.js 15 (App Router) for SSR table fetch; React 19 for components.
- **Styling**: Tailwind CSS 4 with provided config/globals.css; shadcn/ui for Table, Select, Input, Slider (add via CLI: `npx shadcn-ui@latest add table select input slider`).
- **Table Library**: TanStack React Table v8 for sorting/filtering/search (headless, styled with shadcn).
- **Data Fetching**: Server-side in Next.js RSC (fetch Models.dev API, map to table data); no client-side refetch for v1.
- **Dependencies**:
  - Core: next@^15, react@^19, @tanstack/react-table@^8.
  - Styling: tailwindcss@^4 (alpha+), @tailwindcss/typography, tailwindcss-fluid-typography.
  - UI: lucide-react (icons), class-variance-authority (shadcn utils).
  - Fonts: Next/font (Montserrat, Merriweather, Fira Code via Google Fonts).
- **Build/Deploy**: Vercel (monorepo-friendly with pnpm); pnpm for package management (pnpm-lock.yaml committed).
- **Accessibility**: ARIA labels on table (e.g., sortable headers), keyboard nav for filters, high contrast (WCAG AA for v1).
- **Browsers**: Chrome/Edge/Firefox latest; Safari 17+ (Tailwind 4 compat).

## Non-Functional Requirements
- **Performance**: <2s initial table load (SSR fetch); <100ms for client interactions (sort/filter).
- **Security**: No user data; API fetches public; XSS-safe via Next.js defaults.
- **Scalability**: Handle 500+ models (virtualize table rows if needed via TanStack).
- **Offline**: Progressive (table loads from cache if API down; no PWA for v1).
- **Internationalization**: English only; RTL not required.
- **Testing**: Basic unit tests for data mapping (Jest/Vitest); no E2E for v1.

## Assumptions and Dependencies
- **Assumptions**:
  - Models.dev API remains stable (free/public); fallback to ~50 hardcoded models if unavailable.
  - Tailwind 4 alpha is viable (or stable release by launch); no breaking changes to OKLCH vars.
  - Users have modern browsers for fluid typography and CSS vars.
- **Dependencies**:
  - External: Models.dev API (no auth needed).
  - Internal: None (standalone app).
  - Risks: API downtime → Mitigate with retries (up to 3) and static fallback.
- **Out of Scope for v1**:
  - TokenLens integration (estimates).
  - Timeline view.
  - Exports (CSV/JSON).
  - User auth/sessions/saved filters.
  - Advanced search (e.g., semantic).
  - Analytics/tracking.
  - Mobile PWA.

## Future Considerations (v2+)
- Integrate TokenLens for auto-estimates on joined data.
- Add timeline for model evolution.
- Semantic search via OSS embeddings.
- User contributions (e.g., custom model uploads).
- Analytics dashboard for personal usage patterns.

This PRD defines a focused, achievable v1—ready for implementation. If any section needs revision (e.g., more detail on flows or metrics), let me know; otherwise, we can proceed to the next step like code scaffolding.