import { useEffect, useState } from "react"
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

export function useModelFilters(models: Model[]) {
	const [filteredModels, setFilteredModels] = useState<Model[]>([])
	const [search, setSearch] = useState("")
	const [filters, setFilters] = useState<Filters>({
		providers: [],
		modalities: [],
		capabilities: [],
		years: [],
		inputCostRange: [0, 1000],
		outputCostRange: [0, 1000],
		cacheReadCostRange: [0, 1000],
		cacheWriteCostRange: [0, 1000],
		openWeights: null,
		supportsTemperature: null,
		supportsAttachments: null,
	})

	useEffect(() => {
		if (models.length === 0) return

		let filtered = models

		filtered = filtered.filter(
			(m) =>
				search === "" || m.name.toLowerCase().includes(search.toLowerCase()),
		)
		if (filters.providers.length > 0)
			filtered = filtered.filter((m) => filters.providers.includes(m.provider))
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

		setFilteredModels(filtered)
	}, [models, search, filters])

	return {
		filteredModels,
		search,
		setSearch,
		filters,
		setFilters,
	}
}
