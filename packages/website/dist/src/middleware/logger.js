import { Effect } from "effect";
import { HttpMiddleware, HttpServerRequest } from "@effect/platform";
/**
 * Logger middleware that logs incoming requests and outgoing responses
 * Tracks request method, URL, status code, and response time
 */
export const createLoggerMiddleware = () => HttpMiddleware.make((app) => Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const startTime = Date.now();
    // Log incoming request
    console.log(`➡️  ${request.method} ${request.url}`);
    // Execute the app handler
    const response = yield* app;
    // Calculate response time
    const duration = Date.now() - startTime;
    // Log outgoing response with status and duration
    console.log(`⬅️  ${request.method} ${request.url} - ${response.status} (${duration}ms)`);
    return response;
}));
