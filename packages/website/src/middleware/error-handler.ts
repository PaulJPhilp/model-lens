import { type HttpBody, HttpServerResponse } from "@effect/platform"
import type { Effect } from "effect"

/**
 * Error response format
 */
interface ErrorResponse {
	error: string
	code?: string
	details?: unknown
	timestamp: string
}

/**
 * Global error handler for unhandled exceptions
 * Logs errors and returns standardized error responses
 */
export const createErrorHandler = (
	error: unknown,
): Effect.Effect<
	HttpServerResponse.HttpServerResponse,
	HttpBody.HttpBodyError
> => {
	const timestamp = new Date().toISOString()

	// Handle different error types
	if (error instanceof Error) {
		// Standard JavaScript error
		console.error(`Error: ${error.message}`)

		const response: ErrorResponse = {
			error: error.message || "Internal server error",
			timestamp,
		}

		return HttpServerResponse.json(response, { status: 500 })
	}

	if (typeof error === "string") {
		// String error
		console.error(`Error: ${error}`)

		const response: ErrorResponse = {
			error,
			timestamp,
		}

		return HttpServerResponse.json(response, { status: 500 })
	}

	// Unknown error type
	console.error(`Unknown error: ${JSON.stringify(error)}`)

	const response: ErrorResponse = {
		error: "Internal server error",
		timestamp,
	}

	return HttpServerResponse.json(response, { status: 500 })
}
