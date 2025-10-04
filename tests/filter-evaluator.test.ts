import { describe, it, expect } from 'vitest';
import {
  evaluateFilterAgainstModel,
  type ModelMetadata,
} from '../src/lib/filters.js';
import type { RuleClause } from '../src/db/schema.js';

const mockModel: ModelMetadata = {
  id: 'test-1',
  name: 'GPT-4',
  provider: 'openai',
  inputCost: 10.0,
  outputCost: 30.0,
  cacheReadCost: 2.0,
  cacheWriteCost: 5.0,
  contextWindow: 128000,
  maxOutputTokens: 4096,
  modalities: ['text', 'image'],
  capabilities: ['reasoning', 'tools'],
  releaseDate: '2023-03-14',
  lastUpdated: '2024-01-01',
  knowledge: '2023-12',
  openWeights: false,
  supportsTemperature: true,
  supportsAttachments: true,
  new: false,
};

describe('Filter Evaluator', () => {
  it('should pass when all hard clauses match', () => {
    const rules: RuleClause[] = [
      {
        field: 'provider',
        operator: 'eq',
        value: 'openai',
        type: 'hard',
      },
      {
        field: 'inputCost',
        operator: 'lte',
        value: 15,
        type: 'hard',
      },
    ];

    const result = evaluateFilterAgainstModel(rules, mockModel);

    expect(result.match).toBe(true);
    expect(result.failedHardClauses).toBe(0);
  });

  it('should fail when a hard clause does not match', () => {
    const rules: RuleClause[] = [
      {
        field: 'provider',
        operator: 'eq',
        value: 'anthropic',
        type: 'hard',
      },
    ];

    const result = evaluateFilterAgainstModel(rules, mockModel);

    expect(result.match).toBe(false);
    expect(result.failedHardClauses).toBe(1);
  });

  it('should calculate soft clause score correctly', () => {
    const rules: RuleClause[] = [
      {
        field: 'inputCost',
        operator: 'lte',
        value: 20,
        type: 'soft',
        weight: 0.6,
      },
      {
        field: 'capabilities',
        operator: 'contains',
        value: 'reasoning',
        type: 'soft',
        weight: 0.4,
      },
    ];

    const result = evaluateFilterAgainstModel(rules, mockModel);

    expect(result.match).toBe(true);
    expect(result.passedSoftClauses).toBe(2);
    expect(result.totalSoftClauses).toBe(2);
    expect(result.score).toBe(1.0); // Both passed
  });

  it('should handle partial soft clause matches', () => {
    const rules: RuleClause[] = [
      {
        field: 'inputCost',
        operator: 'lt',
        value: 5, // Fails (inputCost is 10)
        type: 'soft',
        weight: 0.5,
      },
      {
        field: 'capabilities',
        operator: 'contains',
        value: 'reasoning', // Passes
        type: 'soft',
        weight: 0.5,
      },
    ];

    const result = evaluateFilterAgainstModel(rules, mockModel);

    expect(result.match).toBe(true);
    expect(result.passedSoftClauses).toBe(1);
    expect(result.totalSoftClauses).toBe(2);
    expect(result.score).toBe(0.5); // Only one passed
  });

  it('should support "in" operator', () => {
    const rules: RuleClause[] = [
      {
        field: 'provider',
        operator: 'in',
        value: ['openai', 'anthropic', 'google'],
        type: 'hard',
      },
    ];

    const result = evaluateFilterAgainstModel(rules, mockModel);

    expect(result.match).toBe(true);
  });

  it('should support "contains" operator for arrays', () => {
    const rules: RuleClause[] = [
      {
        field: 'modalities',
        operator: 'contains',
        value: 'image',
        type: 'hard',
      },
    ];

    const result = evaluateFilterAgainstModel(rules, mockModel);

    expect(result.match).toBe(true);
  });

  it('should support comparison operators', () => {
    const rules: RuleClause[] = [
      {
        field: 'inputCost',
        operator: 'gt',
        value: 5,
        type: 'hard',
      },
      {
        field: 'outputCost',
        operator: 'gte',
        value: 30,
        type: 'hard',
      },
      {
        field: 'cacheReadCost',
        operator: 'lt',
        value: 3,
        type: 'hard',
      },
    ];

    const result = evaluateFilterAgainstModel(rules, mockModel);

    expect(result.match).toBe(true);
  });

  it('should handle mixed hard and soft clauses', () => {
    const rules: RuleClause[] = [
      {
        field: 'provider',
        operator: 'eq',
        value: 'openai',
        type: 'hard',
      },
      {
        field: 'inputCost',
        operator: 'lte',
        value: 15,
        type: 'soft',
        weight: 1.0,
      },
    ];

    const result = evaluateFilterAgainstModel(rules, mockModel);

    expect(result.match).toBe(true);
    expect(result.failedHardClauses).toBe(0);
    expect(result.passedSoftClauses).toBe(1);
    expect(result.score).toBe(1.0);
  });

  it('should fail overall when hard clause fails despite soft passes', () => {
    const rules: RuleClause[] = [
      {
        field: 'provider',
        operator: 'eq',
        value: 'anthropic', // Fails
        type: 'hard',
      },
      {
        field: 'inputCost',
        operator: 'lte',
        value: 15, // Passes
        type: 'soft',
        weight: 1.0,
      },
    ];

    const result = evaluateFilterAgainstModel(rules, mockModel);

    expect(result.match).toBe(false);
    expect(result.failedHardClauses).toBe(1);
    expect(result.passedSoftClauses).toBe(1);
  });
});
