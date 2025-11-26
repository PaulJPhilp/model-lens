import { bigint, integer, jsonb, pgTable, text, timestamp, uuid, } from "drizzle-orm/pg-core";
// Re-export schemas
export * from "./schema.filterRuns";
export * from "./schema.models";
/**
 * Saved filters table - stores user-defined filter configurations
 */
export const savedFilters = pgTable("saved_filters", {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    teamId: uuid("team_id"),
    name: text("name").notNull(),
    description: text("description"),
    visibility: text("visibility").notNull().default("private"),
    rules: jsonb("rules").$type().notNull(),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    usageCount: bigint("usage_count", { mode: "number" }).notNull().default(0),
});
