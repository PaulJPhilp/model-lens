import { Effect, Layer } from 'effect';
import { FilterService, type Filters } from './FilterService';
import type { Model } from '../types';
import { ValidationError } from '../errors';

const defaultFilters: Filters = {
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
  supportsAttachments: null,
};

export const FilterServiceLive = Layer.succeed(FilterService, {
  applyFilters: (models: Model[], search: string, filters: Filters) => Effect.sync(() => {
    let filtered = models;

    filtered = filtered.filter(m => search === '' || m.name.toLowerCase().includes(search.toLowerCase()));
    if (filters.providers.length > 0) filtered = filtered.filter(m => filters.providers.includes(m.provider));
    if (filters.modalities.length > 0) filtered = filtered.filter(m => filters.modalities.some(mod => m.modalities.includes(mod)));
    if (filters.capabilities.length > 0) filtered = filtered.filter(m => filters.capabilities.some(cap => m.capabilities.includes(cap)));
    if (filters.years.length > 0) {
      filtered = filtered.filter(m => {
        if (!m.releaseDate) return false;
        const year = new Date(m.releaseDate).getFullYear();
        return filters.years.includes(year);
      });
    }
    if (filters.openWeights !== null) filtered = filtered.filter(m => m.openWeights === filters.openWeights);
    if (filters.supportsTemperature !== null) filtered = filtered.filter(m => m.supportsTemperature === filters.supportsTemperature);
    if (filters.supportsAttachments !== null) filtered = filtered.filter(m => m.supportsAttachments === filters.supportsAttachments);
    filtered = filtered.filter(m => m.inputCost >= filters.inputCostRange[0] && m.inputCost <= filters.inputCostRange[1]);
    filtered = filtered.filter(m => m.outputCost >= filters.outputCostRange[0] && m.outputCost <= filters.outputCostRange[1]);
    filtered = filtered.filter(m => m.cacheReadCost >= filters.cacheReadCostRange[0] && m.cacheReadCost <= filters.cacheReadCostRange[1]);
    filtered = filtered.filter(m => m.cacheWriteCost >= filters.cacheWriteCostRange[0] && m.cacheWriteCost <= filters.cacheWriteCostRange[1]);
    filtered.sort((a, b) => a.inputCost - b.inputCost);
    return filtered;
  }),
  validateFilters: (filters: Partial<Filters>) => {
    const fullFilters: Filters = { ...defaultFilters, ...filters };
    return Effect.succeed(fullFilters).pipe(
      Effect.filterOrFail(
        f => f.inputCostRange[0] <= f.inputCostRange[1] &&
             f.outputCostRange[0] <= f.outputCostRange[1] &&
             f.cacheReadCostRange[0] <= f.cacheReadCostRange[1] &&
             f.cacheWriteCostRange[0] <= f.cacheWriteCostRange[1],
        () => new ValidationError('cost', 'Min cost cannot be greater than max')
      ),
      Effect.orElseSucceed(() => defaultFilters)
    ) as Effect.Effect<Filters, never>;
  },
});
