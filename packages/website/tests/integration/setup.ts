import { sql } from "drizzle-orm"
import { afterAll, beforeAll } from "vitest"
import { db } from "../../src/db"
import { filterRuns, savedFilters } from "../../src/db/schema"

/**
 * Integration test setup utilities
 * Provides test database management and cleanup
 */

export const testUserId = "test-user-123"
export const testTeamId = "test-team-456"
export const testAdminId = "test-admin-789"

/**
 * Clean up test data from database
 */
export async function cleanupTestData() {
	await db.delete(filterRuns)
	await db.delete(savedFilters)
}

/**
 * Setup test database before all tests
 */
beforeAll(async () => {
	// Ensure database is accessible
	await db.execute(sql`SELECT 1`)
	await cleanupTestData()
})

/**
 * Cleanup after all tests
 */
afterAll(async () => {
	await cleanupTestData()
})

/**
 * Create a test filter in the database
 */
export async function createTestFilter(overrides: any = {}) {
	const [filter] = await db
		.insert(savedFilters)
		.values({
			ownerId: testUserId,
			teamId: null,
			name: "Test Filter",
			description: "Test Description",
			visibility: "private",
			rules: [
				{
					field: "provider",
					operator: "eq",
					value: "OpenAI",
					type: "hard",
				},
			],
			...overrides,
		})
		.returning()

	return filter
}

/**
 * Create a test filter run in the database
 */
export async function createTestFilterRun(filterId: string, overrides: any = {}) {
	const [run] = await db
		.insert(filterRuns)
		.values({
			filterId,
			executedBy: testUserId,
			filterSnapshot: {
				id: filterId,
				name: "Test Filter",
				description: null,
				visibility: "private",
				rules: [],
				version: 1,
			},
			totalEvaluated: 100,
			matchCount: 25,
			results: [],
			...overrides,
		})
		.returning()

	return run
}

/**
 * Create mock request headers for authentication
 */
export function createAuthHeaders(options: {
	userId?: string
	teamId?: string | null
	isAdmin?: boolean
} = {}) {
	const headers: Record<string, string> = {
		"x-user-id": options.userId || testUserId,
	}

	if (options.teamId) {
		headers["x-team-id"] = options.teamId
	}

	if (options.isAdmin) {
		headers["x-admin"] = "true"
	}

	return headers
}
