import { Effect, Layer } from "effect"
import { withRetryAndLogging } from "../config/retry"
import { transformModelsDevResponse } from "../transformers/model-transformer"
import type { Model } from "../types"
import { transformArtificialAnalysisModel } from "./ArtificialAnalysisService"
import { CACHE_KEYS, CACHE_TTL, CacheService } from "./CacheService"
import { transformHuggingFaceModel } from "./HuggingFaceService"
import { ModelDataService } from "./ModelDataService"
import { ModelService } from "./ModelService"

// OpenRouter API types
interface OpenRouterModel {
	id: string
	name: string
	description?: string
	context_length: number
	architecture: {
		modality: string
		input_modalities: string[]
		output_modalities: string[]
		tokenizer?: string
		instruct_type?: string
	}
	pricing: {
		prompt: string
		completion: string
		request?: string
		image?: string
		web_search?: string
		internal_reasoning?: string
	}
	top_provider: {
		context_length: number
		max_completion_tokens?: number
		is_moderated?: boolean
	}
	supported_parameters?: string[]
}

interface OpenRouterResponse {
	data: OpenRouterModel[]
}

// Transform OpenRouter model to our internal Model format
function transformOpenRouterModel(openRouterModel: OpenRouterModel): Model {
	// Extract provider from model ID (e.g., "openai/gpt-4" -> "openai")
	const provider = openRouterModel.id.split("/")[0] || "unknown"

	// Extract capabilities from supported parameters
	const capabilities: string[] = []
	if (openRouterModel.supported_parameters?.includes("tools")) {
		capabilities.push("tools")
	}

	// Determine modalities
	const modalities = Array.from(
		new Set([
			...openRouterModel.architecture.input_modalities,
			...openRouterModel.architecture.output_modalities,
		]),
	)

	// Parse pricing
	const inputCost = parseFloat(openRouterModel.pricing.prompt) || 0
	const outputCost = parseFloat(openRouterModel.pricing.completion) || 0
	const _imageCost = parseFloat(openRouterModel.pricing.image || "0") || 0

	return {
		id: openRouterModel.id,
		name: openRouterModel.name,
		provider,
		contextWindow: openRouterModel.context_length,
		maxOutputTokens: openRouterModel.top_provider.max_completion_tokens || 4096,
		inputCost,
		outputCost,
		cacheReadCost: 0, // OpenRouter doesn't specify cache costs in this format
		cacheWriteCost: 0,
		modalities,
		capabilities,
		releaseDate: "", // OpenRouter doesn't provide release dates
		lastUpdated: "",
		knowledge: openRouterModel.description || "",
		openWeights: false, // Assume not open weights unless specified
		supportsTemperature:
			openRouterModel.supported_parameters?.includes("temperature") || false,
		supportsAttachments: modalities.includes("image"),
		new: false,
	}
}

export const ModelServiceLive = Layer.succeed(ModelService, {
	fetchModels: Effect.gen(function* () {
		// Check cache first
		const cacheService = yield* CacheService
		const cachedModels = yield* cacheService.get<Model[]>(CACHE_KEYS.MODELS)

		if (cachedModels) {
			console.log(
				`🎯 [ModelService] Using cached models (${cachedModels.length} models)`,
			)
			return cachedModels
		}

		// Primary source: external APIs (live data)
		console.log("🌐 [ModelService] Fetching fresh models from external APIs")

		// Fetch from all sources with partial failure handling
		const fetchResults = yield* Effect.all(
			[
				// Fetch from models.dev
				withRetryAndLogging(
					Effect.tryPromise({
						try: () => fetch("https://models.dev/api.json"),
						catch: (error) => {
							throw new Error(
								`Failed to fetch from models.dev: ${
									error instanceof Error ? error.message : "Network error"
								}`,
							)
						},
					}).pipe(
						Effect.flatMap((dataUnknown: unknown) => {
							const allModels = transformModelsDevResponse(dataUnknown)
							return Effect.succeed(allModels)
						}),
					),
					"models.dev API fetch",
				),

				// Fetch from OpenRouter
				withRetryAndLogging(
					Effect.tryPromise({
						try: () => fetch("https://openrouter.ai/api/v1/models"),
						catch: (error) => {
							throw new Error(
								`Failed to fetch from OpenRouter: ${
									error instanceof Error ? error.message : "Network error"
								}`,
							)
						},
					}).pipe(
						Effect.flatMap((dataUnknown: unknown) => {
							const response = dataUnknown as { data?: any[] }
							const models = (response.data || []).map(transformOpenRouterModel)
							return Effect.succeed(models)
						}),
					),
					"OpenRouter API fetch",
				),

				// Fetch from HuggingFace
				withRetryAndLogging(
					Effect.tryPromise({
						try: () =>
							fetch(
								"https://huggingface.co/api/models?limit=100&sort=downloads&direction=-1",
							).then((res) => res.json()),
						catch: (error) => {
							throw new Error(
								`Failed to fetch from HuggingFace: ${
									error instanceof Error ? error.message : "Network error"
								}`,
							)
						},
					}).pipe(
						Effect.flatMap((dataUnknown: unknown) => {
							const models: Model[] = (dataUnknown as any[]).map(
								transformHuggingFaceModel,
							)
							return Effect.succeed(models)
						}),
					),
					"HuggingFace API fetch",
				),

				// Fetch from ArtificialAnalysis
				withRetryAndLogging(
					Effect.tryPromise({
						try: () =>
							fetch("https://artificialanalysis.ai/api/datasets/96.csv").then(
								async (res) => {
									const csvText = await res.text()
									const lines = csvText.trim().split("\n")
									const headers = lines[0].split(",")

									const models: any[] = []
									for (let i = 1; i < lines.length; i++) {
										const values = lines[i].split(",")
										if (values.length >= headers.length) {
											const model: any = {}
											headers.forEach((header, index) => {
												if (header === "intelligenceIndex") {
													model[header] = parseFloat(values[index]) || 0
												} else if (header === "isLabClaimedValue") {
													model[header] = values[index].toLowerCase() === "true"
												} else {
													model[header] = values[index]
												}
											})
											models.push(model)
										}
									}
									return models
								},
							),
						catch: (error) => {
							throw new Error(
								`Failed to fetch from ArtificialAnalysis: ${
									error instanceof Error ? error.message : "Network error"
								}`,
							)
						},
					}).pipe(
						Effect.flatMap((dataUnknown: unknown) => {
							const models: Model[] = (dataUnknown as any[]).map(
								transformArtificialAnalysisModel,
							)
							return Effect.succeed(models)
						}),
					),
					"ArtificialAnalysis API fetch",
				),
			].map((effect) => Effect.either(effect)),
			{ concurrency: 4 },
		)

		// Process results and collect any errors
		const modelsDevModels =
			fetchResults[0]._tag === "Right" ? fetchResults[0].right : []
		const openRouterModels =
			fetchResults[1]._tag === "Right" ? fetchResults[1].right : []
		const huggingFaceModels =
			fetchResults[2]._tag === "Right" ? fetchResults[2].right : []
		const artificialAnalysisModels =
			fetchResults[3]._tag === "Right" ? fetchResults[3].right : []

		// Log any failures
		if (fetchResults[0]._tag === "Left") {
			console.error(
				"❌ [ModelService] models.dev fetch failed:",
				fetchResults[0].left.message,
			)
		}
		if (fetchResults[1]._tag === "Left") {
			console.error(
				"❌ [ModelService] OpenRouter fetch failed:",
				fetchResults[1].left.message,
			)
		}
		if (fetchResults[2]._tag === "Left") {
			console.error(
				"❌ [ModelService] HuggingFace fetch failed:",
				fetchResults[2].left.message,
			)
		}
		if (fetchResults[3]._tag === "Left") {
			console.error(
				"❌ [ModelService] ArtificialAnalysis fetch failed:",
				fetchResults[3].left.message,
			)
		}

		const allModels = [
			...modelsDevModels,
			...openRouterModels,
			...huggingFaceModels,
			...artificialAnalysisModels,
		]
		console.log(
			`✅ [ModelService] Fetched ${allModels.length} models from external APIs (${modelsDevModels.length} from models.dev, ${openRouterModels.length} from OpenRouter, ${huggingFaceModels.length} from HuggingFace, ${artificialAnalysisModels.length} from ArtificialAnalysis)`,
		)

		// Cache the results
		yield* cacheService.set(CACHE_KEYS.MODELS, allModels, CACHE_TTL.MODELS)
		console.log("💾 [ModelService] Cached models for future requests")

		// Optionally store in database for analytics/caching (if service available)
		const modelDataServiceOption = yield* Effect.serviceOption(ModelDataService)
		if (modelDataServiceOption._tag === "Some" && allModels.length > 0) {
			const modelDataService = modelDataServiceOption.value

			// Store models in background - don't wait for completion
			yield* Effect.fork(
				Effect.gen(function* () {
					const syncRecord = yield* modelDataService.startSync()
					if (modelsDevModels.length > 0) {
						yield* modelDataService.storeModelBatch(
							modelsDevModels,
							syncRecord.id,
							"models.dev",
						)
					}
					if (openRouterModels.length > 0) {
						yield* modelDataService.storeModelBatch(
							openRouterModels,
							syncRecord.id,
							"openrouter",
						)
					}
					if (huggingFaceModels.length > 0) {
						yield* modelDataService.storeModelBatch(
							huggingFaceModels,
							syncRecord.id,
							"huggingface",
						)
					}
					if (artificialAnalysisModels.length > 0) {
						yield* modelDataService.storeModelBatch(
							artificialAnalysisModels,
							syncRecord.id,
							"artificialanalysis",
						)
					}
					yield* modelDataService.completeSync(
						syncRecord.id,
						allModels.length,
						allModels.length,
					)
				}).pipe(
					Effect.catchAll((error) =>
						Effect.sync(() => {
							console.log(
								"⚠️ [ModelService] Background database storage failed:",
								error,
							)
						}),
					),
				),
			)
		}

		return allModels
	}),

	fetchModelsFromAPI: withRetryAndLogging(
		Effect.tryPromise({
			try: () => fetch("https://models.dev/api.json").then((res) => res.json()),
			catch: (error) => {
				throw new Error(
					`Failed to fetch models: ${
						error instanceof Error ? error.message : "Network error"
					}`,
				)
			},
		}).pipe(
			Effect.flatMap((dataUnknown: unknown) => {
				const allModels = transformModelsDevResponse(dataUnknown)
				console.log(
					`🌐 [ModelService] Fetched ${allModels.length} models directly from external API`,
				)
				return Effect.succeed(allModels)
			}),
		),
		"Direct models.dev API fetch",
	),

	getModelStats: Effect.gen(function* () {
		// ModelDataService not available in this context, return empty stats
		console.log("⚠️ [ModelService] ModelDataService not available for stats")
		return {
			totalModels: 0,
			providers: [],
			lastSyncAt: undefined,
			modelCountByProvider: {},
		}
	}),
})
