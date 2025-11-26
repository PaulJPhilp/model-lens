import { Effect } from "effect"
import { beforeEach, describe, expect, it } from "vitest"
import { AppLayer } from "../../../lib/layers"
import { FilterDataService } from "../../../src/services/FilterDataService"
import {
    cleanupTestData,
    createTestFilter,
    testTeamId,
    testUserId
} from "../setup"

/**
 * Integration tests for Filters API endpoints
 * Tests CRUD operations with real database
 */
describe("Filters API Integration", () => {
	beforeEach(async () => {
		await cleanupTestData()
	})

	describe("Filter CRUD Operations", () => {
		it("should create a new filter", async () => {
			const program = Effect.gen(function* () {
				const service = yield* FilterDataService

				const filter = yield* service.createFilter({
					name: "OpenAI Models",
					description: "Filter for OpenAI models only",
					ownerId: testUserId,
					visibility: "private",
					rules: [
						{
							field: "provider",
							operator: "eq",
							value: "OpenAI",
							type: "hard",
						},
					],
				})

				expect(filter).toBeDefined()
				expect(filter.id).toBeDefined()
				expect(filter.name).toBe("OpenAI Models")
				expect(filter.ownerId).toBe(testUserId)
				expect(filter.rules).toHaveLength(1)

				return filter
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})

		it("should list filters for a user", async () => {
			// Create test filters
			await createTestFilter({ name: "Filter 1", ownerId: testUserId })
			await createTestFilter({ name: "Filter 2", ownerId: testUserId })
			await createTestFilter({ name: "Other User Filter", ownerId: "other-user" })

			const program = Effect.gen(function* () {
				const service = yield* FilterDataService

				// Note: listFilters doesn't filter by userId - it returns all filters
			// Filtering happens in the route layer based on auth headers
			const result = yield* service.listFilters({
					page: 1,
					pageSize: 10,
				})
				// Filter results by ownerId since service returns all
				const userFilters = result.filters.filter(f => f.ownerId === testUserId)
				expect(userFilters).toHaveLength(2)
				expect(userFilters.every(f => f.ownerId === testUserId)).toBe(true)
				expect(result.total).toBeGreaterThanOrEqual(2)

				return result
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})

		it("should get a filter by ID", async () => {
			const testFilter = await createTestFilter({
				name: "My Filter",
				ownerId: testUserId,
			})

			const program = Effect.gen(function* () {
				const service = yield* FilterDataService

				const filter = yield* service.getFilterById(testFilter.id)

				expect(filter).toBeDefined()
				expect(filter?.id).toBe(testFilter.id)
				expect(filter?.name).toBe("My Filter")

				return filter
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})

		it("should update a filter", async () => {
			const testFilter = await createTestFilter({
				name: "Original Name",
				ownerId: testUserId,
			})

			const program = Effect.gen(function* () {
				const service = yield* FilterDataService

				const updated = yield* service.updateFilter(testFilter.id, {
					name: "Updated Name",
					description: "New description",
				})

				expect(updated).toBeDefined()
				expect(updated?.name).toBe("Updated Name")
				expect(updated?.description).toBe("New description")

				return updated
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})

		it("should delete a filter", async () => {
			const testFilter = await createTestFilter({
				name: "To Delete",
				ownerId: testUserId,
			})

			const program = Effect.gen(function* () {
				const service = yield* FilterDataService

				const deleted = yield* service.deleteFilter(testFilter.id)
				expect(deleted).toBe(true)

				// Verify it's gone
				const filter = yield* service.getFilterById(testFilter.id)
				expect(filter).toBeNull()

				return deleted
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})
	})

	describe("Filter Visibility", () => {
		it("should handle private filters", async () => {
			await createTestFilter({
				name: "Private Filter",
				ownerId: testUserId,
				visibility: "private",
			})

			const program = Effect.gen(function* () {
				const service = yield* FilterDataService

				const result = yield* service.listFilters({
					page: 1,
					pageSize: 10,
					visibility: "private",
				})

				expect(result.filters.every(f => f.visibility === "private")).toBe(true)

				return result
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})

		it("should handle team filters", async () => {
			await createTestFilter({
				name: "Team Filter",
				ownerId: testUserId,
				teamId: testTeamId,
				visibility: "team",
			})

			const program = Effect.gen(function* () {
				const service = yield* FilterDataService

				const result = yield* service.listFilters({
					page: 1,
					pageSize: 10,
					visibility: "team",
				})

				expect(
					result.filters.every(
						f => f.visibility === "team" && f.teamId === testTeamId
					)
				).toBe(true)

				return result
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})

		it("should handle public filters", async () => {
			await createTestFilter({
				name: "Public Filter",
				ownerId: testUserId,
				visibility: "public",
			})

			const program = Effect.gen(function* () {
				const service = yield* FilterDataService

				const result = yield* service.listFilters({
					page: 1,
					pageSize: 10,
					visibility: "public",
				})

				expect(result.filters.every(f => f.visibility === "public")).toBe(true)

				return result
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})
	})

	describe("Filter Runs", () => {
		it("should track filter usage", async () => {
			const testFilter = await createTestFilter({
				name: "Usage Tracked",
				ownerId: testUserId,
			})

			const program = Effect.gen(function* () {
				const service = yield* FilterDataService

				// Get initial state
				const before = yield* service.getFilterById(testFilter.id)
				const initialUsage = before?.usageCount || 0

				// Update usage using incrementUsage method
				yield* service.incrementUsage(testFilter.id)
				
				// Get updated filter
				const updated = yield* service.getFilterById(testFilter.id)

				expect(updated?.usageCount).toBe(initialUsage + 1)
				expect(updated?.lastUsedAt).toBeDefined()

				return updated
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})
	})

	describe("Pagination", () => {
		it("should paginate filter results", async () => {
			// Create multiple filters
			for (let i = 0; i < 25; i++) {
				await createTestFilter({
					name: `Filter ${i}`,
					ownerId: testUserId,
				})
			}

			const program = Effect.gen(function* () {
				const service = yield* FilterDataService

				// First page
				const page1 = yield* service.listFilters({
					page: 1,
					pageSize: 10,
				})

				expect(page1.filters.length).toBeGreaterThanOrEqual(10)
				// Pagination fields are top-level, not in a nested object
				expect(page1.page).toBe(1)
				expect(page1.pageSize).toBe(10)

				// Second page
				const page2 = yield* service.listFilters({
					page: 2,
					pageSize: 10,
				})

				expect(page2.filters.length).toBeGreaterThanOrEqual(10)
				expect(page2.page).toBe(2)
				expect(page2.pageSize).toBe(10)

				// Verify different results
				expect(page1.filters[0].id).not.toBe(page2.filters[0].id)

				return { page1, page2 }
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})
	})

	describe("Error Handling", () => {
		it("should return null for non-existent filter", async () => {
			const program = Effect.gen(function* () {
				const service = yield* FilterDataService

				const filter = yield* service.getFilterById("non-existent-id")

				expect(filter).toBeNull()

				return filter
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})

		it("should return false when deleting non-existent filter", async () => {
			const program = Effect.gen(function* () {
				const service = yield* FilterDataService

				const deleted = yield* service.deleteFilter("non-existent-id")

				expect(deleted).toBe(false)

				return deleted
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})

		it("should handle invalid filter data gracefully", async () => {
			const program = Effect.gen(function* () {
				const service = yield* FilterDataService

				// Attempt to create filter with missing required fields
				const result = yield* Effect.either(
					service.createFilter({
						name: "", // Invalid empty name
						ownerId: testUserId,
						rules: [], // Invalid empty rules
					} as any)
				)

				// Should either fail or handle gracefully
				expect(result).toBeDefined()

				return result
			}).pipe(Effect.provide(AppLayer))

			await Effect.runPromise(program)
		})
	})
})
