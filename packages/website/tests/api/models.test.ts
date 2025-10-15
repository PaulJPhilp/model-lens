import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GET } from "@/app/api/models/route"
import type { Model } from "@/lib/types"

describe("GET /api/models", () => {
	let originalFetch: typeof global.fetch

	beforeEach(() => {
		originalFetch = global.fetch
	})

	afterEach(() => {
		global.fetch = originalFetch
		vi.restoreAllMocks()
	})

	it("should fetch and transform models from external API", async () => {
		// Mock external API response
		const mockExternalResponse = {
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
		}

		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => mockExternalResponse,
		})

		const response = await GET()
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data.models).toHaveLength(2)

		const gpt4Model = data.models.find((m: Model) => m.id === "gpt-4")
		expect(gpt4Model).toBeDefined()
		expect(gpt4Model.name).toBe("gpt-4")
		expect(gpt4Model.provider).toBe("OpenAI")
		expect(gpt4Model.contextWindow).toBe(128000)
		expect(gpt4Model.inputCost).toBe(0.03)
		expect(gpt4Model.outputCost).toBe(0.06)
		expect(gpt4Model.cacheReadCost).toBe(0.015)
		expect(gpt4Model.cacheWriteCost).toBe(0.03)
		expect(gpt4Model.modalities).toEqual(["text"])
		expect(gpt4Model.capabilities).toEqual(["tools"])
		expect(gpt4Model.openWeights).toBe(false)
		expect(gpt4Model.supportsTemperature).toBe(true)
		expect(gpt4Model.supportsAttachments).toBe(false)

		const claudeModel = data.models.find((m: Model) => m.id === "claude-3")
		expect(claudeModel).toBeDefined()
		expect(claudeModel.name).toBe("claude-3")
		expect(claudeModel.provider).toBe("Anthropic")
		expect(claudeModel.contextWindow).toBe(200000)
		expect(claudeModel.inputCost).toBe(0.015)
		expect(claudeModel.outputCost).toBe(0.075)
		expect(claudeModel.cacheReadCost).toBe(0.0075)
		expect(claudeModel.cacheWriteCost).toBe(0.015)
		expect(claudeModel.modalities).toEqual(["text", "image"])
		expect(claudeModel.capabilities).toEqual(["reasoning"])
		expect(claudeModel.openWeights).toBe(false)
		expect(claudeModel.supportsTemperature).toBe(true)
		expect(claudeModel.supportsAttachments).toBe(true)
	})

	it("should handle models with new release date (within 30 days)", async () => {
		const thirtyDaysAgo = new Date()
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 15)
		const recentDate = thirtyDaysAgo.toISOString().split("T")[0]

		const mockExternalResponse = {
			OpenAI: {
				models: {
					"gpt-4-turbo": {
						id: "gpt-4-turbo",
						name: "gpt-4-turbo",
						provider: "OpenAI",
						cost: { input: 0.01, output: 0.03 },
						limit: { context: 128000, output: 4096 },
						modalities: { input: ["text"], output: ["text"] },
						release_date: recentDate,
						tool_call: true,
					},
				},
			},
		}

		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => mockExternalResponse,
		})

		const response = await GET()
		const data = await response.json()

		expect(data.models[0].new).toBe(true)
	})

	it("should handle missing or invalid data gracefully", async () => {
		const mockExternalResponse = {
			OpenAI: {
				models: {
					"invalid-model": {
						// Missing most fields
						id: "invalid-model",
					},
					"partial-model": {
						id: "partial-model",
						name: "partial-model",
						cost: { input: "invalid" }, // Invalid number
						limit: { context: "not-a-number" },
					},
				},
			},
		}

		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => mockExternalResponse,
		})

		const response = await GET()
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data.models).toHaveLength(2)

		const invalidModel = data.models.find(
			(m: Model) => m.id === "invalid-model",
		)
		expect(invalidModel.name).toBe("Unknown")
		expect(invalidModel.provider).toBe("Unknown")
		expect(invalidModel.contextWindow).toBe(0)
		expect(invalidModel.inputCost).toBe(0)

		const partialModel = data.models.find(
			(m: Model) => m.id === "partial-model",
		)
		expect(partialModel.inputCost).toBe(0) // Invalid string converted to 0
		expect(partialModel.contextWindow).toBe(0) // Invalid string converted to 0
	})

	it("should handle external API errors", async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
		})

		const response = await GET()
		const data = await response.json()

		expect(response.status).toBe(500)
		expect(data.error).toBe("Failed to fetch models")
	})

	it("should handle network errors", async () => {
		global.fetch = vi.fn().mockRejectedValue(new Error("Network error"))

		const response = await GET()
		const data = await response.json()

		expect(response.status).toBe(500)
		expect(data.error).toBe("Failed to fetch models")
	})

	it("should handle empty API response", async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({}),
		})

		const response = await GET()
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data.models).toEqual([])
	})

	it("should handle malformed JSON response", async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => {
				throw new Error("Invalid JSON")
			},
		})

		const response = await GET()
		const data = await response.json()

		expect(response.status).toBe(500)
		expect(data.error).toBe("Failed to fetch models")
	})

	it("should properly merge input and output modalities", async () => {
		const mockExternalResponse = {
			OpenAI: {
				models: {
					"multimodal-model": {
						id: "multimodal-model",
						name: "multimodal-model",
						provider: "OpenAI",
						cost: { input: 0.01, output: 0.03 },
						limit: { context: 128000, output: 4096 },
						modalities: {
							input: ["text", "image"],
							output: ["text", "audio"],
						},
						release_date: "2023-01-01",
					},
				},
			},
		}

		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => mockExternalResponse,
		})

		const response = await GET()
		const data = await response.json()

		const model = data.models[0]
		expect(model.modalities).toEqual(["text", "image", "audio"])
	})

	it("should extract capabilities correctly", async () => {
		const mockExternalResponse = {
			OpenAI: {
				models: {
					"capable-model": {
						id: "capable-model",
						name: "capable-model",
						provider: "OpenAI",
						cost: { input: 0.01, output: 0.03 },
						limit: { context: 128000, output: 4096 },
						modalities: { input: ["text"], output: ["text"] },
						release_date: "2023-01-01",
						tool_call: true,
						reasoning: true,
						knowledge: "2024-01",
					},
				},
			},
		}

		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => mockExternalResponse,
		})

		const response = await GET()
		const data = await response.json()

		const model = data.models[0]
		expect(model.capabilities).toEqual(["tools", "reasoning", "knowledge"])
	})
})
