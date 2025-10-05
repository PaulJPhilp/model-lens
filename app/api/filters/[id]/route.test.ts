import { db } from "@/src/db";
import type { RuleClause } from "@/src/db/schema";
import { savedFilters } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DELETE, GET, PUT } from "./route";

describe("GET /api/filters/[id]", () => {
  const owner = "550e8400-e29b-41d4-a716-446655440005"; // Valid UUID
  const otherUser = "550e8400-e29b-41d4-a716-446655440006"; // Valid UUID
  const teamId = "550e8400-e29b-41d4-a716-446655440007"; // Valid UUID
  let privateFilterId: string;
  let publicFilterId: string;
  let teamFilterId: string;

  beforeEach(async () => {
    // Create private filter
    const [privateFilter] = await db
      .insert(savedFilters)
      .values({
        ownerId: owner,
        name: "Private Filter",
        visibility: "private",
        rules: [
          { field: "provider", operator: "eq", value: "openai", type: "hard" },
        ],
      })
      .returning();
    privateFilterId = privateFilter.id;

    // Create public filter
    const [publicFilter] = await db
      .insert(savedFilters)
      .values({
        ownerId: owner,
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
      .returning();
    publicFilterId = publicFilter.id;

    // Create team filter
    const [teamFilter] = await db
      .insert(savedFilters)
      .values({
        ownerId: owner,
        teamId,
        name: "Team Filter",
        visibility: "team",
        rules: [
          { field: "inputCost", operator: "lte", value: 10, type: "soft" },
        ],
      })
      .returning();
    teamFilterId = teamFilter.id;
  });

  afterEach(async () => {
    await db.delete(savedFilters).where(eq(savedFilters.id, privateFilterId));
    await db.delete(savedFilters).where(eq(savedFilters.id, publicFilterId));
    await db.delete(savedFilters).where(eq(savedFilters.id, teamFilterId));
  });

  it("should get filter by id for owner", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${privateFilterId}`,
      {
        headers: {
          "x-user-id": owner,
        },
      }
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: privateFilterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(privateFilterId);
    expect(data.name).toBe("Private Filter");
    expect(data.ownerId).toBe(owner);
    expect(data.visibility).toBe("private");
  });

  it("should allow anyone to get public filter", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${publicFilterId}`,
      {
        headers: {
          "x-user-id": otherUser,
        },
      }
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: publicFilterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(publicFilterId);
    expect(data.visibility).toBe("public");
  });

  it("should allow team member to get team filter", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${teamFilterId}`,
      {
        headers: {
          "x-user-id": otherUser,
          "x-team-id": teamId,
        },
      }
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: teamFilterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(teamFilterId);
    expect(data.visibility).toBe("team");
    expect(data.teamId).toBe(teamId);
  });

  it("should return 403 when user cannot access private filter", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${privateFilterId}`,
      {
        headers: {
          "x-user-id": otherUser,
        },
      }
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: privateFilterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return 403 when non-team-member tries to access team filter", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${teamFilterId}`,
      {
        headers: {
          "x-user-id": otherUser,
          "x-team-id": "different-team",
        },
      }
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: teamFilterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return 404 for non-existent filter", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000999";
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${fakeId}`,
      {
        headers: {
          "x-user-id": owner,
        },
      }
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: fakeId }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Filter not found");
  });
});

describe("PUT /api/filters/[id]", () => {
  const owner = "550e8400-e29b-41d4-a716-446655440008"; // Valid UUID
  const otherUser = "550e8400-e29b-41d4-a716-446655440009"; // Valid UUID
  let filterId: string;

  beforeEach(async () => {
    const [filter] = await db
      .insert(savedFilters)
      .values({
        ownerId: owner,
        name: "Original Name",
        description: "Original description",
        visibility: "private",
        rules: [
          { field: "provider", operator: "eq", value: "openai", type: "hard" },
        ],
      })
      .returning();
    filterId = filter.id;
  });

  afterEach(async () => {
    await db.delete(savedFilters).where(eq(savedFilters.id, filterId));
  });

  it("should update filter name and description", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${filterId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": owner,
        },
        body: JSON.stringify({
          name: "Updated Name",
          description: "Updated description",
        }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: filterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(filterId);
    expect(data.name).toBe("Updated Name");
    expect(data.description).toBe("Updated description");
    expect(data.visibility).toBe("private"); // Unchanged
  });

  it("should update filter visibility", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${filterId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": owner,
        },
        body: JSON.stringify({
          visibility: "public",
        }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: filterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.visibility).toBe("public");
    expect(data.name).toBe("Original Name"); // Unchanged
  });

  it("should update filter rules", async () => {
    const newRules: RuleClause[] = [
      {
        field: "inputCost",
        operator: "lte",
        value: 10,
        type: "soft",
        weight: 0.8,
      },
    ];

    const request = new NextRequest(
      `http://localhost:3000/api/filters/${filterId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": owner,
        },
        body: JSON.stringify({
          rules: newRules,
        }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: filterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.rules).toEqual(newRules);
  });

  it("should allow setting description to null", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${filterId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": owner,
        },
        body: JSON.stringify({
          description: null,
        }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: filterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.description).toBeNull();
  });

  it("should return 403 when non-owner tries to update", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${filterId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": otherUser,
        },
        body: JSON.stringify({
          name: "Hacked Name",
        }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: filterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");

    // Verify filter was not modified
    const [unchanged] = await db
      .select()
      .from(savedFilters)
      .where(eq(savedFilters.id, filterId))
      .limit(1);
    expect(unchanged.name).toBe("Original Name");
  });

  it("should return 404 for non-existent filter", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000999";
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${fakeId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": owner,
        },
        body: JSON.stringify({
          name: "New Name",
        }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: fakeId }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Filter not found");
  });

  it("should validate empty rules array", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${filterId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": owner,
        },
        body: JSON.stringify({
          rules: [],
        }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: filterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request");
    expect(data.details).toContain("rules must be non-empty array");
  });

  it("should require teamId when changing to team visibility", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${filterId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": owner,
        },
        body: JSON.stringify({
          visibility: "team",
        }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: filterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request");
    expect(data.details).toContain("teamId required for team visibility");
  });
});

describe("DELETE /api/filters/[id]", () => {
  const owner = "550e8400-e29b-41d4-a716-446655440010"; // Valid UUID
  const otherUser = "550e8400-e29b-41d4-a716-446655440011"; // Valid UUID
  let filterId: string;

  beforeEach(async () => {
    const [filter] = await db
      .insert(savedFilters)
      .values({
        ownerId: owner,
        name: "To Be Deleted",
        visibility: "private",
        rules: [
          { field: "provider", operator: "eq", value: "openai", type: "hard" },
        ],
      })
      .returning();
    filterId = filter.id;
  });

  afterEach(async () => {
    // Clean up in case test failed
    await db.delete(savedFilters).where(eq(savedFilters.id, filterId));
  });

  it("should delete filter when called by owner", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${filterId}`,
      {
        method: "DELETE",
        headers: {
          "x-user-id": owner,
        },
      }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: filterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify filter was deleted
    const [deleted] = await db
      .select()
      .from(savedFilters)
      .where(eq(savedFilters.id, filterId))
      .limit(1);
    expect(deleted).toBeUndefined();
  });

  it("should return 403 when non-owner tries to delete", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${filterId}`,
      {
        method: "DELETE",
        headers: {
          "x-user-id": otherUser,
        },
      }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: filterId }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");

    // Verify filter still exists
    const [stillExists] = await db
      .select()
      .from(savedFilters)
      .where(eq(savedFilters.id, filterId))
      .limit(1);
    expect(stillExists).toBeDefined();
    expect(stillExists.name).toBe("To Be Deleted");
  });

  it("should return 404 for non-existent filter", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000999";
    const request = new NextRequest(
      `http://localhost:3000/api/filters/${fakeId}`,
      {
        method: "DELETE",
        headers: {
          "x-user-id": owner,
        },
      }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: fakeId }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Filter not found");
  });
});
