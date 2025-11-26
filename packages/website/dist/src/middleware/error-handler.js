import { HttpServerResponse } from "@effect/platform";
/**
 * Global error handler for unhandled exceptions
 * Logs errors and returns standardized error responses
 */
export const createErrorHandler = (error) => {
    const timestamp = new Date().toISOString();
    // Handle different error types
    if (error instanceof Error) {
        // Standard JavaScript error
        console.error(`Error: ${error.message}`);
        const response = {
            error: error.message || "Internal server error",
            timestamp,
        };
        return HttpServerResponse.json(response, { status: 500 });
    }
    if (typeof error === "string") {
        // String error
        console.error(`Error: ${error}`);
        const response = {
            error,
            timestamp,
        };
        return HttpServerResponse.json(response, { status: 500 });
    }
    // Unknown error type
    console.error(`Unknown error: ${JSON.stringify(error)}`);
    const response = {
        error: "Internal server error",
        timestamp,
    };
    return HttpServerResponse.json(response, { status: 500 });
};
