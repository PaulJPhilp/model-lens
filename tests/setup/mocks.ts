import { vi } from "vitest"

// Mock external API responses
export const mockExternalApiResponses = {
	models: {
		success: {
			OpenAI: {
				models: {
					"gpt-4": {
						id: "gpt-4",
						name: "gpt-4",
						provider: "OpenAI",
						cost: {
							input: 0.03,
							output: 0.06,
							cache_read: 0.015,
							cache_write: 0.03,
						},
						limit: {
							context: 128000,
							output: 4096,
						},
						modalities: {
							input: ["text"],
							output: ["text"],
						},
						release_date: "2023-03-01",
						last_updated: "2023-03-01",
						tool_call: true,
						reasoning: false,
						knowledge: "2023-04",
						open_weights: false,
						temperature: true,
						attachment: false,
					},
				},
			},
			Anthropic: {
				models: {
					"claude-3": {
						id: "claude-3",
						name: "claude-3",
						provider: "Anthropic",
						cost: {
							input: 0.015,
							output: 0.075,
							cacheRead: 0.0075,
							cacheWrite: 0.015,
						},
						limit: {
							context: 200000,
							output: 4096,
						},
						modalities: {
							input: ["text", "image"],
							output: ["text"],
						},
						releaseDate: "2023-06-01",
						lastUpdated: "2023-06-01",
						tool_call: false,
						reasoning: true,
						knowledge: "2023-08",
						open_weights: false,
						temperature: true,
						attachment: true,
					},
				},
			},
		},
		error: {
			status: 500,
			message: "External API error",
		},
		networkError: new Error("Network error"),
	},
}

// Mock test models for component testing
export const mockTestModels = [
	{
		id: "gpt-4",
		name: "gpt-4",
		provider: "OpenAI",
		contextWindow: 128000,
		maxOutputTokens: 4096,
		inputCost: 0.03,
		outputCost: 0.06,
		cacheReadCost: 0.015,
		cacheWriteCost: 0.03,
		modalities: ["text"],
		capabilities: ["tools"],
		releaseDate: "2023-03-01",
		lastUpdated: "2023-03-01",
		knowledge: "2023-04",
		openWeights: false,
		supportsTemperature: true,
		supportsAttachments: false,
		new: false,
	},
	{
		id: "claude-3",
		name: "claude-3",
		provider: "Anthropic",
		contextWindow: 200000,
		maxOutputTokens: 4096,
		inputCost: 0.015,
		outputCost: 0.075,
		cacheReadCost: 0.0075,
		cacheWriteCost: 0.015,
		modalities: ["text", "image"],
		capabilities: ["reasoning"],
		releaseDate: "2023-06-01",
		lastUpdated: "2023-06-01",
		knowledge: "2023-08",
		openWeights: false,
		supportsTemperature: true,
		supportsAttachments: true,
		new: true,
	},
	{
		id: "dall-e-3",
		name: "dall-e-3",
		provider: "OpenAI",
		contextWindow: 0,
		maxOutputTokens: 0,
		inputCost: 0.08,
		outputCost: 0.08,
		cacheReadCost: 0,
		cacheWriteCost: 0,
		modalities: ["image"],
		capabilities: ["generation"],
		releaseDate: "2023-09-01",
		lastUpdated: "2023-09-01",
		knowledge: "",
		openWeights: false,
		supportsTemperature: false,
		supportsAttachments: false,
		new: false,
	},
]

// Mock database responses
export const mockDbResponses = {
	filters: {
		list: {
			filters: [
				{
					id: "filter-1",
					ownerId: "test-user",
					teamId: null,
					name: "Test Filter 1",
					description: "Test description 1",
					visibility: "private",
					rules: [
						{
							field: "provider",
							operator: "eq",
							value: "OpenAI",
							type: "hard",
						},
					],
					version: 1,
					createdAt: "2023-01-01T00:00:00Z",
					updatedAt: "2023-01-01T00:00:00Z",
					lastUsedAt: null,
					usageCount: 0,
				},
			],
			total: 1,
			page: 1,
			pageSize: 20,
		},
		create: {
			id: "new-filter-id",
			ownerId: "test-user",
			teamId: null,
			name: "New Filter",
			description: "New filter description",
			visibility: "private",
			rules: [],
			version: 1,
			createdAt: "2023-01-01T00:00:00Z",
			updatedAt: "2023-01-01T00:00:00Z",
			lastUsedAt: null,
			usageCount: 0,
		},
		update: {
			id: "filter-1",
			ownerId: "test-user",
			teamId: null,
			name: "Updated Filter",
			description: "Updated description",
			visibility: "private",
			rules: [],
			version: 2,
			createdAt: "2023-01-01T00:00:00Z",
			updatedAt: "2023-01-01T00:00:00Z",
			lastUsedAt: null,
			usageCount: 0,
		},
		delete: {
			status: 204,
		},
		evaluate: {
			filterId: "filter-1",
			filterName: "Test Filter 1",
			results: [
				{
					modelId: "gpt-4",
					modelName: "gpt-4",
					match: true,
					score: 1.0,
					rationale: "Matches all criteria",
					failedHardClauses: 0,
					passedSoftClauses: 0,
					totalSoftClauses: 0,
				},
			],
			totalEvaluated: 1,
			matchCount: 1,
		},
	},
}

// Mock chat responses
export const mockChatResponses = {
	success: {
		content:
			"Here are some models that might help: GPT-4 for general tasks, Claude-3 for reasoning.",
		meta: {
			citations: [
				{
					type: "MODEL",
					id: "gpt-4",
					title: "GPT-4",
					snippet: "General purpose model",
				},
				{
					type: "MODEL",
					id: "claude-3",
					title: "Claude-3",
					snippet: "Reasoning model",
				},
			],
			finishReason: "completed",
		},
	},
	streaming: {
		chunks: [
			"Here are ",
			"some models ",
			"that support ",
			"vision: ",
			"GPT-4V and ",
			"Claude-3.",
		],
	},
	error: {
		status: 500,
		message: "Chat service error",
	},
}

// Mock authentication responses
export const mockAuthResponses = {
	success: {
		user: {
			id: "test-user-123",
			email: "test@example.com",
			name: "Test User",
		},
		team: {
			id: "test-team-456",
			name: "Test Team",
		},
	},
	unauthorized: {
		status: 401,
		message: "Unauthorized",
	},
}

// Mock component props
export const mockComponentProps = {
	modelTable: {
		onModelSelect: vi.fn(),
		onFilterChange: vi.fn(),
	},
	filterList: {
		onFilterApplied: vi.fn(),
		onFilterEdit: vi.fn(),
		onFilterDelete: vi.fn(),
	},
	filterEditor: {
		onClose: vi.fn(),
		onSave: vi.fn(),
	},
	chat: {
		userId: "test-user-123",
		initialSystemMessage: "You are a helpful assistant.",
	},
}

// Mock router
export const mockRouter = {
	push: vi.fn(),
	replace: vi.fn(),
	back: vi.fn(),
	forward: vi.fn(),
	refresh: vi.fn(),
	prefetch: vi.fn(),
}

// Mock search params
export const mockSearchParams = {
	get: vi.fn(),
	getAll: vi.fn(),
	has: vi.fn(),
	keys: vi.fn(),
	values: vi.fn(),
	entries: vi.fn(),
	forEach: vi.fn(),
	toString: vi.fn(),
}

// Mock window and document
export const mockWindow = {
	matchMedia: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
	scrollTo: vi.fn(),
	location: {
		href: "http://localhost:3000",
		pathname: "/",
		search: "",
		hash: "",
	},
}

// Mock IntersectionObserver
export const mockIntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}))

// Mock ResizeObserver
export const mockResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}))

// Mock console methods
export const mockConsole = {
	error: vi.fn(),
	warn: vi.fn(),
	log: vi.fn(),
	info: vi.fn(),
	debug: vi.fn(),
}

// Setup global mocks
export const setupGlobalMocks = () => {
	// Mock fetch globally
	global.fetch = vi.fn()

	// Mock window properties
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: mockWindow.matchMedia,
	})

	Object.defineProperty(window, "scrollTo", {
		writable: true,
		value: mockWindow.scrollTo,
	})

	// Mock IntersectionObserver
	global.IntersectionObserver = mockIntersectionObserver

	// Mock ResizeObserver
	global.ResizeObserver = mockResizeObserver

	// Mock console methods
	console.error = mockConsole.error
	console.warn = mockConsole.warn
	console.log = mockConsole.log
	console.info = mockConsole.info
	console.debug = mockConsole.debug
}

// Cleanup mocks
export const cleanupMocks = () => {
	vi.clearAllMocks()
	vi.resetAllMocks()
}
