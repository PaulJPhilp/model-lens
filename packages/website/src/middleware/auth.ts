import type { HttpServerRequest } from "@effect/platform"
import { Effect } from "effect"

/**
 * Authentication context extracted from request headers
 */
export interface AuthContext {
	userId: string
	teamId?: string
}

/**
 * Auth error - thrown when authentication fails
 */
export class AuthError extends Error {
	readonly _tag = "AuthError"

	constructor(message = "Unauthorized") {
		super(message)
		this.name = "AuthError"
		Object.setPrototypeOf(this, AuthError.prototype)
	}
}

/**
 * Extract and validate authentication from request headers
 * Expected headers:
 * - x-user-id (required): User identifier
 * - x-team-id (optional): Team identifier for team-scoped resources
 *
 * @throws AuthError if x-user-id is missing or invalid
 */
export const requireAuth = (
	request: HttpServerRequest.HttpServerRequest,
): Effect.Effect<AuthContext, AuthError> =>
	Effect.gen(function* () {
		const userId = request.headers["x-user-id"]

		// Validate userId is present and is a string
		if (!userId || typeof userId !== "string") {
			return yield* Effect.fail(
				new AuthError("Missing or invalid x-user-id header"),
			)
		}

		// Optional teamId
		const teamId = request.headers["x-team-id"]
		const normalizedTeamId = typeof teamId === "string" ? teamId : undefined

		return {
			userId,
			teamId: normalizedTeamId,
		}
	})

/**
 * Optional authentication - doesn't fail if auth is missing
 * Returns partial context with available auth data
 */
export const optionalAuth = (
	request: HttpServerRequest.HttpServerRequest,
): Effect.Effect<Partial<AuthContext>> =>
	Effect.succeed({
		userId: request.headers["x-user-id"] as string | undefined,
		teamId: request.headers["x-team-id"] as string | undefined,
	})

/**
 * Check if user is an admin
 * Checks for x-admin header
 */
export const requireAdmin = (
	request: HttpServerRequest.HttpServerRequest,
): Effect.Effect<boolean, AuthError> =>
	Effect.gen(function* () {
		// First require basic auth
		yield* requireAuth(request)

		// Then check admin header
		const isAdmin = request.headers["x-admin"] === "true"

		if (!isAdmin) {
			return yield* Effect.fail(new AuthError("Admin privileges required"))
		}

		return true
	})
