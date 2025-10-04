import {
  pgTable,
  uuid,
  text,
  jsonb,
  integer,
  timestamp,
  bigint,
} from 'drizzle-orm/pg-core';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

// Re-export filter_runs schema
export * from './schema.filterRuns';

/**
 * Rule clause structure for saved filters.
 * Each clause targets a model field and defines a condition.
 */
export interface RuleClause {
  /** Field path in model (e.g., "inputCost", "provider") */
  field: string;
  /** Comparison operator */
  operator:
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'contains';
  /** Value to compare against */
  value: unknown;
  /** Hard (must pass) or soft (adds score weight) */
  type: 'hard' | 'soft';
  /** Weight for soft clauses (0-1 range recommended) */
  weight?: number;
}

/**
 * Saved filters table - stores user-defined filter configurations
 */
export const savedFilters = pgTable('saved_filters', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull(),
  teamId: uuid('team_id'),
  name: text('name').notNull(),
  description: text('description'),
  visibility: text('visibility').notNull().default('private'),
  rules: jsonb('rules').$type<RuleClause[]>().notNull(),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  usageCount: bigint('usage_count', { mode: 'number' })
    .notNull()
    .default(0),
});

// Inferred types for TypeScript
export type SavedFilterRow = InferSelectModel<typeof savedFilters>;
export type NewSavedFilter = InferInsertModel<typeof savedFilters>;
