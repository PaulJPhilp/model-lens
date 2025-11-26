import { Effect, Layer } from "effect";
import { and, eq } from "drizzle-orm";
import { db } from "@db/index";
import { savedFilters } from "@db/schema";
import { FilterDataService, } from "./FilterDataService";
/**
 * Helper function to transform database row to FilterResponse
 */
function toFilterResponse(row) {
    return {
        id: row.id,
        ownerId: row.ownerId,
        teamId: row.teamId || null,
        name: row.name,
        description: row.description || null,
        visibility: row.visibility,
        rules: Array.isArray(row.rules) ? row.rules : [],
        version: row.version,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
        usageCount: Number(row.usageCount),
    };
}
/**
 * Live implementation of FilterDataService using Drizzle ORM
 */
export const FilterDataServiceLive = Layer.succeed(FilterDataService, FilterDataService.of({
    listFilters: (options) => Effect.tryPromise({
        try: async () => {
            const { visibility = "all", page = 1, pageSize = 20 } = options;
            // Validate pagination
            const safePageSize = Math.min(Math.max(pageSize, 1), 100);
            const safePage = Math.max(page, 1);
            const offset = (safePage - 1) * safePageSize;
            // Build query conditions
            const conditions = [];
            if (visibility && visibility !== "all") {
                conditions.push(eq(savedFilters.visibility, visibility));
            }
            // Execute query
            const filters = await db
                .select()
                .from(savedFilters)
                .where(conditions.length > 0
                ? and(...conditions)
                : undefined)
                .orderBy(savedFilters.createdAt)
                .limit(safePageSize)
                .offset(offset);
            return {
                filters: filters.map(toFilterResponse),
                total: filters.length,
                page: safePage,
                pageSize: safePageSize,
            };
        },
        catch: (error) => new Error(`Failed to list filters: ${error instanceof Error ? error.message : String(error)}`),
    }),
    getFilterById: (id) => Effect.tryPromise({
        try: async () => {
            const [filter] = await db
                .select()
                .from(savedFilters)
                .where(eq(savedFilters.id, id))
                .limit(1);
            return filter ? toFilterResponse(filter) : null;
        },
        catch: (error) => new Error(`Failed to get filter ${id}: ${error instanceof Error ? error.message : String(error)}`),
    }),
    createFilter: (data) => Effect.tryPromise({
        try: async () => {
            const [filter] = await db
                .insert(savedFilters)
                .values({
                ownerId: data.ownerId || "system",
                teamId: data.teamId || null,
                name: data.name,
                description: data.description || null,
                visibility: data.visibility || "private",
                rules: data.rules,
            })
                .returning();
            if (!filter) {
                throw new Error("Failed to retrieve created filter");
            }
            return toFilterResponse(filter);
        },
        catch: (error) => new Error(`Failed to create filter: ${error instanceof Error ? error.message : String(error)}`),
    }),
    updateFilter: (id, data) => Effect.tryPromise({
        try: async () => {
            // Build update object with only provided fields
            const updateData = {};
            if (data.name !== undefined)
                updateData.name = data.name;
            if (data.description !== undefined)
                updateData.description = data.description;
            if (data.visibility !== undefined)
                updateData.visibility = data.visibility;
            if (data.teamId !== undefined)
                updateData.teamId = data.teamId;
            if (data.rules !== undefined)
                updateData.rules = data.rules;
            // Always update the updatedAt timestamp
            updateData.updatedAt = new Date();
            if (Object.keys(updateData).length === 0) {
                // No updates requested, fetch and return current filter
                const [filter] = await db
                    .select()
                    .from(savedFilters)
                    .where(eq(savedFilters.id, id))
                    .limit(1);
                return filter ? toFilterResponse(filter) : null;
            }
            const [filter] = await db
                .update(savedFilters)
                .set(updateData)
                .where(eq(savedFilters.id, id))
                .returning();
            return filter ? toFilterResponse(filter) : null;
        },
        catch: (error) => new Error(`Failed to update filter ${id}: ${error instanceof Error ? error.message : String(error)}`),
    }),
    deleteFilter: (id) => Effect.tryPromise({
        try: async () => {
            const result = await db
                .delete(savedFilters)
                .where(eq(savedFilters.id, id));
            // Drizzle returns an object with rowCount on successful delete
            return result.rowCount ? true : false;
        },
        catch: (error) => new Error(`Failed to delete filter ${id}: ${error instanceof Error ? error.message : String(error)}`),
    }),
    incrementUsage: (id) => Effect.tryPromise({
        try: async () => {
            await db
                .update(savedFilters)
                .set({
                lastUsedAt: new Date(),
                usageCount: savedFilters.usageCount + 1,
            })
                .where(eq(savedFilters.id, id));
        },
        catch: (error) => new Error(`Failed to increment usage for filter ${id}: ${error instanceof Error ? error.message : String(error)}`),
    }),
}));
