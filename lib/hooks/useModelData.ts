import { Effect } from "effect"
import { useEffect, useState } from "react"
import { AppLayer } from "../layers"
import { ModelService } from "../services/ModelService"
import type { Model } from "../types"

function runEffect<A, E, R>(effect: Effect.Effect<A, E, R>): Promise<A> {
	return Effect.runPromise(
		effect.pipe(Effect.provide(AppLayer)) as Effect.Effect<A, E, never>,
	)
}

export function useModelData() {
	const [models, setModels] = useState<Model[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const fetchModels = async () => {
			setLoading(true)
			setError(null)
			try {
				const result = await runEffect(
					Effect.gen(function* () {
						const service = yield* ModelService
						return yield* service.fetchModels
					}),
				)
				setModels(result)
			} catch (error) {
				console.error("Failed to fetch models:", error)
				setError("Failed to load models. Please try again later.")
			} finally {
				setLoading(false)
			}
		}
		fetchModels()
	}, [])

	return { models, loading, error }
}
