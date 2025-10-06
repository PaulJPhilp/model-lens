import { Effect } from "effect"
import type { NextRequest } from "next/server"
import { createApiHandler } from "@/lib/api/route-helpers"
import { AppError, NetworkError } from "@/lib/errors"
import { rateLimitMiddleware } from "@/lib/middleware/rateLimit"
import { withQueryValidation } from "@/lib/middleware/validation"
import { GetModelsRequestSchema } from "@/lib/schemas/validation"
import { transformModelsDevResponse } from "@/lib/transformers/model-transformer"

// Cache configuration
export const revalidate = 3600 // Revalidate every hour
export const dynamic = "force-dynamic" // Allow dynamic rendering

// Effect-based model fetching
const fetchModelsEffect = Effect.gen(function* () {
	console.log("🌐 [API] Fetching models from external API")

	const response = yield* Effect.tryPromise({
		try: () => fetch("https://models.dev/api.json"),
		catch: (error) => new AppError(new NetworkError(error)),
	})

	if (!response.ok) {
		yield* Effect.fail(
			new AppError(
				new NetworkError(new Error(`HTTP error! status: ${response.status}`)),
			),
		)
	}

	const dataUnknown = yield* Effect.tryPromise({
		try: () => response.json(),
		catch: (error) => new AppError(new NetworkError(error)),
	})

	const allModels = transformModelsDevResponse(dataUnknown)

	console.log(`✅ [API] Fetched ${allModels.length} models from external API`)

	return { models: allModels }
})

// Create the validated handler
const getModelsHandler = withQueryValidation(
	GetModelsRequestSchema,
	async (
		request: NextRequest,
		validatedQuery: { limit?: number; provider?: string },
	) => {
		// Apply rate limiting
		const rateLimitResponse = await rateLimitMiddleware(request, "model-fetch")
		if (rateLimitResponse) {
			return rateLimitResponse
		}

		// Use the Effect-based handler with query parameters
		const handler = createApiHandler(
			fetchModelsEffect.pipe(
				Effect.map((result) => {
					// Apply query filters if provided
					let filteredModels = result.models

					if (validatedQuery.provider) {
						filteredModels = filteredModels.filter(
							(model) =>
								model.provider.toLowerCase() ===
								validatedQuery.provider?.toLowerCase(),
						)
					}

					if (validatedQuery.limit) {
						filteredModels = filteredModels.slice(0, validatedQuery.limit)
					}

					return {
						models: filteredModels,
						metadata: {
							total: result.models.length,
							page: 1,
							limit: validatedQuery.limit || result.models.length,
						},
					}
				}),
			),
			"GET /api/models",
		)

		return handler()
	},
)

export const GET = getModelsHandler
