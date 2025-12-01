import { Effect, Schedule } from "effect"
import type { Model } from "../types"

// ArtificialAnalysis API types
interface ArtificialAnalysisModel {
	modelName: string
	intelligenceIndex: number
	detailsUrl: string
	isLabClaimedValue: boolean
}

/**
 * Service for fetching models from ArtificialAnalysis API
 */
export class ArtificialAnalysisService extends Effect.Service<ArtificialAnalysisService>()(
	"ArtificialAnalysisService",
	{
		methods: {
			/** Fetch models from ArtificialAnalysis API */
			fetchModels: Effect.Effect<Model[], Error, never>,
		},
	},
) {}

/**
 * Transform ArtificialAnalysis model to our internal Model format
 */
export function transformArtificialAnalysisModel(
	aaModel: ArtificialAnalysisModel,
): Model {
	// Extract provider from model name (e.g., "GPT-5 Codex" -> "openai", "Claude 4.5" -> "anthropic")
	const modelName = aaModel.modelName.toLowerCase()

	let provider = "unknown"
	if (modelName.includes("gpt") || modelName.includes("codex")) {
		provider = "openai"
	} else if (modelName.includes("claude")) {
		provider = "anthropic"
	} else if (modelName.includes("grok")) {
		provider = "xai"
	} else if (modelName.includes("o3") || modelName.includes("o1")) {
		provider = "openai"
	} else if (modelName.includes("gemini") || modelName.includes("bard")) {
		provider = "google"
	} else if (modelName.includes("llama")) {
		provider = "meta"
	} else if (modelName.includes("qwen")) {
		provider = "alibaba"
	} else if (modelName.includes("deepseek")) {
		provider = "deepseek"
	}

	// Extract model capabilities based on name patterns
	const capabilities: string[] = []
	if (modelName.includes("reasoning") || modelName.includes("thinking")) {
		capabilities.push("reasoning")
	}
	if (modelName.includes("vision") || modelName.includes("image")) {
		capabilities.push("vision")
	}
	if (modelName.includes("tool") || modelName.includes("function")) {
		capabilities.push("tools")
	}
	if (modelName.includes("code") || modelName.includes("codex")) {
		capabilities.push("coding")
	}

	// Default capabilities for most models
	if (capabilities.length === 0) {
		capabilities.push("text-generation")
	}

	// Estimate context window and costs based on model size/name
	let contextWindow = 4096 // Default
	let inputCost = 0
	let outputCost = 0

	if (modelName.includes("gpt-5") || modelName.includes("o3")) {
		contextWindow = 128000
		inputCost = 0.01
		outputCost = 0.03
	} else if (modelName.includes("claude") || modelName.includes("grok")) {
		contextWindow = 200000
		inputCost = 0.015
		outputCost = 0.075
	} else if (modelName.includes("gemini")) {
		contextWindow = 1000000
		inputCost = 0.01
		outputCost = 0.02
	}

	return {
		id: `artificialanalysis/${aaModel.modelName
			.replace(/\s+/g, "-")
			.toLowerCase()}`,
		name: aaModel.modelName,
		provider,
		contextWindow,
		maxOutputTokens: Math.min(contextWindow, 4096),
		inputCost,
		outputCost,
		cacheReadCost: 0,
		cacheWriteCost: 0,
		modalities: ["text"], // Most models are text-only in this dataset
		capabilities,
		releaseDate: "", // Not provided in this dataset
		lastUpdated: "",
		knowledge: `Intelligence Index: ${aaModel.intelligenceIndex}`,
		openWeights: false, // Assume proprietary unless specified
		supportsTemperature: true, // Most models support temperature
		supportsAttachments:
			modelName.includes("vision") || modelName.includes("image"),
		new: false,
	}
}

export const ArtificialAnalysisServiceLive = {
	fetchModels: Effect.tryPromise({
		try: () =>
			fetch("https://artificialanalysis.ai/api/datasets/96.csv").then(
				async (res) => {
					const csvText = await res.text()
					const lines = csvText.trim().split("\n")
					const headers = lines[0].split(",")

					const models: ArtificialAnalysisModel[] = []
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
							models.push(model as ArtificialAnalysisModel)
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
		Effect.flatMap((models: ArtificialAnalysisModel[]) => {
			const transformedModels = models.map(transformArtificialAnalysisModel)

			console.log(
				`🧠 [ArtificialAnalysisService] Fetched ${transformedModels.length} models from ArtificialAnalysis`,
			)

			return Effect.succeed(transformedModels)
		}),
		Effect.retry(
			Schedule.spaced(Number(process.env.API_RETRY_MS ?? 1000)).pipe(
				Schedule.compose(Schedule.recurs(3)),
			),
		),
	),
}
