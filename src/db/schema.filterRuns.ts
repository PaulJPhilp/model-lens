/**
 * Drizzle ORM schema for filter_runs table
 *
 * This table stores historical filter evaluation runs for:
 * - Run history tracking
 * - Analytics and reporting
 * - Debugging and auditing
 * - Reproducibility
 */

import type { InferInsertModel, InferSelectModel } from "drizzle-orm"
import {
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core"

/**
 * Type definitions for JSONB columns
 */

/** Compact model representation in model_list */
export interface CompactModel {
	modelId: string
	name: string
	vendor?: string
	cost_per_1k_tokens?: number
	context_window?: number
	[key: string]: unknown // Allow additional fields
}

/** Per-model evaluation result */
export interface ModelRunResult {
	modelId: string
	modelName: string
	matchedAllHard: boolean
	score: number // 0-1
	clauseResults?: Array<{
		field: string
		matched: boolean
		reason: string
	}>
	outputPreview?: string // Optional sample output
	latencyMs?: number
	tokensEstimate?: number
	costEstimate?: number
}

/** Filter snapshot at execution time */
export interface FilterSnapshot {
	id: string
	name: string
	description: string | null
	visibility: string
	rules: unknown[] // RuleClause[] but keeping generic for flexibility
	version: number
}

/** Artifacts for external storage references */
export interface RunArtifacts {
	fullResults?: string // e.g., "s3://bucket/runs/uuid/results.json"
	modelList?: string // e.g., "s3://bucket/runs/uuid/models.json"
	logs?: string
	[key: string]: string | undefined
}

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
	filterSnapshot: jsonb("filter_snapshot").$type<FilterSnapshot>().notNull(),

	// Input parameters
	modelList: jsonb("model_list").$type<CompactModel[]>(), // Optional, can be large
	limitUsed: integer("limit_used"),
	modelIdsFilter: text("model_ids_filter").array(), // Array of modelIds if filtering

	// Results
	totalEvaluated: integer("total_evaluated").notNull(),
	matchCount: integer("match_count").notNull(),
	results: jsonb("results").$type<ModelRunResult[]>().notNull(),

	// Artifacts (external storage references)
	artifacts: jsonb("artifacts").$type<RunArtifacts>(),

	// Indexing
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
})

/**
 * Inferred types for TypeScript
 */

/** Full filter run row (from SELECT) */
export type FilterRunRow = InferSelectModel<typeof filterRuns>

/** New filter run data (for INSERT) */
export type NewFilterRun = InferInsertModel<typeof filterRuns>

/**
 * Helper type for creating a run (with defaults)
 */
export interface CreateFilterRunInput {
	filterId: string
	executedBy: string
	filterSnapshot: FilterSnapshot
	totalEvaluated: number
	matchCount: number
	results: ModelRunResult[]
	durationMs?: number
	modelList?: CompactModel[]
	limitUsed?: number
	modelIdsFilter?: string[]
	artifacts?: RunArtifacts
}

/**
 * Helper type for API responses
 */
export interface FilterRunResponse {
	id: string
	filterId: string
	executedBy: string
	executedAt: string // ISO timestamp
	durationMs: number | null
	filterSnapshot: FilterSnapshot
	totalEvaluated: number
	matchCount: number
	results: ModelRunResult[]
	limitUsed: number | null
	modelIdsFilter: string[] | null
	artifacts: RunArtifacts | null
	createdAt: string // ISO timestamp
}

/**
 * Helper type for run list response
 */
export interface FilterRunsListResponse {
	runs: FilterRunResponse[]
	total: number
	page: number
	pageSize: number
}
