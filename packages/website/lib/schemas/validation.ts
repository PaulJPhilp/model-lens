import { ParseResult, Schema } from "@effect/schema"
import { Effect } from "effect"

// ============================================================================
// Base Type Schemas
// ============================================================================

export const StringSchema = Schema.String
export const NumberSchema = Schema.Number
export const BooleanSchema = Schema.Boolean

/**
 * UUID validation schema
 * Ensures input is a valid UUID v4 format
 */
export const UUIDSchema = Schema.String.pipe(
	Schema.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
	Schema.description("Valid UUID v4 format"),
)

/**
 * Date string validation schema
 * Ensures input is a valid ISO 8601 date string
 */
export const DateStringSchema = Schema.String.pipe(
	Schema.transformOrFail(Schema.String, {
		decode: (dateString, _, ast) =>
			Effect.try({
				try: () => new Date(dateString),
				catch: () =>
					new ParseResult.Type(
						ast,
						dateString,
						`Invalid date string: ${dateString}`,
					),
			}).pipe(
				Effect.flatMap((date) =>
					Number.isNaN(date.getTime())
						? Effect.fail(
								new ParseResult.Type(
									ast,
									dateString,
									`Invalid date: ${dateString}`,
								),
							)
						: Effect.succeed(dateString),
				),
			),
		encode: (date) => Effect.succeed(date),
	}),
)

/**
 * Safe string: alphanumeric, hyphens, underscores only
 * Prevents injection attacks via identifier fields
 */
export const SafeStringSchema = Schema.String.pipe(
	Schema.pattern(/^[a-zA-Z0-9_-]+$/),
	Schema.maxLength(255),
	Schema.description("Alphanumeric, hyphens, and underscores only"),
)

/**
 * Provider identifier: lowercase alphanumeric and dots
 * For validating provider names like "openai", "anthropic", "openrouter"
 */
export const ProviderSchema = Schema.String.pipe(
	Schema.pattern(/^[a-z0-9]+([._-]?[a-z0-9]+)*$/),
	Schema.maxLength(50),
	Schema.description("Provider identifier format"),
)

/**
 * Integer with bounds checking
 * Safe for integer parameters with enforced range
 */
export const BoundedIntSchema = (min: number, max: number) =>
	Schema.Number.pipe(
		Schema.int(),
		Schema.between(min, max),
		Schema.description(`Integer between ${min} and ${max}`),
	)

// API Request/Response schemas
export const GetModelsRequestSchema = Schema.Struct({
	limit: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.positive())),
	provider: Schema.optional(Schema.String),
})

export const GetModelsResponseSchema = Schema.Struct({
	models: Schema.Array(
		Schema.Struct({
			id: Schema.String,
			name: Schema.String,
			provider: Schema.String,
			contextWindow: Schema.Number,
			maxOutputTokens: Schema.Number,
			inputCost: Schema.Number,
			outputCost: Schema.Number,
			cacheReadCost: Schema.Number,
			cacheWriteCost: Schema.Number,
			modalities: Schema.Array(Schema.String),
			capabilities: Schema.Array(Schema.String),
			releaseDate: Schema.optional(Schema.String),
			lastUpdated: Schema.optional(Schema.String),
			knowledge: Schema.optional(Schema.String),
			openWeights: Schema.Boolean,
			supportsTemperature: Schema.Boolean,
			supportsAttachments: Schema.Boolean,
			new: Schema.Boolean,
		}),
	),
	metadata: Schema.optional(
		Schema.Struct({
			total: Schema.Number,
			page: Schema.Number,
			limit: Schema.Number,
		}),
	),
})

export const ApiErrorSchema = Schema.Struct({
	error: Schema.String,
	field: Schema.optional(Schema.String),
	message: Schema.optional(Schema.String),
})

export const SyncModelsRequestSchema = Schema.Struct({
	// No body parameters for sync request
})

export const SyncModelsResponseSchema = Schema.Struct({
	success: Schema.Boolean,
	data: Schema.optional(
		Schema.Struct({
			syncId: Schema.String,
			modelsStored: Schema.Number,
			success: Schema.Boolean,
		}),
	),
	error: Schema.optional(Schema.String),
	duration: Schema.Number,
})

export const GetSyncHistoryRequestSchema = Schema.Struct({
	limit: Schema.optional(
		Schema.Number.pipe(Schema.int(), Schema.between(1, 100)),
	),
})

export const GetSyncHistoryResponseSchema = Schema.Struct({
	success: Schema.Boolean,
	data: Schema.optional(
		Schema.Struct({
			syncs: Schema.Array(
				Schema.Struct({
					id: Schema.String,
					startedAt: Schema.String,
					completedAt: Schema.optional(Schema.String),
					status: Schema.String,
					totalModels: Schema.optional(Schema.Number),
					newModels: Schema.optional(Schema.Number),
					updatedModels: Schema.optional(Schema.Number),
					errorMessage: Schema.optional(Schema.String),
				}),
			),
			total: Schema.Number,
		}),
	),
	error: Schema.optional(Schema.String),
})

// ============================================================================
// Query Parameter Schemas (with security constraints)
// ============================================================================

/**
 * GET /v1/admin/sync/history query parameters
 * Validates limit parameter with safe bounds (1-100)
 */
export const SyncHistoryQuerySchema = Schema.Struct({
	limit: Schema.optional(BoundedIntSchema(1, 100)),
})

/**
 * GET /v1/models query parameters
 * Validates provider and limit parameters
 */
export const GetModelsQuerySchema = Schema.Struct({
	limit: Schema.optional(BoundedIntSchema(1, 1000)),
	provider: Schema.optional(ProviderSchema),
	offset: Schema.optional(BoundedIntSchema(0, 100000)),
})

// ============================================================================
// Security Helper Schemas
// ============================================================================

/**
 * Request header validation
 * Ensures required headers are present and valid
 */
export const AuthHeadersSchema = Schema.Struct({
	"x-user-id": Schema.optional(SafeStringSchema),
	"x-admin": Schema.optional(
		Schema.String.pipe(Schema.pattern(/^(true|false)$/)),
	),
})

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validate request data against a schema
 * Returns decoded data or validation error
 */
export function validateRequest<T>(
	schema: Schema.Schema<T, unknown>,
	data: unknown,
): Effect.Effect<T, ParseResult.ParseError> {
	return Schema.decodeUnknown(schema)(data)
}

/**
 * Validate response data against a schema
 * Returns decoded data or validation error
 */
export function validateResponse<T>(
	schema: Schema.Schema<T, unknown>,
	data: unknown,
): Effect.Effect<T, ParseResult.ParseError> {
	return Schema.decodeUnknown(schema)(data)
}

/**
 * Validate query parameters from URL
 * Safely parses and validates query string parameters
 */
export function validateQueryParams<T>(
	schema: Schema.Schema<T, unknown>,
	queryString: string | URLSearchParams,
): Effect.Effect<T, ParseResult.ParseError> {
	return Effect.sync(() => {
		const params = new URLSearchParams(queryString)
		const data: Record<string, unknown> = {}

		// Extract all query parameters into an object
		for (const [key, value] of params) {
			// Try to parse as number if it looks like one
			if (!isNaN(Number(value)) && value !== "") {
				data[key] = Number(value)
			} else if (value === "true" || value === "false") {
				data[key] = value === "true"
			} else {
				data[key] = value
			}
		}

		return data
	}).pipe(Effect.flatMap((data) => Schema.decodeUnknown(schema)(data)))
}

/**
 * Sanitize user input string
 * Removes potentially dangerous characters while preserving readability
 */
export function sanitizeString(input: string, maxLength = 1000): string {
	return input
		.slice(0, maxLength) // Enforce max length
		.trim() // Remove leading/trailing whitespace
		.replace(/[<>\"'`]/g, "") // Remove HTML/script characters
}

/**
 * Validate and sanitize user identifier
 * Ensures ID is in valid format (UUID, email, alphanumeric)
 */
export function validateUserId(userId: string | undefined): Effect.Effect<string, ParseResult.ParseError> {
	if (!userId) {
		return Effect.fail(new ParseResult.Type(undefined as any, userId, "User ID is required"))
	}

	return validateRequest(SafeStringSchema, userId)
}

// Type exports for TypeScript
export type GetModelsRequest = Schema.Schema.Type<typeof GetModelsRequestSchema>
export type GetModelsResponse = Schema.Schema.Type<
	typeof GetModelsResponseSchema
>
export type ApiError = Schema.Schema.Type<typeof ApiErrorSchema>
export type SyncModelsRequest = Schema.Schema.Type<
	typeof SyncModelsRequestSchema
>
export type SyncModelsResponse = Schema.Schema.Type<
	typeof SyncModelsResponseSchema
>
export type GetSyncHistoryRequest = Schema.Schema.Type<
	typeof GetSyncHistoryRequestSchema
>
export type GetSyncHistoryResponse = Schema.Schema.Type<
	typeof GetSyncHistoryResponseSchema
>
