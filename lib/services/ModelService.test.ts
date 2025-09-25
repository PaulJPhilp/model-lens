import { describe, expect, it, vi } from 'vitest';
import { Effect } from 'effect';
import { ModelService, ModelServiceLive } from './ModelService';

describe('ModelService', () => {
  it('should fetch models successfully', async () => {
    const mockData = { models: [{ name: 'gpt-4', provider: 'OpenAI', contextWindow: 128000, inputCost: 0.03, modalities: ['text'], capabilities: ['chat'], releaseDate: '2023-03-01' }] };
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockData),
      })
    ) as any;

    const program = Effect.gen(function* () {
      const service = yield* ModelService;
      return yield* service.fetchModels;
    }).pipe(Effect.provide(ModelServiceLive));

    const result = await Effect.runPromise(program);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('gpt-4');
  });

  it('should handle API error', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('API error'))) as any;

    const program = Effect.gen(function* () {
      const service = yield* ModelService;
      return yield* service.fetchModels;
    }).pipe(Effect.provide(ModelServiceLive));

    await expect(Effect.runPromise(program)).rejects.toThrow();
  });
});
