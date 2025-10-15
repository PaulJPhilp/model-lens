import type { Model } from "../types"

// External API types for models.dev
export interface ExternalModelCost {
	input?: number | string
	output?: number | string
	cache_read?: number | string
	cacheRead?: number | string
	cache_write?: number | string
	cacheWrite?: number | string
}

export interface ExternalModelLimit {
	context?: number | string
	output?: number | string
}

export interface ExternalModelModalities {
	input?: unknown
	output?: unknown
}

export interface ExternalRawModel {
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

export interface ProvidersMapValue {
	models?: Record<string, ExternalRawModel>
}

export type ProvidersMap = Record<string, ProvidersMapValue>

// Type guards and utility functions
export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}

export function toNumber(value: unknown): number {
	const num =
		typeof value === "string" || typeof value === "number"
			? Number(value)
			: Number.NaN
	return Number.isFinite(num) ? num : 0
}

export function toStringArray(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.map((v) => String(v))
	}
	return []
}

export function toBoolean(value: unknown): boolean {
	if (typeof value === "boolean") return value
	if (typeof value === "string") return value.toLowerCase() === "true"
	return Boolean(value)
}

/**
 * Transform a raw model from models.dev API into our internal Model format
 */
export function transformModelsDevModel(
	raw: ExternalRawModel,
	provider: string,
): Model {
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
 * Transform models from models.dev API response format
 */
export function transformModelsDevResponse(dataUnknown: unknown): Model[] {
	const allModels: Model[] = []
	if (isRecord(dataUnknown)) {
		const data = dataUnknown as unknown as ProvidersMap
		for (const provider in data) {
			const providerData = data[provider]
			if (providerData?.models) {
				const models = providerData.models
				for (const modelId in models) {
					const rawModel = models[modelId]
					const transformedModel = transformModelsDevModel(rawModel, provider)
					allModels.push(transformedModel)
				}
			}
		}
	}
	return allModels
}
