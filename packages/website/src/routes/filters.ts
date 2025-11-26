import { Effect, pipe } from "effect"
import { HttpRouter, HttpServerRequest } from "@effect/platform"
import { db } from "../db"
import { savedFilters } from "../db/schema"
import { and, eq, or } from "drizzle-orm"
import { requireAuth } from "../middleware/auth"
import { parsePaginationParams } from "../lib/http/pagination"
import {
  createSuccessResponse,
  unauthorizedError,
  validationError,
  internalServerError,
} from "../lib/http/responses"

/**
 * GET /v1/filters
 * List all filters accessible to the current user
 *
 * Query parameters:
 * - page: number (default: 1)
 * - pageSize: number (default: 20, max: 100)
 * - visibility: 'private' | 'team' | 'public' | 'all' (default: 'all')
 */
const listFilters = HttpRouter.get(
  "/v1/filters",
  (Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const auth = yield* requireAuth(request)

    const { page, pageSize, offset } = parsePaginationParams(request)
    const searchParams = new URL(request.url).searchParams
    const visibility = searchParams.get("visibility") || "all"

    // Build query conditions based on visibility filter
    const conditions: any[] = []

    if (visibility === "all") {
      // User's own filters OR public OR team filters (if user has team)
      conditions.push(
        or(
          eq(savedFilters.ownerId, auth.userId),
          eq(savedFilters.visibility, "public"),
          auth.teamId
            ? and(
                eq(savedFilters.visibility, "team"),
                eq(savedFilters.teamId, auth.teamId)
              )
            : undefined
        )
      )
    } else if (visibility === "private") {
      conditions.push(
        and(
          eq(savedFilters.ownerId, auth.userId),
          eq(savedFilters.visibility, "private")
        )
      )
    } else if (visibility === "team" && auth.teamId) {
      conditions.push(
        and(
          eq(savedFilters.visibility, "team"),
          eq(savedFilters.teamId, auth.teamId)
        )
      )
    } else if (visibility === "public") {
      conditions.push(eq(savedFilters.visibility, "public"))
    }

    // Execute query
    const filters = yield* Effect.tryPromise(() =>
      db
        .select()
        .from(savedFilters)
        .where(and(...conditions.filter(Boolean)))
        .limit(pageSize)
        .offset(offset)
        .orderBy(savedFilters.createdAt)
    )

    const total = filters.length // TODO: Use separate count query in production

    return yield* createSuccessResponse(filters, { total, page, pageSize })
  }).pipe(
    Effect.catchAll((error) =>
      internalServerError(
        error instanceof Error ? error.message : "Failed to list filters"
      )
    )
  )) as any
)

/**
 * POST /v1/filters
 * Create a new filter
 *
 * Request body:
 * {
 *   "name": string (required),
 *   "description": string (optional),
 *   "rules": Array (required, non-empty),
 *   "visibility": 'private' | 'team' | 'public' (default: 'private'),
 *   "teamId": string (required if visibility is 'team')
 * }
 */
const createFilter = HttpRouter.post(
  "/v1/filters",
  (Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const auth = yield* requireAuth(request)

    // Parse request body
    const body = (yield* request.json) as any

    // Validate required fields
    if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
      return yield* validationError({
        message: "name (non-empty string) is required",
      })
    }

    if (!body.rules || !Array.isArray(body.rules) || body.rules.length === 0) {
      return yield* validationError({
        message: "rules (non-empty array) is required",
      })
    }

    // Validate teamId if visibility is team
    if (body.visibility === "team" && !body.teamId) {
      return yield* validationError({
        message: "teamId is required when visibility is 'team'",
      })
    }

    // Create filter in database
    const [filter] = yield* Effect.tryPromise(() =>
      db
        .insert(savedFilters)
        .values({
          ownerId: auth.userId,
          teamId: body.teamId || null,
          name: body.name,
          description: body.description || null,
          visibility: body.visibility || "private",
          rules: body.rules,
        })
        .returning()
    )

    return yield* createSuccessResponse(filter)
  }).pipe(
    Effect.catchAll((error) =>
      internalServerError(
        error instanceof Error ? error.message : "Failed to create filter"
      )
    )
  )) as any
)

export const filtersRouter = pipe(
  HttpRouter.empty,
  HttpRouter.concat(listFilters as any),
  HttpRouter.concat(createFilter as any)
) as any
