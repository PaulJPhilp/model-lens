import { Effect, Layer } from 'effect';
import { FilterService, type Filters } from './FilterService';
import type { Model } from '../types';
import { ValidationError } from '../errors';

const defaultFilters: Filters = {
  provider: null,
  costRange: [0, 10],
  modalities: [],
  capabilities: [],
};

export const FilterServiceLive = Layer.succeed(FilterService, {
  applyFilters: (models: Model[], search: string, filters: Filters) => Effect.sync(() => {
    let filtered = models.filter(m => search === '' || m.name.toLowerCase().includes(search.toLowerCase()));
    if (filters.provider) filtered = filtered.filter(m => m.provider === filters.provider);
    if (filters.modalities.length > 0) filtered = filtered.filter(m => filters.modalities.some(mod => m.modalities.includes(mod)));
    if (filters.capabilities.length > 0) filtered = filtered.filter(m => filters.capabilities.some(cap => m.capabilities.includes(cap)));
    filtered = filtered.filter(m => m.inputCost >= filters.costRange[0] && m.inputCost <= filters.costRange[1]);
    filtered.sort((a, b) => a.inputCost - b.inputCost);
    return filtered;
  }),
  validateFilters: (filters: Partial<Filters>) => {
    const fullFilters: Filters = { ...defaultFilters, ...filters };
    return Effect.succeed(fullFilters).pipe(
      Effect.filterOrFail(
        f => f.costRange[0] <= f.costRange[1],
        () => new ValidationError('cost', 'Min cost cannot be greater than max')
      ),
      Effect.orElseSucceed(defaultFilters)
    ) as Effect.Effect<Filters, never>;
  },
});
