import { Effect } from "effect"
import { type NextRequest, NextResponse } from "next/server"
import { rateLimitMiddleware } from "@/lib/middleware/rateLimit"
import { withQueryValidation } from "@/lib/middleware/validation"
import { GetSyncHistoryRequestSchema } from "@/lib/schemas/validation"
import { ModelDataService } from "../../../../lib/services/ModelDataService"
import { ModelDataServiceLive } from "../../../../lib/services/ModelDataServiceLive"

// External API types and transformation logic (duplicated from sync script for API endpoint)
interface ExternalModelCost {
	input?: number | string
	output?: number | string
	cache_read?: number | string
	cacheRead?: number | string
	cache_write?: number | string
	cacheWrite?: number | string
}

interface ExternalModelLimit {
	context?: number | string
	output?: number | string
}

interface ExternalModelModalities {
	input?: unknown
	output?: unknown
}

interface ExternalRawModel {
	id?: unknown
	name?: unknown
	provider?: unknown
	cost?: ExternalModelCost
	limit?: ExternalModelLimit
	modalities?: ExternalModelModalities
	release_date?: unknown
	releaseDate?: unknown
	last_updated?: unknown
	lastUpdated?: unknown
	tool_call?: unknown
	reasoning?: unknown
	knowledge?: unknown
	open_weights?: unknown
	temperature?: unknown
	attachment?: unknown
}

interface ProvidersMapValue {
	models?: Record<string, ExternalRawModel>
}

type ProvidersMap = Record<string, ProvidersMapValue>

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}

function toNumber(value: unknown): number {
	const num =
		typeof value === "string" || typeof value === "number"
			? Number(value)
			: Number.NaN
	return Number.isFinite(num) ? num : 0
}

function toStringArray(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.map((v) => String(v))
	}
	return []
}

function toBoolean(value: unknown): boolean {
	if (typeof value === "boolean") return value
	if (typeof value === "string") return value.toLowerCase() === "true"
	return Boolean(value)
}

// Normalize external models.dev shape into our `Model` shape used by the UI
function transformModel(raw: ExternalRawModel, provider: string) {
	const cost: ExternalModelCost =
		isRecord(raw) && isRecord(raw.cost as unknown)
			? (raw.cost as ExternalModelCost)
			: {}
	const limit: ExternalModelLimit =
		isRecord(raw) && isRecord(raw.limit as unknown)
			? (raw.limit as ExternalModelLimit)
			: {}
	const modalitiesObj: ExternalModelModalities =
		isRecord(raw) && isRecord(raw.modalities as unknown)
			? (raw.modalities as ExternalModelModalities)
			: {}

	const inputModalities = toStringArray(modalitiesObj.input)
	const outputModalities = toStringArray(modalitiesObj.output)
	const modalities = Array.from(
		new Set([...inputModalities, ...outputModalities]),
	)

	const capabilities: string[] = []
	if (isRecord(raw)) {
		if ("tool_call" in raw && raw.tool_call === true) capabilities.push("tools")
		if ("reasoning" in raw && raw.reasoning === true)
			capabilities.push("reasoning")
		if ("knowledge" in raw && raw.knowledge === true)
			capabilities.push("knowledge")
	}

	const rd = isRecord(raw)
		? typeof raw.release_date === "string"
			? raw.release_date
			: typeof raw.releaseDate === "string"
				? raw.releaseDate
				: ""
		: ""

	const lu = isRecord(raw)
		? typeof raw.last_updated === "string"
			? raw.last_updated
			: typeof raw.lastUpdated === "string"
				? raw.lastUpdated
				: ""
		: ""

	// Calculate if model is new (released in past 30 days)
	const isNew = rd
		? (() => {
				const releaseDate = new Date(rd)
				const thirtyDaysAgo = new Date()
				thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
				return releaseDate >= thirtyDaysAgo
			})()
		: false

	// Determine provider - use "Unknown" if model data is invalid
	const hasValidId = typeof raw?.id === "string" && raw.id.trim() !== ""
	const hasValidName = typeof raw?.name === "string" && raw.name.trim() !== ""
	const finalProvider = hasValidId && hasValidName ? provider : "Unknown"

	return {
		id: typeof raw?.id === "string" ? raw.id : "",
		name: typeof raw?.name === "string" ? raw.name : "Unknown",
		provider: finalProvider,
		contextWindow: toNumber(limit.context),
		maxOutputTokens: toNumber(limit.output),
		inputCost: toNumber(cost.input),
		outputCost: toNumber(cost.output),
		cacheReadCost: toNumber(cost.cache_read || cost.cacheRead),
		cacheWriteCost: toNumber(cost.cache_write || cost.cacheWrite),
		modalities,
		capabilities,
		releaseDate: rd,
		lastUpdated: lu,
		knowledge:
			isRecord(raw) && typeof raw.knowledge === "string" ? raw.knowledge : "",
		openWeights: isRecord(raw) && toBoolean(raw.open_weights),
		supportsTemperature: isRecord(raw) && toBoolean(raw.temperature),
		supportsAttachments: isRecord(raw) && toBoolean(raw.attachment),
		new: isNew,
	}
}

/**
 * POST /api/admin/sync-models - Trigger a manual model data sync
 */
export async function POST(request: NextRequest) {
	// Apply admin rate limiting
	const rateLimitResponse = await rateLimitMiddleware(request, "admin")
	if (rateLimitResponse) {
		return rateLimitResponse
	}
	const startTime = Date.now()

	try {
		console.log("🚀 [API] POST /api/admin/sync-models - Starting manual sync")

		// Run sync operation using Effect
		const result = await Effect.gen(function* () {
			// Start sync operation
			const modelDataService = yield* ModelDataService
			const syncRecord = yield* modelDataService.startSync()
			const syncId = syncRecord.id

			console.log(`📝 [API] Created sync operation: ${syncId}`)

			try {
				// Fetch models from external API
				console.log("🌐 [API] Fetching models from external API")
				const response = yield* Effect.tryPromise({
					try: () => fetch("https://models.dev/api.json"),
					catch: (error) => {
						throw new Error(
							`Failed to fetch from external API: ${
								error instanceof Error ? error.message : "Network error"
							}`,
						)
					},
				})

				if (!response.ok) {
					throw new Error(
						`External API returned ${response.status}: ${response.statusText}`,
					)
				}

				const dataUnknown = yield* Effect.promise(() => response.json())
				console.log("✅ [API] Successfully fetched data from external API")

				// Transform the data
				const allModels = []
				if (isRecord(dataUnknown)) {
					const data = dataUnknown as unknown as ProvidersMap
					for (const provider in data) {
						const providerData = data[provider]
						if (providerData?.models) {
							const models = providerData.models
							for (const modelId in models) {
								const rawModel = models[modelId]
								const transformedModel = transformModel(rawModel, provider)
								allModels.push(transformedModel)
							}
						}
					}
				}

				console.log(`🔄 [API] Transformed ${allModels.length} models`)

				// Store models in database
				yield* modelDataService.storeModelBatch(allModels, syncId)

				// Complete sync operation
				yield* modelDataService.completeSync(
					syncId,
					allModels.length,
					allModels.length,
				)

				console.log(
					`✅ [API] Successfully completed sync ${syncId}: stored ${allModels.length} models`,
				)

				return {
					syncId,
					modelsStored: allModels.length,
					success: true,
				}
			} catch (error) {
				// Mark sync as failed
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error"
				yield* modelDataService.failSync(syncId, errorMessage)

				console.error(`❌ [API] Sync operation ${syncId} failed:`, errorMessage)

				throw error
			}
		}).pipe(Effect.provide(ModelDataServiceLive), Effect.runPromise)

		const duration = Date.now() - startTime
		console.log(
			`🎉 [API] POST /api/admin/sync-models - Sync completed successfully in ${duration}ms`,
		)

		return NextResponse.json({
			success: true,
			data: result,
			duration,
		})
	} catch (error) {
		const duration = Date.now() - startTime
		console.error(
			`💥 [API] POST /api/admin/sync-models - Sync failed after ${duration}ms:`,
			error,
		)

		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
				duration,
			},
			{ status: 500 },
		)
	}
}

/**
 * GET /api/admin/sync-models - Get sync status and history
 */
const getSyncHistoryHandler = withQueryValidation(
	GetSyncHistoryRequestSchema,
	async (request: NextRequest, validatedQuery) => {
		// Apply admin rate limiting
		const rateLimitResponse = await rateLimitMiddleware(request, "admin")
		if (rateLimitResponse) {
			return rateLimitResponse
		}

		const limit = (validatedQuery as { limit?: number }).limit || 10

		try {
			console.log(
				`📊 [API] GET /api/admin/sync-models - Fetching sync history (limit: ${limit})`,
			)

			// Get sync history using Effect
			const syncHistory = await Effect.gen(function* () {
				const modelDataService = yield* ModelDataService
				return yield* modelDataService.getSyncHistory(limit)
			}).pipe(Effect.provide(ModelDataServiceLive), Effect.runPromise)

			console.log(
				`✅ [API] Retrieved ${syncHistory.length} sync operations from history`,
			)

			return NextResponse.json({
				success: true,
				data: {
					syncs: syncHistory,
					total: syncHistory.length,
				},
			})
		} catch (error) {
			console.error(
				`❌ [API] GET /api/admin/sync-models - Failed to fetch sync history:`,
				error,
			)

			return NextResponse.json(
				{
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 500 },
			)
		}
	},
)

export const GET = getSyncHistoryHandler
