import { Effect } from "effect"
import { HttpMiddleware, HttpServerResponse } from "@effect/platform"

/**
 * CORS middleware that adds standard CORS headers to all responses
 * Allows all origins by default - adjust origin in production
 */
export const createCorsMiddleware = (): HttpMiddleware.HttpMiddleware =>
	HttpMiddleware.make((app) =>
		Effect.gen(function* () {
			// Execute the app handler
			const response = yield* app

			// Add CORS headers to response
			return response.pipe(
				// Allow all origins for development (restrict in production)
				HttpServerResponse.setHeader("Access-Control-Allow-Origin", "*"),
				// Allow common HTTP methods
				HttpServerResponse.setHeader(
					"Access-Control-Allow-Methods",
					"GET, POST, PUT, DELETE, PATCH, OPTIONS"
				),
				// Allow common headers
				HttpServerResponse.setHeader(
					"Access-Control-Allow-Headers",
					"Content-Type, Authorization, X-Requested-With"
				),
				// Cache preflight requests for 24 hours
				HttpServerResponse.setHeader("Access-Control-Max-Age", "86400"),
				// Allow credentials if needed
				HttpServerResponse.setHeader("Access-Control-Allow-Credentials", "true")
			)
		})
	)
