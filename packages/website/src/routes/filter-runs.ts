import { Effect, pipe } from "effect"
import { HttpRouter, HttpServerRequest } from "@effect/platform"
import { db } from "../db"
import { savedFilters, filterRuns } from "../db/schema"
import { eq, and } from "drizzle-orm"
import { requireAuth } from "../middleware/auth"
import { parsePaginationParams } from "../lib/http/pagination"
import {
  createSuccessResponse,
  notFoundError,
  unauthorizedError,
  forbiddenError,
  internalServerError,
} from "../lib/http/responses"

/**
 * Extract filter ID from URL path
 * Handles URLs like /v1/filters/abc123/runs or /v1/filters/abc123/runs/run456
 */
const getFilterId = (request: HttpServerRequest.HttpServerRequest): string => {
  const match = request.url.match(/\/v1\/filters\/([^/?]+)\/runs/)
  return match?.[1] || ""
}

/**
 * Extract run ID from URL path
 * Handles URLs like /v1/filters/abc123/runs/run456
 */
const getRunId = (request: HttpServerRequest.HttpServerRequest): string => {
  const match = request.url.match(/\/v1\/filters\/[^/]+\/runs\/([^/?]+)/)
  return match?.[1] || ""
}

/**
 * GET /v1/filters/:id/runs
 * List all evaluation runs for a filter
 *
 * Query parameters:
 * - page: number (default: 1)
 * - pageSize: number (default: 20, max: 100)
 *
 * Authorization:
 * - Owner can view their own filter's runs
 * - Public filter runs are viewable by anyone
 * - Team filter runs are viewable by team members
 */
const listRuns = HttpRouter.get(
  "/v1/filters/:id/runs",
  (Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const auth = yield* requireAuth(request)
    const filterId = getFilterId(request)

    if (!filterId) {
      return notFoundError("Filter")
    }

    const { page, pageSize, offset } = parsePaginationParams(request)

    // Verify filter exists and user has access
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

    const canAccess =
      filter.ownerId === auth.userId ||
      filter.visibility === "public" ||
      (filter.visibility === "team" && filter.teamId === auth.teamId)

    if (!canAccess) {
      return forbiddenError(
        "You do not have access to this filter's run history"
      )
    }

    // Query runs for this filter
    const runs = yield* Effect.tryPromise(() =>
      db
        .select()
        .from(filterRuns)
        .where(eq(filterRuns.filterId, filterId))
        .limit(pageSize)
        .offset(offset)
        .orderBy(filterRuns.executedAt)
    )

    const total = runs.length // TODO: Use separate count query in production

    return yield* createSuccessResponse(runs, { total, page, pageSize })
  }).pipe(
    Effect.catchAll((error) =>
      internalServerError(
        error instanceof Error ? error.message : "Failed to list filter runs"
      )
    )
  )) as any
)

/**
 * GET /v1/filters/:id/runs/:runId
 * Get a specific filter run
 *
 * Authorization: Same as parent filter
 */
const getRun = HttpRouter.get(
  "/v1/filters/:id/runs/:runId",
  (Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const auth = yield* requireAuth(request)
    const filterId = getFilterId(request)
    const runId = getRunId(request)

    if (!filterId) {
      return notFoundError("Filter")
    }

    if (!runId) {
      return notFoundError("Filter run")
    }

    // Verify filter exists and user has access
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

    const canAccess =
      filter.ownerId === auth.userId ||
      filter.visibility === "public" ||
      (filter.visibility === "team" && filter.teamId === auth.teamId)

    if (!canAccess) {
      return forbiddenError(
        "You do not have access to this filter's run history"
      )
    }

    // Query specific run
    const [run] = yield* Effect.tryPromise(() =>
      db
        .select()
        .from(filterRuns)
        .where(
          and(
            eq(filterRuns.id, runId),
            eq(filterRuns.filterId, filterId)
          )
        )
        .limit(1)
    )

    if (!run) {
      return yield* notFoundError("Filter run")
    }

    return yield* createSuccessResponse(run)
  }).pipe(
    Effect.catchAll((error) =>
      internalServerError(
        error instanceof Error ? error.message : "Failed to fetch filter run"
      )
    )
  )) as any
)

export const filterRunsRouter = pipe(
  HttpRouter.empty,
  HttpRouter.concat(listRuns as any),
  HttpRouter.concat(getRun as any)
) as any
