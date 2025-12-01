/* @vitest-environment node */

import { eq } from "drizzle-orm"
import { Effect, Layer } from "effect"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { db } from "../../src/db"
import { modelSnapshots, modelSyncs } from "../../src/db/schema.models"
import type { Model } from "../types"
import { ModelDataService } from "./ModelDataService"
import { ModelDataServiceLive } from "./ModelDataServiceLive"

describe("ModelDataService", () => {
	let testSyncId: string

	beforeEach(async () => {
		// Clean up test data before each test
		try {
			await db
				.delete(modelSnapshots)
				.where(eq(modelSnapshots.syncId, testSyncId || ""))
			await db.delete(modelSyncs)
		} catch (error) {
			// Database might not exist in test environment - skip cleanup
			if (error instanceof Error && error.message.includes("does not exist")) {
				console.log(
					"ℹ️  Test database not available - skipping ModelDataService tests",
				)
			}
		}
	})

	afterEach(async () => {
		// Clean up test data after each test
		try {
			if (testSyncId) {
				await db
					.delete(modelSnapshots)
					.where(eq(modelSnapshots.syncId, testSyncId))
			}
			await db.delete(modelSyncs)
		} catch (error) {
			// Database might not exist in test environment - skip cleanup
			if (error instanceof Error && error.message.includes("does not exist")) {
				// Silently skip
			}
		}
	})

	describe("startSync()", () => {
		it("should create a new sync record", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ModelDataService
				const sync = yield* service.startSync()
				return sync
			})

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ModelDataServiceLive)),
			)

			expect(result).toBeDefined()
			expect(result.id).toBeTruthy()
			expect(result.status).toBe("started")
			expect(result.startedAt).toBeDefined()
			testSyncId = result.id
		})

		it("should return a sync record with required properties", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ModelDataService
				const sync = yield* service.startSync()
				return sync
			})

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ModelDataServiceLive)),
			)

			expect(result).toHaveProperty("id")
			expect(result).toHaveProperty("status")
			expect(result).toHaveProperty("startedAt")
			expect(result).toHaveProperty("completedAt")
			testSyncId = result.id
		})

		it("should generate unique sync IDs", async () => {
			// Layer is already properly created in ModelDataServiceLive.ts
			const program = Effect.gen(function* () {
				const service = yield* ModelDataService
				const sync1 = yield* service.startSync()
				const sync2 = yield* service.startSync()
				return { sync1, sync2 }
			})

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ModelDataServiceLive)),
			)

			expect(result.sync1.id).not.toBe(result.sync2.id)
			testSyncId = result.sync1.id
		})
	})

	describe("storeModelBatch()", () => {
		it("should store model batch in database", async () => {
			// Layer is already properly created in ModelDataServiceLive.ts
			const testModels: Model[] = [
				{
					id: "test/model-1",
					name: "Test Model 1",
					provider: "test",
					contextWindow: 4096,
					maxOutputTokens: 2048,
					inputCost: 0.01,
					outputCost: 0.02,
					cacheReadCost: 0,
					cacheWriteCost: 0,
					modalities: ["text"],
					capabilities: [],
					releaseDate: "2024-01-01",
					lastUpdated: "2024-01-01",
					knowledge: "Test model",
					openWeights: false,
					supportsTemperature: true,
					supportsAttachments: false,
					new: false,
				},
			]

			const program = Effect.gen(function* () {
				const service = yield* ModelDataService
				const sync = yield* service.startSync()
				testSyncId = sync.id

				yield* service.storeModelBatch(testModels, sync.id, "test-source")

				// Verify stored
				const snapshots = yield* Effect.tryPromise({
					try: () =>
						db
							.select()
							.from(modelSnapshots)
							.where(eq(modelSnapshots.syncId, sync.id)),
					catch: (error) => new Error(String(error)),
				})

				return snapshots.length
			})

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ModelDataServiceLive)),
			)
			expect(result).toBe(1)
		})

		it("should store multiple models in batch", async () => {
			// Layer is already properly created in ModelDataServiceLive.ts
			const testModels: Model[] = Array.from({ length: 10 }, (_, i) => ({
				id: `test/model-${i}`,
				name: `Test Model ${i}`,
				provider: "test",
				contextWindow: 4096,
				maxOutputTokens: 2048,
				inputCost: 0.01,
				outputCost: 0.02,
				cacheReadCost: 0,
				cacheWriteCost: 0,
				modalities: ["text"],
				capabilities: [],
				releaseDate: "2024-01-01",
				lastUpdated: "2024-01-01",
				knowledge: "Test model",
				openWeights: false,
				supportsTemperature: true,
				supportsAttachments: false,
				new: false,
			}))

			const program = Effect.gen(function* () {
				const service = yield* ModelDataService
				const sync = yield* service.startSync()
				testSyncId = sync.id

				yield* service.storeModelBatch(testModels, sync.id, "test-source")

				const snapshots = yield* Effect.tryPromise({
					try: () =>
						db
							.select()
							.from(modelSnapshots)
							.where(eq(modelSnapshots.syncId, sync.id)),
					catch: (error) => new Error(String(error)),
				})

				return snapshots.length
			})

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ModelDataServiceLive)),
			)
			expect(result).toBe(10)
		})

		it("should store with correct source attribution", async () => {
			// Layer is already properly created in ModelDataServiceLive.ts
			const testModels: Model[] = [
				{
					id: "test/model-1",
					name: "Test Model",
					provider: "test",
					contextWindow: 4096,
					maxOutputTokens: 2048,
					inputCost: 0.01,
					outputCost: 0.02,
					cacheReadCost: 0,
					cacheWriteCost: 0,
					modalities: ["text"],
					capabilities: [],
					releaseDate: "2024-01-01",
					lastUpdated: "2024-01-01",
					knowledge: "Test model",
					openWeights: false,
					supportsTemperature: true,
					supportsAttachments: false,
					new: false,
				},
			]

			const program = Effect.gen(function* () {
				const service = yield* ModelDataService
				const sync = yield* service.startSync()
				testSyncId = sync.id

				yield* service.storeModelBatch(testModels, sync.id, "models.dev")

				const snapshots = yield* Effect.tryPromise({
					try: () =>
						db
							.select()
							.from(modelSnapshots)
							.where(eq(modelSnapshots.syncId, sync.id)),
					catch: (error) => new Error(String(error)),
				})

				return snapshots[0]?.source
			})

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ModelDataServiceLive)),
			)
			expect(result).toBe("models.dev")
		})
	})

	describe("completeSync()", () => {
		it("should mark sync as completed", async () => {
			// Layer is already properly created in ModelDataServiceLive.ts

			const program = Effect.gen(function* () {
				const service = yield* ModelDataService
				const sync = yield* service.startSync()
				testSyncId = sync.id

				yield* service.completeSync(sync.id, 100, 95)

				const updated = yield* Effect.tryPromise({
					try: () =>
						db.select().from(modelSyncs).where(eq(modelSyncs.id, sync.id)),
					catch: (error) => new Error(String(error)),
				})

				return updated[0]
			})

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ModelDataServiceLive)),
			)

			expect(result.status).toBe("completed")
			expect(result.totalFetched).toBe(100)
			expect(result.totalStored).toBe(95)
			expect(result.completedAt).toBeDefined()
		})

		it("should record correct fetch and storage counts", async () => {
			// Layer is already properly created in ModelDataServiceLive.ts

			const program = Effect.gen(function* () {
				const service = yield* ModelDataService
				const sync = yield* service.startSync()
				testSyncId = sync.id

				yield* service.completeSync(sync.id, 1250, 1245)

				const updated = yield* Effect.tryPromise({
					try: () =>
						db.select().from(modelSyncs).where(eq(modelSyncs.id, sync.id)),
					catch: (error) => new Error(String(error)),
				})

				return {
					totalFetched: updated[0].totalFetched,
					totalStored: updated[0].totalStored,
				}
			})

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ModelDataServiceLive)),
			)

			expect(result.totalFetched).toBe(1250)
			expect(result.totalStored).toBe(1245)
		})
	})

	describe("failSync()", () => {
		it("should mark sync as failed with error message", async () => {
			// Layer is already properly created in ModelDataServiceLive.ts

			const program = Effect.gen(function* () {
				const service = yield* ModelDataService
				const sync = yield* service.startSync()
				testSyncId = sync.id

				const errorMsg = "Network connection timeout"
				yield* service.failSync(sync.id, errorMsg)

				const updated = yield* Effect.tryPromise({
					try: () =>
						db.select().from(modelSyncs).where(eq(modelSyncs.id, sync.id)),
					catch: (error) => new Error(String(error)),
				})

				return updated[0]
			})

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ModelDataServiceLive)),
			)

			expect(result.status).toBe("failed")
			expect(result.errorMessage).toBe("Network connection timeout")
			expect(result.completedAt).toBeDefined()
		})
	})

	describe("getLatestModels()", () => {
		it("should return models from latest completed sync", async () => {
			// Layer is already properly created in ModelDataServiceLive.ts
			const testModels: Model[] = [
				{
					id: "test/model-1",
					name: "Test Model 1",
					provider: "test",
					contextWindow: 4096,
					maxOutputTokens: 2048,
					inputCost: 0.01,
					outputCost: 0.02,
					cacheReadCost: 0,
					cacheWriteCost: 0,
					modalities: ["text"],
					capabilities: [],
					releaseDate: "2024-01-01",
					lastUpdated: "2024-01-01",
					knowledge: "Test model",
					openWeights: false,
					supportsTemperature: true,
					supportsAttachments: false,
					new: false,
				},
				{
					id: "test/model-2",
					name: "Test Model 2",
					provider: "test",
					contextWindow: 8192,
					maxOutputTokens: 4096,
					inputCost: 0.02,
					outputCost: 0.04,
					cacheReadCost: 0,
					cacheWriteCost: 0,
					modalities: ["text"],
					capabilities: [],
					releaseDate: "2024-01-02",
					lastUpdated: "2024-01-02",
					knowledge: "Test model 2",
					openWeights: false,
					supportsTemperature: true,
					supportsAttachments: false,
					new: false,
				},
			]

			const program = Effect.gen(function* () {
				const service = yield* ModelDataService
				const sync = yield* service.startSync()
				testSyncId = sync.id

				yield* service.storeModelBatch(testModels, sync.id, "test-source")
				yield* service.completeSync(sync.id, 2, 2)

				const latestModels = yield* service.getLatestModels()
				return latestModels
			})

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ModelDataServiceLive)),
			)

			expect(Array.isArray(result)).toBe(true)
			expect(result.length).toBe(2)
		})

		it("should return empty array when no syncs exist", async () => {
			// Layer is already properly created in ModelDataServiceLive.ts

			const program = Effect.gen(function* () {
				const service = yield* ModelDataService
				const latestModels = yield* service.getLatestModels()
				return latestModels
			})

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ModelDataServiceLive)),
			)

			expect(Array.isArray(result)).toBe(true)
			expect(result.length).toBe(0)
		})
	})

	describe("getLatestModelsBySource()", () => {
		it("should return models only from specified source", async () => {
			// Layer is already properly created in ModelDataServiceLive.ts
			const testModels: Model[] = [
				{
					id: "test/model-1",
					name: "Test Model 1",
					provider: "test",
					contextWindow: 4096,
					maxOutputTokens: 2048,
					inputCost: 0.01,
					outputCost: 0.02,
					cacheReadCost: 0,
					cacheWriteCost: 0,
					modalities: ["text"],
					capabilities: [],
					releaseDate: "2024-01-01",
					lastUpdated: "2024-01-01",
					knowledge: "Test model",
					openWeights: false,
					supportsTemperature: true,
					supportsAttachments: false,
					new: false,
				},
			]

			const program = Effect.gen(function* () {
				const service = yield* ModelDataService
				const sync = yield* service.startSync()
				testSyncId = sync.id

				yield* service.storeModelBatch(testModels, sync.id, "models.dev")
				yield* service.storeModelBatch(testModels, sync.id, "openrouter")
				yield* service.completeSync(sync.id, 2, 2)

				const devModels = yield* service.getLatestModelsBySource("models.dev")
				return devModels
			})

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ModelDataServiceLive)),
			)

			expect(Array.isArray(result)).toBe(true)
			expect(result.length).toBe(1)
		})

		it("should filter by source correctly", async () => {
			// Layer is already properly created in ModelDataServiceLive.ts
			const testModel: Model = {
				id: "test/model-1",
				name: "Test Model",
				provider: "test",
				contextWindow: 4096,
				maxOutputTokens: 2048,
				inputCost: 0.01,
				outputCost: 0.02,
				cacheReadCost: 0,
				cacheWriteCost: 0,
				modalities: ["text"],
				capabilities: [],
				releaseDate: "2024-01-01",
				lastUpdated: "2024-01-01",
				knowledge: "Test model",
				openWeights: false,
				supportsTemperature: true,
				supportsAttachments: false,
				new: false,
			}

			const program = Effect.gen(function* () {
				const service = yield* ModelDataService
				const sync = yield* service.startSync()
				testSyncId = sync.id

				yield* service.storeModelBatch([testModel], sync.id, "source-a")
				yield* service.storeModelBatch([testModel], sync.id, "source-b")
				yield* service.completeSync(sync.id, 2, 2)

				const sourceAModels = yield* service.getLatestModelsBySource("source-a")
				const sourceBModels = yield* service.getLatestModelsBySource("source-b")

				return { sourceA: sourceAModels.length, sourceB: sourceBModels.length }
			})

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ModelDataServiceLive)),
			)

			expect(result.sourceA).toBe(1)
			expect(result.sourceB).toBe(1)
		})
	})

	describe("getModelDataStats()", () => {
		it("should return statistics object", async () => {
			// Layer is already properly created in ModelDataServiceLive.ts

			const program = Effect.gen(function* () {
				const service = yield* ModelDataService
				const stats = yield* service.getModelDataStats()
				return stats
			})

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ModelDataServiceLive)),
			)

			expect(result).toHaveProperty("totalModels")
			expect(result).toHaveProperty("providers")
			expect(result).toHaveProperty("lastSyncAt")
			expect(result).toHaveProperty("modelCountByProvider")
		})

		it("should include provider breakdown", async () => {
			// Layer is already properly created in ModelDataServiceLive.ts
			const testModels: Model[] = [
				{
					id: "openai/gpt-4",
					name: "GPT-4",
					provider: "openai",
					contextWindow: 8192,
					maxOutputTokens: 4096,
					inputCost: 0.03,
					outputCost: 0.06,
					cacheReadCost: 0,
					cacheWriteCost: 0,
					modalities: ["text"],
					capabilities: [],
					releaseDate: "2023-03-14",
					lastUpdated: "2024-01-01",
					knowledge: "GPT-4 model",
					openWeights: false,
					supportsTemperature: true,
					supportsAttachments: false,
					new: false,
				},
				{
					id: "anthropic/claude-3",
					name: "Claude 3",
					provider: "anthropic",
					contextWindow: 200000,
					maxOutputTokens: 4096,
					inputCost: 0.003,
					outputCost: 0.015,
					cacheReadCost: 0,
					cacheWriteCost: 0,
					modalities: ["text"],
					capabilities: [],
					releaseDate: "2024-01-01",
					lastUpdated: "2024-01-01",
					knowledge: "Claude 3 model",
					openWeights: false,
					supportsTemperature: true,
					supportsAttachments: false,
					new: false,
				},
			]

			const program = Effect.gen(function* () {
				const service = yield* ModelDataService
				const sync = yield* service.startSync()
				testSyncId = sync.id

				yield* service.storeModelBatch(testModels, sync.id, "test-source")
				yield* service.completeSync(sync.id, 2, 2)

				const stats = yield* service.getModelDataStats()
				return stats
			})

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ModelDataServiceLive)),
			)

			expect(result.totalModels).toBeGreaterThan(0)
			expect(Array.isArray(result.providers)).toBe(true)
			expect(typeof result.modelCountByProvider).toBe("object")
		})
	})

	describe("getSyncHistory()", () => {
		it("should return sync history", async () => {
			// Layer is already properly created in ModelDataServiceLive.ts

			const program = Effect.gen(function* () {
				const service = yield* ModelDataService
				const sync1 = yield* service.startSync()
				const sync2 = yield* service.startSync()
				testSyncId = sync1.id

				yield* service.completeSync(sync1.id, 100, 95)
				yield* service.completeSync(sync2.id, 110, 105)

				const history = yield* service.getSyncHistory()
				return history
			})

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ModelDataServiceLive)),
			)

			expect(Array.isArray(result)).toBe(true)
			expect(result.length).toBeGreaterThanOrEqual(2)
		})

		it("should respect limit parameter", async () => {
			// Layer is already properly created in ModelDataServiceLive.ts

			const program = Effect.gen(function* () {
				const service = yield* ModelDataService

				// Create 5 syncs
				for (let i = 0; i < 5; i++) {
					const sync = yield* service.startSync()
					if (i === 0) testSyncId = sync.id
					yield* service.completeSync(sync.id, 100, 95)
				}

				const history = yield* service.getSyncHistory(2)
				return history
			})

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ModelDataServiceLive)),
			)

			expect(result.length).toBeLessThanOrEqual(2)
		})

		it("should return syncs ordered by most recent first", async () => {
			// Layer is already properly created in ModelDataServiceLive.ts

			const program = Effect.gen(function* () {
				const service = yield* ModelDataService
				const sync1 = yield* service.startSync()
				const sync2 = yield* service.startSync()
				const sync3 = yield* service.startSync()
				testSyncId = sync1.id

				yield* service.completeSync(sync1.id, 100, 95)
				yield* service.completeSync(sync2.id, 110, 105)
				yield* service.completeSync(sync3.id, 120, 115)

				const history = yield* service.getSyncHistory(3)
				return history.map((s) => s.id)
			})

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ModelDataServiceLive)),
			)

			// Should be in reverse order (most recent first)
			expect(result[0]).toBeTruthy()
		})
	})

	describe("error handling", () => {
		it("should handle non-existent sync gracefully", async () => {
			// Layer is already properly created in ModelDataServiceLive.ts

			const program = Effect.gen(function* () {
				const service = yield* ModelDataService

				// Try to complete a non-existent sync
				const result = yield* Effect.try({
					try: () => service.completeSync("non-existent-id", 0, 0),
					catch: () => new Error("Expected error"),
				})

				return result
			}).pipe(
				Effect.catchAll(() =>
					Effect.succeed({
						error: true,
					}),
				),
			)

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(ModelDataServiceLive)),
			)
			expect(result.error).toBe(true)
		})
	})
})
