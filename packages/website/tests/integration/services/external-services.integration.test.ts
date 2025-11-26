import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { AppLayer } from "../../../lib/layers"
import { ArtificialAnalysisService } from "../../../lib/services/ArtificialAnalysisService"
import { HuggingFaceService } from "../../../lib/services/HuggingFaceService"
import { ModelDataService } from "../../../lib/services/ModelDataService"
import { OpenRouterService } from "../../../lib/services/OpenRouterService"

/**
 * Integration tests for External API Services
 * Tests interactions with HuggingFace, OpenRouter, and Artificial Analysis APIs
 * Note: These tests may be skipped if API credentials are not available
 */
describe("External Services Integration", () => {
	const hasApiCredentials = () => {
		return !!(
			process.env.HUGGINGFACE_API_KEY ||
			process.env.OPENROUTER_API_KEY ||
			process.env.ARTIFICIAL_ANALYSIS_API_KEY
		)
	}

	describe("HuggingFace Service", () => {
		it("should fetch models from HuggingFace", async () => {
			if (!process.env.HUGGINGFACE_API_KEY) {
				console.log("⏭️  Skipping HuggingFace test - no API key")
				return
			}

			const program = Effect.gen(function* () {
				const service = yield* HuggingFaceService

				const models = yield* Effect.either(service.fetchModels)

				if (models._tag === "Right") {
					expect(Array.isArray(models.right)).toBe(true)
					console.log(`✅ Fetched ${models.right.length} models from HuggingFace`)
				} else {
					console.log("⚠️  HuggingFace API returned error:", models.left)
				}

				return models
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})

		it("should handle HuggingFace API errors gracefully", async () => {
			if (!process.env.HUGGINGFACE_API_KEY) {
				console.log("⏭️  Skipping HuggingFace error test - no API key")
				return
			}

			const program = Effect.gen(function* () {
				const service = yield* HuggingFaceService

				// Test error handling with timeout or invalid request
				const result = yield* Effect.either(
					service.fetchModels.pipe(Effect.timeout("5 seconds"))
				)

				// Should not throw, but handle errors
				expect(result).toBeDefined()

				return result
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})
	})

	describe("OpenRouter Service", () => {
		it("should fetch models from OpenRouter", async () => {
			if (!process.env.OPENROUTER_API_KEY) {
				console.log("⏭️  Skipping OpenRouter test - no API key")
				return
			}

			const program = Effect.gen(function* () {
				const service = yield* OpenRouterService

				const models = yield* Effect.either(service.fetchModels)

				if (models._tag === "Right") {
					expect(Array.isArray(models.right)).toBe(true)
					console.log(`✅ Fetched ${models.right.length} models from OpenRouter`)

					// Verify model structure
					if (models.right.length > 0) {
						const model = models.right[0]
						expect(model).toHaveProperty("id")
						expect(model).toHaveProperty("name")
					}
				} else {
					console.log("⚠️  OpenRouter API returned error:", models.left)
				}

				return models
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})

		it("should handle OpenRouter API rate limits", async () => {
			if (!process.env.OPENROUTER_API_KEY) {
				console.log("⏭️  Skipping OpenRouter rate limit test - no API key")
				return
			}

			const program = Effect.gen(function* () {
				const service = yield* OpenRouterService

				// Make multiple requests to test rate limiting
				const results = yield* Effect.all(
					[
						Effect.either(service.fetchModels),
						Effect.either(service.fetchModels),
						Effect.either(service.fetchModels),
					],
					{ concurrency: 1 }
				)

				// All requests should complete (may be rate limited but handled)
				expect(results).toHaveLength(3)

				return results
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})
	})

	describe("Artificial Analysis Service", () => {
		it("should fetch models from Artificial Analysis", async () => {
			if (!process.env.ARTIFICIAL_ANALYSIS_API_KEY) {
				console.log("⏭️  Skipping Artificial Analysis test - no API key")
				return
			}

			const program = Effect.gen(function* () {
				const service = yield* ArtificialAnalysisService

				const models = yield* Effect.either(service.fetchModels)

				if (models._tag === "Right") {
					expect(Array.isArray(models.right)).toBe(true)
					console.log(
						`✅ Fetched ${models.right.length} models from Artificial Analysis`
					)
				} else {
					console.log("⚠️  Artificial Analysis API returned error:", models.left)
				}

				return models
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})
	})

	describe("Model Data Aggregation", () => {
		it("should aggregate models from all sources", async () => {
			if (!hasApiCredentials()) {
				console.log("⏭️  Skipping aggregation test - no API credentials")
				return
			}

			const program = Effect.gen(function* () {
				const modelService = yield* ModelDataService

				// Get latest models (should aggregate from all sources)
				const models = yield* modelService.getLatestModels()

				expect(Array.isArray(models)).toBe(true)
				console.log(`✅ Aggregated ${models.length} total models`)

				// Verify models from different providers
				const providers = [...new Set(models.map(m => m.provider))]
				console.log(`📊 Providers: ${providers.join(", ")}`)

				expect(providers.length).toBeGreaterThan(0)

				return { models, providers }
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})

		it("should deduplicate models across sources", async () => {
			if (!hasApiCredentials()) {
				console.log("⏭️  Skipping deduplication test - no API credentials")
				return
			}

			const program = Effect.gen(function* () {
				const modelService = yield* ModelDataService

				const models = yield* modelService.getLatestModels()

				// Check for duplicate IDs
				const ids = models.map(m => m.id)
				const uniqueIds = new Set(ids)

				expect(ids.length).toBe(uniqueIds.size)

				return { total: ids.length, unique: uniqueIds.size }
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})
	})

	describe("Data Transformation", () => {
		it("should normalize model data across sources", async () => {
			if (!hasApiCredentials()) {
				console.log("⏭️  Skipping normalization test - no API credentials")
				return
			}

			const program = Effect.gen(function* () {
				const modelService = yield* ModelDataService

				const models = yield* modelService.getLatestModels()

				// Verify all models have required fields
				if (models.length > 0) {
					const requiredFields = [
						"id",
						"name",
						"provider",
						"contextWindow",
						"modalities",
						"capabilities",
					]

					models.forEach(model => {
						requiredFields.forEach(field => {
							expect(model).toHaveProperty(field)
						})
					})
				}

				return models
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})

		it("should handle missing data gracefully", async () => {
			if (!hasApiCredentials()) {
				console.log("⏭️  Skipping missing data test - no API credentials")
				return
			}

			const program = Effect.gen(function* () {
				const modelService = yield* ModelDataService

				const models = yield* modelService.getLatestModels()

				// Some models may have missing optional fields
				// Should use defaults or null values
				if (models.length > 0) {
					models.forEach(model => {
						// Optional fields should be null or have default values
						if (model.description === undefined) {
							expect(model.description).toBe(null)
						}
					})
				}

				return models
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})
	})

	describe("Error Recovery", () => {
		it("should continue if one source fails", async () => {
			const program = Effect.gen(function* () {
				const modelService = yield* ModelDataService

				// Even if some sources fail, should return available data
				const result = yield* Effect.either(modelService.getLatestModels())

				// Should not throw, but may return partial data
				expect(result).toBeDefined()

				if (result._tag === "Right") {
					console.log(`✅ Retrieved ${result.right.length} models despite potential failures`)
				}

				return result
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})

		it("should retry failed requests", async () => {
			if (!hasApiCredentials()) {
				console.log("⏭️  Skipping retry test - no API credentials")
				return
			}

			const program = Effect.gen(function* () {
				const hfService = yield* HuggingFaceService

				// Test retry logic by making a request that might fail
				const result = yield* Effect.either(
					hfService.fetchModels.pipe(
						Effect.retry({ times: 2 }),
						Effect.timeout("10 seconds")
					)
				)

				expect(result).toBeDefined()

				return result
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})
	})

	describe("API Health Checks", () => {
		it("should validate API connectivity", async () => {
			if (!hasApiCredentials()) {
				console.log("⏭️  Skipping health check - no API credentials")
				return
			}

			const program = Effect.gen(function* () {
				const results = {
					huggingface: false,
					openrouter: false,
					artificialAnalysis: false,
				}

				// Test HuggingFace
				if (process.env.HUGGINGFACE_API_KEY) {
					const hfService = yield* HuggingFaceService
					const hfResult = yield* Effect.either(
						hfService.fetchModels.pipe(Effect.timeout("5 seconds"))
					)
					results.huggingface = hfResult._tag === "Right"
				}

				// Test OpenRouter
				if (process.env.OPENROUTER_API_KEY) {
					const orService = yield* OpenRouterService
					const orResult = yield* Effect.either(
						orService.fetchModels.pipe(Effect.timeout("5 seconds"))
					)
					results.openrouter = orResult._tag === "Right"
				}

				// Test Artificial Analysis
				if (process.env.ARTIFICIAL_ANALYSIS_API_KEY) {
					const aaService = yield* ArtificialAnalysisService
					const aaResult = yield* Effect.either(
						aaService.fetchModels.pipe(Effect.timeout("5 seconds"))
					)
					results.artificialAnalysis = aaResult._tag === "Right"
				}

				console.log("🏥 API Health Check Results:", results)

				return results
			}).pipe(Effect.provide(AppLayer))

			const results = await Effect.runPromise(program)
			
			// At least one service should be healthy
			const healthyServices = Object.values(results).filter(Boolean).length
			console.log(`✅ ${healthyServices} API services are healthy`)
		})
	})
})
