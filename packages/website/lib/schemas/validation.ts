import { ParseResult, Schema } from "@effect/schema"
import { Effect } from "effect"

// Base schemas for common types
export const StringSchema = Schema.String
export const NumberSchema = Schema.Number
export const BooleanSchema = Schema.Boolean
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

// Validation helper functions
export function validateRequest<T>(
	schema: Schema.Schema<T, unknown>,
	data: unknown,
): Effect.Effect<T, ParseResult.ParseError> {
	return Schema.decodeUnknown(schema)(data)
}

export function validateResponse<T>(
	schema: Schema.Schema<T, unknown>,
	data: unknown,
): Effect.Effect<T, ParseResult.ParseError> {
	return Schema.decodeUnknown(schema)(data)
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
