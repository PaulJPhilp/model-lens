import { Context, Effect } from 'effect';
import type { Model } from '../types';
import { AppError } from '../errors';

export interface ModelServiceType {
  fetchModels: Effect.Effect<Model[], AppError, never>;
}

export const ModelService = Context.GenericTag<ModelServiceType>('ModelService');
