import { Context, Effect } from "effect";
import type { Model } from "../types";

export interface ModelServiceType {
  fetchModels: Effect.Effect<Model[], Error, never>;
}

export const ModelService =
  Context.GenericTag<ModelServiceType>("ModelService");
