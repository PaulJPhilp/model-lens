// app/api/chat/meta/route.ts
// Companion endpoint to /api/chat for retrieving citations/metadata
//
// Purpose:
//  - Returns citations for a given query (models, filters, runs, docs)
//  - Called by Chat component after streaming completes
//  - Provides clickable source references

import { db } from "@/src/db";
import { filterRuns, savedFilters } from "@/src/db/schema";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// -------------------- Types --------------------

export type Citation =
  | { type: "MODEL"; id: string; title?: string; snippet?: string }
  | {
      type: "FILTER";
      id: string;
      title?: string;
      snippet?: string;
      filterId?: string;
    }
  | {
      type: "RUN";
      id: string;
      title?: string;
      snippet?: string;
      filterId?: string;
    }
  | { type: "DOC"; id: string; title?: string; snippet?: string };

// -------------------- Local interfaces to avoid `any` --------------------

interface ModelSummary {
  id: string;
  name?: string;
  vendor?: string;
  inputCost?: number;
  outputCost?: number;
  contextWindow?: number;
  capabilities?: string[];
}

interface FilterSummary {
  id: string;
  name: string;
  description: string | null;
  usageCount: number;
  ownerId: string;
  visibility: string;
  rules?: unknown[];
}

interface RunRow {
  id: string;
  executedAt: string | Date;
  matchCount: number;
  totalEvaluated: number;
  durationMs?: number | null;
  filterSnapshot?: { name?: string } | null;
}

interface MetaResponse {
  citations: Citation[];
  runId?: string | null;
  queryHash?: string;
}

// -------------------- Request validation --------------------

const MetaRequestSchema = z.object({
  query: z.string().min(1),
  topK: z.number().int().positive().max(20).optional(),
  includeRuns: z.boolean().optional(),
  includeFilters: z.boolean().optional(),
  includeModels: z.boolean().optional(),
  includeDocs: z.boolean().optional(),
});

// -------------------- Auth helper --------------------

/**
 * Extract user ID from request headers
 * TODO: Replace with real auth
 */
function getUserIdFromReq(req: NextRequest): string | null {
  return req.headers.get("x-user-id") ?? null;
}

// -------------------- Retrieval helpers (TODO: implement) --------------------

/**
 * Search model registry for relevant models
 * Implements keyword search across model name, vendor, and capabilities
 */
async function searchModels(query: string, topK: number): Promise<Citation[]> {
  try {
    const lowerQuery = query.toLowerCase();

    // Fetch models from API endpoint (reuse existing models endpoint)
    const response = await fetch("http://localhost:3004/api/models", {
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn("Failed to fetch models for search");
      return [];
    }

    const models: ModelSummary[] = await response.json();

    // Filter and rank models based on query match
    const matchedModels = models
      .map((model: ModelSummary): { model: ModelSummary; score: number } => {
        let score = 0;
        const name = (model.name || "").toLowerCase();
        const vendor = (model.vendor || "").toLowerCase();
        const id = (model.id || "").toLowerCase();

        // Exact matches get highest score
        if (name === lowerQuery || id === lowerQuery) score += 10;

        // Partial matches in name/id
        if (name.includes(lowerQuery) || id.includes(lowerQuery)) score += 5;

        // Vendor matches
        if (vendor.includes(lowerQuery)) score += 3;

        // Capability matches (if query mentions common AI terms)
        const aiTerms = [
          "chat",
          "vision",
          "code",
          "reasoning",
          "multimodal",
          "embedding",
        ];
        const matchedTerms = aiTerms.filter((term) =>
          lowerQuery.includes(term)
        );
        if (matchedTerms.length > 0) {
          // Check if model has these capabilities
          const capabilities = model.capabilities || [];
          const hasCapability = matchedTerms.some((term) =>
            capabilities.some((cap: string) => cap.toLowerCase().includes(term))
          );
          if (hasCapability) score += 2;
        }

        return { model, score };
      })
      .filter(({ score }: { score: number }) => score > 0)
      .sort((a, b) => (a.score === b.score ? 0 : a.score < b.score ? 1 : -1))
      .slice(0, topK);

    return matchedModels.map(({ model }) => ({
      type: "MODEL" as const,
      id: model.id,
      title: model.name,
      snippet: buildModelSnippet(model),
    }));
  } catch (error) {
    console.error("Error searching models:", error);
    return [];
  }
}

/**
 * Build a concise snippet for a model citation
 */
function buildModelSnippet(model: ModelSummary): string {
  const parts: string[] = [];

  if (model.vendor) parts.push(model.vendor);

  // Cost info
  if (model.inputCost !== null && model.inputCost !== undefined) {
    parts.push(`$${model.inputCost.toFixed(4)}/1k input`);
  }
  if (model.outputCost !== null && model.outputCost !== undefined) {
    parts.push(`$${model.outputCost.toFixed(4)}/1k output`);
  }

  // Context window
  if (model.contextWindow) {
    const ctxK = Math.floor(model.contextWindow / 1000);
    parts.push(`${ctxK}k context`);
  }

  // Key capabilities (limit to 2-3)
  if (model.capabilities && model.capabilities.length > 0) {
    const caps = model.capabilities.slice(0, 3).join(", ");
    parts.push(caps);
  }

  return parts.join(" • ") || "AI model";
}

/**
 * Search saved filters for relevant filters
 * Respects RBAC - only returns filters user can access
 */
async function searchFilters(
  query: string,
  topK: number,
  userId: string | null
): Promise<Citation[]> {
  try {
    if (!userId) return [];

    const lowerQuery = query.toLowerCase();

    // Query filters that match the search term
    // Filter by visibility: user's own filters, team filters (if has team), or public
    const filters = await db
      .select()
      .from(savedFilters)
      .where(
        and(
          or(
            ilike(savedFilters.name, `%${query}%`),
            ilike(savedFilters.description, `%${query}%`)
          ),
          or(
            eq(savedFilters.ownerId, userId),
            eq(savedFilters.visibility, "public")
            // TODO: Add team filter support when teamId is available
            // eq(savedFilters.teamId, userTeamId)
          )
        )
      )
      .limit(topK * 2) // Get more than needed for ranking
      .orderBy(desc(savedFilters.usageCount));

    // Rank filters by relevance
    const rankedFilters = filters
      .map((filter) => {
        let score = 0;
        const name = (filter.name || "").toLowerCase();
        const desc = (
          (filter.description as string | null) || ""
        ).toLowerCase();

        // Exact name match
        if (name === lowerQuery) score += 10;

        // Name contains query
        if (name.includes(lowerQuery)) score += 5;

        // Description contains query
        if (desc.includes(lowerQuery)) score += 2;

        // Boost frequently used filters
        score += Math.min(filter.usageCount, 5) * 0.5;

        // Boost owner's filters slightly
        if (filter.ownerId === userId) score += 1;

        return { filter, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return rankedFilters.map(({ filter }) => ({
      type: "FILTER" as const,
      id: filter.id,
      title: filter.name,
      snippet: buildFilterSnippet(filter),
    }));
  } catch (error) {
    console.error("Error searching filters:", error);
    return [];
  }
}

/**
 * Build a concise snippet for a filter citation
 */
function buildFilterSnippet(filter: FilterSummary): string {
  const parts: string[] = [];

  if (filter.description) {
    parts.push(filter.description.slice(0, 100));
  }

  const ruleCount = filter.rules?.length || 0;
  parts.push(`${ruleCount} rule${ruleCount !== 1 ? "s" : ""}`);

  if (filter.usageCount > 0) {
    parts.push(
      `Used ${filter.usageCount} time${filter.usageCount !== 1 ? "s" : ""}`
    );
  }

  parts.push(`${filter.visibility} visibility`);

  return parts.join(" • ");
}

/**
 * Search filter runs for relevant run history
 * Respects RBAC - only returns runs for filters user can access
 */
async function searchRuns(
  query: string,
  topK: number,
  userId: string | null
): Promise<Citation[]> {
  try {
    if (!userId) return [];

    const lowerQuery = query.toLowerCase();

    // Get recent runs and join with parent filter for RBAC
    const runs = await db
      .select({
        run: filterRuns,
        filter: savedFilters,
      })
      .from(filterRuns)
      .innerJoin(savedFilters, eq(filterRuns.filterId, savedFilters.id))
      .where(
        or(
          eq(savedFilters.ownerId, userId),
          eq(savedFilters.visibility, "public")
          // TODO: Add team filter support when teamId is available
        )
      )
      .orderBy(desc(filterRuns.executedAt))
      .limit(topK * 3); // Get more for filtering

    // Filter and rank runs by relevance
    const rankedRuns = runs
      .map(({ run, filter }) => {
        let score = 0;
        const filterName = (filter.name || "").toLowerCase();
        const filterSnapshot = run.filterSnapshot;
        const snapshotName = (filterSnapshot?.name || "").toLowerCase();

        // Match filter name
        if (
          filterName.includes(lowerQuery) ||
          snapshotName.includes(lowerQuery)
        ) {
          score += 5;
        }

        // Boost recent runs
        const ageHours =
          (Date.now() - new Date(run.executedAt).getTime()) / (1000 * 60 * 60);
        if (ageHours < 24) score += 3;
        else if (ageHours < 168) score += 1; // within a week

        // Boost runs with many matches (useful runs)
        if (run.matchCount > 0) {
          const matchRate = run.matchCount / run.totalEvaluated;
          score += matchRate * 2;
        }

        return { run, filter, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return rankedRuns.map(({ run, filter }) => ({
      type: "RUN" as const,
      id: run.id,
      filterId: filter.id,
      title: buildRunTitle(run, filter),
      snippet: buildRunSnippet(run),
    }));
  } catch (error) {
    console.error("Error searching runs:", error);
    return [];
  }
}

/**
 * Build a title for a run citation
 */
function buildRunTitle(run: RunRow, filter: { name: string }): string {
  const filterName = filter.name || "Filter";
  const date = new Date(run.executedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${filterName} - ${date}`;
}

/**
 * Build a concise snippet for a run citation
 */
function buildRunSnippet(run: RunRow): string {
  const parts: string[] = [];

  const matchRate = ((run.matchCount / run.totalEvaluated) * 100).toFixed(0);
  parts.push(
    `Found ${run.matchCount} matching model${
      run.matchCount !== 1 ? "s" : ""
    } out of ${run.totalEvaluated} evaluated (${matchRate}%)`
  );

  if (run.durationMs) {
    const duration =
      run.durationMs < 1000
        ? `${run.durationMs}ms`
        : `${(run.durationMs / 1000).toFixed(1)}s`;
    parts.push(`Completed in ${duration}`);
  }

  return parts.join(" • ");
}

/**
 * Search documentation/help content
 * Uses keyword matching against known documentation topics
 */
async function searchDocs(query: string, topK: number): Promise<Citation[]> {
  const lowerQuery = query.toLowerCase();

  // Define documentation topics with keywords
  const docs = [
    {
      id: "FILTERS_OVERVIEW",
      title: "Filter System Overview",
      keywords: [
        "filter",
        "filters",
        "saved filter",
        "rule",
        "rules",
        "criteria",
        "search",
      ],
      snippet:
        "Saved filters let you persist rule sets and apply them to the model registry. Use hard clauses for must-match criteria and soft clauses for weighted scoring.",
    },
    {
      id: "FILTER_RUNS",
      title: "Filter Run History",
      keywords: ["run", "runs", "history", "evaluation", "execute", "apply"],
      snippet:
        "Every filter evaluation is persisted as a run, tracking matches, duration, and results. View run history to analyze filter performance over time.",
    },
    {
      id: "MODEL_SEARCH",
      title: "Searching Models",
      keywords: [
        "model",
        "models",
        "search",
        "find",
        "cost",
        "capabilities",
        "vendor",
      ],
      snippet:
        "Search models by name, vendor, capabilities, cost, context window, and more. Use filters to narrow down results based on specific criteria.",
    },
    {
      id: "FILTER_RULES",
      title: "Filter Rules & Operators",
      keywords: [
        "operator",
        "operators",
        "eq",
        "lte",
        "gte",
        "contains",
        "hard",
        "soft",
        "weight",
      ],
      snippet:
        "Filter rules support operators: eq (equals), ne (not equals), gt/gte (greater than), lt/lte (less than), in (array contains), contains (string match). Hard clauses must match; soft clauses contribute to score.",
    },
    {
      id: "RBAC",
      title: "Access Control & Visibility",
      keywords: [
        "access",
        "permission",
        "visibility",
        "private",
        "team",
        "public",
        "share",
      ],
      snippet:
        "Filters have three visibility levels: private (only you), team (your team), public (everyone). Run history respects parent filter permissions.",
    },
    {
      id: "COST_ANALYSIS",
      title: "Model Cost Analysis",
      keywords: [
        "cost",
        "price",
        "pricing",
        "budget",
        "expensive",
        "cheap",
        "affordable",
      ],
      snippet:
        "Compare model costs by input/output tokens, cache pricing, and total cost of ownership. Filter by cost thresholds to find budget-friendly options.",
    },
    {
      id: "CAPABILITIES",
      title: "Model Capabilities",
      keywords: [
        "capability",
        "capabilities",
        "feature",
        "features",
        "vision",
        "code",
        "chat",
        "reasoning",
      ],
      snippet:
        "Models have various capabilities: chat, vision, code generation, reasoning, embeddings, and more. Filter by required capabilities to find suitable models.",
    },
  ];

  // Score and rank docs by keyword match
  const rankedDocs = docs
    .map((doc) => {
      let score = 0;

      // Check each keyword
      for (const keyword of doc.keywords) {
        if (lowerQuery.includes(keyword)) {
          score += 5;
        }
      }

      // Exact title match
      if (doc.title.toLowerCase().includes(lowerQuery)) {
        score += 3;
      }

      return { doc, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return rankedDocs.map(({ doc }) => ({
    type: "DOC" as const,
    id: doc.id,
    title: doc.title,
    snippet: doc.snippet,
  }));
}

/**
 * Compute a hash of the query for caching/deduplication
 * Optional - useful for caching results
 */
function hashQuery(query: string): string {
  // Simple hash - use crypto.subtle.digest for production
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    const char = query.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// -------------------- Route handler --------------------

export async function POST(req: NextRequest) {
  try {
    const userId = getUserIdFromReq(req);

    // Parse request body
    const body = await req.json();
    const validation = MetaRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", detail: validation.error.format() },
        { status: 400 }
      );
    }

    const {
      query,
      topK = 6,
      includeRuns = true,
      includeFilters = true,
      includeModels = true,
      includeDocs = true,
    } = validation.data;

    // Parallel retrieval across all sources
    const [models, filters, runs, docs] = await Promise.all([
      includeModels ? searchModels(query, topK) : Promise.resolve([]),
      includeFilters ? searchFilters(query, topK, userId) : Promise.resolve([]),
      includeRuns ? searchRuns(query, topK, userId) : Promise.resolve([]),
      includeDocs ? searchDocs(query, topK) : Promise.resolve([]),
    ]);

    // Merge and deduplicate results
    const allCitations = [...models, ...filters, ...runs, ...docs];
    const citationMap = new Map<string, Citation>();

    for (const citation of allCitations) {
      const key = `${citation.type}:${citation.id}`;
      if (!citationMap.has(key)) {
        citationMap.set(key, citation);
      }
    }

    // Rank citations (TODO: implement proper ranking algorithm)
    // For now, simple order: models, filters, runs, docs
    const citations = Array.from(citationMap.values()).slice(0, topK);

    const response: MetaResponse = {
      citations,
      runId: null, // TODO: Track query as a run if needed
      queryHash: hashQuery(query),
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Error fetching citations:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: message },
      { status: 500 }
    );
  }
}

// Optional: Support GET with query params for simple use cases
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("query") || searchParams.get("q");
    const topK = Number.parseInt(searchParams.get("topK") || "6");

    if (!query) {
      return NextResponse.json(
        { error: "Missing query parameter" },
        { status: 400 }
      );
    }

    // Reuse POST handler logic
    return POST(
      new NextRequest(req.url, {
        method: "POST",
        headers: req.headers,
        body: JSON.stringify({ query, topK }),
      })
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Error fetching citations (GET):", err);
    return NextResponse.json(
      { error: "Internal server error", detail: message },
      { status: 500 }
    );
  }
}
