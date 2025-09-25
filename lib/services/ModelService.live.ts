import { Effect, Layer, Schedule } from 'effect';
import { ModelService } from './ModelService';
import type { Model, RawModel } from '../types';
import { AppError, NetworkError } from '../errors';

const transformModel = (raw: RawModel): Model => {
  return {
    name: raw.name as string || 'Unknown',
    provider: raw.provider as string || 'Unknown',
    contextWindow: Number(raw.contextWindow) || 0,
    inputCost: Number(raw.inputCost) || 0,
    modalities: Array.isArray(raw.modalities) ? raw.modalities as string[] : [],
    capabilities: Array.isArray(raw.capabilities) ? raw.capabilities as string[] : [],
    releaseDate: raw.releaseDate as string || '',
  };
};

export const ModelServiceLive = Layer.succeed(ModelService, {
  fetchModels: Effect.tryPromise({
    try: () => fetch('https://models.dev/api.json').then(res => res.json()),
    catch: (error) => new AppError(new NetworkError(error)),
  }).pipe(
    Effect.flatMap((data: { [provider: string]: { models: { [id: string]: RawModel } } }) => {
      const allModels: Model[] = [];
      for (const provider in data) {
        const providerData = data[provider];
        if (providerData.models) {
          for (const modelId in providerData.models) {
            const rawModel = providerData.models[modelId];
            allModels.push(transformModel(rawModel));
          }
        }
      }
      return Effect.succeed(allModels);
    }),
    Effect.retry(Schedule.spaced(1000).pipe(Schedule.compose(Schedule.recurs(3))))
  ),
});
