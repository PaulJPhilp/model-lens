/**
 * Drizzle ORM schema for models table
 *
 * This table stores historical model data fetched from external APIs.
 * Each sync creates a new snapshot with current model information.
 */
import { integer, jsonb, pgTable, text, timestamp, uuid, } from "drizzle-orm/pg-core";
/**
 * Models snapshot table - stores complete model data at sync time
 */
export const modelSnapshots = pgTable("model_snapshots", {
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
    modelData: jsonb("model_data").$type().notNull(),
    // Indexing
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
// Add indexes for common queries
export const modelSnapshotsIndexes = {
    syncId: "idx_model_snapshots_sync_id",
    syncedAt: "idx_model_snapshots_synced_at",
    source: "idx_model_snapshots_source",
    modelId: "idx_model_snapshots_model_id", // Functional index on modelData->>'id'
    provider: "idx_model_snapshots_provider", // Functional index on modelData->>'provider'
};
/**
 * Sync operations table - tracks sync runs and their status
 */
export const modelSyncs = pgTable("model_syncs", {
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
});
