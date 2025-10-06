import { desc, eq, sql } from "drizzle-orm"
import { Context, Effect, Schedule } from "effect"
import { db } from "../../src/db"
import {
	type ModelDataStats,
	type ModelSyncRow,
	modelSnapshots,
	modelSyncs,
	type NewModelSnapshot,
} from "../../src/db/schema.models"
import type { Model } from "../types"

export interface ModelDataServiceType {
	/** Store a batch of models from a sync operation */
	storeModelBatch: (
		models: Model[],
		syncId: string,
		source?: string,
	) => Effect.Effect<void, Error, never>

	/** Start a new sync operation */
	startSync: () => Effect.Effect<ModelSyncRow, Error, never>

	/** Complete a sync operation */
	completeSync: (
		syncId: string,
		totalFetched: number,
		totalStored: number,
	) => Effect.Effect<void, Error, never>

	/** Mark a sync operation as failed */
	failSync: (
		syncId: string,
		errorMessage: string,
	) => Effect.Effect<void, Error, never>

	/** Get the latest models from the database */
	getLatestModels: () => Effect.Effect<Model[], Error, never>

	/** Get the latest models from a specific source */
	getLatestModelsBySource: (
		source: string,
	) => Effect.Effect<Model[], Error, never>

	/** Get model data statistics */
	getModelDataStats: () => Effect.Effect<ModelDataStats, Error, never>

	/** Get sync history */
	getSyncHistory: (
		limit?: number,
	) => Effect.Effect<ModelSyncRow[], Error, never>
}

export const ModelDataService =
	Context.GenericTag<ModelDataServiceType>("ModelDataService")

/**
 * Live implementation of ModelDataService
 */
export const ModelDataServiceLive = {
	storeModelBatch: (models: Model[], syncId: string, source = "models.dev") =>
		Effect.tryPromise({
			try: async () => {
				const snapshots: NewModelSnapshot[] = models.map((model) => ({
					syncId,
					source,
					modelData: model,
				}))

				await db.insert(modelSnapshots).values(snapshots)
				console.log(
					`✅ [ModelDataService] Stored ${snapshots.length} model snapshots for sync ${syncId} from ${source}`,
				)
			},
			catch: (error) => {
				console.error(
					`❌ [ModelDataService] Failed to store model batch for sync ${syncId}:`,
					error,
				)
				throw new Error(
					`Failed to store model batch: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				)
			},
		}).pipe(
			Effect.retry(
				Schedule.spaced(Number(process.env.DB_RETRY_MS ?? 1000)).pipe(
					Schedule.compose(Schedule.recurs(3)),
				),
			),
		),

	startSync: () =>
		Effect.tryPromise({
			try: async () => {
				const [sync] = await db.insert(modelSyncs).values({}).returning()

				if (!sync) {
					throw new Error("Failed to create sync record")
				}

				console.log(`🚀 [ModelDataService] Started sync operation: ${sync.id}`)
				return sync
			},
			catch: (error) => {
				console.error("❌ [ModelDataService] Failed to start sync:", error)
				throw new Error(
					`Failed to start sync: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				)
			},
		}),

	completeSync: (syncId: string, totalFetched: number, totalStored: number) =>
		Effect.tryPromise({
			try: async () => {
				const result = await db
					.update(modelSyncs)
					.set({
						status: "completed",
						completedAt: new Date(),
						totalFetched,
						totalStored,
					})
					.where(eq(modelSyncs.id, syncId))

				if (result.rowCount === 0) {
					throw new Error(`Sync operation ${syncId} not found`)
				}

				console.log(
					`✅ [ModelDataService] Completed sync ${syncId}: ${totalStored}/${totalFetched} models stored`,
				)
			},
			catch: (error) => {
				console.error(
					`❌ [ModelDataService] Failed to complete sync ${syncId}:`,
					error,
				)
				throw new Error(
					`Failed to complete sync: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				)
			},
		}),

	failSync: (syncId: string, errorMessage: string) =>
		Effect.tryPromise({
			try: async () => {
				const result = await db
					.update(modelSyncs)
					.set({
						status: "failed",
						completedAt: new Date(),
						errorMessage,
					})
					.where(eq(modelSyncs.id, syncId))

				if (result.rowCount === 0) {
					throw new Error(`Sync operation ${syncId} not found`)
				}

				console.log(
					`❌ [ModelDataService] Failed sync ${syncId}: ${errorMessage}`,
				)
			},
			catch: (error) => {
				console.error(
					`❌ [ModelDataService] Failed to mark sync ${syncId} as failed:`,
					error,
				)
				throw new Error(
					`Failed to mark sync as failed: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				)
			},
		}),

	getLatestModels: () =>
		Effect.tryPromise({
			try: async () => {
				// Get the most recent sync
				const [latestSync] = await db
					.select()
					.from(modelSyncs)
					.where(eq(modelSyncs.status, "completed"))
					.orderBy(desc(modelSyncs.completedAt))
					.limit(1)

				if (!latestSync) {
					console.log("ℹ️ [ModelDataService] No completed syncs found")
					return []
				}

				// Get all models from that sync
				const snapshots = await db
					.select()
					.from(modelSnapshots)
					.where(eq(modelSnapshots.syncId, latestSync.id))

				const models = snapshots.map((snapshot) => snapshot.modelData)
				console.log(
					`📊 [ModelDataService] Retrieved ${models.length} models from latest sync (${latestSync.id})`,
				)

				return models
			},
			catch: (error) => {
				console.error(
					"❌ [ModelDataService] Failed to get latest models:",
					error,
				)
				throw new Error(
					`Failed to get latest models: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				)
			},
		}),

	getLatestModelsBySource: (source: string) =>
		Effect.tryPromise({
			try: async () => {
				// Get the most recent sync for the specified source
				const [latestSync] = await db
					.select()
					.from(modelSyncs)
					.where(eq(modelSyncs.status, "completed"))
					.orderBy(desc(modelSyncs.completedAt))
					.limit(1)

				if (!latestSync) {
					console.log(
						`ℹ️ [ModelDataService] No completed syncs found for source: ${source}`,
					)
					return []
				}

				// Get all models from that sync for the specified source
				const snapshots = await db
					.select()
					.from(modelSnapshots)
					.where(
						sql`${modelSnapshots.syncId} = ${latestSync.id} AND ${modelSnapshots.source} = ${source}`,
					)

				const models = snapshots.map((snapshot) => snapshot.modelData)
				console.log(
					`📊 [ModelDataService] Retrieved ${models.length} models from latest sync (${latestSync.id}) for source ${source}`,
				)

				return models
			},
			catch: (error) => {
				console.error(
					`❌ [ModelDataService] Failed to get latest models for source ${source}:`,
					error,
				)
				throw new Error(
					`Failed to get latest models for source ${source}: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				)
			},
		}),

	getModelDataStats: () =>
		Effect.tryPromise({
			try: async () => {
				// Get latest sync info
				const [latestSync] = await db
					.select()
					.from(modelSyncs)
					.where(eq(modelSyncs.status, "completed"))
					.orderBy(desc(modelSyncs.completedAt))
					.limit(1)

				// Get total models and provider breakdown
				const statsResult = await db
					.select({
						totalModels: sql<number>`count(*)`,
						provider: sql<string>`model_data->>'provider'`,
					})
					.from(modelSnapshots)
					.where(
						latestSync ? eq(modelSnapshots.syncId, latestSync.id) : sql`true`, // If no syncs, get all (should be empty)
					)
					.groupBy(sql`model_data->>'provider'`)

				const totalModels = statsResult.reduce(
					(sum, row) => sum + row.totalModels,
					0,
				)
				const providers = statsResult.map((row) => row.provider)
				const modelCountByProvider = statsResult.reduce(
					(acc, row) => {
						acc[row.provider] = row.totalModels
						return acc
					},
					{} as Record<string, number>,
				)

				const stats: ModelDataStats = {
					totalModels,
					providers,
					lastSyncAt: latestSync?.completedAt?.toISOString(),
					modelCountByProvider,
				}

				console.log(
					`📊 [ModelDataService] Model data stats: ${totalModels} models from ${providers.length} providers`,
				)

				return stats
			},
			catch: (error) => {
				console.error(
					"❌ [ModelDataService] Failed to get model data stats:",
					error,
				)
				throw new Error(
					`Failed to get model data stats: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				)
			},
		}),

	getSyncHistory: (limit = 10) =>
		Effect.tryPromise({
			try: async () => {
				const syncs = await db
					.select()
					.from(modelSyncs)
					.orderBy(desc(modelSyncs.startedAt))
					.limit(limit)

				console.log(
					`📊 [ModelDataService] Retrieved ${syncs.length} sync operations from history`,
				)

				return syncs
			},
			catch: (error) => {
				console.error(
					"❌ [ModelDataService] Failed to get sync history:",
					error,
				)
				throw new Error(
					`Failed to get sync history: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				)
			},
		}),
}
