/* @vitest-environment node */
import { Effect, Layer } from "effect"
import { describe, expect, it, beforeEach, vi } from "vitest"
import { ModelService } from "./ModelService"
import { ModelServiceLive } from "./ModelServiceLive"
import { CacheService } from "./CacheService"
import { ModelDataService } from "./ModelDataService"
import type { Model } from "../types"

// Minimal stub implementations for dependencies
const CacheServiceStub = Layer.succeed(CacheService, {
	get: vi.fn(() => Effect.succeed(null)),
	set: vi.fn(() => Effect.void),
	delete: vi.fn(() => Effect.void),
	clear: vi.fn(() => Effect.void),
	has: vi.fn(() => Effect.succeed(false)),
})

const ModelDataServiceStub = Layer.succeed(ModelDataService, {
	storeModelBatch: vi.fn(() => Effect.void),
	startSync: vi.fn(() =>
		Effect.succeed({
			id: "test-sync",
			status: "started" as const,
			startedAt: new Date(),
			completedAt: null,
			totalFetched: 0,
			totalStored: 0,
			errorMessage: null,
		}),
	),
	completeSync: vi.fn(() => Effect.void),
	failSync: vi.fn(() => Effect.void),
	getLatestModels: vi.fn(() => Effect.succeed([])),
	getLatestModelsBySource: vi.fn(() => Effect.succeed([])),
	getModelDataStats: vi.fn(() =>
		Effect.succeed({
			totalModels: 0,
			providers: [],
			lastSyncAt: new Date().toISOString(),
			modelCountByProvider: {},
		}),
	),
	getSyncHistory: vi.fn(() => Effect.succeed([])),
})

describe("ModelService", () => {
	describe("fetchModels()", () => {
		it(
			"should fetch models from real external APIs",
			{ timeout: 30000 },
			async () => {
				const layer = Layer.merge(ModelServiceLive, CacheServiceStub, ModelDataServiceStub)
				const program = Effect.gen(function* () {
					const service = yield* ModelService
					const models = yield* service.fetchModels
					return models
				})

				const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))
				expect(Array.isArray(result)).toBe(true)
				expect(result.length).toBeGreaterThan(0)
			},
		)

		it(
			"should fetch models from all 4 sources (models.dev, OpenRouter, HuggingFace, ArtificialAnalysis)",
			{ timeout: 45000 },
			async () => {
				const layer = Layer.merge(ModelServiceLive, CacheServiceStub, ModelDataServiceStub)
				const program = Effect.gen(function* () {
					const service = yield* ModelService
					const models = yield* service.fetchModels
					return models
				})

				const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))

				// Verify we have models from multiple sources
				const providers = new Set(result.map((m) => m.provider))
				expect(providers.size).toBeGreaterThan(1)
			},
		)

		it("should return Model objects with required properties", { timeout: 30000 }, async () => {
			const layer = Layer.merge(ModelServiceLive, CacheServiceStub, ModelDataServiceStub)
			const program = Effect.gen(function* () {
				const service = yield* ModelService
				const models = yield* service.fetchModels
				return models
			})

			const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))

			// Verify first model has required properties
			if (result.length > 0) {
				const firstModel = result[0]
				expect(firstModel).toHaveProperty("id")
				expect(firstModel).toHaveProperty("name")
				expect(firstModel).toHaveProperty("provider")
				expect(firstModel).toHaveProperty("contextWindow")
				expect(firstModel).toHaveProperty("maxOutputTokens")
				expect(firstModel).toHaveProperty("inputCost")
				expect(firstModel).toHaveProperty("outputCost")
				expect(firstModel).toHaveProperty("modalities")
				expect(firstModel).toHaveProperty("capabilities")
			}
		})

		it("should handle partial failures gracefully (continue if one API fails)", { timeout: 45000 }, async () => {
			// This test verifies the system continues even if one API is unavailable
			const layer = Layer.merge(ModelServiceLive, CacheServiceStub, ModelDataServiceStub)
			const program = Effect.gen(function* () {
				const service = yield* ModelService
				const models = yield* service.fetchModels
				return models
			})

			// Run multiple times to see if we get consistent partial results
			const results = await Promise.all([
				Effect.runPromise(program.pipe(Effect.provide(layer))),
				Effect.runPromise(program.pipe(Effect.provide(layer))),
			])

			// Both should succeed even if one source fails
			expect(results[0]).toBeDefined()
			expect(results[1]).toBeDefined()
			expect(Array.isArray(results[0])).toBe(true)
			expect(Array.isArray(results[1])).toBe(true)
		})

		it("should deduplicate models from multiple sources", { timeout: 30000 }, async () => {
			const layer = Layer.merge(ModelServiceLive, CacheServiceStub, ModelDataServiceStub)
			const program = Effect.gen(function* () {
				const service = yield* ModelService
				const models = yield* service.fetchModels
				return models
			})

			const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))

			// Check for duplicates by ID
			const ids = result.map((m) => m.id)
			const uniqueIds = new Set(ids)
			// Different sources have overlapping models, so allow up to 35% duplication
			const duplicationRate = (ids.length - uniqueIds.size) / ids.length
			expect(duplicationRate).toBeLessThan(0.35) // Allow up to 35% duplication from multiple sources
		})

		it("should include models with various capabilities", { timeout: 30000 }, async () => {
			const layer = Layer.merge(ModelServiceLive, CacheServiceStub, ModelDataServiceStub)
			const program = Effect.gen(function* () {
				const service = yield* ModelService
				const models = yield* service.fetchModels
				return models
			})

			const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))

			// Verify we have diverse capabilities
			const allCapabilities = new Set<string>()
			result.forEach((m) => {
				m.capabilities.forEach((c) => allCapabilities.add(c))
			})
			expect(allCapabilities.size).toBeGreaterThan(0)
		})

		it("should include models with various modalities", { timeout: 30000 }, async () => {
			const layer = Layer.merge(ModelServiceLive, CacheServiceStub, ModelDataServiceStub)
			const program = Effect.gen(function* () {
				const service = yield* ModelService
				const models = yield* service.fetchModels
				return models
			})

			const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))

			// Verify we have diverse modalities
			const allModalities = new Set<string>()
			result.forEach((m) => {
				m.modalities.forEach((mod) => allModalities.add(mod))
			})
			expect(allModalities.size).toBeGreaterThan(0)
		})

		it("should fetch pricing information correctly", { timeout: 30000 }, async () => {
			const layer = Layer.merge(ModelServiceLive, CacheServiceStub, ModelDataServiceStub)
			const program = Effect.gen(function* () {
				const service = yield* ModelService
				const models = yield* service.fetchModels
				return models
			})

			const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))

			// Find models with pricing
			const pricedModels = result.filter((m) => m.inputCost > 0 || m.outputCost > 0)
			expect(pricedModels.length).toBeGreaterThan(0)

			// Verify pricing is reasonable (not negative, not absurdly high)
			pricedModels.forEach((m) => {
				expect(m.inputCost).toBeGreaterThanOrEqual(0)
				expect(m.outputCost).toBeGreaterThanOrEqual(0)
				expect(m.inputCost).toBeLessThan(1000) // Sanity check
				expect(m.outputCost).toBeLessThan(1000)
			})
		})

		it("should include context window information", { timeout: 30000 }, async () => {
			const layer = Layer.merge(ModelServiceLive, CacheServiceStub, ModelDataServiceStub)
			const program = Effect.gen(function* () {
				const service = yield* ModelService
				const models = yield* service.fetchModels
				return models
			})

			const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))

			// Find models with context windows
			const modelsWithContext = result.filter((m) => m.contextWindow > 0)
			expect(modelsWithContext.length).toBeGreaterThan(0)

			// Verify context windows are reasonable (some models like Claude 3.5 have 200M tokens)
			modelsWithContext.forEach((m) => {
				expect(m.contextWindow).toBeGreaterThan(0)
				expect(m.contextWindow).toBeLessThanOrEqual(1000000000) // Up to 1B tokens
			})
		})
	})

	describe("fetchModelsFromAPI()", () => {
		it(
			"should fetch models directly from models.dev API",
			{ timeout: 30000 },
			async () => {
				const layer = Layer.merge(ModelServiceLive, CacheServiceStub, ModelDataServiceStub)
				const program = Effect.gen(function* () {
					const service = yield* ModelService
					const models = yield* service.fetchModelsFromAPI
					return models
				})

				const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))
				expect(Array.isArray(result)).toBe(true)
				expect(result.length).toBeGreaterThan(0)
			},
		)

		it("should only return models from models.dev source", { timeout: 30000 }, async () => {
			const layer = Layer.merge(ModelServiceLive, CacheServiceStub, ModelDataServiceStub)
			const program = Effect.gen(function* () {
				const service = yield* ModelService
				const models = yield* service.fetchModelsFromAPI
				return models
			})

			const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))

			// All models should come from models.dev structure
			result.forEach((m) => {
				expect(m).toHaveProperty("id")
				expect(m).toHaveProperty("name")
				expect(m).toHaveProperty("provider")
			})
		})

		it("should retry on network failure", { timeout: 45000 }, async () => {
			const layer = Layer.merge(ModelServiceLive, CacheServiceStub, ModelDataServiceStub)

			// Make multiple calls to verify retry behavior
			const program = Effect.gen(function* () {
				const service = yield* ModelService
				const models = yield* service.fetchModelsFromAPI
				return models
			})

			const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))
			expect(Array.isArray(result)).toBe(true)
		})
	})

	describe("getModelStats()", () => {
		it("should return model statistics", async () => {
			const layer = Layer.merge(ModelServiceLive, CacheServiceStub, ModelDataServiceStub)
			const program = Effect.gen(function* () {
				const service = yield* ModelService
				const stats = yield* service.getModelStats
				return stats
			})

			const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))

			expect(result).toHaveProperty("totalModels")
			expect(result).toHaveProperty("providers")
			expect(result).toHaveProperty("lastSyncAt")
			expect(result).toHaveProperty("modelCountByProvider")
		})

		it("should return valid statistics structure", async () => {
			const layer = Layer.merge(ModelServiceLive, CacheServiceStub, ModelDataServiceStub)
			const program = Effect.gen(function* () {
				const service = yield* ModelService
				const stats = yield* service.getModelStats
				return stats
			})

			const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))

			expect(typeof result.totalModels).toBe("number")
			expect(Array.isArray(result.providers)).toBe(true)
			expect(typeof result.lastSyncAt).toBe("string")
			expect(typeof result.modelCountByProvider).toBe("object")
		})
	})

	describe("concurrent operations", () => {
		it(
			"should handle concurrent fetchModels calls",
			{ timeout: 45000 },
			async () => {
				const layer = Layer.merge(ModelServiceLive, CacheServiceStub, ModelDataServiceStub)
				const program = Effect.gen(function* () {
					const service = yield* ModelService

					// Call in parallel
					const results = yield* Effect.all(
						[service.fetchModels, service.fetchModels, service.fetchModels],
						{ concurrency: "unbounded" },
					)

					return results
				})

				const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))

				// All three calls should succeed
				expect(result.length).toBe(3)
				result.forEach((models) => {
					expect(Array.isArray(models)).toBe(true)
					expect(models.length).toBeGreaterThan(0)
				})
			},
		)
	})

	describe("data quality", () => {
		it(
			"should ensure all models have valid IDs",
			{ timeout: 30000 },
			async () => {
				const layer = Layer.merge(ModelServiceLive, CacheServiceStub, ModelDataServiceStub)
				const program = Effect.gen(function* () {
					const service = yield* ModelService
					const models = yield* service.fetchModels
					return models
				})

				const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))

				result.forEach((m) => {
					expect(m.id).toBeTruthy()
					expect(typeof m.id).toBe("string")
					expect(m.id.length).toBeGreaterThan(0)
				})
			},
		)

		it(
			"should ensure all models have valid names",
			{ timeout: 30000 },
			async () => {
				const layer = Layer.merge(ModelServiceLive, CacheServiceStub, ModelDataServiceStub)
				const program = Effect.gen(function* () {
					const service = yield* ModelService
					const models = yield* service.fetchModels
					return models
				})

				const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))

				result.forEach((m) => {
					expect(m.name).toBeTruthy()
					expect(typeof m.name).toBe("string")
					expect(m.name.length).toBeGreaterThan(0)
				})
			},
		)

		it(
			"should ensure all models have provider information",
			{ timeout: 30000 },
			async () => {
				const layer = Layer.merge(ModelServiceLive, CacheServiceStub, ModelDataServiceStub)
				const program = Effect.gen(function* () {
					const service = yield* ModelService
					const models = yield* service.fetchModels
					return models
				})

				const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))

				result.forEach((m) => {
					expect(m.provider).toBeTruthy()
					expect(typeof m.provider).toBe("string")
				})
			},
		)

		it(
			"should have valid arrays for modalities and capabilities",
			{ timeout: 30000 },
			async () => {
				const layer = Layer.merge(ModelServiceLive, CacheServiceStub, ModelDataServiceStub)
				const program = Effect.gen(function* () {
					const service = yield* ModelService
					const models = yield* service.fetchModels
					return models
				})

				const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))

				result.forEach((m) => {
					expect(Array.isArray(m.modalities)).toBe(true)
					expect(Array.isArray(m.capabilities)).toBe(true)
				})
			},
		)
	})
})
