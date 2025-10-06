#!/usr/bin/env bun
/**
 * Daily model data synchronization script
 *
 * This script fetches model data from the external API and stores it in the database.
 * It should be run daily to keep model data up to date.
 */

import { Effect, Layer } from "effect"
import { ArtificialAnalysisService } from "../../lib/services/ArtificialAnalysisService"
import { ArtificialAnalysisServiceLive } from "../../lib/services/ArtificialAnalysisServiceLive"
import { HuggingFaceService } from "../../lib/services/HuggingFaceService"
import { HuggingFaceServiceLive } from "../../lib/services/HuggingFaceServiceLive"
import { ModelDataService } from "../../lib/services/ModelDataService"
import { ModelDataServiceLive } from "../../lib/services/ModelDataServiceLive"
import { ModelServiceLive } from "../../lib/services/ModelServiceLive"
import { OpenRouterService } from "../../lib/services/OpenRouterService"
import { OpenRouterServiceLive } from "../../lib/services/OpenRouterServiceLive"
import { transformModelsDevResponse } from "../../lib/transformers/model-transformer"
import { closeDb, testConnection } from "../db"

/**
 * Main sync effect that fetches and stores model data from multiple sources
 */
const syncModelsEffect = Effect.gen(function* () {
	console.log("🚀 [Sync] Starting model data synchronization")

	// Test database connection first
	const dbConnected = yield* Effect.promise(() => testConnection())
	if (!dbConnected) {
		throw new Error("Database connection failed")
	}

	// Start sync operation
	const modelDataService = yield* ModelDataService
	const syncRecord = yield* modelDataService.startSync()
	const syncId = syncRecord.id

	console.log(`📝 [Sync] Created sync operation: ${syncId}`)

	try {
		// Fetch models from multiple sources in parallel
		console.log("🌐 [Sync] Fetching models from multiple sources")

		const [
			modelsDevModels,
			openRouterModels,
			huggingFaceModels,
			artificialAnalysisModels,
		] = yield* Effect.all(
			[
				// Fetch from models.dev
				Effect.tryPromise({
					try: () => fetch("https://models.dev/api.json"),
					catch: (error) => {
						throw new Error(
							`Failed to fetch from models.dev: ${
								error instanceof Error ? error.message : "Network error"
							}`,
						)
					},
				}).pipe(
					Effect.flatMap((dataUnknown: unknown) => {
						const allModels = transformModelsDevResponse(dataUnknown)
						console.log(
							`✅ [Sync] Fetched ${allModels.length} models from models.dev`,
						)
						return Effect.succeed(allModels)
					}),
				),

				// Fetch from OpenRouter
				Effect.gen(function* () {
					const { fetchModels } = yield* OpenRouterService
					const models = yield* fetchModels
					console.log(
						`✅ [Sync] Fetched ${models.length} models from OpenRouter`,
					)
					return models
				}),

				// Fetch from HuggingFace
				Effect.gen(function* () {
					const { fetchModels } = yield* HuggingFaceService
					const models = yield* fetchModels
					console.log(
						`✅ [Sync] Fetched ${models.length} models from HuggingFace`,
					)
					return models
				}),

				// Fetch from ArtificialAnalysis
				Effect.gen(function* () {
					const { fetchModels } = yield* ArtificialAnalysisService
					const models = yield* fetchModels
					console.log(
						`✅ [Sync] Fetched ${models.length} models from ArtificialAnalysis`,
					)
					return models
				}),
			],
			{ concurrency: 4 },
		)

		// Combine all models
		const allModels = [
			...modelsDevModels,
			...openRouterModels,
			...huggingFaceModels,
			...artificialAnalysisModels,
		]
		console.log(
			`🔄 [Sync] Total transformed models: ${allModels.length} (${modelsDevModels.length} from models.dev, ${openRouterModels.length} from OpenRouter, ${huggingFaceModels.length} from HuggingFace, ${artificialAnalysisModels.length} from ArtificialAnalysis)`,
		)

		// Store models in database with source tracking
		if (modelsDevModels.length > 0) {
			yield* modelDataService.storeModelBatch(
				modelsDevModels,
				syncId,
				"models.dev",
			)
		}
		if (openRouterModels.length > 0) {
			yield* modelDataService.storeModelBatch(
				openRouterModels,
				syncId,
				"openrouter",
			)
		}
		if (huggingFaceModels.length > 0) {
			yield* modelDataService.storeModelBatch(
				huggingFaceModels,
				syncId,
				"huggingface",
			)
		}
		if (artificialAnalysisModels.length > 0) {
			yield* modelDataService.storeModelBatch(
				artificialAnalysisModels,
				syncId,
				"artificialanalysis",
			)
		}

		// Complete sync operation
		yield* modelDataService.completeSync(
			syncId,
			allModels.length,
			allModels.length,
		)

		console.log(
			`✅ [Sync] Successfully completed sync ${syncId}: stored ${allModels.length} models (${modelsDevModels.length} from models.dev, ${openRouterModels.length} from OpenRouter, ${huggingFaceModels.length} from HuggingFace, ${artificialAnalysisModels.length} from ArtificialAnalysis)`,
		)

		return {
			syncId,
			modelsStored: allModels.length,
			modelsDevCount: modelsDevModels.length,
			openRouterCount: openRouterModels.length,
			huggingFaceCount: huggingFaceModels.length,
			artificialAnalysisCount: artificialAnalysisModels.length,
			success: true,
		}
	} catch (error) {
		// Mark sync as failed
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error"
		yield* modelDataService.failSync(syncId, errorMessage)

		console.error(`❌ [Sync] Sync operation ${syncId} failed:`, errorMessage)

		throw error
	}
})

/**
 * Main program effect
 */
const program = Effect.gen(function* () {
	const startTime = Date.now()

	try {
		const result = yield* syncModelsEffect

		const duration = Date.now() - startTime
		console.log(
			`🎉 [Sync] Model synchronization completed successfully in ${duration}ms`,
		)

		return result
	} catch (error) {
		const duration = Date.now() - startTime
		console.error(
			`💥 [Sync] Model synchronization failed after ${duration}ms:`,
			error,
		)

		// Re-throw to exit with error code
		throw error
	} finally {
		// Always close database connection
		yield* Effect.promise(() => closeDb())
	}
})

/**
 * Run the sync script
 */
const main = program.pipe(
	Effect.provide(
		Layer.mergeAll(
			ModelDataServiceLive,
			ModelServiceLive,
			OpenRouterServiceLive,
			HuggingFaceServiceLive,
			ArtificialAnalysisServiceLive,
		),
	),
	Effect.runPromise,
)

// Handle process signals for graceful shutdown
process.on("SIGINT", () => {
	console.log("\n⚠️ [Sync] Received SIGINT, shutting down gracefully...")
	closeDb().then(() => process.exit(0))
})

process.on("SIGTERM", () => {
	console.log("\n⚠️ [Sync] Received SIGTERM, shutting down gracefully...")
	closeDb().then(() => process.exit(0))
})

// Run the script
main
	.then((result) => {
		console.log("📊 [Sync] Final result:", result)
		process.exit(0)
	})
	.catch((error) => {
		console.error("💥 [Sync] Script failed:", error)
		process.exit(1)
	})
