import { Context, Effect } from 'effect';
import type { Model } from '../types';

export interface Filters {
  provider: string[];
  costRange: [number, number];
  modalities: string[];
  capabilities: string[];
}

export interface FilterServiceType {
  applyFilters: (models: Model[], search: string, filters: Filters) => Effect.Effect<Model[], never>;
  validateFilters: (filters: Partial<Filters>) => Effect.Effect<Filters, never>;
}

export const FilterService = Context.GenericTag<FilterServiceType>('FilterService');
