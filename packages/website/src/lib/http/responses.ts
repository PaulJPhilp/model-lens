import { HttpServerResponse } from "@effect/platform"

/**
 * Create a success response with standardized format
 * Response: { data: T, meta?: { total?, page?, pageSize? }, timestamp }
 */
export const createSuccessResponse = <T>(
	data: T,
	meta?: { total?: number; page?: number; pageSize?: number },
) =>
	HttpServerResponse.json(
		{
			data,
			...(meta && { meta }),
			timestamp: new Date().toISOString(),
		},
		{ status: 200 },
	)

/**
 * Create an error response with standardized format
 * Response: { error: { code, message, details? }, timestamp }
 */
export const createErrorResponse = (
	code: string,
	message: string,
	details?: unknown,
	status = 500,
) => {
	const errorObj: any = { code, message }
	if (details !== undefined) {
		errorObj.details = details
	}

	return HttpServerResponse.json(
		{
			error: errorObj,
			timestamp: new Date().toISOString(),
		},
		{ status },
	)
}

/**
 * 400 Bad Request - Invalid input
 */
export const badRequestError = (details?: unknown) =>
	createErrorResponse("BAD_REQUEST", "Invalid request parameters", details, 400)

/**
 * 400 Validation Error - Field validation failed
 */
export const validationError = (details?: unknown) =>
	createErrorResponse("VALIDATION_ERROR", "Validation failed", details, 400)

/**
 * 401 Unauthorized - Authentication required or invalid
 */
export const unauthorizedError = (message = "Authentication required") =>
	createErrorResponse("UNAUTHORIZED", message, undefined, 401)

/**
 * 403 Forbidden - User lacks permission
 */
export const forbiddenError = (message = "Access denied") =>
	createErrorResponse("FORBIDDEN", message, undefined, 403)

/**
 * 404 Not Found - Resource doesn't exist
 */
export const notFoundError = (resource: string) =>
	createErrorResponse(
		"RESOURCE_NOT_FOUND",
		`${resource} not found`,
		undefined,
		404,
	)

/**
 * 409 Conflict - Resource already exists or state conflict
 */
export const conflictError = (message: string, details?: unknown) =>
	createErrorResponse("CONFLICT", message, details, 409)

/**
 * 422 Unprocessable Entity - Semantic error
 */
export const unprocessableError = (message: string, details?: unknown) =>
	createErrorResponse("UNPROCESSABLE_ENTITY", message, details, 422)

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export const rateLimitError = (retryAfter?: number) =>
	createErrorResponse(
		"RATE_LIMIT_EXCEEDED",
		"Too many requests. Please try again later.",
		retryAfter && { retryAfterSeconds: retryAfter },
		429,
	)

/**
 * 500 Internal Server Error - Unexpected server error
 */
export const internalServerError = (
	message = "Internal server error",
	details?: unknown,
) => createErrorResponse("INTERNAL_SERVER_ERROR", message, details, 500)

/**
 * 503 Service Unavailable - Service temporarily down
 */
export const serviceUnavailableError = (
	message = "Service temporarily unavailable",
) => createErrorResponse("SERVICE_UNAVAILABLE", message, undefined, 503)
