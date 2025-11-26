import { describe, expect, it } from "vitest"
import type { RuleClause } from "../db/schema"
import {
    type EvaluationResult,
    type ModelMetadata,
    evaluateFilterAgainstModel,
    formatEvaluationResult,
} from "./filters"

describe("filters", () => {
	const mockModel: ModelMetadata = {
		id: "test-model",
		name: "Test Model",
		provider: "TestProvider",
		inputCost: 10,
		outputCost: 20,
		cacheReadCost: 5,
		cacheWriteCost: 10,
		contextWindow: 1000,
		maxOutputTokens: 500,
		modalities: ["text", "image"],
		capabilities: ["chat"],
		releaseDate: "2023-01-01",
		lastUpdated: "2023-01-01",
		knowledge: "2023-01",
		openWeights: false,
		supportsTemperature: true,
		supportsAttachments: false,
		new: false,
		nested: {
			field: "value",
			number: 100,
		},
	}

	describe("evaluateFilterAgainstModel", () => {
		it("should pass when no rules are provided", () => {
			const result = evaluateFilterAgainstModel([], mockModel)
			expect(result.match).toBe(true)
			expect(result.score).toBe(0)
		})

		describe("Hard Clauses", () => {
			it("should pass exact match (eq)", () => {
				const rules: RuleClause[] = [
					{
						type: "hard",
						field: "provider",
						operator: "eq",
						value: "TestProvider",
					},
				]
				const result = evaluateFilterAgainstModel(rules, mockModel)
				expect(result.match).toBe(true)
				expect(result.failedHardClauses).toBe(0)
			})

			it("should fail mismatch (eq)", () => {
				const rules: RuleClause[] = [
					{
						type: "hard",
						field: "provider",
						operator: "eq",
						value: "OtherProvider",
					},
				]
				const result = evaluateFilterAgainstModel(rules, mockModel)
				expect(result.match).toBe(false)
				expect(result.failedHardClauses).toBe(1)
			})

			it("should pass inequality (ne)", () => {
				const rules: RuleClause[] = [
					{
						type: "hard",
						field: "provider",
						operator: "ne",
						value: "OtherProvider",
					},
				]
				const result = evaluateFilterAgainstModel(rules, mockModel)
				expect(result.match).toBe(true)
			})

			it("should handle numeric comparisons (gt, gte, lt, lte)", () => {
				const rules: RuleClause[] = [
					{
						type: "hard",
						field: "inputCost",
						operator: "gt",
						value: 5,
					},
					{
						type: "hard",
						field: "inputCost",
						operator: "gte",
						value: 10,
					},
					{
						type: "hard",
						field: "inputCost",
						operator: "lt",
						value: 15,
					},
					{
						type: "hard",
						field: "inputCost",
						operator: "lte",
						value: 10,
					},
				]
				const result = evaluateFilterAgainstModel(rules, mockModel)
				expect(result.match).toBe(true)
			})

			it("should handle 'in' operator", () => {
				const rules: RuleClause[] = [
					{
						type: "hard",
						field: "provider",
						operator: "in",
						value: ["TestProvider", "Other"],
					},
				]
				const result = evaluateFilterAgainstModel(rules, mockModel)
				expect(result.match).toBe(true)
			})

			it("should handle 'contains' operator for arrays", () => {
				const rules: RuleClause[] = [
					{
						type: "hard",
						field: "modalities",
						operator: "contains",
						value: "image",
					},
				]
				const result = evaluateFilterAgainstModel(rules, mockModel)
				expect(result.match).toBe(true)
			})

			it("should handle nested fields", () => {
				const rules: RuleClause[] = [
					{
						type: "hard",
						field: "nested.field",
						operator: "eq",
						value: "value",
					},
				]
				const result = evaluateFilterAgainstModel(rules, mockModel)
				expect(result.match).toBe(true)
			})
		})

		describe("Soft Clauses", () => {
			it("should calculate score correctly", () => {
				const rules: RuleClause[] = [
					{
						type: "soft",
						field: "provider",
						operator: "eq",
						value: "TestProvider",
						weight: 1,
					},
					{
						type: "soft",
						field: "provider",
						operator: "eq",
						value: "Other",
						weight: 1,
					},
				]
				const result = evaluateFilterAgainstModel(rules, mockModel)
				expect(result.match).toBe(true)
				expect(result.score).toBe(0.5) // 1 passed out of 2 total weight
				expect(result.passedSoftClauses).toBe(1)
				expect(result.totalSoftClauses).toBe(2)
			})

			it("should handle weighted scores", () => {
				const rules: RuleClause[] = [
					{
						type: "soft",
						field: "provider",
						operator: "eq",
						value: "TestProvider",
						weight: 3,
					},
					{
						type: "soft",
						field: "provider",
						operator: "eq",
						value: "Other",
						weight: 1,
					},
				]
				const result = evaluateFilterAgainstModel(rules, mockModel)
				expect(result.match).toBe(true)
				expect(result.score).toBe(0.75) // 3 passed out of 4 total weight
			})
		})
	})

	describe("formatEvaluationResult", () => {
		it("should format rejection", () => {
			const result: EvaluationResult = {
				match: false,
				score: 0,
				failedHardClauses: 2,
				passedSoftClauses: 0,
				totalSoftClauses: 0,
				rationale: "failed",
			}
			expect(formatEvaluationResult(result)).toContain("Filter rejected")
			expect(formatEvaluationResult(result)).toContain("2 hard clause(s) failed")
		})

		it("should format pass with hard clauses only", () => {
			const result: EvaluationResult = {
				match: true,
				score: 0,
				failedHardClauses: 0,
				passedSoftClauses: 0,
				totalSoftClauses: 0,
				rationale: "passed",
			}
			expect(formatEvaluationResult(result)).toContain(
				"Filter passed (hard clauses only)",
			)
		})

		it("should format pass with score", () => {
			const result: EvaluationResult = {
				match: true,
				score: 0.75,
				failedHardClauses: 0,
				passedSoftClauses: 3,
				totalSoftClauses: 4,
				rationale: "passed",
			}
			expect(formatEvaluationResult(result)).toContain("Filter passed with score 75.0%")
			expect(formatEvaluationResult(result)).toContain("(3/4 soft clauses)")
		})
	})
})
