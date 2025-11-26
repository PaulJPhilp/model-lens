import { Effect } from "effect";
import { HttpRouter, HttpServerResponse } from "@effect/platform";
import { FilterDataService } from "../services/FilterDataService";
/**
 * POST /filters/:id/evaluate - Evaluate filter against models
 */
export const filterEvaluateRouter = HttpRouter.post("/filters/:id/evaluate", () => Effect.gen(function* () {
    const svc = yield* FilterDataService;
    // TODO: Extract id from path and request body
    // TODO: Implement filter evaluation logic
    // For now, increment usage count and return placeholder
    return HttpServerResponse.json({ error: "Not implemented" }, { status: 501 });
}));
