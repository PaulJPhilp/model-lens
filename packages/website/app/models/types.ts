export interface Model {
	id: string
	name: string
	provider: string
	contextWindow: number
	inputCost: number
	outputCost: number
	modalities: string[]
	capabilities: string[]
	releaseDate: string
}
