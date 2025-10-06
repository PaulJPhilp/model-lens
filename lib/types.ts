export interface Model {
	id: string
	name: string
	provider: string
	contextWindow: number
	maxOutputTokens: number
	inputCost: number
	outputCost: number
	cacheReadCost: number
	cacheWriteCost: number
	modalities: string[]
	capabilities: string[]
	releaseDate: string
	lastUpdated: string
	knowledge: string
	openWeights: boolean
	supportsTemperature: boolean
	supportsAttachments: boolean
	new: boolean
}

export interface RawModel {
	[key: string]: unknown
}
