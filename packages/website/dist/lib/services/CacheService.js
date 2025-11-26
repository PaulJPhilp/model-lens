import { Context, Effect, Layer } from "effect";
export class CacheService extends Context.Tag("CacheService")() {
}
// In-memory cache implementation
class MemoryCache {
    constructor() {
        this.cache = new Map();
    }
    get(key) {
        const item = this.cache.get(key);
        if (!item)
            return null;
        if (item.expires && Date.now() > item.expires) {
            this.cache.delete(key);
            return null;
        }
        return item.value;
    }
    set(key, value, ttlSeconds) {
        const expires = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
        this.cache.set(key, { value, expires });
    }
    delete(key) {
        this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
    // Clean up expired entries
    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (item.expires && now > item.expires) {
                this.cache.delete(key);
            }
        }
    }
}
const memoryCache = new MemoryCache();
// Clean up expired entries every 5 minutes
if (typeof window === "undefined") {
    setInterval(() => {
        memoryCache.cleanup();
    }, 5 * 60 * 1000);
}
export const CacheServiceLive = Layer.succeed(CacheService, {
    get: (key) => Effect.sync(() => memoryCache.get(key)),
    set: (key, value, ttlSeconds) => Effect.sync(() => memoryCache.set(key, value, ttlSeconds)),
    delete: (key) => Effect.sync(() => memoryCache.delete(key)),
    clear: Effect.sync(() => memoryCache.clear()),
});
// Cache keys
export const CACHE_KEYS = {
    MODELS: "models",
    MODEL_STATS: "model_stats",
    FILTERED_MODELS: (search, filters) => `filtered_models:${search}:${filters}`,
    PROVIDERS: "providers",
};
// Cache TTL values (in seconds)
export const CACHE_TTL = {
    MODELS: 3600, // 1 hour
    MODEL_STATS: 1800, // 30 minutes
    FILTERED_MODELS: 300, // 5 minutes
    PROVIDERS: 7200, // 2 hours
};
