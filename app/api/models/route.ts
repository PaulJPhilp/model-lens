
import { Effect } from 'effect';
import { fetchModelsEffect } from '@myorg/core/effects';
import { NextResponse } from 'next/server';

export async function GET() {
  const models = await Effect.runPromise(fetchModelsEffect);
  return NextResponse.json({ models });
}
