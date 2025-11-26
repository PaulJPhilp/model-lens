#!/usr/bin/env bun
/**
 * End-to-end test script for Filter API endpoints
 *
 * Tests all CRUD operations and the evaluate endpoint:
 * - POST /api/filters (create)
 * - GET /api/filters (list)
 * - GET /api/filters/[id] (get)
 * - PUT /api/filters/[id] (update)
 * - DELETE /api/filters/[id] (delete)
 * - POST /api/filters/[id]/evaluate (apply)
 *
 * Also verifies:
 * - Visibility/auth enforcement
 * - Payload validation
 * - Usage stats updates
 * - Deterministic evaluation results
 */
const BASE_URL = process.env.BASE_URL || "http://localhost:3002";
const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";
const TEST_TEAM_ID = "00000000-0000-0000-0000-000000000002";
const OTHER_USER_ID = "00000000-0000-0000-0000-000000000003";
const results = [];
/**
 * Helper to make API requests with auth headers
 */
async function apiRequest(endpoint, options = {}, userId = TEST_USER_ID, teamId) {
    const headers = Object.assign({ "Content-Type": "application/json", "x-user-id": userId }, (options.headers || {}));
    if (teamId) {
        headers["x-team-id"] = teamId;
    }
    const response = await fetch(`${BASE_URL}${endpoint}`, Object.assign(Object.assign({}, options), { headers }));
    const text = await response.text();
    let data;
    try {
        data = text ? JSON.parse(text) : null;
    }
    catch (_e) {
        data = text;
    }
    return { response, data };
}
/**
 * Test: Create a private filter
 */
async function testCreatePrivateFilter() {
    console.log("📝 Testing: Create private filter...");
    const rules = [
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
    try {
        const { response, data } = await apiRequest("/api/filters", {
            method: "POST",
            body: JSON.stringify({
                name: "E2E Test Filter - Private",
                description: "Created by end-to-end test",
                visibility: "private",
                rules,
            }),
        });
        if (response.status === 201 && data.id) {
            results.push({
                name: "Create private filter",
                passed: true,
                details: { id: data.id, name: data.name },
            });
            console.log("  ✅ Created filter:", data.id);
            return data.id;
        }
        else {
            results.push({
                name: "Create private filter",
                passed: false,
                error: `Expected 201, got ${response.status}`,
                details: data,
            });
            console.log("  ❌ Failed:", data);
            return null;
        }
    }
    catch (error) {
        results.push({
            name: "Create private filter",
            passed: false,
            error: error instanceof Error ? error.message : String(error),
        });
        console.log("  ❌ Error:", error);
        return null;
    }
}
/**
 * Test: Create a team filter
 */
async function testCreateTeamFilter() {
    console.log("📝 Testing: Create team filter...");
    const rules = [
        {
            field: "capabilities",
            operator: "contains",
            value: "reasoning",
            type: "hard",
        },
    ];
    try {
        const { response, data } = await apiRequest("/api/filters", {
            method: "POST",
            body: JSON.stringify({
                name: "E2E Test Filter - Team",
                description: "Team filter for testing",
                visibility: "team",
                teamId: TEST_TEAM_ID,
                rules,
            }),
        }, TEST_USER_ID, TEST_TEAM_ID);
        if (response.status === 201 && data.id && data.teamId === TEST_TEAM_ID) {
            results.push({
                name: "Create team filter",
                passed: true,
                details: { id: data.id, teamId: data.teamId },
            });
            console.log("  ✅ Created team filter:", data.id);
            return data.id;
        }
        else {
            results.push({
                name: "Create team filter",
                passed: false,
                error: `Expected 201 with teamId, got ${response.status}`,
                details: data,
            });
            console.log("  ❌ Failed:", data);
            return null;
        }
    }
    catch (error) {
        results.push({
            name: "Create team filter",
            passed: false,
            error: error instanceof Error ? error.message : String(error),
        });
        console.log("  ❌ Error:", error);
        return null;
    }
}
/**
 * Test: Validation - reject empty rules
 */
async function testValidationEmptyRules() {
    console.log("📝 Testing: Validation - empty rules...");
    try {
        const { response, data } = await apiRequest("/api/filters", {
            method: "POST",
            body: JSON.stringify({
                name: "Invalid Filter",
                rules: [],
            }),
        });
        if (response.status === 400) {
            results.push({
                name: "Validation - reject empty rules",
                passed: true,
            });
            console.log("  ✅ Correctly rejected empty rules");
        }
        else {
            results.push({
                name: "Validation - reject empty rules",
                passed: false,
                error: `Expected 400, got ${response.status}`,
                details: data,
            });
            console.log("  ❌ Should have rejected empty rules");
        }
    }
    catch (error) {
        results.push({
            name: "Validation - reject empty rules",
            passed: false,
            error: error instanceof Error ? error.message : String(error),
        });
        console.log("  ❌ Error:", error);
    }
}
/**
 * Test: Validation - require teamId for team visibility
 */
async function testValidationTeamId() {
    console.log("📝 Testing: Validation - require teamId for team visibility...");
    try {
        const { response, data } = await apiRequest("/api/filters", {
            method: "POST",
            body: JSON.stringify({
                name: "Invalid Team Filter",
                visibility: "team",
                rules: [
                    { field: "provider", operator: "eq", value: "openai", type: "hard" },
                ],
            }),
        });
        if (response.status === 400) {
            results.push({
                name: "Validation - require teamId",
                passed: true,
            });
            console.log("  ✅ Correctly required teamId for team visibility");
        }
        else {
            results.push({
                name: "Validation - require teamId",
                passed: false,
                error: `Expected 400, got ${response.status}`,
                details: data,
            });
            console.log("  ❌ Should have required teamId");
        }
    }
    catch (error) {
        results.push({
            name: "Validation - require teamId",
            passed: false,
            error: error instanceof Error ? error.message : String(error),
        });
        console.log("  ❌ Error:", error);
    }
}
/**
 * Test: List filters
 */
async function testListFilters() {
    console.log("📝 Testing: List filters...");
    try {
        const { response, data } = await apiRequest("/api/filters?page=1&pageSize=20");
        if (response.status === 200 &&
            Array.isArray(data.filters) &&
            typeof data.total === "number") {
            results.push({
                name: "List filters",
                passed: true,
                details: { count: data.filters.length, total: data.total },
            });
            console.log(`  ✅ Listed ${data.filters.length} filters (total: ${data.total})`);
        }
        else {
            results.push({
                name: "List filters",
                passed: false,
                error: `Expected 200 with filters array, got ${response.status}`,
                details: data,
            });
            console.log("  ❌ Failed:", data);
        }
    }
    catch (error) {
        results.push({
            name: "List filters",
            passed: false,
            error: error instanceof Error ? error.message : String(error),
        });
        console.log("  ❌ Error:", error);
    }
}
/**
 * Test: Get single filter
 */
async function testGetFilter(filterId) {
    console.log("📝 Testing: Get single filter...");
    try {
        const { response, data } = await apiRequest(`/api/filters/${filterId}`);
        if (response.status === 200 && data.id === filterId) {
            results.push({
                name: "Get single filter",
                passed: true,
                details: { id: data.id, name: data.name },
            });
            console.log("  ✅ Retrieved filter:", data.name);
        }
        else {
            results.push({
                name: "Get single filter",
                passed: false,
                error: `Expected 200, got ${response.status}`,
                details: data,
            });
            console.log("  ❌ Failed:", data);
        }
    }
    catch (error) {
        results.push({
            name: "Get single filter",
            passed: false,
            error: error instanceof Error ? error.message : String(error),
        });
        console.log("  ❌ Error:", error);
    }
}
/**
 * Test: Update filter
 */
async function testUpdateFilter(filterId) {
    console.log("📝 Testing: Update filter...");
    try {
        const { response, data } = await apiRequest(`/api/filters/${filterId}`, {
            method: "PUT",
            body: JSON.stringify({
                name: "E2E Test Filter - Updated",
                description: "Updated by end-to-end test",
            }),
        });
        if (response.status === 200 && data.name === "E2E Test Filter - Updated") {
            results.push({
                name: "Update filter",
                passed: true,
                details: { id: data.id, name: data.name },
            });
            console.log("  ✅ Updated filter:", data.name);
        }
        else {
            results.push({
                name: "Update filter",
                passed: false,
                error: `Expected 200, got ${response.status}`,
                details: data,
            });
            console.log("  ❌ Failed:", data);
        }
    }
    catch (error) {
        results.push({
            name: "Update filter",
            passed: false,
            error: error instanceof Error ? error.message : String(error),
        });
        console.log("  ❌ Error:", error);
    }
}
/**
 * Test: Access control - non-owner cannot update
 */
async function testAccessControlUpdate(filterId) {
    console.log("📝 Testing: Access control - non-owner cannot update...");
    try {
        const { response, data } = await apiRequest(`/api/filters/${filterId}`, {
            method: "PUT",
            body: JSON.stringify({
                name: "Hacked Name",
            }),
        }, OTHER_USER_ID);
        if (response.status === 403) {
            results.push({
                name: "Access control - update forbidden",
                passed: true,
            });
            console.log("  ✅ Correctly blocked non-owner update");
        }
        else {
            results.push({
                name: "Access control - update forbidden",
                passed: false,
                error: `Expected 403, got ${response.status}`,
                details: data,
            });
            console.log("  ❌ Should have blocked non-owner");
        }
    }
    catch (error) {
        results.push({
            name: "Access control - update forbidden",
            passed: false,
            error: error instanceof Error ? error.message : String(error),
        });
        console.log("  ❌ Error:", error);
    }
}
/**
 * Test: Evaluate filter
 */
async function testEvaluateFilter(filterId) {
    console.log("📝 Testing: Evaluate filter...");
    try {
        // Get initial usage stats
        const { data: beforeData } = await apiRequest(`/api/filters/${filterId}`);
        const usageCountBefore = beforeData.usageCount;
        // Evaluate filter
        const { response, data } = await apiRequest(`/api/filters/${filterId}/evaluate`, {
            method: "POST",
            body: JSON.stringify({
                limit: 10,
            }),
        });
        if (response.status === 200 &&
            data.filterId === filterId &&
            Array.isArray(data.results)) {
            // Verify usage stats updated
            const { data: afterData } = await apiRequest(`/api/filters/${filterId}`);
            if (afterData.usageCount === usageCountBefore + 1 &&
                afterData.lastUsedAt !== null) {
                results.push({
                    name: "Evaluate filter & update stats",
                    passed: true,
                    details: {
                        matchCount: data.matchCount,
                        totalEvaluated: data.totalEvaluated,
                        usageCount: afterData.usageCount,
                    },
                });
                console.log(`  ✅ Evaluated: ${data.matchCount}/${data.totalEvaluated} matches, usage: ${afterData.usageCount}`);
            }
            else {
                results.push({
                    name: "Evaluate filter & update stats",
                    passed: false,
                    error: "Usage stats not updated correctly",
                    details: { before: usageCountBefore, after: afterData.usageCount },
                });
                console.log("  ❌ Usage stats not updated");
            }
        }
        else {
            results.push({
                name: "Evaluate filter & update stats",
                passed: false,
                error: `Expected 200, got ${response.status}`,
                details: data,
            });
            console.log("  ❌ Failed:", data);
        }
    }
    catch (error) {
        results.push({
            name: "Evaluate filter & update stats",
            passed: false,
            error: error instanceof Error ? error.message : String(error),
        });
        console.log("  ❌ Error:", error);
    }
}
/**
 * Test: Deterministic evaluation results
 */
async function testDeterministicEvaluation(filterId) {
    console.log("📝 Testing: Deterministic evaluation results...");
    try {
        // Evaluate twice with same parameters
        const { data: result1 } = await apiRequest(`/api/filters/${filterId}/evaluate`, {
            method: "POST",
            body: JSON.stringify({ limit: 5 }),
        });
        const { data: result2 } = await apiRequest(`/api/filters/${filterId}/evaluate`, {
            method: "POST",
            body: JSON.stringify({ limit: 5 }),
        });
        // Compare results (should be identical)
        const matches1 = result1.results.map((r) => ({
            id: r.modelId,
            match: r.match,
            score: r.score,
        }));
        const matches2 = result2.results.map((r) => ({
            id: r.modelId,
            match: r.match,
            score: r.score,
        }));
        const areIdentical = JSON.stringify(matches1) === JSON.stringify(matches2);
        if (areIdentical) {
            results.push({
                name: "Deterministic evaluation",
                passed: true,
                details: { evaluations: matches1.length },
            });
            console.log("  ✅ Evaluation results are deterministic");
        }
        else {
            results.push({
                name: "Deterministic evaluation",
                passed: false,
                error: "Results differ between evaluations",
                details: { result1: matches1, result2: matches2 },
            });
            console.log("  ❌ Results are not deterministic");
        }
    }
    catch (error) {
        results.push({
            name: "Deterministic evaluation",
            passed: false,
            error: error instanceof Error ? error.message : String(error),
        });
        console.log("  ❌ Error:", error);
    }
}
/**
 * Test: Team filter visibility
 */
async function testTeamVisibility(teamFilterId) {
    console.log("📝 Testing: Team filter visibility...");
    try {
        // Team member should access
        const { response: memberResponse } = await apiRequest(`/api/filters/${teamFilterId}`, {}, OTHER_USER_ID, TEST_TEAM_ID);
        // Non-team member should not access
        const { response: nonMemberResponse } = await apiRequest(`/api/filters/${teamFilterId}`, {}, OTHER_USER_ID, "different-team");
        if (memberResponse.status === 200 && nonMemberResponse.status === 403) {
            results.push({
                name: "Team filter visibility",
                passed: true,
            });
            console.log("  ✅ Team visibility enforced correctly");
        }
        else {
            results.push({
                name: "Team filter visibility",
                passed: false,
                error: `Expected 200 for member and 403 for non-member, got ${memberResponse.status} and ${nonMemberResponse.status}`,
            });
            console.log("  ❌ Team visibility not enforced:", memberResponse.status, nonMemberResponse.status);
        }
    }
    catch (error) {
        results.push({
            name: "Team filter visibility",
            passed: false,
            error: error instanceof Error ? error.message : String(error),
        });
        console.log("  ❌ Error:", error);
    }
}
/**
 * Test: Delete filter
 */
async function testDeleteFilter(filterId) {
    console.log("📝 Testing: Delete filter...");
    try {
        const { response, data } = await apiRequest(`/api/filters/${filterId}`, {
            method: "DELETE",
        });
        if (response.status === 200 && data.success === true) {
            // Verify it's gone
            const { response: getResponse } = await apiRequest(`/api/filters/${filterId}`);
            if (getResponse.status === 404) {
                results.push({
                    name: "Delete filter",
                    passed: true,
                });
                console.log("  ✅ Filter deleted successfully");
            }
            else {
                results.push({
                    name: "Delete filter",
                    passed: false,
                    error: "Filter still exists after deletion",
                });
                console.log("  ❌ Filter not deleted");
            }
        }
        else {
            results.push({
                name: "Delete filter",
                passed: false,
                error: `Expected 200, got ${response.status}`,
                details: data,
            });
            console.log("  ❌ Failed:", data);
        }
    }
    catch (error) {
        results.push({
            name: "Delete filter",
            passed: false,
            error: error instanceof Error ? error.message : String(error),
        });
        console.log("  ❌ Error:", error);
    }
}
/**
 * Main test runner
 */
async function runTests() {
    console.log("\n🧪 Starting End-to-End API Tests\n");
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Test User: ${TEST_USER_ID}\n`);
    // Create filters for testing
    const privateFilterId = await testCreatePrivateFilter();
    const teamFilterId = await testCreateTeamFilter();
    // Validation tests
    await testValidationEmptyRules();
    await testValidationTeamId();
    // CRUD tests
    await testListFilters();
    if (privateFilterId) {
        await testGetFilter(privateFilterId);
        await testUpdateFilter(privateFilterId);
        await testAccessControlUpdate(privateFilterId);
        await testEvaluateFilter(privateFilterId);
        await testDeterministicEvaluation(privateFilterId);
    }
    // Team visibility test
    if (teamFilterId) {
        await testTeamVisibility(teamFilterId);
    }
    // Cleanup
    if (privateFilterId) {
        await testDeleteFilter(privateFilterId);
    }
    if (teamFilterId) {
        await testDeleteFilter(teamFilterId);
    }
    // Print results
    console.log("\n📊 Test Results:\n");
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    results.forEach((result) => {
        const icon = result.passed ? "✅" : "❌";
        console.log(`${icon} ${result.name}`);
        if (!result.passed && result.error) {
            console.log(`   Error: ${result.error}`);
        }
    });
    console.log(`\n${passed} passed, ${failed} failed (${results.length} total)\n`);
    if (failed > 0) {
        console.log("❌ Some tests failed. See details above.\n");
        process.exit(1);
    }
    else {
        console.log("✅ All tests passed!\n");
        process.exit(0);
    }
}
// Run tests
runTests().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
export {};
