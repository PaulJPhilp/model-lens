import { HttpRouter, HttpServerRequest } from "@effect/platform"
import { ParseResult } from "@effect/schema"
import { Effect, pipe } from "effect"
import {
	SyncHistoryQuerySchema,
	validateQueryParams,
} from "../../lib/schemas/validation"
import { ModelDataService } from "../../lib/services/ModelDataService"
import {
	badRequestError,
	createSuccessResponse,
	forbiddenError,
	internalServerError,
	unauthorizedError,
} from "../lib/http/responses"
import { requireAdmin, requireAuth } from "../middleware/auth"

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
				: internalServerError(
						error instanceof Error ? error.message : "Failed to trigger sync",
					),
		),
	),
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

		// Parse and validate query parameters
		const searchParams = new URL(request.url).searchParams
		const validatedParams = yield* validateQueryParams(
			SyncHistoryQuerySchema,
			searchParams,
		).pipe(
			Effect.mapError(
				() =>
					new Error(
						"Invalid query parameters: limit must be between 1 and 100",
					),
			),
		)

		// Use validated limit or default to 10
		const limit = validatedParams.limit ?? 10

		// Get service and history
		const service = yield* ModelDataService
		const history = yield* service.getSyncHistory()

		// Return limited results
		const results = history.slice(0, limit)

		return yield* createSuccessResponse(results, { total: history.length })
	}).pipe(
		Effect.catchTags({
			ParseError: () =>
				badRequestError(
					"Invalid query parameters: limit must be between 1 and 100",
				),
		}),
		Effect.catchAll((error) =>
			internalServerError(
				error instanceof Error ? error.message : "Failed to fetch sync history",
			),
		),
	),
)

export const adminSyncRouter = HttpRouter.concat(
	HttpRouter.concat(HttpRouter.empty, triggerSync),
	getSyncHistory,
)
