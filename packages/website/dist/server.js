import { Effect } from "effect";
import { HttpRouter, HttpServer, HttpServerResponse, } from "@effect/platform";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { AppLayer } from "@lib/layers";
import { createLoggerMiddleware } from "@middleware/logger";
import { createCorsMiddleware } from "@middleware/cors";
import { createErrorHandler } from "@middleware/error-handler";
import { modelsRouter } from "@routes/models";
import { filtersRouter } from "@routes/filters";
import { filterDetailRouter } from "@routes/filter-detail";
import { filterEvaluateRouter } from "@routes/filter-evaluate";
import { filterRunsRouter } from "@routes/filter-runs";
import { syncWebhookRouter } from "@routes/sync-webhook";
/**
 * Compose all API route handlers into a single router
 */
const apiRouter = HttpRouter.empty.pipe(HttpRouter.concat(modelsRouter), HttpRouter.concat(filtersRouter), HttpRouter.concat(filterDetailRouter), HttpRouter.concat(filterEvaluateRouter), HttpRouter.concat(filterRunsRouter), HttpRouter.concat(syncWebhookRouter));
/**
 * Main application router with health check endpoint
 */
const appRouter = apiRouter.pipe(
// Health check endpoint
HttpRouter.get("/health", (_req) => Effect.succeed(HttpServerResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
}))), 
// 404 handler for undefined routes
HttpRouter.get("/*", (_req) => Effect.succeed(HttpServerResponse.json({
    error: "Not found",
    path: _req.url,
    message: "The requested endpoint does not exist. Use GET /health to check server status.",
}, { status: 404 }))));
/**
 * Apply middleware to the router
 * Order matters: logger first, then CORS, then error handler
 */
const app = appRouter.pipe(HttpRouter.use(createLoggerMiddleware()), HttpRouter.use(createCorsMiddleware()), 
// Error handler catches unhandled exceptions from routes
HttpRouter.catchAll(createErrorHandler));
/**
 * HTTP server configuration
 * Binds to localhost:3000 by default
 * Set PORT environment variable to use a different port
 */
const port = parseInt(process.env.PORT || "3000", 10);
const ServerLive = BunHttpServer.layer({ port });
/**
 * Main program that starts the HTTP server
 * Provides all service layers and starts listening for requests
 */
const program = HttpServer.serve(app).pipe(
// Provide HTTP server implementation (Bun)
Effect.provide(ServerLive), 
// Provide application service layer (models, filters, cache, etc.)
Effect.provide(AppLayer), 
// Log any errors that occur
Effect.tapErrorCause(Effect.logError), 
// Catch fatal errors and exit gracefully
Effect.catchAllCause(() => Effect.sync(() => {
    console.error("❌ Server crashed");
    process.exit(1);
})));
/**
 * Start the server
 */
console.log(`🚀 Starting Model-Lens API server on http://localhost:${port}`);
console.log("📊 Available endpoints:");
console.log(`   GET  /health              - Health check`);
console.log(`   GET  /models              - List all models`);
console.log(`   GET  /filters             - List filters`);
console.log(`   POST /filters             - Create filter`);
console.log(`   GET  /filters/:id         - Get filter`);
console.log(`   PUT  /filters/:id         - Update filter`);
console.log(`   DELETE /filters/:id       - Delete filter`);
console.log(`   POST /filters/:id/evaluate - Evaluate filter`);
console.log(`   GET  /filters/:id/runs    - Get filter runs`);
console.log(`   GET  /filters/:id/runs/:runId - Get specific run`);
console.log(`   POST /sync-trigger        - Trigger model sync`);
console.log("");
BunRuntime.runMain(program);
