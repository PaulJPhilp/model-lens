import { HttpRouter } from "@effect/platform";
/**
 * GET /filters/:id/runs - Get filter run history
 * GET /filters/:id/runs/:runId - Get specific run
 */
export const filterRunsRouter = HttpRouter.empty;
