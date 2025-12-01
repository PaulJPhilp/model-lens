import { Effect } from "effect"
import type { ModelDataStats } from "../../src/db/schema.models"
import type { Model } from "../types"

/**
 * Service for aggregating AI model data from multiple sources
 *
 * Data sources:
 * - models.dev: Provider pricing and specifications
 * - OpenRouter: Real-time availability
 * - HuggingFace: Open-source model metrics
 * - ArtificialAnalysis: Performance benchmarks
 */
export class ModelService extends Effect.Service<ModelService>()(
	"ModelService",
	{
		methods: {
			/** Fetch models - tries database cache first, falls back to external API */
			fetchModels: Effect.Effect<Model[], never>,

			/** Fetch models directly from external API (bypasses cache) */
			fetchModelsFromAPI: Effect.Effect<Model[], never>,

			/** Get model data statistics */
			getModelStats: Effect.Effect<ModelDataStats, never>,
		},
	},
) {}
