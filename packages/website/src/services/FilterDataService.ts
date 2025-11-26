import { Context, Effect } from "effect"
import type { RuleClause } from "../db/schema"

/**
 * Filter response format for API endpoints
 */
export interface FilterResponse {
	id: string
	ownerId: string
	teamId: string | null
	name: string
	description: string | null
	visibility: "private" | "team" | "public"
	rules: RuleClause[]
	version: number
	createdAt: string
	updatedAt: string
	lastUsedAt: string | null
	usageCount: number
}

/**
 * Request to create a new filter
 */
export interface CreateFilterRequest {
	name: string
	description?: string
	visibility?: "private" | "team" | "public"
	teamId?: string
	ownerId?: string
	rules: RuleClause[]
}

/**
 * Request to update an existing filter
 */
export interface UpdateFilterRequest {
	name?: string
	description?: string
	visibility?: "private" | "team" | "public"
	teamId?: string
	rules?: RuleClause[]
}

/**
 * List options for querying filters
 */
export interface FilterListOptions {
	visibility?: "private" | "team" | "public" | "all"
	page?: number
	pageSize?: number
}

/**
 * Result of listing filters
 */
export interface FilterListResult {
	filters: FilterResponse[]
	total: number
	page: number
	pageSize: number
}

/**
 * FilterDataService provides CRUD operations for saved filters
 * Manages persistent storage and lifecycle of filter configurations
 */
export interface FilterDataService {
	/**
	 * List filters with optional filtering and pagination
	 * @param options - Filter list options (visibility, pagination)
	 * @returns List of filters and pagination metadata
	 */
	listFilters: (
		options: FilterListOptions
	) => Effect.Effect<FilterListResult, Error>

	/**
	 * Get a specific filter by ID
	 * @param id - Filter ID
	 * @returns Filter data or null if not found
	 */
	getFilterById: (id: string) => Effect.Effect<FilterResponse | null, Error>

	/**
	 * Create a new filter
	 * @param data - Filter creation data
	 * @returns Created filter with generated ID
	 */
	createFilter: (
		data: CreateFilterRequest
	) => Effect.Effect<FilterResponse, Error>

	/**
	 * Update an existing filter
	 * @param id - Filter ID
	 * @param data - Partial filter data to update
	 * @returns Updated filter or null if not found
	 */
	updateFilter: (
		id: string,
		data: UpdateFilterRequest
	) => Effect.Effect<FilterResponse | null, Error>

	/**
	 * Delete a filter
	 * @param id - Filter ID
	 * @returns true if deleted, false if not found
	 */
	deleteFilter: (id: string) => Effect.Effect<boolean, Error>

	/**
	 * Increment usage count and update last used timestamp
	 * @param id - Filter ID
	 */
	incrementUsage: (id: string) => Effect.Effect<void, Error>
}

/**
 * Context tag for FilterDataService dependency injection
 */
export const FilterDataService = Context.GenericTag<FilterDataService>(
	"@services/FilterDataService"
)
