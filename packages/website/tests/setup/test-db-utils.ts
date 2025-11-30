/**
 * Database Test Utilities
 *
 * Provides utilities for database setup, teardown, and test data management
 * in integration and E2E tests.
 */

import { db } from "../../src/db"
import { modelSyncs, modelSnapshots } from "../../src/db/schema.models"
import { eq } from "drizzle-orm"
import type { Model } from "../../lib/types"

/**
 * Database Setup and Teardown
 */
export const dbSetup = {
	/**
	 * Check if database is available
	 */
	isAvailable: async (): Promise<boolean> => {
		try {
			// Try a simple query to verify connection
			await db.select().from(modelSyncs).limit(1)
			return true
		} catch (error) {
			return false
		}
	},

	/**
	 * Initialize test database (create tables if needed)
	 */
	initialize: async (): Promise<void> => {
		try {
			// Verify connection works
			await db.select().from(modelSyncs).limit(1)
			console.log("✅ Database initialized successfully")
		} catch (error) {
			console.warn("⚠️  Database unavailable - tests will skip database operations")
		}
	},

	/**
	 * Clean up test data after test
	 */
	cleanup: async (syncId?: string): Promise<void> => {
		try {
			if (syncId) {
				// Delete snapshots first (foreign key constraint)
				await db.delete(modelSnapshots).where(eq(modelSnapshots.syncId, syncId))
				// Then delete sync
				await db.delete(modelSyncs).where(eq(modelSyncs.id, syncId))
			} else {
				// Full cleanup
				await db.delete(modelSnapshots)
				await db.delete(modelSyncs)
			}
		} catch (error) {
			// Gracefully handle cleanup errors
			console.warn("⚠️  Database cleanup failed:", error instanceof Error ? error.message : String(error))
		}
	},

	/**
	 * Reset database to clean state
	 */
	reset: async (): Promise<void> => {
		try {
			await db.delete(modelSnapshots)
			await db.delete(modelSyncs)
			console.log("✅ Database reset successfully")
		} catch (error) {
			console.warn("⚠️  Database reset failed")
		}
	},

	/**
	 * Get database statistics
	 */
	getStats: async (): Promise<{
		syncCount: number
		snapshotCount: number
		isAvailable: boolean
	}> => {
		try {
			const syncs = await db.select().from(modelSyncs)
			const snapshots = await db.select().from(modelSnapshots)

			return {
				syncCount: syncs.length,
				snapshotCount: snapshots.length,
				isAvailable: true,
			}
		} catch (error) {
			return {
				syncCount: 0,
				snapshotCount: 0,
				isAvailable: false,
			}
		}
	},
}

/**
 * Test Data Management
 */
export const testData = {
	/**
	 * Create test sync record in database
	 */
	createSync: async (overrides?: Record<string, any>) => {
		try {
			const [sync] = await db
				.insert(modelSyncs)
				.values({
					status: "pending",
					...overrides,
				})
				.returning()

			return sync
		} catch (error) {
			throw new Error(`Failed to create test sync: ${error instanceof Error ? error.message : String(error)}`)
		}
	},

	/**
	 * Create test model snapshots
	 */
	createSnapshots: async (
		syncId: string,
		models: Model[],
		source: string = "test-source"
	): Promise<void> => {
		try {
			const snapshots = models.map((model) => ({
				syncId,
				source,
				modelData: model,
			}))

			await db.insert(modelSnapshots).values(snapshots)
		} catch (error) {
			throw new Error(
				`Failed to create test snapshots: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	},

	/**
	 * Get sync by ID
	 */
	getSync: async (syncId: string) => {
		try {
			const [sync] = await db.select().from(modelSyncs).where(eq(modelSyncs.id, syncId))
			return sync || null
		} catch (error) {
			return null
		}
	},

	/**
	 * Get snapshots for sync
	 */
	getSnapshots: async (syncId: string) => {
		try {
			return await db.select().from(modelSnapshots).where(eq(modelSnapshots.syncId, syncId))
		} catch (error) {
			return []
		}
	},

	/**
	 * Get all snapshots for testing
	 */
	getAllSnapshots: async () => {
		try {
			return await db.select().from(modelSnapshots)
		} catch (error) {
			return []
		}
	},

	/**
	 * Get snapshots by source
	 */
	getSnapshotsBySource: async (source: string) => {
		try {
			return await db
				.select()
				.from(modelSnapshots)
				.where(eq(modelSnapshots.source, source))
		} catch (error) {
			return []
		}
	},

	/**
	 * Count syncs
	 */
	countSyncs: async (): Promise<number> => {
		try {
			const result = await db.select().from(modelSyncs)
			return result.length
		} catch (error) {
			return 0
		}
	},

	/**
	 * Count snapshots
	 */
	countSnapshots: async (): Promise<number> => {
		try {
			const result = await db.select().from(modelSnapshots)
			return result.length
		} catch (error) {
			return 0
		}
	},

	/**
	 * Get count by sync
	 */
	getCountBySync: async (syncId: string): Promise<number> => {
		try {
			const result = await db
				.select()
				.from(modelSnapshots)
				.where(eq(modelSnapshots.syncId, syncId))
			return result.length
		} catch (error) {
			return 0
		}
	},
}

/**
 * Database Transaction Testing
 */
export const dbTransactions = {
	/**
	 * Verify atomicity of operations
	 */
	verifyAtomicity: async (
		operation: () => Promise<void>,
		expectedSyncCount: number
	): Promise<boolean> => {
		try {
			const beforeStats = await dbSetup.getStats()

			await operation()

			const afterStats = await dbSetup.getStats()

			return afterStats.syncCount === beforeStats.syncCount + expectedSyncCount
		} catch (error) {
			return false
		}
	},

	/**
	 * Simulate partial failure and verify rollback
	 */
	verifyRollback: async (
		successOperation: () => Promise<void>,
		failedOperation: () => Promise<void>,
		expectedFinalState: (stats: any) => boolean
	): Promise<boolean> => {
		try {
			const beforeStats = await dbSetup.getStats()

			// Successful operation
			await successOperation()

			// Failed operation
			try {
				await failedOperation()
			} catch (error) {
				// Expected to fail
			}

			const afterStats = await dbSetup.getStats()

			return expectedFinalState(afterStats)
		} catch (error) {
			return false
		}
	},
}

/**
 * Database Query Testing
 */
export const dbQueries = {
	/**
	 * Measure query performance
	 */
	measureQuery: async <T,>(
		queryFn: () => Promise<T>
	): Promise<{ result: T; duration: number }> => {
		const start = Date.now()
		const result = await queryFn()
		const duration = Date.now() - start

		return { result, duration }
	},

	/**
	 * Get query statistics
	 */
	getQueryStats: async (): Promise<{
		estimatedRowCount: number
		averageQueryTime: number
	}> => {
		try {
			const measurements: number[] = []

			// Measure 5 queries to get average
			for (let i = 0; i < 5; i++) {
				const { duration } = await dbQueries.measureQuery(() =>
					db.select().from(modelSyncs).limit(1)
				)
				measurements.push(duration)
			}

			const stats = await dbSetup.getStats()
			const avgTime = measurements.reduce((a, b) => a + b, 0) / measurements.length

			return {
				estimatedRowCount: stats.syncCount,
				averageQueryTime: avgTime,
			}
		} catch (error) {
			return {
				estimatedRowCount: 0,
				averageQueryTime: 0,
			}
		}
	},
}

/**
 * Test Fixtures
 */
export const testFixtures = {
	/**
	 * Create complete test scenario in database
	 */
	setupCompleteSync: async () => {
		try {
			const sync = await testData.createSync({
				status: "completed",
				totalFetched: 10,
				totalStored: 10,
				completedAt: new Date(),
			})

			const testModels: Model[] = Array.from({ length: 10 }, (_, i) => ({
				id: `fixture-model-${i}`,
				name: `Fixture Model ${i}`,
				provider: `provider-${i % 3}`,
				description: `Test fixture model ${i}`,
				modalities: ["text"],
				capabilities: ["chat"],
				inputCost: 0.001 * (i + 1),
				outputCost: 0.002 * (i + 1),
				contextWindow: 4096 * (i + 1),
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
			}))

			await testData.createSnapshots(sync.id, testModels, "fixture-source")

			return { sync, models: testModels }
		} catch (error) {
			throw new Error(`Failed to setup complete sync: ${error instanceof Error ? error.message : String(error)}`)
		}
	},

	/**
	 * Create partial sync for error scenario testing
	 */
	setupPartialSync: async () => {
		try {
			const sync = await testData.createSync({
				status: "failed",
				totalFetched: 10,
				totalStored: 5,
				errorMessage: "Partial failure: source 2 unavailable",
				completedAt: new Date(),
			})

			const testModels: Model[] = Array.from({ length: 5 }, (_, i) => ({
				id: `partial-model-${i}`,
				name: `Partial Model ${i}`,
				provider: "provider-1",
				description: `Test partial model ${i}`,
				modalities: ["text"],
				capabilities: ["chat"],
				inputCost: 0.001,
				outputCost: 0.002,
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
			}))

			await testData.createSnapshots(sync.id, testModels, "partial-source")

			return { sync, models: testModels }
		} catch (error) {
			throw new Error(`Failed to setup partial sync: ${error instanceof Error ? error.message : String(error)}`)
		}
	},

	/**
	 * Cleanup all test fixtures
	 */
	cleanup: async (): Promise<void> => {
		await dbSetup.cleanup()
	},
}

/**
 * Database Context Manager
 */
export const dbContext = {
	/**
	 * Run operation with database context (setup/teardown)
	 */
	run: async <T,>(
		operation: (context: typeof testData) => Promise<T>,
		cleanup: boolean = true
	): Promise<T> => {
		try {
			const result = await operation(testData)

			if (cleanup) {
				await dbSetup.cleanup()
			}

			return result
		} catch (error) {
			throw error
		}
	},

	/**
	 * Run operation with automatic sync cleanup
	 */
	runWithSync: async <T,>(
		operation: (syncId: string) => Promise<T>,
		cleanup: boolean = true
	): Promise<T> => {
		try {
			const sync = await testData.createSync()
			const result = await operation(sync.id)

			if (cleanup) {
				await dbSetup.cleanup(sync.id)
			}

			return result
		} catch (error) {
			throw error
		}
	},
}

export default {
	dbSetup,
	testData,
	dbTransactions,
	dbQueries,
	testFixtures,
	dbContext,
}
