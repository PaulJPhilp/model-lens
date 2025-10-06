import { Effect } from "effect"
import { useEffect, useState } from "react"
import { AppLayer } from "../layers"
import { FilterService, type Filters } from "../services/FilterService"
import type { Model } from "../types"

function runEffect<A, E, R>(effect: Effect.Effect<A, E, R>): Promise<A> {
	return Effect.runPromise(
		effect.pipe(Effect.provide(AppLayer)) as Effect.Effect<A, E, never>,
	)
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
		const applyFilters = async () => {
			if (models.length === 0) return

			try {
				const result = await runEffect(
					Effect.gen(function* () {
						const service = yield* FilterService
						return yield* service.applyFilters(models, search, filters)
					}),
				)
				setFilteredModels(result)
			} catch (error) {
				console.error(error)
			}
		}
		applyFilters()
	}, [models, search, filters])

	return {
		filteredModels,
		search,
		setSearch,
		filters,
		setFilters,
	}
}
