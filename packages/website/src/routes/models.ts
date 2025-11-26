import { Effect } from "effect"
import { HttpRouter } from "@effect/platform"
import { ModelDataService } from "../../lib/services/ModelDataService"
import {
  createSuccessResponse,
  internalServerError,
} from "../lib/http/responses"

/**
 * GET /v1/models
 * Returns all available AI models from the latest sync
 *
 * Response format:
 * {
 *   "data": [ ... ], // Array of model objects
 *   "meta": {
 *     "total": 1234 // Total number of models
 *   },
 *   "timestamp": "2025-01-01T00:00:00.000Z"
 * }
 */
export const modelsRouter = HttpRouter.get(
  "/v1/models",
  Effect.gen(function* () {
    const service = yield* ModelDataService
    const models = yield* service.getLatestModels()

    return yield* createSuccessResponse(models, { total: models.length })
  }).pipe(
    Effect.catchAll((error) =>
      internalServerError(
        error instanceof Error
          ? error.message
          : "Failed to fetch models from database"
      )
    )
  )
)
