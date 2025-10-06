import { eq } from "drizzle-orm"
import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { db } from "@/src/db"
import type { RuleClause } from "@/src/db/schema"
import { savedFilters } from "@/src/db/schema"
import { GET, POST } from "./route"

describe("POST /api/filters", () => {
	const testUserId = "550e8400-e29b-41d4-a716-446655440000" // Valid UUID
	const testTeamId = "550e8400-e29b-41d4-a716-446655440001" // Valid UUID

	afterEach(async () => {
		// Clean up test data
		await db.delete(savedFilters).where(eq(savedFilters.ownerId, testUserId))
	})

	it("should create a new private filter", async () => {
		const rules: RuleClause[] = [
			{
				field: "provider",
				operator: "eq",
				value: "openai",
				type: "hard",
			},
		]

		const request = new NextRequest("http://localhost:3000/api/filters", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-user-id": testUserId,
			},
			body: JSON.stringify({
				name: "Test Filter",
				description: "Test description",
				visibility: "private",
				rules,
			}),
		})

		const response = await POST(request)
		const data = await response.json()

		expect(response.status).toBe(201)
		expect(data.id).toBeDefined()
		expect(data.name).toBe("Test Filter")
		expect(data.description).toBe("Test description")
		expect(data.visibility).toBe("private")
		expect(data.ownerId).toBe(testUserId)
		expect(data.teamId).toBeNull()
		expect(data.rules).toEqual(rules)
		expect(data.version).toBe(1)
		expect(data.usageCount).toBe(0)
	})

	it("should create a team filter with teamId", async () => {
		const rules: RuleClause[] = [
			{
				field: "inputCost",
				operator: "lte",
				value: 10,
				type: "soft",
				weight: 0.6,
			},
		]

		const request = new NextRequest("http://localhost:3000/api/filters", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-user-id": testUserId,
				"x-team-id": testTeamId,
			},
			body: JSON.stringify({
				name: "Team Filter",
				visibility: "team",
				teamId: testTeamId,
				rules,
			}),
		})

		const response = await POST(request)
		const data = await response.json()

		expect(response.status).toBe(201)
		expect(data.visibility).toBe("team")
		expect(data.teamId).toBe(testTeamId)
	})

	it("should reject request without name", async () => {
		const request = new NextRequest("http://localhost:3000/api/filters", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-user-id": testUserId,
			},
			body: JSON.stringify({
				rules: [
					{ field: "provider", operator: "eq", value: "openai", type: "hard" },
				],
			}),
		})

		const response = await POST(request)
		const data = await response.json()

		expect(response.status).toBe(400)
		expect(data.error).toBe("Invalid request")
		expect(data.details).toContain("name and rules are required")
	})

	it("should reject request without rules", async () => {
		const request = new NextRequest("http://localhost:3000/api/filters", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-user-id": testUserId,
			},
			body: JSON.stringify({
				name: "Test Filter",
			}),
		})

		const response = await POST(request)
		const data = await response.json()

		expect(response.status).toBe(400)
		expect(data.error).toBe("Invalid request")
	})

	it("should reject request with empty rules array", async () => {
		const request = new NextRequest("http://localhost:3000/api/filters", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-user-id": testUserId,
			},
			body: JSON.stringify({
				name: "Test Filter",
				rules: [],
			}),
		})

		const response = await POST(request)
		const data = await response.json()

		expect(response.status).toBe(400)
		expect(data.error).toBe("Invalid request")
		expect(data.details).toContain("At least one rule is required")
	})

	it("should reject team visibility without teamId", async () => {
		const request = new NextRequest("http://localhost:3000/api/filters", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-user-id": testUserId,
			},
			body: JSON.stringify({
				name: "Test Filter",
				visibility: "team",
				rules: [
					{ field: "provider", operator: "eq", value: "openai", type: "hard" },
				],
			}),
		})

		const response = await POST(request)
		const data = await response.json()

		expect(response.status).toBe(400)
		expect(data.error).toBe("Invalid request")
		expect(data.details).toContain("teamId required for team visibility")
	})

	it("should default to private visibility when not specified", async () => {
		const request = new NextRequest("http://localhost:3000/api/filters", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-user-id": testUserId,
			},
			body: JSON.stringify({
				name: "Test Filter",
				rules: [
					{ field: "provider", operator: "eq", value: "openai", type: "hard" },
				],
			}),
		})

		const response = await POST(request)
		const data = await response.json()

		expect(response.status).toBe(201)
		expect(data.visibility).toBe("private")
	})
})

describe("GET /api/filters", () => {
	const user1 = "550e8400-e29b-41d4-a716-446655440002" // Valid UUID
	const user2 = "550e8400-e29b-41d4-a716-446655440003" // Valid UUID
	const team1 = "550e8400-e29b-41d4-a716-446655440004" // Valid UUID
	let privateFilter1Id: string
	let publicFilterId: string
	let teamFilterId: string

	beforeEach(async () => {
		// Create test filters
		const [privateFilter1] = await db
			.insert(savedFilters)
			.values({
				ownerId: user1,
				name: "Private Filter 1",
				visibility: "private",
				rules: [
					{ field: "provider", operator: "eq", value: "openai", type: "hard" },
				],
			})
			.returning()
		privateFilter1Id = privateFilter1.id

		const [publicFilter] = await db
			.insert(savedFilters)
			.values({
				ownerId: user2,
				name: "Public Filter",
				visibility: "public",
				rules: [
					{
						field: "provider",
						operator: "eq",
						value: "anthropic",
						type: "hard",
					},
				],
			})
			.returning()
		publicFilterId = publicFilter.id

		const [teamFilter] = await db
			.insert(savedFilters)
			.values({
				ownerId: user2,
				teamId: team1,
				name: "Team Filter",
				visibility: "team",
				rules: [
					{ field: "inputCost", operator: "lte", value: 10, type: "soft" },
				],
			})
			.returning()
		teamFilterId = teamFilter.id
	})

	afterEach(async () => {
		// Clean up test data
		await db.delete(savedFilters).where(eq(savedFilters.id, privateFilter1Id))
		await db.delete(savedFilters).where(eq(savedFilters.id, publicFilterId))
		await db.delete(savedFilters).where(eq(savedFilters.id, teamFilterId))
	})

	it("should list all accessible filters for user with visibility=all", async () => {
		const request = new NextRequest(
			"http://localhost:3000/api/filters?visibility=all",
			{
				headers: {
					"x-user-id": user1,
					"x-team-id": team1,
				},
			},
		)

		const response = await GET(request)
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data.filters).toBeDefined()
		expect(data.filters.length).toBeGreaterThanOrEqual(2) // Own private + public + team
		expect(data.filters.some((f: any) => f.id === privateFilter1Id)).toBe(true)
		expect(data.filters.some((f: any) => f.id === publicFilterId)).toBe(true)
		expect(data.filters.some((f: any) => f.id === teamFilterId)).toBe(true)
	})

	it("should list only private filters for user with visibility=private", async () => {
		const request = new NextRequest(
			"http://localhost:3000/api/filters?visibility=private",
			{
				headers: {
					"x-user-id": user1,
				},
			},
		)

		const response = await GET(request)
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data.filters.every((f: any) => f.visibility === "private")).toBe(
			true,
		)
		expect(data.filters.every((f: any) => f.ownerId === user1)).toBe(true)
	})

	it("should list only public filters with visibility=public", async () => {
		const request = new NextRequest(
			"http://localhost:3000/api/filters?visibility=public",
			{
				headers: {
					"x-user-id": user1,
				},
			},
		)

		const response = await GET(request)
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data.filters.every((f: any) => f.visibility === "public")).toBe(true)
	})

	it("should list only team filters with visibility=team", async () => {
		const request = new NextRequest(
			"http://localhost:3000/api/filters?visibility=team",
			{
				headers: {
					"x-user-id": user1,
					"x-team-id": team1,
				},
			},
		)

		const response = await GET(request)
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data.filters.every((f: any) => f.visibility === "team")).toBe(true)
		expect(data.filters.every((f: any) => f.teamId === team1)).toBe(true)
	})

	it("should respect pagination parameters", async () => {
		const request = new NextRequest(
			"http://localhost:3000/api/filters?page=1&pageSize=1",
			{
				headers: {
					"x-user-id": user1,
				},
			},
		)

		const response = await GET(request)
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data.page).toBe(1)
		expect(data.pageSize).toBe(1)
		expect(data.filters.length).toBeLessThanOrEqual(1)
	})

	it("should enforce max page size of 100", async () => {
		const request = new NextRequest(
			"http://localhost:3000/api/filters?pageSize=200",
			{
				headers: {
					"x-user-id": user1,
				},
			},
		)

		const response = await GET(request)
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data.pageSize).toBe(100)
	})

	it("should default to page=1 and pageSize=20", async () => {
		const request = new NextRequest("http://localhost:3000/api/filters", {
			headers: {
				"x-user-id": user1,
			},
		})

		const response = await GET(request)
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data.page).toBe(1)
		expect(data.pageSize).toBe(20)
	})
})
