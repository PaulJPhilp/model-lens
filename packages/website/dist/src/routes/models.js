import { Effect } from "effect";
import { HttpRouter, HttpServerResponse } from "@effect/platform";
import { ModelDataService } from "../../lib/services/ModelDataService";
/**
 * GET /models
 * Returns all available AI models from the latest sync
 */
export const modelsRouter = HttpRouter.get("/models", () => Effect.gen(function* () {
    const svc = yield* ModelDataService;
    const models = yield* svc.getLatestModels();
    return HttpServerResponse.json({
        models,
        total: models.length,
        timestamp: new Date().toISOString(),
    });
}).pipe(Effect.catchAll((error) => {
    const message = error instanceof Error
        ? error.message
        : "Failed to fetch models";
    return Effect.succeed(HttpServerResponse.json({ error: message, models: [], total: 0 }, { status: 500 }));
})));
