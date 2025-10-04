import { describe, expect, it } from 'vitest';
import { Effect } from 'effect';
import { FilterService, type Filters } from './FilterService';
import { FilterServiceLive } from './FilterServiceLive';
import type { Model } from '../types';

describe('FilterService', () => {
  const mockModels: Model[] = [
    {
      id: 'gpt-4',
      name: 'gpt-4',
      provider: 'OpenAI',
      contextWindow: 128000,
      maxOutputTokens: 4096,
      inputCost: 0.03,
      outputCost: 0.06,
      cacheReadCost: 0.015,
      cacheWriteCost: 0.03,
      modalities: ['text'],
      capabilities: ['chat'],
      releaseDate: '2023-03-01',
      lastUpdated: '2023-03-01',
      knowledge: '2023-04',
      openWeights: false,
      supportsTemperature: true,
      supportsAttachments: false,
      new: false
    },
    {
      id: 'claude-3',
      name: 'claude-3',
      provider: 'Anthropic',
      contextWindow: 200000,
      maxOutputTokens: 4096,
      inputCost: 0.015,
      outputCost: 0.075,
      cacheReadCost: 0.0075,
      cacheWriteCost: 0.015,
      modalities: ['text', 'image'],
      capabilities: ['chat', 'reasoning'],
      releaseDate: '2023-06-01',
      lastUpdated: '2023-06-01',
      knowledge: '2023-08',
      openWeights: false,
      supportsTemperature: true,
      supportsAttachments: true,
      new: false
    },
    {
      id: 'dall-e-3',
      name: 'dall-e-3',
      provider: 'OpenAI',
      contextWindow: 0,
      maxOutputTokens: 0,
      inputCost: 0.08,
      outputCost: 0.08,
      cacheReadCost: 0,
      cacheWriteCost: 0,
      modalities: ['image'],
      capabilities: ['generation'],
      releaseDate: '2023-09-01',
      lastUpdated: '2023-09-01',
      knowledge: '',
      openWeights: false,
      supportsTemperature: false,
      supportsAttachments: false,
      new: false
    }
  ];

  describe('applyFilters', () => {
    it('should return all models when no filters applied', async () => {
      const filters: Filters = {
        providers: [],
        inputCostRange: [0, 1000],
        outputCostRange: [0, 1000],
        cacheReadCostRange: [0, 1000],
        cacheWriteCostRange: [0, 1000],
        modalities: [],
        capabilities: [],
        years: [],
        openWeights: null,
        supportsTemperature: null,
        supportsAttachments: null
      };

      const program = Effect.gen(function* () {
        const service = yield* FilterService;
        return yield* service.applyFilters(mockModels, '', filters);
      }).pipe(Effect.provide(FilterServiceLive));

      const result = await Effect.runPromise(program);
      expect(result).toHaveLength(3);
    });

    it('should filter by search term', async () => {
      const filters: Filters = {
        providers: [],
        inputCostRange: [0, 1000],
        outputCostRange: [0, 1000],
        cacheReadCostRange: [0, 1000],
        cacheWriteCostRange: [0, 1000],
        modalities: [],
        capabilities: [],
        years: [],
        openWeights: null,
        supportsTemperature: null,
        supportsAttachments: null
      };

      const program = Effect.gen(function* () {
        const service = yield* FilterService;
        return yield* service.applyFilters(mockModels, 'gpt', filters);
      }).pipe(Effect.provide(FilterServiceLive));

      const result = await Effect.runPromise(program);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('gpt-4');
    });

    it('should filter by provider', async () => {
      const filters: Filters = {
        providers: ['OpenAI'],
        inputCostRange: [0, 1000],
        outputCostRange: [0, 1000],
        cacheReadCostRange: [0, 1000],
        cacheWriteCostRange: [0, 1000],
        modalities: [],
        capabilities: [],
        years: [],
        openWeights: null,
        supportsTemperature: null,
        supportsAttachments: null
      };

      const program = Effect.gen(function* () {
        const service = yield* FilterService;
        return yield* service.applyFilters(mockModels, '', filters);
      }).pipe(Effect.provide(FilterServiceLive));

      const result = await Effect.runPromise(program);
      expect(result).toHaveLength(2);
      expect(result.every(m => m.provider === 'OpenAI')).toBe(true);
    });

    it('should filter by cost range', async () => {
      const filters: Filters = {
        providers: [],
        inputCostRange: [0.01, 0.05],
        outputCostRange: [0, 1000],
        cacheReadCostRange: [0, 1000],
        cacheWriteCostRange: [0, 1000],
        modalities: [],
        capabilities: [],
        years: [],
        openWeights: null,
        supportsTemperature: null,
        supportsAttachments: null
      };

      const program = Effect.gen(function* () {
        const service = yield* FilterService;
        return yield* service.applyFilters(mockModels, '', filters);
      }).pipe(Effect.provide(FilterServiceLive));

      const result = await Effect.runPromise(program);
      expect(result).toHaveLength(2);
      expect(result.every(m => m.inputCost >= 0.01 && m.inputCost <= 0.05)).toBe(true);
    });

    it('should filter by modalities', async () => {
      const filters: Filters = {
        providers: [],
        inputCostRange: [0, 1000],
        outputCostRange: [0, 1000],
        cacheReadCostRange: [0, 1000],
        cacheWriteCostRange: [0, 1000],
        modalities: ['image'],
        capabilities: [],
        years: [],
        openWeights: null,
        supportsTemperature: null,
        supportsAttachments: null
      };

      const program = Effect.gen(function* () {
        const service = yield* FilterService;
        return yield* service.applyFilters(mockModels, '', filters);
      }).pipe(Effect.provide(FilterServiceLive));

      const result = await Effect.runPromise(program);
      expect(result).toHaveLength(2);
      expect(result.every(m => m.modalities.includes('image'))).toBe(true);
    });

    it('should filter by capabilities', async () => {
      const filters: Filters = {
        providers: [],
        inputCostRange: [0, 1000],
        outputCostRange: [0, 1000],
        cacheReadCostRange: [0, 1000],
        cacheWriteCostRange: [0, 1000],
        modalities: [],
        capabilities: ['reasoning'],
        years: [],
        openWeights: null,
        supportsTemperature: null,
        supportsAttachments: null
      };

      const program = Effect.gen(function* () {
        const service = yield* FilterService;
        return yield* service.applyFilters(mockModels, '', filters);
      }).pipe(Effect.provide(FilterServiceLive));

      const result = await Effect.runPromise(program);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('claude-3');
    });

    it('should sort by cost ascending', async () => {
      const filters: Filters = {
        providers: [],
        inputCostRange: [0, 1000],
        outputCostRange: [0, 1000],
        cacheReadCostRange: [0, 1000],
        cacheWriteCostRange: [0, 1000],
        modalities: [],
        capabilities: [],
        years: [],
        openWeights: null,
        supportsTemperature: null,
        supportsAttachments: null
      };

      const program = Effect.gen(function* () {
        const service = yield* FilterService;
        return yield* service.applyFilters(mockModels, '', filters);
      }).pipe(Effect.provide(FilterServiceLive));

      const result = await Effect.runPromise(program);
      expect(result[0].inputCost).toBeLessThanOrEqual(result[1].inputCost);
      expect(result[1].inputCost).toBeLessThanOrEqual(result[2].inputCost);
    });
  });

  describe('validateFilters', () => {
    it('should return valid filters', async () => {
      const partialFilters = {
        inputCostRange: [0.01, 0.05] as [number, number],
        outputCostRange: [0.01, 0.05] as [number, number]
      };

      const program = Effect.gen(function* () {
        const service = yield* FilterService;
        return yield* service.validateFilters(partialFilters);
      }).pipe(Effect.provide(FilterServiceLive));

      const result = await Effect.runPromise(program);
      expect(result.inputCostRange).toEqual([0.01, 0.05]);
      expect(result.outputCostRange).toEqual([0.01, 0.05]);
      expect(result.providers).toEqual([]);
      expect(result.modalities).toEqual([]);
      expect(result.capabilities).toEqual([]);
    });

    it('should return default filters when validation fails', async () => {
      const partialFilters = {
        inputCostRange: [0.05, 0.01] as [number, number] // Invalid: min > max
      };

      const program = Effect.gen(function* () {
        const service = yield* FilterService;
        return yield* service.validateFilters(partialFilters);
      }).pipe(Effect.provide(FilterServiceLive));

      const result = await Effect.runPromise(program);
      expect(result.inputCostRange).toEqual([0, 1000]); // Should return defaults
      expect(result.providers).toEqual([]);
    });
  });
});
