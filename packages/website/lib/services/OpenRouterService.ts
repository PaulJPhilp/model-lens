import { Effect, Schedule } from "effect"
import type { Model } from "../types"

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

/**
 * Service for fetching models from OpenRouter API
 */
export class OpenRouterService extends Effect.Service<OpenRouterService>()(
	"OpenRouterService",
	{
		methods: {
			/** Fetch all models from OpenRouter API */
			fetchModels: Effect.Effect<Model[], Error, never>,
		},
	},
) {}

/**
 * Transform OpenRouter model to our internal Model format
 */
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

	return {
		id: openRouterModel.id,
		name: openRouterModel.name,
		provider,
		contextWindow: openRouterModel.context_length,
		maxOutputTokens: openRouterModel.top_provider.max_completion_tokens || 4096,
		inputCost,
		outputCost,
		cacheReadCost: 0, // OpenRouter doesn't specify cache costs
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

export const OpenRouterServiceLive = {
	fetchModels: Effect.tryPromise({
		try: () =>
			fetch("https://openrouter.ai/api/v1/models").then((res) => res.json()),
		catch: (error) => {
			throw new Error(
				`Failed to fetch from OpenRouter: ${
					error instanceof Error ? error.message : "Network error"
				}`,
			)
		},
	}).pipe(
		Effect.flatMap((dataUnknown: unknown) => {
			const response = dataUnknown as OpenRouterResponse
			const models = response.data.map(transformOpenRouterModel)

			console.log(
				`🌐 [OpenRouterService] Fetched ${models.length} models from OpenRouter`,
			)

			return Effect.succeed(models)
		}),
		Effect.retry(
			Schedule.spaced(Number(process.env.API_RETRY_MS ?? 1000)).pipe(
				Schedule.compose(Schedule.recurs(3)),
			),
		),
	),
}
