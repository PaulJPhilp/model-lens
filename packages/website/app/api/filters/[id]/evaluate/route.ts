import { eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/src/db"
import type { FilterSnapshot, ModelRunResult } from "@/src/db/schema"
import { filterRuns, savedFilters } from "@/src/db/schema"
import {
	evaluateFilterAgainstModel,
	type ModelMetadata,
} from "@/src/lib/filters"
import { canAccessFilter, requireAuth } from "../../auth"
import type {
	ErrorResponse,
	EvaluateFilterRequest,
	EvaluateFilterResponse,
	ModelEvaluationResult,
} from "../../types"

/**
 * POST /api/filters/[id]/evaluate
 * Evaluate a filter against models
 *
 * Request body: EvaluateFilterRequest
 *  - modelIds?: string[] - Specific models to evaluate (optional)
 *  - limit?: number - Max results to return (default: 50)
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<EvaluateFilterResponse | ErrorResponse>> {
	try {
		const startTime = Date.now()
		const auth = await requireAuth(request)
		const { id } = await params

		// Get filter
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

		// Parse request body
		const body: EvaluateFilterRequest = await request.json().catch(() => ({}))
		const limit = Math.min(body.limit || 50, 500)

		// Fetch models to evaluate
		// NOTE: This fetches from the existing /api/models endpoint
		// In production, you might want to query directly from DB
		const modelsResponse = await fetch(
			new URL("/api/models", request.url).toString(),
		)

		if (!modelsResponse.ok) {
			return NextResponse.json(
				{ error: "Failed to fetch models" },
				{ status: 500 },
			)
		}

		const modelsData = await modelsResponse.json()
		let models: ModelMetadata[] = modelsData.models || []

		// Filter to specific model IDs if provided
		if (body.modelIds && body.modelIds.length > 0) {
			models = models.filter((m) => body.modelIds?.includes(m.id))
		}

		// Limit models to evaluate
		models = models.slice(0, limit)

		// Evaluate each model
		const results: ModelEvaluationResult[] = []
		const runResults: ModelRunResult[] = []
		let matchCount = 0

		for (const model of models) {
			const evaluation = evaluateFilterAgainstModel(filter.rules, model)

			if (evaluation.match) {
				matchCount++
			}

			// API response format
			results.push({
				modelId: model.id,
				modelName: model.name,
				match: evaluation.match,
				score: evaluation.score,
				rationale: evaluation.rationale,
				failedHardClauses: evaluation.failedHardClauses,
				passedSoftClauses: evaluation.passedSoftClauses,
				totalSoftClauses: evaluation.totalSoftClauses,
			})

			// Database run result format
			runResults.push({
				modelId: model.id,
				modelName: model.name,
				matchedAllHard: evaluation.match,
				score: evaluation.score,
				clauseResults: [], // Could be populated with detailed clause results
			})
		}

		const durationMs = Date.now() - startTime

		// Create filter snapshot for run history
		const filterSnapshot: FilterSnapshot = {
			id: filter.id,
			name: filter.name,
			description: filter.description,
			visibility: filter.visibility,
			rules: filter.rules,
			version: filter.version,
		}

		// Persist run to database
		await db.insert(filterRuns).values({
			filterId: filter.id,
			executedBy: auth.userId,
			filterSnapshot,
			totalEvaluated: results.length,
			matchCount,
			results: runResults,
			durationMs,
			limitUsed: limit,
			modelIdsFilter: body.modelIds || null,
		})

		// Update filter usage stats
		await db
			.update(savedFilters)
			.set({
				lastUsedAt: new Date(),
				usageCount: filter.usageCount + 1,
			})
			.where(eq(savedFilters.id, id))

		// Build response
		const response: EvaluateFilterResponse = {
			filterId: filter.id,
			filterName: filter.name,
			results,
			totalEvaluated: results.length,
			matchCount,
		}

		return NextResponse.json(response)
	} catch (error) {
		if (error instanceof Error && error.message === "Unauthorized") {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		console.error("Error evaluating filter:", error)
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : undefined,
			},
			{ status: 500 },
		)
	}
}
