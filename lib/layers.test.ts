import { describe, expect, it } from 'vitest';
import { Effect } from 'effect';
import { AppLayer } from './layers';
import { ModelService } from './services/ModelService';
import { FilterService } from './services/FilterService';
import { ModeService } from './services/ModeService';

describe('AppLayer', () => {
  it('should provide all services', async () => {
    const program = Effect.gen(function* () {
      const modelService = yield* ModelService;
      const filterService = yield* FilterService;
      const modeService = yield* ModeService;

      // Just check that we can access the services without errors
      expect(modelService).toBeDefined();
      expect(filterService).toBeDefined();
      expect(modeService).toBeDefined();

      return true;
    }).pipe(Effect.provide(AppLayer));

    const result = await Effect.runPromise(program);
    expect(result).toBe(true);
  });
});
