import { eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/src/db"
import { savedFilters } from "@/src/db/schema"
import { canAccessFilter, canModifyFilter, requireAuth } from "../auth"
import type {
	ErrorResponse,
	FilterResponse,
	UpdateFilterRequest,
} from "../types"

/**
 * GET /api/filters/[id]
 * Get a specific filter by ID
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<FilterResponse | ErrorResponse>> {
	try {
		const auth = await requireAuth(request)
		const { id } = await params

		// Query filter
		const [filter] = await db
			.select()
			.from(savedFilters)
			.where(eq(savedFilters.id, id))
			.limit(1)

		if (!filter) {
			return NextResponse.json({ error: "Filter not found" }, { status: 404 })
		}

		// Check access permissions
		if (!canAccessFilter(auth.userId, filter, auth.teamId)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 })
		}

		// Transform to response format
		const response: FilterResponse = {
			id: filter.id,
			ownerId: filter.ownerId,
			teamId: filter.teamId,
			name: filter.name,
			description: filter.description,
			visibility: filter.visibility,
			rules: filter.rules,
			version: filter.version,
			createdAt: filter.createdAt.toISOString(),
			updatedAt: filter.updatedAt.toISOString(),
			lastUsedAt: filter.lastUsedAt?.toISOString() || null,
			usageCount: filter.usageCount,
		}

		return NextResponse.json(response)
	} catch (error) {
		if (error instanceof Error && error.message === "Unauthorized") {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		console.error("Error getting filter:", error)
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		)
	}
}

/**
 * PUT /api/filters/[id]
 * Update a filter (owner only)
 *
 * Request body: UpdateFilterRequest
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<FilterResponse | ErrorResponse>> {
	try {
		const auth = await requireAuth(request)
		const { id } = await params

		// Get existing filter
		const [existingFilter] = await db
			.select()
			.from(savedFilters)
			.where(eq(savedFilters.id, id))
			.limit(1)

		if (!existingFilter) {
			return NextResponse.json({ error: "Filter not found" }, { status: 404 })
		}

		// Check modify permissions (owner only)
		if (!canModifyFilter(auth.userId, existingFilter)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 })
		}

		// Parse request body
		const body: UpdateFilterRequest = await request.json()

		// Validate rules if provided
		if (body.rules !== undefined) {
			if (!Array.isArray(body.rules) || body.rules.length === 0) {
				return NextResponse.json(
					{
						error: "Invalid request",
						details: "rules must be non-empty array",
					},
					{ status: 400 },
				)
			}
		}

		// Validate teamId if changing to team visibility
		if (body.visibility === "team" && !body.teamId) {
			return NextResponse.json(
				{
					error: "Invalid request",
					details: "teamId required for team visibility",
				},
				{ status: 400 },
			)
		}

		// Update filter
		const [updatedFilter] = await db
			.update(savedFilters)
			.set({
				name: body.name ?? existingFilter.name,
				description:
					body.description !== undefined
						? body.description
						: existingFilter.description,
				visibility: body.visibility ?? existingFilter.visibility,
				teamId: body.teamId !== undefined ? body.teamId : existingFilter.teamId,
				rules: body.rules ?? existingFilter.rules,
			})
			.where(eq(savedFilters.id, id))
			.returning()

		// Transform to response format
		const response: FilterResponse = {
			id: updatedFilter.id,
			ownerId: updatedFilter.ownerId,
			teamId: updatedFilter.teamId,
			name: updatedFilter.name,
			description: updatedFilter.description,
			visibility: updatedFilter.visibility,
			rules: updatedFilter.rules,
			version: updatedFilter.version,
			createdAt: updatedFilter.createdAt.toISOString(),
			updatedAt: updatedFilter.updatedAt.toISOString(),
			lastUsedAt: updatedFilter.lastUsedAt?.toISOString() || null,
			usageCount: updatedFilter.usageCount,
		}

		return NextResponse.json(response)
	} catch (error) {
		if (error instanceof Error && error.message === "Unauthorized") {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		console.error("Error updating filter:", error)
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		)
	}
}

/**
 * DELETE /api/filters/[id]
 * Delete a filter (owner only)
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<{ success: boolean } | ErrorResponse>> {
	try {
		const auth = await requireAuth(request)
		const { id } = await params

		// Get existing filter
		const [existingFilter] = await db
			.select()
			.from(savedFilters)
			.where(eq(savedFilters.id, id))
			.limit(1)

		if (!existingFilter) {
			return NextResponse.json({ error: "Filter not found" }, { status: 404 })
		}

		// Check modify permissions (owner only)
		if (!canModifyFilter(auth.userId, existingFilter)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 })
		}

		// Delete filter
		await db.delete(savedFilters).where(eq(savedFilters.id, id))

		return NextResponse.json({ success: true })
	} catch (error) {
		if (error instanceof Error && error.message === "Unauthorized") {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		console.error("Error deleting filter:", error)
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		)
	}
}
