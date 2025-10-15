import { Effect } from "effect"
import { type NextRequest, NextResponse } from "next/server"
import {
	checkAdminRateLimit,
	checkApiRateLimit,
	checkModelFetchRateLimit,
	type RateLimitResult,
} from "@/lib/services/RateLimitService"

export interface RateLimitOptions {
	limit?: number
	window?: number
	identifier?: string
}

export type RateLimitType = "api" | "admin" | "model-fetch" | "custom"

/**
 * Rate limiting middleware for Next.js API routes
 *
 * @param request - Next.js request object
 * @param type - Type of rate limiting to apply
 * @param options - Optional rate limiting configuration
 * @returns NextResponse with rate limit headers or null if not rate limited
 */
export async function rateLimitMiddleware(
	request: NextRequest,
	type: RateLimitType = "api",
	options: RateLimitOptions = {},
): Promise<NextResponse | null> {
	try {
		// Get client identifier (IP address or user ID)
		const identifier = options.identifier || getClientIdentifier(request)

		let result: RateLimitResult

		switch (type) {
			case "admin": {
				const adminResult = await Effect.runPromise(
					checkAdminRateLimit(identifier),
				)
				result = {
					success: adminResult.success,
					limit: adminResult.limit,
					remaining: adminResult.remaining,
					reset: new Date(adminResult.reset),
				}
				break
			}
			case "model-fetch": {
				const modelResult = await Effect.runPromise(
					checkModelFetchRateLimit(identifier),
				)
				result = {
					success: modelResult.success,
					limit: modelResult.limit,
					remaining: modelResult.remaining,
					reset: new Date(modelResult.reset),
				}
				break
			}
			default: {
				const apiResult = await Effect.runPromise(checkApiRateLimit(identifier))
				result = {
					success: apiResult.success,
					limit: apiResult.limit,
					remaining: apiResult.remaining,
					reset: new Date(apiResult.reset),
				}
				break
			}
		}

		// Create response headers
		const headers = new Headers({
			"X-RateLimit-Limit": result.limit.toString(),
			"X-RateLimit-Remaining": result.remaining.toString(),
			"X-RateLimit-Reset": result.reset.getTime().toString(),
		})

		// If rate limit exceeded, return 429 response
		if (!result.success) {
			return new NextResponse(
				JSON.stringify({
					error: "Too Many Requests",
					message: "Rate limit exceeded. Please try again later.",
					retryAfter: Math.ceil((result.reset.getTime() - Date.now()) / 1000),
				}),
				{
					status: 429,
					headers: {
						...Object.fromEntries(headers.entries()),
						"Retry-After": Math.ceil(
							(result.reset.getTime() - Date.now()) / 1000,
						).toString(),
					},
				},
			)
		}

		// Rate limit not exceeded, return null to continue processing
		return null
	} catch (error) {
		console.error("Rate limiting error:", error)

		// In case of rate limiting service failure, allow the request to proceed
		// but log the error for monitoring
		return null
	}
}

/**
 * Get client identifier for rate limiting
 *
 * @param request - Next.js request object
 * @returns Client identifier (IP address or user ID)
 */
function getClientIdentifier(request: NextRequest): string {
	// Try to get user ID from headers (if authenticated)
	const userId = request.headers.get("x-user-id")
	if (userId) {
		return `user:${userId}`
	}

	// Fall back to IP address
	const forwarded = request.headers.get("x-forwarded-for")
	const realIp = request.headers.get("x-real-ip")
	const ip = forwarded ? forwarded.split(",")[0] : realIp || "unknown"

	return `ip:${ip}`
}

/**
 * Higher-order function to wrap API route handlers with rate limiting
 *
 * @param handler - API route handler function
 * @param type - Rate limiting type
 * @param options - Rate limiting options
 * @returns Wrapped handler with rate limiting
 */
export function withRateLimit<T extends unknown[]>(
	handler: (...args: T) => Promise<NextResponse>,
	type: RateLimitType = "api",
	options: RateLimitOptions = {},
) {
	return async (...args: T): Promise<NextResponse> => {
		// Extract request from first argument (assuming it's a NextRequest)
		const request = args[0] as NextRequest

		// Check rate limit
		const rateLimitResponse = await rateLimitMiddleware(request, type, options)

		// If rate limited, return the rate limit response
		if (rateLimitResponse) {
			return rateLimitResponse
		}

		// Otherwise, proceed with the original handler
		return handler(...args)
	}
}
