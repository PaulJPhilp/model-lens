import { Effect, Layer } from "effect"

/**
 * Cache key constants for model data
 */
export const CACHE_KEYS = {
	ALL_MODELS: "models:all",
	MODELS_BY_PROVIDER: (provider: string) => `models:provider:${provider}`,
	MODEL_BY_ID: (id: string) => `models:id:${id}`,
	SYNC_STATUS: "sync:status",
}

/**
 * Cache TTL (time-to-live) in seconds
 */
export const CACHE_TTL = {
	MODELS: 3600, // 1 hour
	SYNC_STATUS: 300, // 5 minutes
}

/**
 * Cache service for storing and retrieving model data
 * Currently a stub - Redis caching is handled via RateLimitService/Upstash
 */
export class CacheService extends Effect.Service<CacheService>()(
	"CacheService",
	{
		methods: {
			get: (key: string) => Effect.Effect<unknown, never>,
			set: (key: string, value: unknown, ttl?: number) => Effect.Effect<void, never>,
			delete: (key: string) => Effect.Effect<void, never>,
			clear: () => Effect.Effect<void, never>,
		},
	},
) {}

/**
 * Live implementation of CacheService
 * Currently a no-op stub since we use Upstash Redis directly
 */
export const CacheServiceLive = Layer.succeed(CacheService, {
	get: () => Effect.succeed(undefined),
	set: () => Effect.succeed(void 0),
	delete: () => Effect.succeed(void 0),
	clear: () => Effect.succeed(void 0),
})
