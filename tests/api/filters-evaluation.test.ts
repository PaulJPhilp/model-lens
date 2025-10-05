import { POST } from "@/app/api/filters/[id]/evaluate/route";
import { db } from "@/src/db";
import type { RuleClause } from "@/src/db/schema";
import { savedFilters } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("POST /api/filters/[id]/evaluate", () => {
  const testUserId = "550e8400-e29b-41d4-a716-446655440000"; // Valid UUID
  const testTeamId = "550e8400-e29b-41d4-a716-446655440001"; // Valid UUID
  let testFilterId: string;

  beforeEach(async () => {
    // Create a test filter
    const rules: RuleClause[] = [
      {
        field: "provider",
        operator: "eq",
        value: "OpenAI",
        type: "hard",
      },
      {
        field: "inputCost",
        operator: "lte",
        value: 0.05,
        type: "soft",
        weight: 0.8,
      },
      {
        field: "capabilities",
        operator: "contains",
        value: "tools",
        type: "soft",
        weight: 0.6,
      },
    ];

    const [filter] = await db
      .insert(savedFilters)
      .values({
        ownerId: testUserId,
        name: "Test Filter for Evaluation",
        description: "Test filter for evaluation tests",
        visibility: "private",
        rules,
      })
      .returning();

    testFilterId = filter.id;
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(savedFilters).where(eq(savedFilters.ownerId, testUserId));
  });

  it("should evaluate filter against all models", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${testFilterId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": testUserId,
        },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: testFilterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.filterId).toBe(testFilterId);
    expect(data.filterName).toBe("Test Filter for Evaluation");
    expect(data.results).toBeDefined();
    expect(Array.isArray(data.results)).toBe(true);
    expect(data.totalEvaluated).toBeGreaterThan(0);
    expect(data.matchCount).toBeGreaterThanOrEqual(0);
    expect(data.matchCount).toBeLessThanOrEqual(data.totalEvaluated);
  });

  it("should evaluate filter against specific model IDs", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${testFilterId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": testUserId,
        },
        body: JSON.stringify({
          modelIds: ["gpt-4", "gpt-3.5-turbo"],
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: testFilterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toBeDefined();
    expect(data.results.length).toBeLessThanOrEqual(2); // Should only evaluate specified models
  });

  it("should limit results when limit parameter is provided", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${testFilterId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": testUserId,
        },
        body: JSON.stringify({
          limit: 5,
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: testFilterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results.length).toBeLessThanOrEqual(5);
  });

  it("should return proper evaluation result structure", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${testFilterId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": testUserId,
        },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: testFilterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);

    if (data.results.length > 0) {
      const result = data.results[0];
      expect(result).toHaveProperty("modelId");
      expect(result).toHaveProperty("modelName");
      expect(result).toHaveProperty("match");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("rationale");
      expect(result).toHaveProperty("failedHardClauses");
      expect(result).toHaveProperty("passedSoftClauses");
      expect(result).toHaveProperty("totalSoftClauses");

      expect(typeof result.modelId).toBe("string");
      expect(typeof result.modelName).toBe("string");
      expect(typeof result.match).toBe("boolean");
      expect(typeof result.score).toBe("number");
      expect(typeof result.rationale).toBe("string");
      expect(typeof result.failedHardClauses).toBe("number");
      expect(typeof result.passedSoftClauses).toBe("number");
      expect(typeof result.totalSoftClauses).toBe("number");
    }
  });

  it("should handle hard clause failures correctly", async () => {
    // Create a filter with a hard clause that will fail
    const strictRules: RuleClause[] = [
      {
        field: "provider",
        operator: "eq",
        value: "NonExistentProvider",
        type: "hard",
      },
    ];

    const [strictFilter] = await db
      .insert(savedFilters)
      .values({
        ownerId: testUserId,
        name: "Strict Test Filter",
        visibility: "private",
        rules: strictRules,
      })
      .returning();

    const request = new NextRequest(
      `http://localhost:3000/api/filters/${strictFilter.id}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": testUserId,
        },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: strictFilter.id }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.matchCount).toBe(0);

    // All results should have match: false due to hard clause failure
    data.results.forEach((result: any) => {
      expect(result.match).toBe(false);
      expect(result.failedHardClauses).toBeGreaterThan(0);
    });

    // Clean up
    await db.delete(savedFilters).where(eq(savedFilters.id, strictFilter.id));
  });

  it("should calculate soft clause scores correctly", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${testFilterId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": testUserId,
        },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: testFilterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);

    data.results.forEach((result: any) => {
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.passedSoftClauses).toBeLessThanOrEqual(
        result.totalSoftClauses
      );
    });
  });

  it("should reject request without authentication", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${testFilterId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // No x-user-id header
        },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: testFilterId }),
    });

    expect(response.status).toBe(401);
  });

  it("should reject request for non-existent filter", async () => {
    const nonExistentId = "00000000-0000-0000-0000-000000000000";

    const request = new NextRequest(
      `http://localhost:3000/api/filters/${nonExistentId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": testUserId,
        },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: nonExistentId }),
    });

    expect(response.status).toBe(404);
  });

  it("should reject request for filter owned by different user", async () => {
    const otherUserId = "550e8400-e29b-41d4-a716-446655440002"; // Valid UUID

    // Create a filter owned by another user
    const [otherFilter] = await db
      .insert(savedFilters)
      .values({
        ownerId: otherUserId,
        name: "Other User Filter",
        visibility: "private",
        rules: [
          { field: "provider", operator: "eq", value: "OpenAI", type: "hard" },
        ],
      })
      .returning();

    const request = new NextRequest(
      `http://localhost:3000/api/filters/${otherFilter.id}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": testUserId,
        },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: otherFilter.id }),
    });

    expect(response.status).toBe(403);

    // Clean up
    await db.delete(savedFilters).where(eq(savedFilters.id, otherFilter.id));
  });

  it("should allow access to public filters", async () => {
    const publicUserId = "550e8400-e29b-41d4-a716-446655440003"; // Valid UUID

    // Create a public filter
    const [publicFilter] = await db
      .insert(savedFilters)
      .values({
        ownerId: publicUserId,
        name: "Public Filter",
        visibility: "public",
        rules: [
          { field: "provider", operator: "eq", value: "OpenAI", type: "hard" },
        ],
      })
      .returning();

    const request = new NextRequest(
      `http://localhost:3000/api/filters/${publicFilter.id}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": testUserId,
        },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: publicFilter.id }),
    });

    expect(response.status).toBe(200);

    // Clean up
    await db.delete(savedFilters).where(eq(savedFilters.id, publicFilter.id));
  });

  it("should update filter usage statistics", async () => {
    // Get initial usage count
    const [initialFilter] = await db
      .select()
      .from(savedFilters)
      .where(eq(savedFilters.id, testFilterId));

    const request = new NextRequest(
      `http://localhost:3000/api/filters/${testFilterId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": testUserId,
        },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: testFilterId }),
    });

    expect(response.status).toBe(200);

    // Check that usage count was incremented
    const [updatedFilter] = await db
      .select()
      .from(savedFilters)
      .where(eq(savedFilters.id, testFilterId));

    expect(updatedFilter.usageCount).toBe(initialFilter.usageCount + 1);
    expect(updatedFilter.lastUsedAt).toBeDefined();
  });

  it("should handle invalid request body gracefully", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${testFilterId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": testUserId,
        },
        body: "invalid json",
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: testFilterId }),
    });

    expect(response.status).toBe(400);
  });
});
