import { Effect, Layer } from "effect"
import { ValidationError } from "../errors"
import type { Model } from "../types"
import { CACHE_KEYS, CACHE_TTL, CacheService } from "./CacheService"
import { FilterService, type Filters } from "./FilterService"

const defaultFilters: Filters = {
	providers: [],
	inputCostRange: [0, 1000],
	outputCostRange: [0, 1000],
	cacheReadCostRange: [0, 1000],
	cacheWriteCostRange: [0, 1000],
	modalities: [],
	capabilities: [],
	years: [],
	openWeights: null,
	supportsTemperature: null,
	supportsAttachments: null,
}

export const FilterServiceLive = Layer.succeed(FilterService, {
	applyFilters: (models: Model[], search: string, filters: Filters) =>
		Effect.gen(function* () {
			// Create cache key from filters and search
			const cacheKey = CACHE_KEYS.FILTERED_MODELS(
				search,
				JSON.stringify(filters),
			)

			// Check cache first
			const cacheService = yield* CacheService
			const cachedResult = yield* cacheService.get<Model[]>(cacheKey)

			if (cachedResult) {
				console.log(
					`🎯 [FilterService] Using cached filtered results (${cachedResult.length} models)`,
				)
				return cachedResult
			}

			console.log(
				`🔍 [FilterService] Applying filters to ${models.length} models`,
			)
			console.log(`🔍 [FilterService] Search: "${search}", Filters:`, {
				providers: filters.providers,
				inputCostRange: filters.inputCostRange,
				outputCostRange: filters.outputCostRange,
				capabilities: filters.capabilities,
				modalities: filters.modalities,
			})

			const startTime = Date.now()
			let filtered = models

			filtered = filtered.filter(
				(m) =>
					search === "" || m.name.toLowerCase().includes(search.toLowerCase()),
			)
			if (filters.providers.length > 0)
				filtered = filtered.filter((m) =>
					filters.providers.includes(m.provider),
				)
			if (filters.modalities.length > 0)
				filtered = filtered.filter((m) =>
					filters.modalities.some((mod) => m.modalities.includes(mod)),
				)
			if (filters.capabilities.length > 0)
				filtered = filtered.filter((m) =>
					filters.capabilities.some((cap) => m.capabilities.includes(cap)),
				)
			if (filters.years.length > 0) {
				filtered = filtered.filter((m) => {
					if (!m.releaseDate) return false
					const year = new Date(m.releaseDate).getFullYear()
					return filters.years.includes(year)
				})
			}
			if (filters.openWeights !== null)
				filtered = filtered.filter((m) => m.openWeights === filters.openWeights)
			if (filters.supportsTemperature !== null)
				filtered = filtered.filter(
					(m) => m.supportsTemperature === filters.supportsTemperature,
				)
			if (filters.supportsAttachments !== null)
				filtered = filtered.filter(
					(m) => m.supportsAttachments === filters.supportsAttachments,
				)
			filtered = filtered.filter(
				(m) =>
					m.inputCost >= filters.inputCostRange[0] &&
					m.inputCost <= filters.inputCostRange[1],
			)
			filtered = filtered.filter(
				(m) =>
					m.outputCost >= filters.outputCostRange[0] &&
					m.outputCost <= filters.outputCostRange[1],
			)
			filtered = filtered.filter(
				(m) =>
					m.cacheReadCost >= filters.cacheReadCostRange[0] &&
					m.cacheReadCost <= filters.cacheReadCostRange[1],
			)
			filtered = filtered.filter(
				(m) =>
					m.cacheWriteCost >= filters.cacheWriteCostRange[0] &&
					m.cacheWriteCost <= filters.cacheWriteCostRange[1],
			)
			filtered.sort((a, b) => a.inputCost - b.inputCost)

			const duration = Date.now() - startTime
			console.log(
				`✅ [FilterService] Filtered ${models.length} models to ${filtered.length} results (${duration}ms)`,
			)

			// Cache the results
			yield* cacheService.set(cacheKey, filtered, CACHE_TTL.FILTERED_MODELS)
			console.log(
				"💾 [FilterService] Cached filtered results for future requests",
			)

			return filtered
		}),
	validateFilters: (filters: Partial<Filters>) => {
		const fullFilters: Filters = { ...defaultFilters, ...filters }

		// Clamp negative values to 0
		const clampedFilters: Filters = {
			...fullFilters,
			inputCostRange: [
				Math.max(0, fullFilters.inputCostRange[0]),
				fullFilters.inputCostRange[1],
			],
			outputCostRange: [
				Math.max(0, fullFilters.outputCostRange[0]),
				fullFilters.outputCostRange[1],
			],
			cacheReadCostRange: [
				Math.max(0, fullFilters.cacheReadCostRange[0]),
				fullFilters.cacheReadCostRange[1],
			],
			cacheWriteCostRange: [
				Math.max(0, fullFilters.cacheWriteCostRange[0]),
				fullFilters.cacheWriteCostRange[1],
			],
		}

		return Effect.succeed(clampedFilters).pipe(
			Effect.filterOrFail(
				(f) =>
					f.inputCostRange[0] <= f.inputCostRange[1] &&
					f.outputCostRange[0] <= f.outputCostRange[1] &&
					f.cacheReadCostRange[0] <= f.cacheReadCostRange[1] &&
					f.cacheWriteCostRange[0] <= f.cacheWriteCostRange[1],
				() =>
					new ValidationError("cost", "Min cost cannot be greater than max"),
			),
			Effect.orElseSucceed(() => defaultFilters),
		) as Effect.Effect<Filters, never>
	},
})
