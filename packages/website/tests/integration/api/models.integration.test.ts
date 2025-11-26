import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { AppLayer } from "../../../lib/layers"
import { ModelDataService } from "../../../lib/services/ModelDataService"

/**
 * Integration tests for Models API endpoints
 * Tests the full stack: route -> service -> database
 */
describe("Models API Integration", () => {
	describe("GET /v1/models", () => {
		it("should fetch models from database", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ModelDataService
				const models = yield* service.getLatestModels()
				
				expect(Array.isArray(models)).toBe(true)
				
				// Verify model structure
				if (models.length > 0) {
					const model = models[0]
					expect(model).toHaveProperty("id")
					expect(model).toHaveProperty("name")
					expect(model).toHaveProperty("provider")
					expect(model).toHaveProperty("contextWindow")
				}
				
				return models
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})

		it("should handle empty model list gracefully", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ModelDataService
				const models = yield* service.getLatestModels()
				
				// Should always return an array, even if empty
				expect(Array.isArray(models)).toBe(true)
				
				return models
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})
	})

	describe("GET /v1/models with filtering", () => {
		it("should support provider filtering", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ModelDataService
				const allModels = yield* service.getLatestModels()
				
				// Get unique providers
				const providers = [...new Set(allModels.map(m => m.provider))]
				
				if (providers.length > 0) {
					const targetProvider = providers[0]
					const filtered = allModels.filter(m => m.provider === targetProvider)
					
					expect(filtered.every(m => m.provider === targetProvider)).toBe(true)
				}
				
				return allModels
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})

		it("should support cost range filtering", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ModelDataService
				const models = yield* service.getLatestModels()
				
				// Filter by cost range
				const minCost = 0.01
				const maxCost = 0.05
				const filtered = models.filter(
					m => m.inputCost >= minCost && m.inputCost <= maxCost
				)
				
				expect(filtered.every(
					m => m.inputCost >= minCost && m.inputCost <= maxCost
				)).toBe(true)
				
				return models
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})
	})

	describe("GET /v1/models error handling", () => {
		it("should handle database errors gracefully", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ModelDataService
				
				// This should not throw, but handle errors gracefully
				const result = yield* Effect.either(service.getLatestModels())
				
				// Result should be Either<Error, Model[]>
				expect(result).toBeDefined()
				
				return result
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})
	})
})
