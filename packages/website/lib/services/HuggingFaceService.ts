import { Effect, Schedule } from "effect"
import type { Model } from "../types"

// HuggingFace API types
interface HuggingFaceModel {
	_id: string
	id: string
	likes: number
	trendingScore?: number
	private: boolean
	downloads: number
	tags: string[]
	pipeline_tag?: string
	library_name?: string
	createdAt: string
	modelId: string
	author?: string
	lastModified?: string
	gated?: boolean
	disabled?: boolean
}

type HuggingFaceResponse = HuggingFaceModel[]

/**
 * Service for fetching models from HuggingFace API
 */
export class HuggingFaceService extends Effect.Service<HuggingFaceService>()(
	"HuggingFaceService",
	{
		methods: {
			/** Fetch models from HuggingFace API */
			fetchModels: Effect.Effect<Model[], Error, never>,
		},
	},
) {}

/**
 * Transform HuggingFace model to our internal Model format
 */
export function transformHuggingFaceModel(hfModel: HuggingFaceModel): Model {
	// Extract provider from model ID (e.g., "microsoft/DialoGPT-medium" -> "microsoft")
	const provider = hfModel.id.split("/")[0] || "huggingface"

	// Try to infer capabilities from tags and pipeline
	const capabilities: string[] = []
	const tags = hfModel.tags || []

	if (
		tags.includes("text-generation") ||
		hfModel.pipeline_tag === "text-generation"
	) {
		capabilities.push("text-generation")
	}
	if (
		tags.includes("text-classification") ||
		hfModel.pipeline_tag === "text-classification"
	) {
		capabilities.push("classification")
	}
	if (
		tags.includes("question-answering") ||
		hfModel.pipeline_tag === "question-answering"
	) {
		capabilities.push("qa")
	}
	if (
		tags.includes("token-classification") ||
		hfModel.pipeline_tag === "token-classification"
	) {
		capabilities.push("ner")
	}

	// Determine modalities based on tags
	const modalities: string[] = []
	if (tags.includes("text") || hfModel.pipeline_tag?.includes("text")) {
		modalities.push("text")
	}
	if (tags.includes("image") || hfModel.pipeline_tag?.includes("image")) {
		modalities.push("image")
	}
	if (tags.includes("audio") || hfModel.pipeline_tag?.includes("audio")) {
		modalities.push("audio")
	}
	if (tags.includes("video") || hfModel.pipeline_tag?.includes("video")) {
		modalities.push("video")
	}

	// Extract model size from tags (e.g., "7b", "13b", "70b")
	const sizeMatch = hfModel.id.match(/(\d+(?:\.\d+)?)(b|k|m|g|t)/i)
	let contextWindow = 2048 // Default
	if (sizeMatch) {
		const size = parseFloat(sizeMatch[1])
		const unit = sizeMatch[2].toLowerCase()
		// Rough heuristic: larger models tend to have larger context windows
		if (unit === "b" && size >= 70) contextWindow = 4096
		else if (unit === "b" && size >= 30) contextWindow = 8192
		else if (unit === "b" && size >= 7) contextWindow = 4096
	}

	// Estimate costs (HuggingFace models are typically free or low-cost)
	const inputCost = 0 // Free for most models
	const outputCost = 0

	return {
		id: `huggingface/${hfModel.id}`,
		name: hfModel.id,
		provider,
		contextWindow,
		maxOutputTokens: Math.min(contextWindow, 4096), // Conservative estimate
		inputCost,
		outputCost,
		cacheReadCost: 0,
		cacheWriteCost: 0,
		modalities: modalities.length > 0 ? modalities : ["text"], // Default to text
		capabilities,
		releaseDate: hfModel.createdAt || "",
		lastUpdated: hfModel.lastModified || "",
		knowledge: hfModel.pipeline_tag || "",
		openWeights: !hfModel.private && !hfModel.gated,
		supportsTemperature: capabilities.includes("text-generation"),
		supportsAttachments: modalities.includes("image"),
		new: false, // We'll calculate this based on creation date if needed
	}
}

export const HuggingFaceServiceLive = {
	fetchModels: Effect.tryPromise({
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
			const models: Model[] = (dataUnknown as HuggingFaceResponse).map(
				transformHuggingFaceModel,
			)

			console.log(
				`🤗 [HuggingFaceService] Fetched ${models.length} models from HuggingFace`,
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
