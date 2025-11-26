import { Effect, pipe } from "effect"
import { HttpRouter, HttpServerRequest } from "@effect/platform"
import { db } from "../db"
import { savedFilters } from "../db/schema"
import { eq } from "drizzle-orm"
import { requireAuth } from "../middleware/auth"
import {
  createSuccessResponse,
  notFoundError,
  unauthorizedError,
  forbiddenError,
  validationError,
  internalServerError,
} from "../lib/http/responses"

/**
 * Extract filter ID from URL path
 * Handles URLs like /v1/filters/abc123 or /v1/filters/abc123/runs
 */
const getFilterId = (request: HttpServerRequest.HttpServerRequest): string => {
  const match = request.url.match(/\/v1\/filters\/([^/?]+)/)
  return match?.[1] || ""
}

/**
 * GET /v1/filters/:id
 * Get a specific filter by ID
 *
 * Authorization:
 * - Owner can always access their own filters
 * - Public filters are accessible to everyone
 * - Team filters are accessible to team members
 */
const getFilter = HttpRouter.get(
  "/v1/filters/:id",
  (Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const auth = yield* requireAuth(request)
    const filterId = getFilterId(request)

    if (!filterId) {
      return notFoundError("Filter")
    }

    // Fetch filter from database
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
      return yield* forbiddenError("You do not have access to this filter")
    }

    return yield* createSuccessResponse(filter)
  }).pipe(
    Effect.catchAll((error) =>
      internalServerError(
        error instanceof Error ? error.message : "Failed to fetch filter"
      )
    )
  )) as any
)

/**
 * PUT /v1/filters/:id
 * Update a filter
 *
 * Authorization: Only the owner can update their filter
 *
 * Request body:
 * {
 *   "name": string (optional),
 *   "description": string (optional),
 *   "rules": Array (optional),
 *   "visibility": string (optional)
 * }
 */
const updateFilter = HttpRouter.put(
  "/v1/filters/:id",
  (Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const auth = yield* requireAuth(request)
    const filterId = getFilterId(request)

    if (!filterId) {
      return yield* notFoundError("Filter")
    }

    // Parse request body
    const body = (yield* request.json) as any

    // Check if filter exists and user owns it
    const [existing] = yield* Effect.tryPromise(() =>
      db
        .select()
        .from(savedFilters)
        .where(eq(savedFilters.id, filterId))
        .limit(1)
    )

    if (!existing) {
      return yield* notFoundError("Filter")
    }

    if (existing.ownerId !== auth.userId) {
      return yield* forbiddenError("Only the filter owner can update this filter")
    }

    // Validate updates if provided
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim() === "") {
        return yield* validationError({
          message: "name must be a non-empty string",
        })
      }
    }

    if (body.rules !== undefined) {
      if (!Array.isArray(body.rules) || body.rules.length === 0) {
        return yield* validationError({
          message: "rules must be a non-empty array",
        })
      }
    }

    // Update filter
    const [updated] = yield* Effect.tryPromise(() =>
      db
        .update(savedFilters)
        .set({
          name: body.name !== undefined ? body.name : existing.name,
          description:
            body.description !== undefined
              ? body.description
              : existing.description,
          visibility:
            body.visibility !== undefined
              ? body.visibility
              : existing.visibility,
          rules: body.rules !== undefined ? body.rules : existing.rules,
          updatedAt: new Date(),
        })
        .where(eq(savedFilters.id, filterId))
        .returning()
    )

    return yield* createSuccessResponse(updated)
  }).pipe(
    Effect.catchAll((error) =>
      internalServerError(
        error instanceof Error ? error.message : "Failed to update filter"
      )
    )
  )) as any
)

/**
 * DELETE /v1/filters/:id
 * Delete a filter
 *
 * Authorization: Only the owner can delete their filter
 */
const deleteFilter = HttpRouter.del(
  "/v1/filters/:id",
  (Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const auth = yield* requireAuth(request)
    const filterId = getFilterId(request)

    if (!filterId) {
      return yield* notFoundError("Filter")
    }

    // Check if filter exists and user owns it
    const [existing] = yield* Effect.tryPromise(() =>
      db
        .select()
        .from(savedFilters)
        .where(eq(savedFilters.id, filterId))
        .limit(1)
    )

    if (!existing) {
      return yield* notFoundError("Filter")
    }

    if (existing.ownerId !== auth.userId) {
      return yield* forbiddenError("Only the filter owner can delete this filter")
    }

    // Delete filter
    yield* Effect.tryPromise(() =>
      db.delete(savedFilters).where(eq(savedFilters.id, filterId))
    )

    return yield* createSuccessResponse({ deleted: true, id: filterId })
  }).pipe(
    Effect.catchAll((error) =>
      internalServerError(
        error instanceof Error ? error.message : "Failed to delete filter"
      )
    )
  )) as any
)

export const filterDetailRouter = pipe(
  HttpRouter.empty,
  HttpRouter.concat(getFilter as any),
  HttpRouter.concat(updateFilter as any),
  HttpRouter.concat(deleteFilter as any)
) as any
