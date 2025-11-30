import { Layer } from "effect"
import { CacheServiceLive } from "./services/CacheService"
import { ModelDataServiceLive } from "./services/ModelDataServiceLive"
import { ModelServiceLive } from "./services/ModelServiceLive"
import { RateLimitServiceLive } from "./services/RateLimitService"

export const AppLayer = Layer.mergeAll(
	ModelServiceLive,
	ModelDataServiceLive,
	CacheServiceLive,
	RateLimitServiceLive,
)
