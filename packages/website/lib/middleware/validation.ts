import { Schema } from "@effect/schema"
import { Effect, Layer } from "effect"
import { type NextRequest, NextResponse } from "next/server"
import { AppError, ValidationError } from "@/lib/errors"

/**
 * Validate request query parameters
 */
export function validateQuery<T>(
	request: NextRequest,
	schema: Schema.Schema<T>,
): Effect.Effect<T, AppError> {
	return Effect.gen(function* () {
		const { searchParams } = new URL(request.url)
		const queryObject = Object.fromEntries(searchParams.entries())

		// Convert string values to appropriate types for validation
		const processedQuery = Object.fromEntries(
			Object.entries(queryObject).map(([key, value]) => {
				// Try to parse as number if it looks like a number
				if (
					value &&
					!Number.isNaN(Number(value)) &&
					!Number.isNaN(parseFloat(value))
				) {
					return [key, Number(value)]
				}
				// Try to parse as boolean
				if (value === "true") return [key, true]
				if (value === "false") return [key, false]
				return [key, value]
			}),
		)

		const validated: T = yield* Schema.decodeUnknown(schema)(
			processedQuery,
		).pipe(
			Effect.mapError(
				(parseError: Error) =>
					new AppError(
						new ValidationError(
							"query",
							`Invalid query parameters: ${parseError.message}`,
						),
					),
			),
		)

		return validated
	})
}

/**
 * Validate request body
 */
export function validateBody<T>(
	request: NextRequest,
	schema: Schema.Schema<T>,
): Effect.Effect<T, AppError> {
	return Effect.gen(function* () {
		const body: unknown = yield* Effect.tryPromise({
			try: () => request.json(),
			catch: (error) =>
				new AppError(
					new ValidationError("body", `Failed to parse JSON: ${error}`),
				),
		})

		const validated = yield* Schema.decodeUnknown(schema)(body).pipe(
			Effect.mapError(
				(parseError) =>
					new AppError(
						new ValidationError(
							"body",
							`Invalid request body: ${parseError.message}`,
						),
					),
			),
		)

		return validated
	})
}

/**
 * Validate response data before sending
 */
export function validateResponse<T>(
	data: unknown,
	schema: Schema.Schema<T>,
): Effect.Effect<T, AppError> {
	return Schema.decodeUnknown(schema)(data).pipe(
		Effect.mapError(
			(parseError) =>
				new AppError(
					new ValidationError(
						"response",
						`Invalid response data: ${parseError.message}`,
					),
				),
		),
	)
}

/**
 * Higher-order function to wrap API route handlers with validation
 */
export function withValidation<
	TQuery,
	TBody,
	TResponse,
	TArgs extends [NextRequest, ...unknown[]],
>(
	options: {
		query?: Schema.Schema<TQuery>
		body?: Schema.Schema<TBody>
		response?: Schema.Schema<TResponse>
	},
	handler: (
		request: NextRequest,
		validatedQuery: TQuery,
		validatedBody: TBody,
		...args: TArgs extends [NextRequest, ...infer Rest] ? Rest : never
	) => Promise<NextResponse>,
) {
	return async (
		request: NextRequest,
		...args: TArgs extends [NextRequest, ...infer Rest] ? Rest : never
	): Promise<NextResponse> => {
		try {
			// Validate query parameters
			let validatedQuery: TQuery | undefined
			if (options.query) {
				const queryResult = await Effect.runPromise(
					validateQuery(request, options.query).pipe(
						Effect.provide(Layer.empty),
					) as Effect.Effect<TQuery, AppError, never>,
				)
				validatedQuery = queryResult
			}

			// Validate request body
			let validatedBody: TBody | undefined
			if (options.body) {
				const bodyResult = await Effect.runPromise(
					validateBody(request, options.body).pipe(
						Effect.provide(Layer.empty),
					) as Effect.Effect<TBody, AppError, never>,
				)
				validatedBody = bodyResult
			}

			// Call the handler
			const response = await handler(
				request,
				validatedQuery as TQuery,
				validatedBody as TBody,
				...args,
			)

			// Validate response if schema provided
			if (options.response) {
				const responseData = await response.json()
				const validatedResponse = await Effect.runPromise(
					validateResponse(responseData, options.response).pipe(
						Effect.provide(Layer.empty),
					) as Effect.Effect<TResponse, AppError, never>,
				)

				return NextResponse.json(validatedResponse)
			}

			return response
		} catch (error) {
			console.error("Validation error:", error)

			if (error instanceof AppError && error.cause._tag === "ValidationError") {
				return NextResponse.json(
					{
						error: error.cause.message,
						field: error.cause.field,
					},
					{ status: 400 },
				)
			}

			// Fallback error response
			return NextResponse.json(
				{
					error: "Validation failed",
					message:
						error instanceof Error ? error.message : "Unknown validation error",
				},
				{ status: 400 },
			)
		}
	}
}

/**
 * Simple validation wrapper for query parameters only
 */
export function withQueryValidation<TQuery>(
	schema: Schema.Schema<TQuery>,
	handler: (
		request: NextRequest,
		validatedQuery: TQuery,
	) => Promise<NextResponse>,
) {
	return withValidation({ query: schema }, (request, validatedQuery) =>
		handler(request, validatedQuery),
	)
}

/**
 * Simple validation wrapper for request body only
 */
export function withBodyValidation<TBody>(
	schema: Schema.Schema<TBody>,
	handler: (
		request: NextRequest,
		validatedBody: TBody,
	) => Promise<NextResponse>,
) {
	return withValidation({ body: schema }, (request, _, validatedBody) =>
		handler(request, validatedBody),
	)
}
