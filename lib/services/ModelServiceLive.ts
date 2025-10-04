import { Effect, Layer, Schedule } from "effect";
import { AppError, NetworkError } from "../errors";
import type { Model } from "../types";
import { ModelService } from "./ModelService";

export const ModelServiceLive = Layer.succeed(ModelService, {
  fetchModels: Effect.tryPromise({
    try: () => {
      // In browser contexts, use a relative path to preserve same-origin
      if (typeof window !== "undefined") {
        return fetch("/api/models").then((res) => res.json());
      }
      // In non-browser contexts (SSR/tests without DOM), allow configuring base
      const base = process.env.MODEL_SERVICE_BASE ?? "http://127.0.0.1:3000";
      const url = `${base}/api/models`;
      return fetch(url).then((res) => res.json());
    },
    catch: (error: unknown) => new AppError(new NetworkError(error)),
  }).pipe(
    Effect.flatMap((data: { models: Model[] }) => Effect.succeed(data.models)),
    Effect.retry(
      Schedule.spaced(Number(process.env.MODEL_SERVICE_RETRY_MS ?? 1000)).pipe(
        Schedule.compose(Schedule.recurs(3))
      )
    )
  ),
});
