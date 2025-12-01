import type { HttpServerRequest } from "@effect/platform"

/**
 * Pagination parameters extracted from query string
 */
export interface PaginationParams {
	page: number
	pageSize: number
	offset: number
}

/**
 * Parse and validate pagination parameters from request query string
 * Expects query parameters:
 * - page: number (default: 1, minimum: 1)
 * - pageSize: number (default: 20, minimum: 1, maximum: 100)
 *
 * @returns Validated pagination params with offset calculated
 */
export const parsePaginationParams = (
	request: HttpServerRequest.HttpServerRequest,
	defaultPageSize = 20,
	maxPageSize = 100,
): PaginationParams => {
	const searchParams = new URL(request.url).searchParams

	// Parse page number
	const rawPage = searchParams.get("page")
	const page = Math.max(1, parseInt(rawPage || "1", 10))

	// Validate page is a valid number (not NaN)
	const validPage = Number.isNaN(page) ? 1 : page

	// Parse page size with validation
	const rawPageSize = searchParams.get("pageSize")
	const parsedPageSize = parseInt(rawPageSize || String(defaultPageSize), 10)

	// Enforce bounds: at least 1, at most maxPageSize, default to defaultPageSize if invalid
	let pageSize = defaultPageSize
	if (!Number.isNaN(parsedPageSize)) {
		pageSize = Math.max(1, Math.min(maxPageSize, parsedPageSize))
	}

	// Calculate offset for database queries
	const offset = (validPage - 1) * pageSize

	return { page: validPage, pageSize, offset }
}

/**
 * Pagination metadata for responses
 */
export interface PaginationMeta {
	total: number
	page: number
	pageSize: number
	totalPages: number
	hasNextPage: boolean
	hasPreviousPage: boolean
}

/**
 * Create pagination metadata for a response
 * Useful for including in response meta field
 */
export const createPaginationMeta = (
	total: number,
	page: number,
	pageSize: number,
): PaginationMeta => {
	const totalPages = Math.ceil(total / pageSize)

	return {
		total,
		page,
		pageSize,
		totalPages,
		hasNextPage: page < totalPages,
		hasPreviousPage: page > 1,
	}
}

/**
 * Cursor-based pagination parameters (for future use)
 * More efficient for large datasets than offset-based pagination
 */
export interface CursorPaginationParams {
	cursor?: string
	pageSize: number
}

/**
 * Parse cursor-based pagination from query string
 * @param request HTTP request
 * @param defaultPageSize Default items per page (default: 20)
 * @param maxPageSize Maximum items per page (default: 100)
 */
export const parseCursorPaginationParams = (
	request: HttpServerRequest.HttpServerRequest,
	defaultPageSize = 20,
	maxPageSize = 100,
): CursorPaginationParams => {
	const searchParams = new URL(request.url).searchParams

	const rawPageSize = searchParams.get("pageSize")
	const parsedPageSize = parseInt(rawPageSize || String(defaultPageSize), 10)

	let pageSize = defaultPageSize
	if (!Number.isNaN(parsedPageSize)) {
		pageSize = Math.max(1, Math.min(maxPageSize, parsedPageSize))
	}

	const cursor = searchParams.get("cursor") || undefined

	return { cursor, pageSize }
}
