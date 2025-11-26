import { Effect } from "effect"
import { HttpRouter, HttpServerRequest } from "@effect/platform"
import { db } from "../db"
import { savedFilters, filterRuns } from "../db/schema"
import { eq } from "drizzle-orm"
import { requireAuth } from "../middleware/auth"
import { ModelDataService } from "../../lib/services/ModelDataService"
import {
  createSuccessResponse,
  notFoundError,
  unauthorizedError,
  forbiddenError,
  internalServerError,
} from "../lib/http/responses"

/**
 * Extract filter ID from URL path
 * Handles URLs like /v1/filters/abc123/evaluate
 */
const getFilterId = (request: HttpServerRequest.HttpServerRequest): string => {
  const match = request.url.match(/\/v1\/filters\/([^/?]+)\/evaluate/)
  return match?.[1] || ""
}

/**
 * POST /v1/filters/:id/evaluate
 * Evaluate a filter against the latest models
 *
 * Authorization:
 * - Owner can evaluate their own filters
 * - Public filters can be evaluated by anyone
 * - Team filters can be evaluated by team members
 *
 * Response:
 * {
 *   "data": {
 *     "runId": string,
 *     "matchCount": number,
 *     "totalEvaluated": number,
 *     "durationMs": number,
 *     "results": Array  // Matched models
 *   },
 *   "timestamp": string
 * }
 */
export const filterEvaluateRouter = HttpRouter.post(
  "/v1/filters/:id/evaluate",
  (Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const auth = yield* requireAuth(request)
    const filterId = getFilterId(request)

    if (!filterId) {
      return notFoundError("Filter")
    }

    // Get filter
    const [filter] = yield* Effect.tryPromise(() =>
      db
        .select()
        .from(savedFilters)
        .where(eq(savedFilters.id, filterId))
        .limit(1)
    )

    if (!filter) {
      return notFoundError("Filter")
    }

    // Check access permissions
    const canAccess =
      filter.ownerId === auth.userId ||
      filter.visibility === "public" ||
      (filter.visibility === "team" && filter.teamId === auth.teamId)

    if (!canAccess) {
      return forbiddenError("You do not have access to this filter")
    }

    // Get all models for evaluation
    const modelService = yield* ModelDataService
    const allModels = yield* modelService.getLatestModels()

    // Evaluate filter rules against models (simplified)
    const startTime = Date.now()
    const matchedModels = allModels.filter((model) => {
      // TODO: Implement full filter evaluation logic from lib/filters.ts
      // For now, include all models as placeholder
      return true
    })
    const durationMs = Date.now() - startTime

    // Save filter run to database
    const [run] = yield* Effect.tryPromise(() =>
      db
        .insert(filterRuns)
        .values({
          filterId: filter.id,
          executedBy: auth.userId,
          executedAt: new Date(),
          durationMs,
          filterSnapshot: filter.rules,
          modelList: allModels.map((m: any) => m.id),
          totalEvaluated: allModels.length,
          matchCount: matchedModels.length,
          results: matchedModels,
        } as any)
        .returning()
    )

    // Update filter usage tracking
    yield* Effect.tryPromise(() =>
      db
        .update(savedFilters)
        .set({
          usageCount: (filter.usageCount || 0) + 1,
          lastUsedAt: new Date(),
        })
        .where(eq(savedFilters.id, filterId))
    )

    return yield* createSuccessResponse({
      runId: run.id,
      matchCount: matchedModels.length,
      totalEvaluated: allModels.length,
      durationMs,
      results: matchedModels,
    })
  }).pipe(
    Effect.catchAll((error) =>
      internalServerError(
        error instanceof Error
          ? error.message
          : "Failed to evaluate filter"
      )
    )
  )) as any
)
