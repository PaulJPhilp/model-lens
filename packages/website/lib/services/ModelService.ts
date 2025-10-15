import { Context, type Effect } from "effect"
import type { ModelDataStats } from "../../src/db/schema.models"
import type { Model } from "../types"

export interface ModelServiceType {
	/** Fetch models - tries database cache first, falls back to external API */
	fetchModels: Effect.Effect<Model[], unknown, unknown>

	/** Fetch models directly from external API (bypasses cache) */
	fetchModelsFromAPI: Effect.Effect<Model[], unknown, unknown>

	/** Get model data statistics */
	getModelStats: Effect.Effect<ModelDataStats, unknown, unknown>
}

export class ModelService extends Context.Tag("ModelService")<
	ModelService,
	ModelServiceType
>() {}
