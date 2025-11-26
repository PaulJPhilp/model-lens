import { Effect } from "effect";
import { HttpRouter, HttpServerResponse } from "@effect/platform";
/**
 * GET /filters/:id/runs - Get filter run history
 * GET /filters/:id/runs/:runId - Get specific run
 */
export const filterRunsRouter = HttpRouter.empty
    .pipe(
// GET /filters/:id/runs - Get filter run history
HttpRouter.get("/filters/:id/runs", () => Effect.gen(function* () {
    // TODO: Extract id from request path parameters
    // TODO: Query runs from database
    return HttpServerResponse.json({ error: "Not implemented" }, { status: 501 });
})))
    .pipe(
// GET /filters/:id/runs/:runId - Get specific run
HttpRouter.get("/filters/:id/runs/:runId", () => Effect.gen(function* () {
    // TODO: Extract id and runId from path parameters
    // TODO: Query specific run from database
    return HttpServerResponse.json({ error: "Not implemented" }, { status: 501 });
})));
