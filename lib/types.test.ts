import { describe, expect, it } from 'vitest';
import type { Model, RawModel } from './types';

describe('Types', () => {
  describe('Model interface', () => {
    it('should accept valid model data', () => {
      const model: Model = {
        id: 'gpt-4',
        name: 'gpt-4',
        provider: 'OpenAI',
        contextWindow: 128000,
        maxOutputTokens: 4096,
        inputCost: 0.03,
        outputCost: 0.06,
        cacheReadCost: 0.015,
        modalities: ['text'],
        capabilities: ['chat'],
        releaseDate: '2023-03-01',
        lastUpdated: '2023-03-01',
        openWeights: false,
        supportsTemperature: true,
        supportsAttachments: false
      };

      expect(model.id).toBe('gpt-4');
      expect(model.name).toBe('gpt-4');
      expect(model.provider).toBe('OpenAI');
      expect(model.contextWindow).toBe(128000);
      expect(model.maxOutputTokens).toBe(4096);
      expect(model.inputCost).toBe(0.03);
      expect(model.outputCost).toBe(0.06);
      expect(model.cacheReadCost).toBe(0.015);
      expect(model.modalities).toEqual(['text']);
      expect(model.capabilities).toEqual(['chat']);
      expect(model.releaseDate).toBe('2023-03-01');
      expect(model.lastUpdated).toBe('2023-03-01');
      expect(model.openWeights).toBe(false);
      expect(model.supportsTemperature).toBe(true);
      expect(model.supportsAttachments).toBe(false);
    });

    it('should allow empty arrays for modalities and capabilities', () => {
      const model: Model = {
        id: 'test-model',
        name: 'test-model',
        provider: 'Test',
        contextWindow: 1000,
        maxOutputTokens: 100,
        inputCost: 0.01,
        outputCost: 0.02,
        cacheReadCost: 0,
        modalities: [],
        capabilities: [],
        releaseDate: '2023-01-01',
        lastUpdated: '2023-01-01',
        openWeights: false,
        supportsTemperature: false,
        supportsAttachments: false
      };

      expect(model.modalities).toEqual([]);
      expect(model.capabilities).toEqual([]);
    });
  });

  describe('RawModel interface', () => {
    it('should accept raw API data', () => {
      const rawModel: RawModel = {
        name: 'gpt-4',
        provider: 'OpenAI',
        contextWindow: 128000,
        inputCost: 0.03,
        modalities: ['text'],
        capabilities: ['chat'],
        releaseDate: '2023-03-01'
      };

      expect(rawModel.name).toBe('gpt-4');
      expect(rawModel.provider).toBe('OpenAI');
      expect(rawModel.contextWindow).toBe(128000);
      expect(rawModel.inputCost).toBe(0.03);
      expect(rawModel.modalities).toEqual(['text']);
      expect(rawModel.capabilities).toEqual(['chat']);
      expect(rawModel.releaseDate).toBe('2023-03-01');
    });
  });
});
