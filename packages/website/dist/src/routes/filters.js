import { Effect } from "effect";
import { HttpRouter, HttpServerResponse } from "@effect/platform";
import { FilterDataService } from "../services/FilterDataService";
/**
 * GET /filters - List filters
 * POST /filters - Create filter
 */
export const filtersRouter = HttpRouter.empty
    .pipe(
// GET /filters - List filters with optional filtering and pagination
HttpRouter.get("/filters", () => Effect.gen(function* () {
    const svc = yield* FilterDataService;
    const result = yield* svc.listFilters({
        visibility: "all",
        page: 1,
        pageSize: 20,
    });
    return HttpServerResponse.json(result);
}).pipe(Effect.catchAll((error) => {
    const message = error instanceof Error
        ? error.message
        : "Failed to list filters";
    return Effect.succeed(HttpServerResponse.json({ error: message }, { status: 500 }));
}))))
    .pipe(
// POST /filters - Create a new filter
HttpRouter.post("/filters", () => Effect.gen(function* () {
    const svc = yield* FilterDataService;
    // TODO: Parse request body to get filter data
    // For now, return a placeholder error
    return HttpServerResponse.json({ error: "Not implemented" }, { status: 501 });
})));
