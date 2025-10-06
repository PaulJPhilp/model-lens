import { Context, type Effect } from "effect"
import type { Model } from "../types"

export interface Filters {
	providers: string[]
	inputCostRange: [number, number]
	outputCostRange: [number, number]
	cacheReadCostRange: [number, number]
	cacheWriteCostRange: [number, number]
	modalities: string[]
	capabilities: string[]
	years: number[]
	openWeights: boolean | null
	supportsTemperature: boolean | null
	supportsAttachments: boolean | null
}

export interface FilterServiceType {
	applyFilters: (
		models: Model[],
		search: string,
		filters: Filters,
	) => Effect.Effect<Model[], never>
	validateFilters: (filters: Partial<Filters>) => Effect.Effect<Filters, never>
}

export const FilterService =
	Context.GenericTag<FilterServiceType>("FilterService")
