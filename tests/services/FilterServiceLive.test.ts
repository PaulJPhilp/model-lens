import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import type { Filters } from "@/lib/services/FilterService"
import { FilterService } from "@/lib/services/FilterService"
import { FilterServiceLive } from "@/lib/services/FilterServiceLive"
import type { Model } from "@/lib/types"

describe("FilterServiceLive", () => {
	const mockModels: Model[] = [
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
		{
			id: "llama-2",
			name: "llama-2-70b",
			provider: "Meta",
			contextWindow: 4096,
			maxOutputTokens: 2048,
			inputCost: 0.001,
			outputCost: 0.001,
			cacheReadCost: 0,
			cacheWriteCost: 0,
			modalities: ["text"],
			capabilities: [],
			releaseDate: "2023-07-01",
			lastUpdated: "2023-07-01",
			knowledge: "2022-09",
			openWeights: true,
			supportsTemperature: true,
			supportsAttachments: false,
			new: false,
		},
	]

	describe("applyFilters", () => {
		it("should return all models when no filters applied", async () => {
			const filters: Filters = {
				providers: [],
				inputCostRange: [0, 1000],
				outputCostRange: [0, 1000],
				cacheReadCostRange: [0, 1000],
				cacheWriteCostRange: [0, 1000],
				modalities: [],
				capabilities: [],
				years: [],
				openWeights: null,
				supportsTemperature: null,
				supportsAttachments: null,
			}

			const program = Effect.gen(function* () {
				const service = yield* FilterService
				return yield* service.applyFilters(mockModels, "", filters)
			}).pipe(Effect.provide(FilterServiceLive))

			const result = await Effect.runPromise(program)
			expect(result).toHaveLength(4)
			// Models are sorted by input cost ascending
			const expectedSorted = [...mockModels].sort(
				(a, b) => a.inputCost - b.inputCost,
			)
			expect(result).toEqual(expectedSorted)
		})

		it("should filter by search term", async () => {
			const filters: Filters = {
				providers: [],
				inputCostRange: [0, 1000],
				outputCostRange: [0, 1000],
				cacheReadCostRange: [0, 1000],
				cacheWriteCostRange: [0, 1000],
				modalities: [],
				capabilities: [],
				years: [],
				openWeights: null,
				supportsTemperature: null,
				supportsAttachments: null,
			}

			const program = Effect.gen(function* () {
				const service = yield* FilterService
				return yield* service.applyFilters(mockModels, "gpt", filters)
			}).pipe(Effect.provide(FilterServiceLive))

			const result = await Effect.runPromise(program)
			expect(result).toHaveLength(1)
			expect(result.map((m) => m.id)).toEqual(["gpt-4"])
		})

		it("should filter by provider", async () => {
			const filters: Filters = {
				providers: ["OpenAI"],
				inputCostRange: [0, 1000],
				outputCostRange: [0, 1000],
				cacheReadCostRange: [0, 1000],
				cacheWriteCostRange: [0, 1000],
				modalities: [],
				capabilities: [],
				years: [],
				openWeights: null,
				supportsTemperature: null,
				supportsAttachments: null,
			}

			const program = Effect.gen(function* () {
				const service = yield* FilterService
				return yield* service.applyFilters(mockModels, "", filters)
			}).pipe(Effect.provide(FilterServiceLive))

			const result = await Effect.runPromise(program)
			expect(result).toHaveLength(2)
			expect(result.map((m) => m.provider)).toEqual(["OpenAI", "OpenAI"])
		})

		it("should filter by multiple providers", async () => {
			const filters: Filters = {
				providers: ["OpenAI", "Anthropic"],
				inputCostRange: [0, 1000],
				outputCostRange: [0, 1000],
				cacheReadCostRange: [0, 1000],
				cacheWriteCostRange: [0, 1000],
				modalities: [],
				capabilities: [],
				years: [],
				openWeights: null,
				supportsTemperature: null,
				supportsAttachments: null,
			}

			const program = Effect.gen(function* () {
				const service = yield* FilterService
				return yield* service.applyFilters(mockModels, "", filters)
			}).pipe(Effect.provide(FilterServiceLive))

			const result = await Effect.runPromise(program)
			expect(result).toHaveLength(3)
			// Models are sorted by input cost ascending: claude-3 (0.015), gpt-4 (0.03), dall-e-3 (0.08)
			expect(result.map((m) => m.provider)).toEqual([
				"Anthropic",
				"OpenAI",
				"OpenAI",
			])
		})

		it("should filter by input cost range", async () => {
			const filters: Filters = {
				providers: [],
				inputCostRange: [0, 0.02],
				outputCostRange: [0, 1000],
				cacheReadCostRange: [0, 1000],
				cacheWriteCostRange: [0, 1000],
				modalities: [],
				capabilities: [],
				years: [],
				openWeights: null,
				supportsTemperature: null,
				supportsAttachments: null,
			}

			const program = Effect.gen(function* () {
				const service = yield* FilterService
				return yield* service.applyFilters(mockModels, "", filters)
			}).pipe(Effect.provide(FilterServiceLive))

			const result = await Effect.runPromise(program)
			expect(result).toHaveLength(2)
			// Models are sorted by input cost ascending: llama-2 (0.001), claude-3 (0.015)
			expect(result.map((m) => m.id)).toEqual(["llama-2", "claude-3"])
		})

		it("should filter by output cost range", async () => {
			const filters: Filters = {
				providers: [],
				inputCostRange: [0, 1000],
				outputCostRange: [0, 0.01],
				cacheReadCostRange: [0, 1000],
				cacheWriteCostRange: [0, 1000],
				modalities: [],
				capabilities: [],
				years: [],
				openWeights: null,
				supportsTemperature: null,
				supportsAttachments: null,
			}

			const program = Effect.gen(function* () {
				const service = yield* FilterService
				return yield* service.applyFilters(mockModels, "", filters)
			}).pipe(Effect.provide(FilterServiceLive))

			const result = await Effect.runPromise(program)
			expect(result).toHaveLength(1)
			expect(result[0].id).toBe("llama-2")
		})

		it("should filter by modalities", async () => {
			const filters: Filters = {
				providers: [],
				inputCostRange: [0, 1000],
				outputCostRange: [0, 1000],
				cacheReadCostRange: [0, 1000],
				cacheWriteCostRange: [0, 1000],
				modalities: ["image"],
				capabilities: [],
				years: [],
				openWeights: null,
				supportsTemperature: null,
				supportsAttachments: null,
			}

			const program = Effect.gen(function* () {
				const service = yield* FilterService
				return yield* service.applyFilters(mockModels, "", filters)
			}).pipe(Effect.provide(FilterServiceLive))

			const result = await Effect.runPromise(program)
			expect(result).toHaveLength(2)
			expect(result.map((m) => m.id)).toEqual(["claude-3", "dall-e-3"])
		})

		it("should filter by capabilities", async () => {
			const filters: Filters = {
				providers: [],
				inputCostRange: [0, 1000],
				outputCostRange: [0, 1000],
				cacheReadCostRange: [0, 1000],
				cacheWriteCostRange: [0, 1000],
				modalities: [],
				capabilities: ["tools"],
				years: [],
				openWeights: null,
				supportsTemperature: null,
				supportsAttachments: null,
			}

			const program = Effect.gen(function* () {
				const service = yield* FilterService
				return yield* service.applyFilters(mockModels, "", filters)
			}).pipe(Effect.provide(FilterServiceLive))

			const result = await Effect.runPromise(program)
			expect(result).toHaveLength(1)
			expect(result[0].id).toBe("gpt-4")
		})

		it("should filter by multiple capabilities", async () => {
			const filters: Filters = {
				providers: [],
				inputCostRange: [0, 1000],
				outputCostRange: [0, 1000],
				cacheReadCostRange: [0, 1000],
				cacheWriteCostRange: [0, 1000],
				modalities: [],
				capabilities: ["tools", "reasoning"],
				years: [],
				openWeights: null,
				supportsTemperature: null,
				supportsAttachments: null,
			}

			const program = Effect.gen(function* () {
				const service = yield* FilterService
				return yield* service.applyFilters(mockModels, "", filters)
			}).pipe(Effect.provide(FilterServiceLive))

			const result = await Effect.runPromise(program)
			expect(result).toHaveLength(2)
			// Models are sorted by input cost ascending: claude-3 (0.015), gpt-4 (0.03)
			expect(result.map((m) => m.id)).toEqual(["claude-3", "gpt-4"])
		})

		it("should filter by release year", async () => {
			const filters: Filters = {
				providers: [],
				inputCostRange: [0, 1000],
				outputCostRange: [0, 1000],
				cacheReadCostRange: [0, 1000],
				cacheWriteCostRange: [0, 1000],
				modalities: [],
				capabilities: [],
				years: [2023],
				openWeights: null,
				supportsTemperature: null,
				supportsAttachments: null,
			}

			const program = Effect.gen(function* () {
				const service = yield* FilterService
				return yield* service.applyFilters(mockModels, "", filters)
			}).pipe(Effect.provide(FilterServiceLive))

			const result = await Effect.runPromise(program)
			expect(result).toHaveLength(4) // All models are from 2023
		})

		it("should filter by open weights", async () => {
			const filters: Filters = {
				providers: [],
				inputCostRange: [0, 1000],
				outputCostRange: [0, 1000],
				cacheReadCostRange: [0, 1000],
				cacheWriteCostRange: [0, 1000],
				modalities: [],
				capabilities: [],
				years: [],
				openWeights: true,
				supportsTemperature: null,
				supportsAttachments: null,
			}

			const program = Effect.gen(function* () {
				const service = yield* FilterService
				return yield* service.applyFilters(mockModels, "", filters)
			}).pipe(Effect.provide(FilterServiceLive))

			const result = await Effect.runPromise(program)
			expect(result).toHaveLength(1)
			expect(result[0].id).toBe("llama-2")
		})

		it("should filter by supports temperature", async () => {
			const filters: Filters = {
				providers: [],
				inputCostRange: [0, 1000],
				outputCostRange: [0, 1000],
				cacheReadCostRange: [0, 1000],
				cacheWriteCostRange: [0, 1000],
				modalities: [],
				capabilities: [],
				years: [],
				openWeights: null,
				supportsTemperature: true,
				supportsAttachments: null,
			}

			const program = Effect.gen(function* () {
				const service = yield* FilterService
				return yield* service.applyFilters(mockModels, "", filters)
			}).pipe(Effect.provide(FilterServiceLive))

			const result = await Effect.runPromise(program)
			expect(result).toHaveLength(3)
			// Models are sorted by input cost ascending: llama-2 (0.001), claude-3 (0.015), gpt-4 (0.03)
			expect(result.map((m) => m.id)).toEqual(["llama-2", "claude-3", "gpt-4"])
		})

		it("should filter by supports attachments", async () => {
			const filters: Filters = {
				providers: [],
				inputCostRange: [0, 1000],
				outputCostRange: [0, 1000],
				cacheReadCostRange: [0, 1000],
				cacheWriteCostRange: [0, 1000],
				modalities: [],
				capabilities: [],
				years: [],
				openWeights: null,
				supportsTemperature: null,
				supportsAttachments: true,
			}

			const program = Effect.gen(function* () {
				const service = yield* FilterService
				return yield* service.applyFilters(mockModels, "", filters)
			}).pipe(Effect.provide(FilterServiceLive))

			const result = await Effect.runPromise(program)
			expect(result).toHaveLength(1)
			expect(result[0].id).toBe("claude-3")
		})

		it("should combine multiple filters", async () => {
			const filters: Filters = {
				providers: ["OpenAI"],
				inputCostRange: [0, 0.05],
				outputCostRange: [0, 1000],
				cacheReadCostRange: [0, 1000],
				cacheWriteCostRange: [0, 1000],
				modalities: ["text"],
				capabilities: [],
				years: [2023],
				openWeights: null,
				supportsTemperature: null,
				supportsAttachments: null,
			}

			const program = Effect.gen(function* () {
				const service = yield* FilterService
				return yield* service.applyFilters(mockModels, "", filters)
			}).pipe(Effect.provide(FilterServiceLive))

			const result = await Effect.runPromise(program)
			expect(result).toHaveLength(1)
			expect(result[0].id).toBe("gpt-4")
		})

		it("should handle case-insensitive search", async () => {
			const filters: Filters = {
				providers: [],
				inputCostRange: [0, 1000],
				outputCostRange: [0, 1000],
				cacheReadCostRange: [0, 1000],
				cacheWriteCostRange: [0, 1000],
				modalities: [],
				capabilities: [],
				years: [],
				openWeights: null,
				supportsTemperature: null,
				supportsAttachments: null,
			}

			const program = Effect.gen(function* () {
				const service = yield* FilterService
				return yield* service.applyFilters(mockModels, "GPT", filters)
			}).pipe(Effect.provide(FilterServiceLive))

			const result = await Effect.runPromise(program)
			expect(result).toHaveLength(1)
			expect(result.map((m) => m.id)).toEqual(["gpt-4"])
		})

		it("should handle partial search matches", async () => {
			const filters: Filters = {
				providers: [],
				inputCostRange: [0, 1000],
				outputCostRange: [0, 1000],
				cacheReadCostRange: [0, 1000],
				cacheWriteCostRange: [0, 1000],
				modalities: [],
				capabilities: [],
				years: [],
				openWeights: null,
				supportsTemperature: null,
				supportsAttachments: null,
			}

			const program = Effect.gen(function* () {
				const service = yield* FilterService
				return yield* service.applyFilters(mockModels, "llama", filters)
			}).pipe(Effect.provide(FilterServiceLive))

			const result = await Effect.runPromise(program)
			expect(result).toHaveLength(1)
			expect(result[0].id).toBe("llama-2")
		})

		it("should return empty array when no models match", async () => {
			const filters: Filters = {
				providers: ["NonExistentProvider"],
				inputCostRange: [0, 1000],
				outputCostRange: [0, 1000],
				cacheReadCostRange: [0, 1000],
				cacheWriteCostRange: [0, 1000],
				modalities: [],
				capabilities: [],
				years: [],
				openWeights: null,
				supportsTemperature: null,
				supportsAttachments: null,
			}

			const program = Effect.gen(function* () {
				const service = yield* FilterService
				return yield* service.applyFilters(mockModels, "", filters)
			}).pipe(Effect.provide(FilterServiceLive))

			const result = await Effect.runPromise(program)
			expect(result).toHaveLength(0)
		})
	})

	describe("validateFilters", () => {
		it("should validate and normalize filters", async () => {
			const partialFilters = {
				providers: ["OpenAI"],
				inputCostRange: [0, 0.1] as [number, number],
			}

			const program = Effect.gen(function* () {
				const service = yield* FilterService
				return yield* service.validateFilters(partialFilters)
			}).pipe(Effect.provide(FilterServiceLive))

			const result = await Effect.runPromise(program)

			expect(result.providers).toEqual(["OpenAI"])
			expect(result.inputCostRange).toEqual([0, 0.1])
			expect(result.outputCostRange).toEqual([0, 1000]) // Default value
			expect(result.modalities).toEqual([]) // Default value
			expect(result.capabilities).toEqual([]) // Default value
			expect(result.years).toEqual([]) // Default value
			expect(result.openWeights).toBeNull() // Default value
			expect(result.supportsTemperature).toBeNull() // Default value
			expect(result.supportsAttachments).toBeNull() // Default value
		})

		it("should handle empty filters", async () => {
			const program = Effect.gen(function* () {
				const service = yield* FilterService
				return yield* service.validateFilters({})
			}).pipe(Effect.provide(FilterServiceLive))

			const result = await Effect.runPromise(program)

			expect(result.providers).toEqual([])
			expect(result.inputCostRange).toEqual([0, 1000])
			expect(result.outputCostRange).toEqual([0, 1000])
			expect(result.cacheReadCostRange).toEqual([0, 1000])
			expect(result.cacheWriteCostRange).toEqual([0, 1000])
			expect(result.modalities).toEqual([])
			expect(result.capabilities).toEqual([])
			expect(result.years).toEqual([])
			expect(result.openWeights).toBeNull()
			expect(result.supportsTemperature).toBeNull()
			expect(result.supportsAttachments).toBeNull()
		})

		it("should handle invalid cost ranges", async () => {
			const partialFilters = {
				inputCostRange: [0.1, 0.05] as [number, number], // Invalid: min > max
			}

			const program = Effect.gen(function* () {
				const service = yield* FilterService
				return yield* service.validateFilters(partialFilters)
			}).pipe(Effect.provide(FilterServiceLive))

			const result = await Effect.runPromise(program)

			// Should normalize to valid range
			expect(result.inputCostRange[0]).toBeLessThanOrEqual(
				result.inputCostRange[1],
			)
		})

		it("should handle negative cost ranges", async () => {
			const partialFilters = {
				inputCostRange: [-0.1, 0.05] as [number, number],
			}

			const program = Effect.gen(function* () {
				const service = yield* FilterService
				return yield* service.validateFilters(partialFilters)
			}).pipe(Effect.provide(FilterServiceLive))

			const result = await Effect.runPromise(program)

			// Should clamp to 0
			expect(result.inputCostRange[0]).toBeGreaterThanOrEqual(0)
		})
	})
})
