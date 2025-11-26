import { Effect } from "effect"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { savedFilters } from "../db/schema"
import { FilterDataService } from "./FilterDataService"
import { FilterDataServiceLive } from "./FilterDataServiceLive"

// Mock the database
const mocks = vi.hoisted(() => ({
	db: {
		select: vi.fn(),
		from: vi.fn(),
		where: vi.fn(),
		limit: vi.fn(),
		offset: vi.fn(),
		orderBy: vi.fn(),
		insert: vi.fn(),
		values: vi.fn(),
		returning: vi.fn(),
		update: vi.fn(),
		set: vi.fn(),
		delete: vi.fn(),
	},
}))

vi.mock("../db/index", () => ({
	db: mocks.db,
}))

const mockDb = mocks.db

describe("FilterDataService", () => {
	beforeEach(() => {
		vi.resetAllMocks()
		// Setup default chainable mocks
		mockDb.select.mockReturnThis()
		mockDb.from.mockReturnThis()
		mockDb.where.mockReturnThis()
		mockDb.limit.mockReturnThis()
		mockDb.offset.mockReturnThis()
		mockDb.orderBy.mockReturnThis()
		mockDb.insert.mockReturnThis()
		mockDb.values.mockReturnThis()
		mockDb.returning.mockReturnThis()
		mockDb.update.mockReturnThis()
		mockDb.set.mockReturnThis()
		mockDb.delete.mockReturnThis()
	})

	const mockFilter = {
		id: "test-id",
		ownerId: "user-1",
		teamId: null,
		name: "Test Filter",
		description: "Description",
		visibility: "private",
		rules: [],
		version: 1,
		createdAt: new Date("2023-01-01"),
		updatedAt: new Date("2023-01-01"),
		lastUsedAt: null,
		usageCount: 0,
	}

	describe("listFilters", () => {
		it("should list filters successfully", async () => {
			mockDb.offset.mockResolvedValue([mockFilter])

			const program = Effect.gen(function* () {
				const service = yield* FilterDataService
				return yield* service.listFilters({ page: 1, pageSize: 10 })
			}).pipe(Effect.provide(FilterDataServiceLive))

			const result = await Effect.runPromise(program)
			expect(result.filters).toHaveLength(1)
			expect(result.filters[0].id).toBe("test-id")
			expect(mockDb.select).toHaveBeenCalled()
			expect(mockDb.from).toHaveBeenCalledWith(savedFilters)
		})

		it("should handle empty results", async () => {
			mockDb.offset.mockResolvedValue([])

			const program = Effect.gen(function* () {
				const service = yield* FilterDataService
				return yield* service.listFilters({ page: 1, pageSize: 10 })
			}).pipe(Effect.provide(FilterDataServiceLive))

			const result = await Effect.runPromise(program)
			expect(result.filters).toHaveLength(0)
			expect(result.total).toBe(0)
		})
	})

	describe("getFilterById", () => {
		it("should return filter when found", async () => {
			mockDb.limit.mockResolvedValue([mockFilter])

			const program = Effect.gen(function* () {
				const service = yield* FilterDataService
				return yield* service.getFilterById("test-id")
			}).pipe(Effect.provide(FilterDataServiceLive))

			const result = await Effect.runPromise(program)
			expect(result).not.toBeNull()
			expect(result?.id).toBe("test-id")
		})

		it("should return null when not found", async () => {
			mockDb.limit.mockResolvedValue([])

			const program = Effect.gen(function* () {
				const service = yield* FilterDataService
				return yield* service.getFilterById("non-existent")
			}).pipe(Effect.provide(FilterDataServiceLive))

			const result = await Effect.runPromise(program)
			expect(result).toBeNull()
		})
	})

	describe("createFilter", () => {
		it("should create filter successfully", async () => {
			mockDb.returning.mockResolvedValue([mockFilter])

			const program = Effect.gen(function* () {
				const service = yield* FilterDataService
				return yield* service.createFilter({
					name: "Test Filter",
					rules: [],
					ownerId: "user-1",
				})
			}).pipe(Effect.provide(FilterDataServiceLive))

			const result = await Effect.runPromise(program)
			expect(result.id).toBe("test-id")
			expect(mockDb.insert).toHaveBeenCalledWith(savedFilters)
		})
	})

	describe("updateFilter", () => {
		it("should update filter successfully", async () => {
			mockDb.returning.mockResolvedValue([
				{ ...mockFilter, name: "Updated Name" },
			])

			const program = Effect.gen(function* () {
				const service = yield* FilterDataService
				return yield* service.updateFilter("test-id", {
					name: "Updated Name",
				})
			}).pipe(Effect.provide(FilterDataServiceLive))

			const result = await Effect.runPromise(program)
			expect(result?.name).toBe("Updated Name")
			expect(mockDb.update).toHaveBeenCalledWith(savedFilters)
		})

		it("should return null if filter not found", async () => {
			mockDb.returning.mockResolvedValue([])

			const program = Effect.gen(function* () {
				const service = yield* FilterDataService
				return yield* service.updateFilter("non-existent", {
					name: "Updated Name",
				})
			}).pipe(Effect.provide(FilterDataServiceLive))

			const result = await Effect.runPromise(program)
			expect(result).toBeNull()
		})
	})

	describe("deleteFilter", () => {
		it("should return true when deleted", async () => {
			mockDb.where.mockResolvedValue({ rowCount: 1 })

			const program = Effect.gen(function* () {
				const service = yield* FilterDataService
				return yield* service.deleteFilter("test-id")
			}).pipe(Effect.provide(FilterDataServiceLive))

			const result = await Effect.runPromise(program)
			expect(result).toBe(true)
			expect(mockDb.delete).toHaveBeenCalledWith(savedFilters)
		})

		it("should return false when not found", async () => {
			mockDb.where.mockResolvedValue({ rowCount: 0 })

			const program = Effect.gen(function* () {
				const service = yield* FilterDataService
				return yield* service.deleteFilter("non-existent")
			}).pipe(Effect.provide(FilterDataServiceLive))

			const result = await Effect.runPromise(program)
			expect(result).toBe(false)
		})
	})
})
