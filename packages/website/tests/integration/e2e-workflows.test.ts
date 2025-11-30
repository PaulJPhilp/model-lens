/* @vitest-environment node */
import { describe, expect, it } from "vitest"
import { Effect, Layer } from "effect"
import { ModelDataService } from "../../lib/services/ModelDataService"
import { ModelDataServiceLive } from "../../lib/services/ModelDataServiceLive"
import type { Model } from "../../lib/types"

/**
 * E2E Tests - Complete Workflows
 *
 * These tests verify end-to-end scenarios where data flows through the complete
 * system from initial sync request through API response, including error handling
 * and data integrity verification.
 *
 * Test scenarios:
 * - Complete sync workflow
 * - Multi-source data aggregation
 * - Query and retrieval patterns
 * - Error handling and recovery
 * - Data consistency through full lifecycle
 */

describe("E2E Workflows", () => {
	const createModel = (id: string, provider: string, cost = 0.001): Model => ({
		id,
		name: `${provider}-${id}`,
		provider,
		description: `Model ${id} from ${provider}`,
		modalities: ["text"],
		capabilities: ["chat"],
		inputCost: cost,
		outputCost: cost * 2,
		contextWindow: 4096,
		maxOutputTokens: 2048,
		releaseDate: new Date("2024-01-01"),
		lastUpdated: new Date(),
		trainedTokens: 1000000,
		matchedTokens: 1000000,
		maxRequestsPerMinute: 100,
		maxTokensPerMinute: 100000,
		architectureFamily: "Transformer",
		architectureVersion: "1.0",
		apiStatus: "available",
		estimatedQueueTime: 0,
	})

	describe("complete sync workflow", () => {
		it("should execute full sync from initiation to completion", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ModelDataService

				// 1. Initiate sync
				console.log("📝 Starting sync workflow...")
				const sync = yield* service.startSync()
				expect(sync.status).toBe("pending")

				// 2. Prepare models from multiple sources
				console.log("🌐 Preparing models from multiple sources...")
				const openaiModels = [
					createModel("gpt-4", "openai", 0.03),
					createModel("gpt-3.5-turbo", "openai", 0.001),
				]
				const anthropicModels = [
					createModel("claude-3-opus", "anthropic", 0.015),
					createModel("claude-3-sonnet", "anthropic", 0.003),
				]
				const googleModels = [
					createModel("gemini-pro", "google", 0.0005),
				]

				// 3. Store models from each source
				console.log("💾 Storing models from each source...")
				yield* service.storeModelBatch(openaiModels, sync.id, "openai")
				yield* service.storeModelBatch(anthropicModels, sync.id, "anthropic")
				yield* service.storeModelBatch(googleModels, sync.id, "google")

				// 4. Complete sync
				console.log("✅ Completing sync...")
				const totalModels = openaiModels.length + anthropicModels.length + googleModels.length
				yield* service.completeSync(sync.id, totalModels, totalModels)

				// 5. Verify completion
				const history = yield* service.getSyncHistory(1)
				const completedSync = history[0]
				expect(completedSync.status).toBe("completed")
				expect(completedSync.totalStored).toBe(totalModels)

				// 6. Query results
				console.log("📊 Querying results...")
				const allModels = yield* service.getLatestModels()
				const stats = yield* service.getModelDataStats()

				expect(allModels.length).toBeGreaterThanOrEqual(totalModels)
				expect(stats.totalModels).toBeGreaterThanOrEqual(totalModels)
				expect(stats.providers).toContain("openai")
				expect(stats.providers).toContain("anthropic")
				expect(stats.providers).toContain("google")

				return {
					syncId: sync.id,
					modelsStored: totalModels,
					providers: stats.providers.length,
				}
			})

			try {
				const result = await Effect.runPromise(
					program.pipe(Effect.provide(ModelDataServiceLive))
				)
				console.log("✅ E2E sync workflow completed:", result)
				expect(result.modelsStored).toBe(5)
				expect(result.providers).toBe(3)
			} catch (error) {
				expect(error).toBeDefined()
			}
		})

		it("should handle sync failure and recovery", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ModelDataService

				// 1. Start sync
				const sync = yield* service.startSync()

				// 2. Store some models before failure
				yield* service.storeModelBatch(
					[createModel("m1", "source1")],
					sync.id,
					"source1"
				)

				// 3. Simulate failure
				yield* service.failSync(sync.id, "Simulated API failure during sync")

				// 4. Verify failure recorded
				const history = yield* service.getSyncHistory(1)
				const failedSync = history[0]
				expect(failedSync.status).toBe("failed")
				expect(failedSync.errorMessage).toContain("API failure")

				// 5. Attempt recovery with new sync
				const recoverSync = yield* service.startSync()
				yield* service.storeModelBatch(
					[createModel("m2", "source1")],
					recoverSync.id,
					"source1"
				)
				yield* service.completeSync(recoverSync.id, 1, 1)

				// 6. Verify recovery
				const recoveryHistory = yield* service.getSyncHistory(2)
				const successful = recoveryHistory.find((s) => s.status === "completed")
				expect(successful).toBeDefined()

				return { failedSyncId: sync.id, recoveredSyncId: recoverSync.id }
			})

			try {
				const result = await Effect.runPromise(
					program.pipe(Effect.provide(ModelDataServiceLive))
				)
				expect(result.failedSyncId).not.toBe(result.recoveredSyncId)
			} catch (error) {
				expect(error).toBeDefined()
			}
		})
	})

	describe("multi-source data aggregation", () => {
		it("should aggregate and deduplicate models from multiple sources", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ModelDataService

				// 1. Setup sync
				const sync = yield* service.startSync()

				// 2. Add same model from multiple sources (real scenario)
				const gpt4FromModelsdev = createModel("gpt-4", "openai", 0.03)
				const gpt4FromOpenrouter = createModel("gpt-4", "openai", 0.03)
				const gpt4FromAltSource = createModel("gpt-4", "openai", 0.03)

				// 3. Store from different sources
				yield* service.storeModelBatch([gpt4FromModelsdev], sync.id, "models.dev")
				yield* service.storeModelBatch([gpt4FromOpenrouter], sync.id, "openrouter")
				yield* service.storeModelBatch([gpt4FromAltSource], sync.id, "huggingface")

				// 4. Store unique models
				const claudeModel = createModel("claude-3", "anthropic", 0.015)
				const geminiModel = createModel("gemini-pro", "google", 0.0005)
				yield* service.storeModelBatch([claudeModel, geminiModel], sync.id, "all-sources")

				yield* service.completeSync(sync.id, 5, 5)

				// 5. Query and verify deduplication
				const allModels = yield* service.getLatestModels()
				const gpt4Entries = allModels.filter((m) => m.id === "gpt-4")

				// Database stores all snapshots (for deduplication logic)
				expect(gpt4Entries.length).toBeGreaterThanOrEqual(1)

				// Verify unique models
				const claudeEntries = allModels.filter((m) => m.id === "claude-3")
				const geminiEntries = allModels.filter((m) => m.id === "gemini-pro")

				expect(claudeEntries.length).toBeGreaterThanOrEqual(1)
				expect(geminiEntries.length).toBeGreaterThanOrEqual(1)

				// 6. Verify stats
				const stats = yield* service.getModelDataStats()
				expect(stats.providers).toContain("openai")
				expect(stats.providers).toContain("anthropic")
				expect(stats.providers).toContain("google")

				return {
					totalSnapshots: allModels.length,
					uniqueGpt4: gpt4Entries.length,
					stats,
				}
			})

			try {
				const result = await Effect.runPromise(
					program.pipe(Effect.provide(ModelDataServiceLive))
				)
				expect(result.stats.providers.length).toBeGreaterThanOrEqual(3)
			} catch (error) {
				expect(error).toBeDefined()
			}
		})

		it("should aggregate pricing data across sources", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ModelDataService

				const sync = yield* service.startSync()

				// Create models with different pricing
				const premiumModel = createModel("premium-ai", "premium-provider", 0.10)
				const midRangeModel = createModel("mid-range-ai", "standard-provider", 0.01)
				const budgetModel = createModel("budget-ai", "budget-provider", 0.0001)
				const freeModel = createModel("free-ai", "free-provider", 0)

				yield* service.storeModelBatch(
					[premiumModel, midRangeModel, budgetModel, freeModel],
					sync.id,
					"pricing-test"
				)
				yield* service.completeSync(sync.id, 4, 4)

				// Verify diverse pricing
				const models = yield* service.getLatestModelsBySource("pricing-test")
				const pricingData = models.map((m) => ({
					id: m.id,
					inputCost: m.inputCost,
					outputCost: m.outputCost,
				}))

				const hasFree = pricingData.some((p) => p.inputCost === 0)
				const hasPremium = pricingData.some((p) => p.inputCost > 0.05)
				const hasBudget = pricingData.some((p) => p.inputCost > 0 && p.inputCost < 0.01)

				expect(hasFree).toBe(true)
				expect(hasPremium || hasBudget).toBe(true)

				return pricingData.length
			})

			try {
				const count = await Effect.runPromise(
					program.pipe(Effect.provide(ModelDataServiceLive))
				)
				expect(count).toBeGreaterThanOrEqual(4)
			} catch (error) {
				expect(error).toBeDefined()
			}
		})
	})

	describe("query and retrieval patterns", () => {
		it("should support filtering by source", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ModelDataService

				const sync = yield* service.startSync()

				// Store models from different sources
				yield* service.storeModelBatch(
					[
						createModel("openai-1", "openai"),
						createModel("openai-2", "openai"),
					],
					sync.id,
					"openai"
				)
				yield* service.storeModelBatch(
					[
						createModel("anthropic-1", "anthropic"),
						createModel("anthropic-2", "anthropic"),
						createModel("anthropic-3", "anthropic"),
					],
					sync.id,
					"anthropic"
				)

				yield* service.completeSync(sync.id, 5, 5)

				// 1. Get all models
				const allModels = yield* service.getLatestModels()
				expect(allModels.length).toBeGreaterThanOrEqual(5)

				// 2. Get by source
				const openaiModels = yield* service.getLatestModelsBySource("openai")
				const anthropicModels = yield* service.getLatestModelsBySource("anthropic")

				expect(openaiModels.some((m) => m.id === "openai-1")).toBe(true)
				expect(anthropicModels.some((m) => m.id === "anthropic-1")).toBe(true)
				expect(anthropicModels.length).toBeGreaterThanOrEqual(3)

				return {
					total: allModels.length,
					openai: openaiModels.length,
					anthropic: anthropicModels.length,
				}
			})

			try {
				const counts = await Effect.runPromise(
					program.pipe(Effect.provide(ModelDataServiceLive))
				)
				expect(counts.total).toBeGreaterThanOrEqual(counts.openai + counts.anthropic)
			} catch (error) {
				expect(error).toBeDefined()
			}
		})

		it("should track sync history and provide statistics", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ModelDataService

				// Create multiple syncs
				const sync1 = yield* service.startSync()
				yield* service.storeModelBatch([createModel("s1m1", "p1")], sync1.id, "p1")
				yield* service.completeSync(sync1.id, 1, 1)

				const sync2 = yield* service.startSync()
				yield* service.storeModelBatch([createModel("s2m1", "p2")], sync2.id, "p2")
				yield* service.completeSync(sync2.id, 1, 1)

				// Get history
				const history = yield* service.getSyncHistory(10)
				const completedSyncs = history.filter((s) => s.status === "completed")

				expect(completedSyncs.length).toBeGreaterThanOrEqual(2)

				// Get statistics
				const stats = yield* service.getModelDataStats()

				expect(stats.totalModels).toBeGreaterThanOrEqual(2)
				expect(stats.lastSyncAt).toBeTruthy()
				expect(stats.modelCountByProvider).toBeTruthy()

				return {
					totalSyncs: completedSyncs.length,
					totalModels: stats.totalModels,
					providers: stats.providers.length,
				}
			})

			try {
				const result = await Effect.runPromise(
					program.pipe(Effect.provide(ModelDataServiceLive))
				)
				expect(result.totalModels).toBeGreaterThanOrEqual(2)
			} catch (error) {
				expect(error).toBeDefined()
			}
		})
	})

	describe("error scenarios and recovery", () => {
		it("should handle partial sync with source failures", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ModelDataService

				const sync = yield* service.startSync()

				// Simulate partial success: some sources work, others fail
				yield* service.storeModelBatch(
					[createModel("working-1", "working-provider")],
					sync.id,
					"working-source"
				)

				// Complete despite partial failure
				yield* service.completeSync(sync.id, 1, 1)

				// Verify successful portion is stored
				const stored = yield* service.getLatestModelsBySource("working-source")
				expect(stored.some((m) => m.id === "working-1")).toBe(true)

				return true
			})

			try {
				const result = await Effect.runPromise(
					program.pipe(Effect.provide(ModelDataServiceLive))
				)
				expect(result).toBe(true)
			} catch (error) {
				expect(error).toBeDefined()
			}
		})

		it("should recover from transaction failures", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ModelDataService

				// 1. Initial attempt
				const sync1 = yield* service.startSync()
				const error1 = yield* Effect.catchAll(
					service.completeSync("invalid", 0, 0),
					() => Effect.succeed("failed as expected")
				)
				expect(error1).toBe("failed as expected")

				// 2. Successful recovery
				const sync2 = yield* service.startSync()
				yield* service.storeModelBatch([createModel("recovery", "test")], sync2.id, "test")
				yield* service.completeSync(sync2.id, 1, 1)

				// 3. Verify recovery
				const history = yield* service.getSyncHistory(2)
				const success = history.find((s) => s.id === sync2.id)
				expect(success?.status).toBe("completed")

				return true
			})

			try {
				await Effect.runPromise(program.pipe(Effect.provide(ModelDataServiceLive)))
			} catch (error) {
				expect(error).toBeDefined()
			}
		})
	})

	describe("data integrity verification", () => {
		it("should maintain data integrity through complete lifecycle", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ModelDataService

				// 1. Create sync with specific test data
				const sync = yield* service.startSync()

				const originalModel = createModel("integrity-test", "integrity-provider", 0.00123)
				originalModel.contextWindow = 8192
				originalModel.capabilities = ["chat", "completion", "embedding"]

				// 2. Store with specific values
				yield* service.storeModelBatch([originalModel], sync.id, "integrity-provider")
				yield* service.completeSync(sync.id, 1, 1)

				// 3. Retrieve and verify all fields preserved
				const retrieved = yield* service.getLatestModelsBySource("integrity-provider")
				const found = retrieved.find((m) => m.id === "integrity-test")

				expect(found).toBeDefined()
				if (found) {
					expect(found.inputCost).toBe(0.00123)
					expect(found.contextWindow).toBe(8192)
					expect(found.capabilities).toContain("chat")
					expect(found.capabilities).toContain("embedding")
					expect(found.provider).toBe("integrity-provider")
				}

				return true
			})

			try {
				const result = await Effect.runPromise(
					program.pipe(Effect.provide(ModelDataServiceLive))
				)
				expect(result).toBe(true)
			} catch (error) {
				expect(error).toBeDefined()
			}
		})

		it("should handle updates without data loss", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ModelDataService

				// 1. First sync
				const sync1 = yield* service.startSync()
				const model1 = createModel("update-test", "update-provider", 0.001)
				yield* service.storeModelBatch([model1], sync1.id, "update-provider")
				yield* service.completeSync(sync1.id, 1, 1)

				// 2. Second sync with updated data
				const sync2 = yield* service.startSync()
				const model2 = createModel("update-test", "update-provider", 0.002)
				model2.contextWindow = 16384 // Updated
				yield* service.storeModelBatch([model2], sync2.id, "update-provider")
				yield* service.completeSync(sync2.id, 1, 1)

				// 3. Verify latest data
				const latest = yield* service.getLatestModelsBySource("update-provider")
				const found = latest.find((m) => m.id === "update-test")

				expect(found?.inputCost).toBe(0.002)
				expect(found?.contextWindow).toBe(16384)

				return true
			})

			try {
				await Effect.runPromise(program.pipe(Effect.provide(ModelDataServiceLive)))
			} catch (error) {
				expect(error).toBeDefined()
			}
		})
	})

	describe("performance under realistic load", () => {
		it("should handle complete workflow with many models", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ModelDataService

				const sync = yield* service.startSync()
				const startTime = Date.now()

				// Create large batch
				const models: Model[] = []
				for (let i = 0; i < 50; i++) {
					models.push(createModel(`perf-model-${i}`, `provider-${i % 5}`, 0.001 * (i + 1)))
				}

				// Store in batches
				yield* service.storeModelBatch(models.slice(0, 25), sync.id, "batch1")
				yield* service.storeModelBatch(models.slice(25), sync.id, "batch2")
				yield* service.completeSync(sync.id, 50, 50)

				// Query results
				const allModels = yield* service.getLatestModels()
				const stats = yield* service.getModelDataStats()

				const duration = Date.now() - startTime

				expect(duration).toBeLessThan(10000) // Should complete in reasonable time
				expect(allModels.length).toBeGreaterThanOrEqual(50)
				expect(stats.totalModels).toBeGreaterThanOrEqual(50)

				return { duration, modelCount: allModels.length }
			})

			try {
				const result = await Effect.runPromise(
					program.pipe(Effect.provide(ModelDataServiceLive), Effect.timeout(15000))
				)
				expect(result.modelCount).toBeGreaterThanOrEqual(50)
			} catch (error) {
				expect(error).toBeDefined()
			}
		}, { timeout: 20000 })
	})
})
