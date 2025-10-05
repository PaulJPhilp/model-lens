import { db } from "@/src/db";
import type { RuleClause } from "@/src/db/schema";
import { savedFilters } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Mock fetch for /api/models endpoint
global.fetch = vi.fn();

describe("POST /api/filters/[id]/evaluate", () => {
  const owner = "550e8400-e29b-41d4-a716-446655440012"; // Valid UUID
  const otherUser = "550e8400-e29b-41d4-a716-446655440013"; // Valid UUID
  const teamId = "550e8400-e29b-41d4-a716-446655440014"; // Valid UUID
  let filterId: string;
  let publicFilterId: string;

  const mockModels = {
    models: [
      {
        id: "gpt-4",
        name: "GPT-4",
        provider: "openai",
        inputCost: 30,
        outputCost: 60,
        capabilities: ["reasoning", "vision"],
        releaseDate: "2023-03-14",
      },
      {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        provider: "openai",
        inputCost: 0.5,
        outputCost: 1.5,
        capabilities: ["chat"],
        releaseDate: "2022-11-28",
      },
      {
        id: "claude-3-opus",
        name: "Claude 3 Opus",
        provider: "anthropic",
        inputCost: 15,
        outputCost: 75,
        capabilities: ["reasoning", "vision", "code"],
        releaseDate: "2024-03-04",
      },
    ],
  };

  beforeEach(async () => {
    // Setup fetch mock
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockModels,
    });

    // Create filter for owner
    const rules: RuleClause[] = [
      {
        field: "provider",
        operator: "eq",
        value: "openai",
        type: "hard",
      },
      {
        field: "inputCost",
        operator: "lte",
        value: 10,
        type: "soft",
        weight: 0.6,
      },
    ];

    const [filter] = await db
      .insert(savedFilters)
      .values({
        ownerId: owner,
        name: "OpenAI Budget Models",
        visibility: "private",
        rules,
      })
      .returning();
    filterId = filter.id;

    // Create public filter
    const publicRules: RuleClause[] = [
      {
        field: "capabilities",
        operator: "contains",
        value: "reasoning",
        type: "hard",
      },
    ];

    const [pubFilter] = await db
      .insert(savedFilters)
      .values({
        ownerId: owner,
        name: "Reasoning Models",
        visibility: "public",
        rules: publicRules,
      })
      .returning();
    publicFilterId = pubFilter.id;
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await db.delete(savedFilters).where(eq(savedFilters.id, filterId));
    await db.delete(savedFilters).where(eq(savedFilters.id, publicFilterId));
  });

  it("should evaluate filter and return matching models", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${filterId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": owner,
        },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: filterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.filterId).toBe(filterId);
    expect(data.filterName).toBe("OpenAI Budget Models");
    expect(data.results).toBeDefined();
    expect(Array.isArray(data.results)).toBe(true);
    expect(data.totalEvaluated).toBe(3);

    // Check that OpenAI models are evaluated
    const openaiResults = data.results.filter((r: any) =>
      r.modelId.startsWith("gpt")
    );
    expect(openaiResults.length).toBeGreaterThan(0);

    // Check result structure
    const firstResult = data.results[0];
    expect(firstResult).toHaveProperty("modelId");
    expect(firstResult).toHaveProperty("modelName");
    expect(firstResult).toHaveProperty("match");
    expect(firstResult).toHaveProperty("score");
    expect(firstResult).toHaveProperty("rationale");
    expect(firstResult).toHaveProperty("failedHardClauses");
    expect(firstResult).toHaveProperty("passedSoftClauses");
    expect(firstResult).toHaveProperty("totalSoftClauses");
  });

  it("should filter by hard clauses correctly", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${filterId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": owner,
        },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: filterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);

    // Hard clause requires provider='openai', so Claude should not match
    const claudeResult = data.results.find(
      (r: any) => r.modelId === "claude-3-opus"
    );
    expect(claudeResult).toBeDefined();
    expect(claudeResult.match).toBe(false);
    expect(claudeResult.failedHardClauses).toBeGreaterThan(0);

    // OpenAI models should pass hard clause
    const gpt4Result = data.results.find((r: any) => r.modelId === "gpt-4");
    expect(gpt4Result).toBeDefined();
    expect(gpt4Result.failedHardClauses).toBe(0);
  });

  it("should calculate soft clause scores", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${filterId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": owner,
        },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: filterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);

    // GPT-3.5 Turbo has inputCost=0.5 which passes soft clause (lte 10)
    const gpt35Result = data.results.find(
      (r: any) => r.modelId === "gpt-3.5-turbo"
    );
    expect(gpt35Result).toBeDefined();
    expect(gpt35Result.match).toBe(true);
    expect(gpt35Result.score).toBeGreaterThan(0);
    expect(gpt35Result.passedSoftClauses).toBe(1);
    expect(gpt35Result.totalSoftClauses).toBe(1);

    // GPT-4 has inputCost=30 which fails soft clause
    const gpt4Result = data.results.find((r: any) => r.modelId === "gpt-4");
    expect(gpt4Result).toBeDefined();
    expect(gpt4Result.match).toBe(true); // Still matches (no failed hard clauses)
    expect(gpt4Result.passedSoftClauses).toBe(0);
  });

  it("should respect limit parameter", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${filterId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": owner,
        },
        body: JSON.stringify({
          limit: 2,
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: filterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results.length).toBeLessThanOrEqual(2);
    expect(data.totalEvaluated).toBeLessThanOrEqual(2);
  });

  it("should enforce max limit of 500", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${filterId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": owner,
        },
        body: JSON.stringify({
          limit: 1000,
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: filterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    // With our mock data, we only have 3 models, but the limit was capped at 500
    expect(data.totalEvaluated).toBe(3);
  });

  it("should filter by specific model IDs", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${filterId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": owner,
        },
        body: JSON.stringify({
          modelIds: ["gpt-4", "claude-3-opus"],
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: filterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results.length).toBe(2);
    expect(data.results.some((r: any) => r.modelId === "gpt-4")).toBe(true);
    expect(data.results.some((r: any) => r.modelId === "claude-3-opus")).toBe(
      true
    );
    expect(data.results.some((r: any) => r.modelId === "gpt-3.5-turbo")).toBe(
      false
    );
  });

  it("should update filter usage stats", async () => {
    // Get initial usage stats
    const [before] = await db
      .select()
      .from(savedFilters)
      .where(eq(savedFilters.id, filterId))
      .limit(1);

    const initialUsageCount = before.usageCount;
    const initialLastUsedAt = before.lastUsedAt;

    const request = new NextRequest(
      `http://localhost:3000/api/filters/${filterId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": owner,
        },
        body: JSON.stringify({}),
      }
    );

    await POST(request, { params: Promise.resolve({ id: filterId }) });

    // Get updated usage stats
    const [after] = await db
      .select()
      .from(savedFilters)
      .where(eq(savedFilters.id, filterId))
      .limit(1);

    expect(after.usageCount).toBe(initialUsageCount + 1);
    expect(after.lastUsedAt).not.toBeNull();
    if (initialLastUsedAt) {
      expect(after.lastUsedAt!.getTime()).toBeGreaterThanOrEqual(
        initialLastUsedAt.getTime()
      );
    }
  });

  it("should allow non-owner to evaluate public filter", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${publicFilterId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": otherUser,
        },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: publicFilterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.filterId).toBe(publicFilterId);
    expect(data.filterName).toBe("Reasoning Models");
  });

  it("should return 403 when user cannot access private filter", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${filterId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": otherUser,
        },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: filterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return 404 for non-existent filter", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000999";
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${fakeId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": owner,
        },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: fakeId }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Filter not found");
  });

  it("should handle empty request body", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${filterId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": owner,
        },
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: filterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toBeDefined();
  });

  it("should handle models API failure gracefully", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const request = new NextRequest(
      `http://localhost:3000/api/filters/${filterId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": owner,
        },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: filterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch models");
  });

  it("should count matches correctly", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${publicFilterId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": owner,
        },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: publicFilterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);

    // Public filter requires 'reasoning' capability
    // GPT-4 and Claude-3-Opus have it, GPT-3.5 doesn't
    const matchingResults = data.results.filter((r: any) => r.match);
    expect(data.matchCount).toBe(matchingResults.length);
    expect(data.matchCount).toBe(2); // GPT-4 and Claude-3-Opus
  });

  it("should provide meaningful rationale", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${filterId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": owner,
        },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: filterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);

    // Every result should have a non-empty rationale
    data.results.forEach((result: any) => {
      expect(result.rationale).toBeDefined();
      expect(result.rationale.length).toBeGreaterThan(0);
      expect(typeof result.rationale).toBe("string");
    });
  });
});
