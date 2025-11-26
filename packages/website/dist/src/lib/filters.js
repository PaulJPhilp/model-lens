/**
 * Get nested field value from object using dot notation
 * @param obj - Object to query
 * @param path - Dot-separated path (e.g., "cost.input")
 */
function getFieldValue(obj, path) {
    const parts = path.split(".");
    let value = obj;
    for (const part of parts) {
        if (value && typeof value === "object" && part in value) {
            value = value[part];
        }
        else {
            return undefined;
        }
    }
    return value;
}
/**
 * Evaluate a single rule clause against a model
 * @param clause - Rule clause to evaluate
 * @param model - Model metadata to test
 */
function evaluateClause(clause, model) {
    const fieldValue = getFieldValue(model, clause.field);
    switch (clause.operator) {
        case "eq":
            return fieldValue === clause.value;
        case "ne":
            return fieldValue !== clause.value;
        case "gt":
            return (typeof fieldValue === "number" &&
                typeof clause.value === "number" &&
                fieldValue > clause.value);
        case "gte":
            return (typeof fieldValue === "number" &&
                typeof clause.value === "number" &&
                fieldValue >= clause.value);
        case "lt":
            return (typeof fieldValue === "number" &&
                typeof clause.value === "number" &&
                fieldValue < clause.value);
        case "lte":
            return (typeof fieldValue === "number" &&
                typeof clause.value === "number" &&
                fieldValue <= clause.value);
        case "in":
            return Array.isArray(clause.value) && clause.value.includes(fieldValue);
        case "contains":
            return Array.isArray(fieldValue) && fieldValue.includes(clause.value);
        default:
            return false;
    }
}
/**
 * Evaluate filter rules against a model
 * @param rules - Array of rule clauses
 * @param model - Model metadata to evaluate
 */
export function evaluateFilterAgainstModel(rules, model) {
    var _a;
    let failedHardClauses = 0;
    let passedSoftClauses = 0;
    let totalSoftClauses = 0;
    let softScore = 0;
    const reasons = [];
    for (const clause of rules) {
        const passed = evaluateClause(clause, model);
        if (clause.type === "hard") {
            if (!passed) {
                failedHardClauses++;
                reasons.push(`Hard clause failed: ${clause.field} ${clause.operator} ` +
                    `${JSON.stringify(clause.value)}`);
            }
        }
        else if (clause.type === "soft") {
            totalSoftClauses++;
            if (passed) {
                passedSoftClauses++;
                const weight = (_a = clause.weight) !== null && _a !== void 0 ? _a : 1;
                softScore += weight;
                reasons.push(`Soft clause passed: ${clause.field} ` +
                    `${clause.operator} ${JSON.stringify(clause.value)} ` +
                    `(+${weight})`);
            }
        }
    }
    // Normalize soft score (0-1 range)
    const totalWeight = rules
        .filter((r) => r.type === "soft")
        .reduce((sum, r) => { var _a; return sum + ((_a = r.weight) !== null && _a !== void 0 ? _a : 1); }, 0);
    const normalizedScore = totalWeight > 0 ? softScore / totalWeight : 0;
    const match = failedHardClauses === 0;
    const rationale = reasons.length > 0
        ? reasons.join("; ")
        : match
            ? "All criteria passed"
            : "No matching criteria";
    return {
        match,
        score: normalizedScore,
        failedHardClauses,
        passedSoftClauses,
        totalSoftClauses,
        rationale,
    };
}
/**
 * Convert evaluation result to human-readable string
 * @param result - Evaluation result
 */
export function formatEvaluationResult(result) {
    if (!result.match) {
        return (`❌ Filter rejected (${result.failedHardClauses} hard ` +
            `clause(s) failed)`);
    }
    if (result.totalSoftClauses === 0) {
        return "✓ Filter passed (hard clauses only)";
    }
    return (`✓ Filter passed with score ${(result.score * 100).toFixed(1)}% ` +
        `(${result.passedSoftClauses}/${result.totalSoftClauses} soft ` +
        `clauses)`);
}
