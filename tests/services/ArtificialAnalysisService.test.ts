import { Effect } from "effect"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ArtificialAnalysisService } from "../../lib/services/ArtificialAnalysisService"
import { ArtificialAnalysisServiceLive } from "../../lib/services/ArtificialAnalysisServiceLive"

describe("ArtificialAnalysisService", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should fetch models from ArtificialAnalysis API", async () => {
		const mockCsvData = `modelName,intelligenceIndex,isLabClaimedValue
gpt-4,95.2,true
claude-3,92.8,false`

		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			text: () => Promise.resolve(mockCsvData),
		})

		const program = Effect.gen(function* () {
			const service = yield* ArtificialAnalysisService
			return yield* service.fetchModels
		})

		const result = await Effect.runPromise(
			program.pipe(Effect.provide(ArtificialAnalysisServiceLive)),
		)

		expect(result).toHaveLength(2)
		expect(result[0]).toMatchObject({
			id: "artificialanalysis/gpt-4",
			name: "gpt-4",
			provider: "openai",
			intelligenceIndex: 95.2,
			isLabClaimedValue: true,
		})
		expect(result[1]).toMatchObject({
			id: "artificialanalysis/claude-3",
			name: "claude-3",
			provider: "anthropic",
			intelligenceIndex: 92.8,
			isLabClaimedValue: false,
		})
	})

	it("should handle API errors gracefully", async () => {
		global.fetch = vi.fn().mockRejectedValue(new Error("Network error"))

		const program = Effect.gen(function* () {
			const service = yield* ArtificialAnalysisService
			return yield* service.fetchModels
		})

		await expect(
			Effect.runPromise(
				program.pipe(Effect.provide(ArtificialAnalysisServiceLive)),
			),
		).rejects.toThrow("Network error")
	})

	it("should handle malformed CSV data", async () => {
		const malformedCsv = `invalid,csv,data
incomplete,row`

		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			text: () => Promise.resolve(malformedCsv),
		})

		const program = Effect.gen(function* () {
			const service = yield* ArtificialAnalysisService
			return yield* service.fetchModels
		})

		const result = await Effect.runPromise(
			program.pipe(Effect.provide(ArtificialAnalysisServiceLive)),
		)

		expect(result).toHaveLength(0)
	})
})
