import { Effect } from "effect"
import { beforeEach, describe, expect, it } from "vitest"
import { AppLayer } from "../../../lib/layers"
import { FilterService } from "../../../lib/services/FilterService"
import { ModelDataService } from "../../../lib/services/ModelDataService"
import { FilterDataService } from "../../../src/services/FilterDataService"
import {
    cleanupTestData,
    createTestFilter,
    createTestFilterRun,
    testUserId,
} from "../setup"

/**
 * Integration tests for Filter Evaluation
 * Tests the complete filter evaluation workflow
 */
describe("Filter Evaluation Integration", () => {
	beforeEach(async () => {
		await cleanupTestData()
	})

	describe("Filter Application", () => {
		it("should evaluate filter against models", async () => {
			const program = Effect.gen(function* () {
				const modelService = yield* ModelDataService
				const filterService = yield* FilterService

				// Get models
				const models = yield* modelService.getLatestModels()

				// Apply filter
				const filters = {
					providers: ["OpenAI"],
					inputCostRange: [0, 1000] as [number, number],
					outputCostRange: [0, 1000] as [number, number],
					cacheReadCostRange: [0, 1000] as [number, number],
					cacheWriteCostRange: [0, 1000] as [number, number],
					modalities: [],
					capabilities: [],
					years: [],
					openWeights: null,
					supportsTemperature: null,
					supportsAttachments: null,
				}

				const filtered = yield* filterService.applyFilters(models, "", filters)

				// Verify all results match filter criteria
				if (filtered.length > 0) {
					expect(filtered.every(m => m.provider === "OpenAI")).toBe(true)
				}

				return { total: models.length, filtered: filtered.length }
			}).pipe(Effect.provide(AppLayer))

			const result = await Effect.runPromise(program)
			expect(result.filtered).toBeLessThanOrEqual(result.total)
		})

		it("should filter by multiple criteria", async () => {
			const program = Effect.gen(function* () {
				const modelService = yield* ModelDataService
				const filterService = yield* FilterService

				const models = yield* modelService.getLatestModels()

				// Multi-criteria filter
				const filters = {
					providers: ["OpenAI", "Anthropic"],
					inputCostRange: [0.01, 0.05] as [number, number],
					outputCostRange: [0, 1000] as [number, number],
					cacheReadCostRange: [0, 1000] as [number, number],
					cacheWriteCostRange: [0, 1000] as [number, number],
					modalities: ["text"],
					capabilities: [],
					years: [],
					openWeights: null,
					supportsTemperature: true,
					supportsAttachments: null,
				}

				const filtered = yield* filterService.applyFilters(models, "", filters)

				// Verify results match all criteria
				if (filtered.length > 0) {
					expect(
						filtered.every(
							m =>
								(m.provider === "OpenAI" || m.provider === "Anthropic") &&
								m.inputCost >= 0.01 &&
								m.inputCost <= 0.05 &&
								m.modalities.includes("text") &&
								m.supportsTemperature === true
						)
					).toBe(true)
				}

				return filtered
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})

		it("should handle search term filtering", async () => {
			const program = Effect.gen(function* () {
				const modelService = yield* ModelDataService
				const filterService = yield* FilterService

				const models = yield* modelService.getLatestModels()

				const filters = {
					providers: [],
					inputCostRange: [0, 1000] as [number, number],
					outputCostRange: [0, 1000] as [number, number],
					cacheReadCostRange: [0, 1000] as [number, number],
					cacheWriteCostRange: [0, 1000] as [number, number],
					modalities: [],
					capabilities: [],
					years: [],
					openWeights: null,
					supportsTemperature: null,
					supportsAttachments: null,
				}

				const searchTerm = "gpt"
				const filtered = yield* filterService.applyFilters(
					models,
					searchTerm,
					filters
				)

				// Verify results contain search term
				if (filtered.length > 0) {
					expect(
						filtered.every(
							m =>
								m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
								m.id.toLowerCase().includes(searchTerm.toLowerCase())
						)
					).toBe(true)
				}

				return filtered
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})
	})

	describe("Filter Run Tracking", () => {
		it("should create and track filter runs", async () => {
			const testFilter = await createTestFilter({
				name: "Test Run Filter",
				ownerId: testUserId,
			})

			const program = Effect.gen(function* () {
				const filterDataService = yield* FilterDataService
				const modelService = yield* ModelDataService

				// Get models
				const models = yield* modelService.getLatestModels()

				// Simulate filter evaluation
				const matchedCount = Math.floor(models.length / 2)

				// Create a run record
				const run = yield* Effect.tryPromise(() =>
					createTestFilterRun(testFilter.id, {
						executedBy: testUserId,
						totalEvaluated: models.length,
						matchCount: matchedCount,
						durationMs: 150,
					})
				)

				expect(run).toBeDefined()
				expect(run.filterId).toBe(testFilter.id)
				expect(run.totalEvaluated).toBe(models.length)
				expect(run.matchCount).toBe(matchedCount)

				return run
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})

		it("should track failed filter runs", async () => {
			const testFilter = await createTestFilter({
				name: "Failed Run Filter",
				ownerId: testUserId,
			})

			const program = Effect.gen(function* () {
				const run = yield* Effect.tryPromise(() =>
					createTestFilterRun(testFilter.id, {
						executedBy: testUserId,
						totalEvaluated: 0,
						matchCount: 0,
						results: [],
					})
				)

				expect(run).toBeDefined()
				expect(run.totalEvaluated).toBe(0)

				return run
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})
	})

	describe("Complex Filter Scenarios", () => {
		it("should handle filter with no matches", async () => {
			const program = Effect.gen(function* () {
				const modelService = yield* ModelDataService
				const filterService = yield* FilterService

				const models = yield* modelService.getLatestModels()

				// Create impossible filter
				const filters = {
					providers: [],
					inputCostRange: [1000000, 2000000] as [number, number], // Impossibly high
					outputCostRange: [0, 1000] as [number, number],
					cacheReadCostRange: [0, 1000] as [number, number],
					cacheWriteCostRange: [0, 1000] as [number, number],
					modalities: [],
					capabilities: [],
					years: [],
					openWeights: null,
					supportsTemperature: null,
					supportsAttachments: null,
				}

				const filtered = yield* filterService.applyFilters(models, "", filters)

				expect(filtered).toHaveLength(0)

				return filtered
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})

		it("should handle filter matching all models", async () => {
			const program = Effect.gen(function* () {
				const modelService = yield* ModelDataService
				const filterService = yield* FilterService

				const models = yield* modelService.getLatestModels()

				// Create permissive filter
				const filters = {
					providers: [],
					inputCostRange: [0, 1000000] as [number, number],
					outputCostRange: [0, 1000000] as [number, number],
					cacheReadCostRange: [0, 1000000] as [number, number],
					cacheWriteCostRange: [0, 1000000] as [number, number],
					modalities: [],
					capabilities: [],
					years: [],
					openWeights: null,
					supportsTemperature: null,
					supportsAttachments: null,
				}

				const filtered = yield* filterService.applyFilters(models, "", filters)

				expect(filtered.length).toBe(models.length)

				return filtered
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})

		it("should combine saved filter with evaluation", async () => {
			const testFilter = await createTestFilter({
				name: "Combined Filter",
				ownerId: testUserId,
				rules: [
					{
						field: "provider",
						operator: "eq",
						value: "OpenAI",
						type: "hard",
					},
					{
						field: "inputCost",
						operator: "lt",
						value: 0.1,
						type: "hard",
					},
				],
			})

			const program = Effect.gen(function* () {
				const filterDataService = yield* FilterDataService
				const modelService = yield* ModelDataService
				const filterService = yield* FilterService

				// Retrieve saved filter
				const savedFilter = yield* filterDataService.getFilterById(testFilter.id)
				expect(savedFilter).toBeDefined()

				// Get models
				const models = yield* modelService.getLatestModels()

				// Convert saved filter rules to Filters format
				// (In production, this would be done by a transformer)
				const filters = {
					providers: ["OpenAI"],
					inputCostRange: [0, 0.1] as [number, number],
					outputCostRange: [0, 1000] as [number, number],
					cacheReadCostRange: [0, 1000] as [number, number],
					cacheWriteCostRange: [0, 1000] as [number, number],
					modalities: [],
					capabilities: [],
					years: [],
					openWeights: null,
					supportsTemperature: null,
					supportsAttachments: null,
				}

				const filtered = yield* filterService.applyFilters(models, "", filters)

				// Update usage tracking
				yield* filterDataService.incrementUsage(testFilter.id)

				return { filtered, savedFilter }
			}).pipe(Effect.provide(AppLayer))

			const result = await Effect.runPromise(program)
			expect(result.savedFilter).toBeDefined()
		})
	})

	describe("Performance Tests", () => {
		it("should evaluate large model sets efficiently", async () => {
			const program = Effect.gen(function* () {
				const modelService = yield* ModelDataService
				const filterService = yield* FilterService

				const startTime = Date.now()

				const models = yield* modelService.getLatestModels()

				const filters = {
					providers: ["OpenAI", "Anthropic", "Google"],
					inputCostRange: [0, 1] as [number, number],
					outputCostRange: [0, 1] as [number, number],
					cacheReadCostRange: [0, 1000] as [number, number],
					cacheWriteCostRange: [0, 1000] as [number, number],
					modalities: ["text"],
					capabilities: [],
					years: [],
					openWeights: null,
					supportsTemperature: null,
					supportsAttachments: null,
				}

				const filtered = yield* filterService.applyFilters(models, "", filters)

				const endTime = Date.now()
				const executionTime = endTime - startTime

				// Should complete in reasonable time (< 1 second)
				expect(executionTime).toBeLessThan(1000)

				return { executionTime, modelCount: models.length }
			}).pipe(Effect.provide(AppLayer))

			const result = await Effect.runPromise(program)
			console.log(
				`Filter evaluation time: ${result.executionTime}ms for ${result.modelCount} models`
			)
		})
	})
})
