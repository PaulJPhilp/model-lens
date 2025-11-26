import { Effect, Layer, pipe } from "effect"
import {
  HttpRouter,
  HttpServer,
  HttpServerResponse,
} from "@effect/platform"
import { BunHttpServer, BunRuntime } from "@effect/platform-bun"
import { AppLayer } from "../lib/layers"
import { createLoggerMiddleware } from "./middleware/logger"
import { createCorsMiddleware } from "./middleware/cors"
import { createErrorHandler } from "./middleware/error-handler"

// Import all routers
import { modelsRouter } from "./routes/models"
import { filtersRouter } from "./routes/filters"
import { filterDetailRouter } from "./routes/filter-detail"
import { filterEvaluateRouter } from "./routes/filter-evaluate"
import { filterRunsRouter } from "./routes/filter-runs"
import { adminSyncRouter } from "./routes/admin-sync"

/**
 * Main application router with all routes and endpoints
 */
const app = pipe(
  HttpRouter.empty,
  // Health check endpoint
  HttpRouter.get(
    "/health",
    HttpServerResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    })
  ),
  // Mount all route routers
  HttpRouter.concat(modelsRouter as any),
  HttpRouter.concat(filtersRouter as any),
  HttpRouter.concat(filterDetailRouter as any),
  HttpRouter.concat(filterEvaluateRouter as any),
  HttpRouter.concat(filterRunsRouter as any),
  HttpRouter.concat(adminSyncRouter as any),
  // 404 handler for undefined routes
  HttpRouter.all(
    "/*",
    HttpServerResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Endpoint not found. Use GET /health to check server status.",
        },
        timestamp: new Date().toISOString(),
      },
      { status: 404 }
    )
  ),
  // Apply middleware
  HttpRouter.use(createLoggerMiddleware()),
  HttpRouter.use(createCorsMiddleware()),
  // Error handler catches unhandled exceptions from routes
  HttpRouter.catchAll(createErrorHandler)
)

/**
 * HTTP server configuration
 * Binds to localhost:3000 by default
 * Set PORT environment variable to use a different port
 */
const port = parseInt(process.env.PORT || "3000", 10)

/**
 * Start the server
 */
console.log(`🚀 Model-Lens API Server starting on http://localhost:${port}`)
console.log("\n📚 API Endpoints:")
console.log("\nHealth & Status:")
console.log("  GET  /health                           - Health check")

console.log("\nModels:")
console.log("  GET  /v1/models                        - List all models")

console.log("\nFilters:")
console.log("  GET  /v1/filters                       - List filters")
console.log("  POST /v1/filters                       - Create filter")
console.log("  GET  /v1/filters/:id                   - Get filter")
console.log("  PUT  /v1/filters/:id                   - Update filter")
console.log("  DELETE /v1/filters/:id                 - Delete filter")

console.log("\nFilter Evaluation:")
console.log("  POST /v1/filters/:id/evaluate          - Evaluate filter")
console.log("  GET  /v1/filters/:id/runs              - List filter runs")
console.log("  GET  /v1/filters/:id/runs/:runId       - Get specific run")

console.log("\nAdmin (requires x-admin: true header):")
console.log("  POST /v1/admin/sync                    - Trigger model sync")
console.log("  GET  /v1/admin/sync/history            - Get sync history")

console.log("\nAuthentication: Include x-user-id header with all requests")
console.log("Optional: x-team-id and x-admin headers for team/admin features\n")

// Run the HTTP server with proper layer initialization
const main = async () => {
  const serverLayer = BunHttpServer.layer({ port })
  const allLayers = Layer.merge(serverLayer, AppLayer)

  const program = (HttpServer.serve(app) as any).pipe(
    Effect.provide(allLayers)
  )

  await BunRuntime.runMain()(program)
}

main().catch((err) => {
  console.error("🔴 Server error:", err)
  process.exit(1)
})
