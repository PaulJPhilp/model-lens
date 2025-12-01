/**
 * Drizzle ORM schema for models table
 *
 * This table stores historical model data fetched from external APIs.
 * Each sync creates a new snapshot with current model information.
 */

import type { InferInsertModel, InferSelectModel } from "drizzle-orm"
import {
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core"
import type { Model } from "../../lib/types"

/**
 * Models snapshot table - stores complete model data at sync time
 */
export const modelSnapshots = pgTable(
	"model_snapshots",
	{
		// Identity
		id: uuid("id").primaryKey().defaultRandom(),

		// Sync metadata
		syncId: uuid("sync_id").notNull(), // Groups models from the same sync operation
		syncedAt: timestamp("synced_at", { withTimezone: true })
			.notNull()
			.defaultNow(),

		// Data source
		source: text("source").notNull().default("models.dev"), // 'models.dev' or 'openrouter'

		// Model data (stored as JSONB for flexibility)
		modelData: jsonb("model_data").$type<Model>().notNull(),

		// Indexing
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	// Indexes for performance
	(table) => ({
		// Query by sync operation
		syncIdIdx: index("idx_model_snapshots_sync_id").on(table.syncId),

		// Sort/filter by sync time
		syncedAtIdx: index("idx_model_snapshots_synced_at").on(table.syncedAt),

		// Filter by data source
		sourceIdx: index("idx_model_snapshots_source").on(table.source),

		// Composite index for common queries: sync + source
		syncSourceIdx: index("idx_model_snapshots_sync_source").on(
			table.syncId,
			table.source,
		),

		// Composite index for time-based lookups
		createdAtIdx: index("idx_model_snapshots_created_at").on(table.createdAt),
	}),
)

// Index names for reference in queries
export const modelSnapshotsIndexes = {
	syncId: "idx_model_snapshots_sync_id",
	syncedAt: "idx_model_snapshots_synced_at",
	source: "idx_model_snapshots_source",
	syncSource: "idx_model_snapshots_sync_source",
	createdAt: "idx_model_snapshots_created_at",
}

/**
 * Sync operations table - tracks sync runs and their status
 */
export const modelSyncs = pgTable(
	"model_syncs",
	{
		// Identity
		id: uuid("id").primaryKey().defaultRandom(),

		// Sync metadata
		startedAt: timestamp("started_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		status: text("status").notNull().default("running"), // 'running', 'completed', 'failed'

		// Results
		totalFetched: integer("total_fetched"),
		totalStored: integer("total_stored"),
		errorMessage: text("error_message"),

		// Indexing
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	// Indexes for performance
	(table) => ({
		// Query by sync status
		statusIdx: index("idx_model_syncs_status").on(table.status),

		// Sort/filter by start time
		startedAtIdx: index("idx_model_syncs_started_at").on(table.startedAt),

		// Sort/filter by completion time
		completedAtIdx: index("idx_model_syncs_completed_at").on(table.completedAt),

		// Composite index for finding recent completed syncs
		statusCompletedIdx: index("idx_model_syncs_status_completed").on(
			table.status,
			table.completedAt,
		),

		// Composite index for recent syncs across time range
		startedCreatedIdx: index("idx_model_syncs_started_created").on(
			table.startedAt,
			table.createdAt,
		),
	}),
)

/**
 * Inferred types for TypeScript
 */

/** Full model snapshot row (from SELECT) */
export type ModelSnapshotRow = InferSelectModel<typeof modelSnapshots>

/** New model snapshot data (for INSERT) */
export type NewModelSnapshot = InferInsertModel<typeof modelSnapshots>

/** Full sync operation row (from SELECT) */
export type ModelSyncRow = InferSelectModel<typeof modelSyncs>

/** New sync operation data (for INSERT) */
export type NewModelSync = InferInsertModel<typeof modelSyncs>

/**
 * Helper types for API and service operations
 */

export interface ModelSyncOperation {
	id: string
	startedAt: string
	completedAt?: string
	status: "running" | "completed" | "failed"
	totalFetched?: number
	totalStored?: number
	errorMessage?: string
}

export interface ModelSnapshotWithData extends ModelSnapshotRow {
	modelData: Model
}

export interface ModelDataStats {
	totalModels: number
	providers: string[]
	lastSyncAt?: string
	modelCountByProvider: Record<string, number>
}
