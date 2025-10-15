import { useEffect, useState } from "react"
import type { Model } from "../types"

export function useModelData() {
	const [models, setModels] = useState<Model[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const fetchModels = async () => {
			setLoading(true)
			setError(null)
			try {
				const response = await fetch("/api/models")
				if (!response.ok) {
					throw new Error("Failed to fetch models")
				}
				const data = await response.json()
				setModels(data)
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
