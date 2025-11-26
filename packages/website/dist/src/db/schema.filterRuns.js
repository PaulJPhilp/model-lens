/**
 * Drizzle ORM schema for filter_runs table
 *
 * This table stores historical filter evaluation runs for:
 * - Run history tracking
 * - Analytics and reporting
 * - Debugging and auditing
 * - Reproducibility
 */
import { integer, jsonb, pgTable, text, timestamp, uuid, } from "drizzle-orm/pg-core";
/**
 * filter_runs table schema
 */
export const filterRuns = pgTable("filter_runs", {
    // Identity
    id: uuid("id").primaryKey().defaultRandom(),
    filterId: uuid("filter_id").notNull(),
    // Execution metadata
    executedBy: uuid("executed_by").notNull(),
    executedAt: timestamp("executed_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    durationMs: integer("duration_ms"),
    // Filter snapshot (denormalized for history)
    filterSnapshot: jsonb("filter_snapshot").$type().notNull(),
    // Input parameters
    modelList: jsonb("model_list").$type(), // Optional, can be large
    limitUsed: integer("limit_used"),
    modelIdsFilter: text("model_ids_filter").array(), // Array of modelIds if filtering
    // Results
    totalEvaluated: integer("total_evaluated").notNull(),
    matchCount: integer("match_count").notNull(),
    results: jsonb("results").$type().notNull(),
    // Artifacts (external storage references)
    artifacts: jsonb("artifacts").$type(),
    // Indexing
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
