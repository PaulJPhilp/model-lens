import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { Context, Effect, Layer } from "effect"

export interface RateLimitResult {
	success: boolean
	limit: number
	remaining: number
	reset: Date
}

export interface RateLimitService {
	readonly checkRateLimit: (
		identifier: string,
		limit: number,
		window: number,
	) => Effect.Effect<RateLimitResult, never>
}

export const RateLimitService =
	Context.GenericTag<RateLimitService>("RateLimitService")

// Create Redis instance (will use environment variables)
const redis = new Redis({
	url: process.env.UPSTASH_REDIS_REST_URL || "http://localhost:8080",
	token: process.env.UPSTASH_REDIS_REST_TOKEN || "dummy-token",
})

// Default rate limiter for API routes
export const apiRateLimiter = new Ratelimit({
	redis,
	limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests per minute
	analytics: true,
	prefix: "model-lens-api",
})

// Strict rate limiter for admin routes
export const adminRateLimiter = new Ratelimit({
	redis,
	limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
	analytics: true,
	prefix: "model-lens-admin",
})

// Rate limiter for model fetching (heavier operations)
export const modelFetchRateLimiter = new Ratelimit({
	redis,
	limiter: Ratelimit.slidingWindow(20, "1 m"), // 20 requests per minute
	analytics: true,
	prefix: "model-lens-models",
})

export const RateLimitServiceLive = Layer.succeed(RateLimitService, {
	checkRateLimit: (identifier: string, limit: number, window: number) =>
		Effect.gen(function* () {
			const ratelimit = new Ratelimit({
				redis,
				limiter: Ratelimit.slidingWindow(limit, `${window} s`),
				analytics: true,
				prefix: "model-lens-custom",
			})

			const result = yield* Effect.promise(() => ratelimit.limit(identifier))

			return {
				success: result.success,
				limit: result.limit,
				remaining: result.remaining,
				reset: new Date(result.reset),
			}
		}),
})

// Helper functions for common rate limiting scenarios
export const checkApiRateLimit = (identifier: string) =>
	Effect.promise(() => apiRateLimiter.limit(identifier))

export const checkAdminRateLimit = (identifier: string) =>
	Effect.promise(() => adminRateLimiter.limit(identifier))

export const checkModelFetchRateLimit = (identifier: string) =>
	Effect.promise(() => modelFetchRateLimiter.limit(identifier))
