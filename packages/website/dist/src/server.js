import { Effect, pipe } from "effect";
import { HttpRouter, HttpServer, HttpServerResponse, } from "@effect/platform";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { createLoggerMiddleware } from "./middleware/logger";
import { createCorsMiddleware } from "./middleware/cors";
import { createErrorHandler } from "./middleware/error-handler";
/**
 * Main application router with all routes and endpoints
 */
const app = pipe(HttpRouter.empty, 
// Health check endpoint
HttpRouter.get("/health", HttpServerResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
})), 
// Models endpoint (placeholder)
HttpRouter.get("/models", HttpServerResponse.json({
    models: [],
    total: 0,
    timestamp: new Date().toISOString(),
})), 
// 404 handler for undefined routes
HttpRouter.all("/*", HttpServerResponse.json({
    error: "Not found",
    message: "The requested endpoint does not exist. Use GET /health to check server status.",
}, { status: 404 })), 
// Apply middleware
HttpRouter.use(createLoggerMiddleware()), HttpRouter.use(createCorsMiddleware()), 
// Error handler catches unhandled exceptions from routes
HttpRouter.catchAll(createErrorHandler));
/**
 * HTTP server configuration
 * Binds to localhost:3000 by default
 * Set PORT environment variable to use a different port
 */
const port = parseInt(process.env.PORT || "3000", 10);
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
// Run the HTTP server with proper layer initialization
const main = async () => {
    await BunRuntime.runMain()(HttpServer.serve(app).pipe(Effect.provide(BunHttpServer.layer({ port }))));
};
main().catch((err) => {
    console.error("Server error:", err);
    process.exit(1);
});
