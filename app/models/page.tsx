
import { Effect, pipe } from 'effect';
import { fetchModelsEffect } from '@myorg/core/effects';
import { ClientTable } from './ClientTable';
import { Model } from './types';

async function getModels(): Promise<Model[]> {
  const models = await pipe(
    fetchModelsEffect,
    Effect.runPromise
  );
  return models;
}

export default async function ModelsPage() {
  const initialModels = await getModels();

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-4">LLM Models</h1>
      {initialModels.length > 0 ? (
        <ClientTable initialModels={initialModels} />
      ) : (
        <p>Failed to load models. Please try again later.</p>
      )}
    </div>
  );
}
