import { Effect } from "effect"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { OpenRouterService } from "../../lib/services/OpenRouterService"
import { OpenRouterServiceLive } from "../../lib/services/OpenRouterServiceLive"

describe("OpenRouterService", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should fetch models from OpenRouter API", async () => {
		const mockApiResponse = {
			data: [
				{
					id: "openai/gpt-4",
					name: "GPT-4",
					description: "Most capable GPT-4 model",
					pricing: {
						prompt: "0.03",
						completion: "0.06",
						image: "0.04",
					},
					context_length: 128000,
					architecture: {
						modality: "text",
						tokenizer: "cl100k_base",
						instruct_type: "chat",
						input_modalities: ["text"],
						output_modalities: ["text"],
					},
				},
				{
					id: "anthropic/claude-3-sonnet",
					name: "Claude 3 Sonnet",
					description: "Balanced performance and speed",
					pricing: {
						prompt: "0.003",
						completion: "0.015",
					},
					context_length: 200000,
					architecture: {
						modality: "text",
						tokenizer: "claude",
						instruct_type: "chat",
						input_modalities: ["text"],
						output_modalities: ["text"],
					},
				},
			],
		}

		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(mockApiResponse),
		})

		const program = Effect.gen(function* () {
			const service = yield* OpenRouterService
			return yield* service.fetchModels
		})

		const result = await Effect.runPromise(
			program.pipe(Effect.provide(OpenRouterServiceLive)),
		)

		expect(result).toHaveLength(2)
		expect(result[0]).toMatchObject({
			id: "openai/gpt-4",
			name: "GPT-4",
			provider: "OpenRouter",
			inputCost: 0.03,
			outputCost: 0.06,
			contextWindow: 128000,
			modalities: ["text"],
		})
		expect(result[1]).toMatchObject({
			id: "anthropic/claude-3-sonnet",
			name: "Claude 3 Sonnet",
			provider: "OpenRouter",
			inputCost: 0.003,
			outputCost: 0.015,
			contextWindow: 200000,
			modalities: ["text"],
		})
	})

	it("should handle API errors gracefully", async () => {
		global.fetch = vi.fn().mockRejectedValue(new Error("Network error"))

		const program = Effect.gen(function* () {
			const service = yield* OpenRouterService
			return yield* service.fetchModels
		})

		await expect(
			Effect.runPromise(program.pipe(Effect.provide(OpenRouterServiceLive))),
		).rejects.toThrow("Network error")
	})

	it("should handle empty API response", async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ data: [] }),
		})

		const program = Effect.gen(function* () {
			const service = yield* OpenRouterService
			return yield* service.fetchModels
		})

		const result = await Effect.runPromise(
			program.pipe(Effect.provide(OpenRouterServiceLive)),
		)

		expect(result).toHaveLength(0)
	})

	it("should handle malformed API response", async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ data: null }),
		})

		const program = Effect.gen(function* () {
			const service = yield* OpenRouterService
			return yield* service.fetchModels
		})

		const result = await Effect.runPromise(
			program.pipe(Effect.provide(OpenRouterServiceLive)),
		)

		expect(result).toHaveLength(0)
	})

	it("should handle missing pricing data", async () => {
		const mockApiResponse = {
			data: [
				{
					id: "test/model",
					name: "Test Model",
					pricing: {},
					context_length: 1000,
					architecture: {
						modality: "text",
						input_modalities: ["text"],
						output_modalities: ["text"],
					},
				},
			],
		}

		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(mockApiResponse),
		})

		const program = Effect.gen(function* () {
			const service = yield* OpenRouterService
			return yield* service.fetchModels
		})

		const result = await Effect.runPromise(
			program.pipe(Effect.provide(OpenRouterServiceLive)),
		)

		expect(result).toHaveLength(1)
		expect(result[0]).toMatchObject({
			id: "test/model",
			name: "Test Model",
			provider: "OpenRouter",
			inputCost: 0,
			outputCost: 0,
			contextWindow: 1000,
		})
	})
})
