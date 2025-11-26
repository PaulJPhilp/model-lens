import { Effect } from "effect";
import { HttpRouter, HttpServerResponse } from "@effect/platform";
/**
 * GET /models
 * Returns all available AI models
 */
export const modelsRouter = HttpRouter.empty.pipe(HttpRouter.get("/models", (_req) => Effect.succeed(HttpServerResponse.json({
    models: [],
    total: 0,
    timestamp: new Date().toISOString(),
}))));
