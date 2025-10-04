import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { savedFilters } from '@/src/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { requireAuth, canAccessFilter } from './auth';
import type {
  CreateFilterRequest,
  FilterResponse,
  FiltersListResponse,
  ErrorResponse,
} from './types';

/**
 * GET /api/filters
 * List all filters accessible to the current user
 *
 * Query params:
 * - page: number (default: 1)
 * - pageSize: number (default: 20, max: 100)
 * - visibility: 'private' | 'team' | 'public' | 'all' (default: 'all')
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<FiltersListResponse | ErrorResponse>> {
  try {
    const auth = await requireAuth(request);

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(
      parseInt(searchParams.get('pageSize') || '20', 10),
      100
    );
    const visibility = searchParams.get('visibility') || 'all';

    // Build query conditions
    const conditions = [];

    if (visibility === 'all') {
      // User's own filters OR public OR team filters
      conditions.push(
        or(
          eq(savedFilters.ownerId, auth.userId),
          eq(savedFilters.visibility, 'public'),
          auth.teamId
            ? and(
                eq(savedFilters.visibility, 'team'),
                eq(savedFilters.teamId, auth.teamId)
              )
            : undefined
        )
      );
    } else if (visibility === 'private') {
      conditions.push(
        and(
          eq(savedFilters.ownerId, auth.userId),
          eq(savedFilters.visibility, 'private')
        )
      );
    } else if (visibility === 'team' && auth.teamId) {
      conditions.push(
        and(
          eq(savedFilters.visibility, 'team'),
          eq(savedFilters.teamId, auth.teamId)
        )
      );
    } else if (visibility === 'public') {
      conditions.push(eq(savedFilters.visibility, 'public'));
    }

    // Query filters
    const filters = await db
      .select()
      .from(savedFilters)
      .where(and(...conditions.filter(Boolean)))
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .orderBy(savedFilters.createdAt);

    // Count total (simplified - in production use separate count query)
    const total = filters.length;

    // Transform to response format
    const response: FiltersListResponse = {
      filters: filters.map((f) => ({
        id: f.id,
        ownerId: f.ownerId,
        teamId: f.teamId,
        name: f.name,
        description: f.description,
        visibility: f.visibility,
        rules: f.rules,
        version: f.version,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
        lastUsedAt: f.lastUsedAt?.toISOString() || null,
        usageCount: f.usageCount,
      })),
      total,
      page,
      pageSize,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('Error listing filters:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/filters
 * Create a new filter
 *
 * Request body: CreateFilterRequest
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<FilterResponse | ErrorResponse>> {
  try {
    const auth = await requireAuth(request);

    // Parse request body
    const body: CreateFilterRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.rules || !Array.isArray(body.rules)) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: 'name and rules are required',
        },
        { status: 400 }
      );
    }

    // Validate rules array
    if (body.rules.length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: 'At least one rule is required',
        },
        { status: 400 }
      );
    }

    // Validate teamId if visibility is team
    if (body.visibility === 'team' && !body.teamId) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: 'teamId required for team visibility',
        },
        { status: 400 }
      );
    }

    // Create filter
    const [filter] = await db
      .insert(savedFilters)
      .values({
        ownerId: auth.userId,
        teamId: body.teamId || null,
        name: body.name,
        description: body.description || null,
        visibility: body.visibility || 'private',
        rules: body.rules,
      })
      .returning();

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
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('Error creating filter:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
