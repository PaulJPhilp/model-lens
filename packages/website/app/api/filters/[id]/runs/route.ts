import { desc, eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/src/db"
import type { FilterRunsListResponse } from "@/src/db/schema"
import { filterRuns, savedFilters } from "@/src/db/schema"
import { canAccessFilter, requireAuth } from "../../auth"
import type { ErrorResponse } from "../../types"

/**
 * GET /api/filters/[id]/runs
 * List all runs for a specific filter
 *
 * Query params:
 * - page: number (default: 1)
 * - pageSize: number (default: 20, max: 100)
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<FilterRunsListResponse | ErrorResponse>> {
	try {
		const auth = await requireAuth(request)
		const { id } = await params

		// Get filter to check access
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

		// Parse query params
		const { searchParams } = new URL(request.url)
		const page = parseInt(searchParams.get("page") || "1", 10)
		const pageSize = Math.min(
			parseInt(searchParams.get("pageSize") || "20", 10),
			100,
		)

		// Query runs for this filter
		const runs = await db
			.select()
			.from(filterRuns)
			.where(eq(filterRuns.filterId, id))
			.orderBy(desc(filterRuns.executedAt))
			.limit(pageSize)
			.offset((page - 1) * pageSize)

		// Count total (simplified - in production use separate count query)
		const total = runs.length

		// Transform to response format
		const response: FilterRunsListResponse = {
			runs: runs.map((run) => ({
				id: run.id,
				filterId: run.filterId,
				executedBy: run.executedBy,
				executedAt: run.executedAt.toISOString(),
				durationMs: run.durationMs,
				filterSnapshot: run.filterSnapshot,
				totalEvaluated: run.totalEvaluated,
				matchCount: run.matchCount,
				results: run.results,
				limitUsed: run.limitUsed,
				modelIdsFilter: run.modelIdsFilter,
				artifacts: run.artifacts,
				createdAt: run.createdAt.toISOString(),
			})),
			total,
			page,
			pageSize,
		}

		return NextResponse.json(response)
	} catch (error) {
		if (error instanceof Error && error.message === "Unauthorized") {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		console.error("Error listing filter runs:", error)
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		)
	}
}
