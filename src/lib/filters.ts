import type { RuleClause } from "../db/schema.js"

/**
 * Model metadata structure for filter evaluation
 */
export interface ModelMetadata {
	id: string
	name: string
	provider: string
	inputCost: number
	outputCost: number
	cacheReadCost: number
	cacheWriteCost: number
	contextWindow: number
	maxOutputTokens: number
	modalities: string[]
	capabilities: string[]
	releaseDate: string
	lastUpdated: string
	knowledge: string
	openWeights: boolean
	supportsTemperature: boolean
	supportsAttachments: boolean
	new: boolean
	[key: string]: unknown
}

/**
 * Evaluation result with match status and score
 */
export interface EvaluationResult {
	/** Whether all hard clauses passed */
	match: boolean
	/** Total score from soft clauses (0-1 range) */
	score: number
	/** Number of hard clauses that failed */
	failedHardClauses: number
	/** Number of soft clauses that passed */
	passedSoftClauses: number
	/** Total soft clauses evaluated */
	totalSoftClauses: number
	/** Human-readable explanation */
	rationale: string
}

/**
 * Get nested field value from object using dot notation
 * @param obj - Object to query
 * @param path - Dot-separated path (e.g., "cost.input")
 */
function getFieldValue(obj: Record<string, unknown>, path: string): unknown {
	const parts = path.split(".")
	let value: unknown = obj
	for (const part of parts) {
		if (value && typeof value === "object" && part in value) {
			value = (value as Record<string, unknown>)[part]
		} else {
			return undefined
		}
	}
	return value
}

/**
 * Evaluate a single rule clause against a model
 * @param clause - Rule clause to evaluate
 * @param model - Model metadata to test
 */
function evaluateClause(clause: RuleClause, model: ModelMetadata): boolean {
	const fieldValue = getFieldValue(
		model as Record<string, unknown>,
		clause.field,
	)

	switch (clause.operator) {
		case "eq":
			return fieldValue === clause.value
		case "ne":
			return fieldValue !== clause.value
		case "gt":
			return (
				typeof fieldValue === "number" &&
				typeof clause.value === "number" &&
				fieldValue > clause.value
			)
		case "gte":
			return (
				typeof fieldValue === "number" &&
				typeof clause.value === "number" &&
				fieldValue >= clause.value
			)
		case "lt":
			return (
				typeof fieldValue === "number" &&
				typeof clause.value === "number" &&
				fieldValue < clause.value
			)
		case "lte":
			return (
				typeof fieldValue === "number" &&
				typeof clause.value === "number" &&
				fieldValue <= clause.value
			)
		case "in":
			return Array.isArray(clause.value) && clause.value.includes(fieldValue)
		case "contains":
			return Array.isArray(fieldValue) && fieldValue.includes(clause.value)
		default:
			return false
	}
}

/**
 * Evaluate filter rules against a model
 * @param rules - Array of rule clauses
 * @param model - Model metadata to evaluate
 */
export function evaluateFilterAgainstModel(
	rules: RuleClause[],
	model: ModelMetadata,
): EvaluationResult {
	let failedHardClauses = 0
	let passedSoftClauses = 0
	let totalSoftClauses = 0
	let softScore = 0
	const reasons: string[] = []

	for (const clause of rules) {
		const passed = evaluateClause(clause, model)

		if (clause.type === "hard") {
			if (!passed) {
				failedHardClauses++
				reasons.push(
					`Hard clause failed: ${clause.field} ${clause.operator} ` +
						`${JSON.stringify(clause.value)}`,
				)
			}
		} else if (clause.type === "soft") {
			totalSoftClauses++
			if (passed) {
				passedSoftClauses++
				const weight = clause.weight ?? 1
				softScore += weight
				reasons.push(
					`Soft clause passed: ${clause.field} ` +
						`${clause.operator} ${JSON.stringify(clause.value)} ` +
						`(+${weight})`,
				)
			}
		}
	}

	// Normalize soft score (0-1 range)
	const totalWeight = rules
		.filter((r) => r.type === "soft")
		.reduce((sum, r) => sum + (r.weight ?? 1), 0)
	const normalizedScore = totalWeight > 0 ? softScore / totalWeight : 0

	const match = failedHardClauses === 0
	const rationale =
		reasons.length > 0
			? reasons.join("; ")
			: match
				? "All criteria passed"
				: "No matching criteria"

	return {
		match,
		score: normalizedScore,
		failedHardClauses,
		passedSoftClauses,
		totalSoftClauses,
		rationale,
	}
}

/**
 * Convert evaluation result to human-readable string
 * @param result - Evaluation result
 */
export function formatEvaluationResult(result: EvaluationResult): string {
	if (!result.match) {
		return (
			`❌ Filter rejected (${result.failedHardClauses} hard ` +
			`clause(s) failed)`
		)
	}
	if (result.totalSoftClauses === 0) {
		return "✓ Filter passed (hard clauses only)"
	}
	return (
		`✓ Filter passed with score ${(result.score * 100).toFixed(1)}% ` +
		`(${result.passedSoftClauses}/${result.totalSoftClauses} soft ` +
		`clauses)`
	)
}
