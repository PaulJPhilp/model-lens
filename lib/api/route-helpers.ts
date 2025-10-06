import { Effect } from "effect"
import { NextResponse } from "next/server"
import type { AppError } from "../errors"

/**
 * Run an Effect and return a NextResponse
 * Handles errors gracefully and provides consistent error responses
 */
export function runApiEffect<A>(
	effect: Effect.Effect<A, AppError, never>,
	successResponse: (data: A) => NextResponse,
): Promise<NextResponse> {
	return Effect.runPromise(
		effect.pipe(
			Effect.match({
				onFailure: (error) => {
					console.error("❌ [API] Error:", error)

					// Handle different error types
					if (error.cause._tag === "ApiError") {
						return NextResponse.json(
							{ error: error.cause.error, status: error.cause.status },
							{ status: error.cause.status || 500 },
						)
					}

					if (error.cause._tag === "ValidationError") {
						return NextResponse.json(
							{
								error: "Validation failed",
								field: error.cause.field,
								message: error.cause.message,
							},
							{ status: 400 },
						)
					}

					if (error.cause._tag === "NetworkError") {
						return NextResponse.json(
							{ error: "Network error occurred" },
							{ status: 503 },
						)
					}

					// Default error response
					return NextResponse.json(
						{ error: "Internal server error" },
						{ status: 500 },
					)
				},
				onSuccess: (data) => successResponse(data),
			}),
		),
	)
}

/**
 * Create a success response with timing information
 */
export function createSuccessResponse<T>(
	data: T,
	startTime: number,
	additionalMetadata?: Record<string, unknown>,
): NextResponse {
	const duration = Date.now() - startTime
	return NextResponse.json({
		data,
		metadata: {
			duration,
			timestamp: new Date().toISOString(),
			...additionalMetadata,
		},
	})
}

/**
 * Create an error response with timing information
 */
export function createErrorResponse(
	error: string,
	status: number = 500,
	startTime: number,
	additionalMetadata?: Record<string, unknown>,
): NextResponse {
	const duration = Date.now() - startTime
	return NextResponse.json(
		{
			error,
			metadata: {
				duration,
				timestamp: new Date().toISOString(),
				...additionalMetadata,
			},
		},
		{ status },
	)
}

/**
 * Wrap an Effect with timing and logging
 */
export function withTiming<A, E>(
	effect: Effect.Effect<A, E>,
	operationName: string,
): Effect.Effect<A, E> {
	return Effect.gen(function* () {
		const startTime = Date.now()
		console.log(`🚀 [API] ${operationName} - Starting`)

		const result = yield* effect

		const duration = Date.now() - startTime
		console.log(`✅ [API] ${operationName} - Completed (${duration}ms)`)

		return result
	})
}

/**
 * Create a standardized API route handler that uses Effect
 */
export function createApiHandler<A>(
	effect: Effect.Effect<A, AppError, never>,
	operationName: string,
) {
	return async function handler(): Promise<NextResponse> {
		const startTime = Date.now()

		return runApiEffect(withTiming(effect, operationName), (data) =>
			createSuccessResponse(data, startTime),
		)
	}
}
