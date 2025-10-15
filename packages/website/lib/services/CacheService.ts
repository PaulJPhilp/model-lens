import { Context, Effect, Layer } from "effect"

export interface CacheServiceInterface {
	readonly get: <T>(key: string) => Effect.Effect<T | null, never>
	readonly set: <T>(
		key: string,
		value: T,
		ttlSeconds?: number,
	) => Effect.Effect<void, never>
	readonly delete: (key: string) => Effect.Effect<void, never>
	readonly clear: Effect.Effect<void, never>
}

export class CacheService extends Context.Tag("CacheService")<
	CacheService,
	CacheServiceInterface
>() {}

// In-memory cache implementation
class MemoryCache {
	private cache = new Map<string, { value: unknown; expires?: number }>()

	get<T>(key: string): T | null {
		const item = this.cache.get(key)
		if (!item) return null

		if (item.expires && Date.now() > item.expires) {
			this.cache.delete(key)
			return null
		}

		return item.value as T
	}

	set<T>(key: string, value: T, ttlSeconds?: number): void {
		const expires = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined
		this.cache.set(key, { value, expires })
	}

	delete(key: string): void {
		this.cache.delete(key)
	}

	clear(): void {
		this.cache.clear()
	}

	// Clean up expired entries
	cleanup(): void {
		const now = Date.now()
		for (const [key, item] of this.cache.entries()) {
			if (item.expires && now > item.expires) {
				this.cache.delete(key)
			}
		}
	}
}

const memoryCache = new MemoryCache()

// Clean up expired entries every 5 minutes
if (typeof window === "undefined") {
	setInterval(
		() => {
			memoryCache.cleanup()
		},
		5 * 60 * 1000,
	)
}

export const CacheServiceLive = Layer.succeed(CacheService, {
	get: <T>(key: string) => Effect.sync(() => memoryCache.get<T>(key)),

	set: <T>(key: string, value: T, ttlSeconds?: number) =>
		Effect.sync(() => memoryCache.set(key, value, ttlSeconds)),

	delete: (key: string) => Effect.sync(() => memoryCache.delete(key)),

	clear: Effect.sync(() => memoryCache.clear()),
})

// Cache keys
export const CACHE_KEYS = {
	MODELS: "models",
	MODEL_STATS: "model_stats",
	FILTERED_MODELS: (search: string, filters: string) =>
		`filtered_models:${search}:${filters}`,
	PROVIDERS: "providers",
} as const

// Cache TTL values (in seconds)
export const CACHE_TTL = {
	MODELS: 3600, // 1 hour
	MODEL_STATS: 1800, // 30 minutes
	FILTERED_MODELS: 300, // 5 minutes
	PROVIDERS: 7200, // 2 hours
} as const
