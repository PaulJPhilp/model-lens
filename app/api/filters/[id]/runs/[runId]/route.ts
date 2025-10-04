import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { savedFilters, filterRuns } from '@/src/db/schema';
import type { FilterRunResponse } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, canAccessFilter } from '../../../auth';
import type { ErrorResponse } from '../../../types';

/**
 * GET /api/filters/[id]/runs/[runId]
 * Get a specific run by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
): Promise<NextResponse<FilterRunResponse | ErrorResponse>> {
  try {
    const auth = await requireAuth(request);
    const { id, runId } = await params;

    // Get filter to check access
    const [filter] = await db
      .select()
      .from(savedFilters)
      .where(eq(savedFilters.id, id))
      .limit(1);

    if (!filter) {
      return NextResponse.json(
        { error: 'Filter not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    if (!canAccessFilter(auth.userId, filter, auth.teamId)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Query specific run
    const [run] = await db
      .select()
      .from(filterRuns)
      .where(
        and(
          eq(filterRuns.id, runId),
          eq(filterRuns.filterId, id)
        )
      )
      .limit(1);

    if (!run) {
      return NextResponse.json(
        { error: 'Run not found' },
        { status: 404 }
      );
    }

    // Transform to response format
    const response: FilterRunResponse = {
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
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('Error getting filter run:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
