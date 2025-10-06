import { Effect } from "effect"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { HuggingFaceService } from "../../lib/services/HuggingFaceService"
import { HuggingFaceServiceLive } from "../../lib/services/HuggingFaceServiceLive"

describe("HuggingFaceService", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should fetch models from HuggingFace API", async () => {
		const mockApiResponse = [
			{
				id: "microsoft/DialoGPT-medium",
				downloads: 1000000,
				tags: ["text-generation", "conversational"],
				pipeline_tag: "text-generation",
				library_name: "transformers",
			},
			{
				id: "google/flan-t5-large",
				downloads: 500000,
				tags: ["text2text-generation"],
				pipeline_tag: "text2text-generation",
				library_name: "transformers",
			},
		]

		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(mockApiResponse),
		})

		const program = Effect.gen(function* () {
			const service = yield* HuggingFaceService
			return yield* service.fetchModels
		})

		const result = await Effect.runPromise(
			program.pipe(Effect.provide(HuggingFaceServiceLive)),
		)

		expect(result).toHaveLength(2)
		expect(result[0]).toMatchObject({
			id: "huggingface/microsoft/DialoGPT-medium",
			name: "microsoft/DialoGPT-medium",
			provider: "microsoft",
			modalities: ["text"],
			capabilities: ["text-generation"],
		})
	})

	it("should handle API errors gracefully", async () => {
		global.fetch = vi.fn().mockRejectedValue(new Error("Network error"))

		const program = Effect.gen(function* () {
			const service = yield* HuggingFaceService
			return yield* service.fetchModels
		})

		await expect(
			Effect.runPromise(program.pipe(Effect.provide(HuggingFaceServiceLive))),
		).rejects.toThrow("Network error")
	})

	it("should handle empty API response", async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve([]),
		})

		const program = Effect.gen(function* () {
			const service = yield* HuggingFaceService
			return yield* service.fetchModels
		})

		const result = await Effect.runPromise(
			program.pipe(Effect.provide(HuggingFaceServiceLive)),
		)

		expect(result).toHaveLength(0)
	})

	it("should handle malformed API response", async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(null),
		})

		const program = Effect.gen(function* () {
			const service = yield* HuggingFaceService
			return yield* service.fetchModels
		})

		const result = await Effect.runPromise(
			program.pipe(Effect.provide(HuggingFaceServiceLive)),
		)

		expect(result).toHaveLength(0)
	})
})
