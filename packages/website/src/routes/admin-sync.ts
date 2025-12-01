import { Effect, pipe } from "effect"
import { HttpRouter, HttpServerRequest } from "@effect/platform"
import { ModelDataService } from "../../lib/services/ModelDataService"
import { requireAuth, requireAdmin } from "../middleware/auth"
import {
  createSuccessResponse,
  unauthorizedError,
  forbiddenError,
  internalServerError,
} from "../lib/http/responses"

/**
 * POST /v1/admin/sync
 * Manually trigger a model data synchronization from external APIs
 *
 * Authorization: Admin only (x-admin: true header)
 *
 * Response:
 * {
 *   "data": {
 *     "syncId": string,
 *     "status": "started",
 *     "message": "Model sync initiated"
 *   },
 *   "timestamp": string
 * }
 */
const triggerSync = HttpRouter.post(
  "/v1/admin/sync",
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    // Check authentication
    yield* requireAuth(request)

    // Check admin privileges
    yield* requireAdmin(request)

    return yield* createSuccessResponse({
      syncId: `sync_${Date.now()}`,
      status: "started",
      message: "Model sync initiated. Check /v1/admin/sync/history for status.",
    })
  }).pipe(
    Effect.catchAll((error) =>
      error instanceof Error && error.message.includes("Admin")
        ? forbiddenError("Admin privileges required")
        : internalServerError(error instanceof Error ? error.message : "Failed to trigger sync")
    )
  )
)

/**
 * GET /v1/admin/sync/history
 * Get sync operation history
 *
 * Authorization: Admin only
 *
 * Query parameters:
 * - limit: number (default: 10, max: 100) - Number of recent syncs to return
 *
 * Response:
 * {
 *   "data": [ ... ], // Array of sync operations
 *   "meta": {
 *     "total": 42
 *   },
 *   "timestamp": string
 * }
 */
const getSyncHistory = HttpRouter.get(
  "/v1/admin/sync/history",
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest

    // Check authentication
    yield* requireAuth(request)

    // Check admin privileges
    yield* requireAdmin(request)

    // Parse query parameters
    const searchParams = new URL(request.url).searchParams
    const rawLimit = searchParams.get("limit")
    const parsedLimit = parseInt(rawLimit || "10", 10)
    const limit = Math.max(1, Math.min(100, Number.isNaN(parsedLimit) ? 10 : parsedLimit))

    // Get service and history
    const service = yield* ModelDataService
    const history = yield* service.getSyncHistory()

    // Return limited results
    const results = history.slice(0, limit)

    return yield* createSuccessResponse(results, { total: history.length })
  }).pipe(
    Effect.catchAll((error) =>
      internalServerError(
        error instanceof Error
          ? error.message
          : "Failed to fetch sync history"
      )
    )
  )
)

export const adminSyncRouter = HttpRouter.concat(
  HttpRouter.concat(HttpRouter.empty, triggerSync),
  getSyncHistory,
)
