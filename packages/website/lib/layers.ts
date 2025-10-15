import { Layer } from "effect"
import { CacheServiceLive } from "./services/CacheService"
import { FilterServiceLive } from "./services/FilterServiceLive"
import { ModelDataServiceLive } from "./services/ModelDataServiceLive"
import { ModelServiceLive } from "./services/ModelServiceLive"
import { ModeServiceLive } from "./services/ModeService.live"
import { RateLimitServiceLive } from "./services/RateLimitService"

export const AppLayer = Layer.mergeAll(
	ModelServiceLive,
	FilterServiceLive,
	ModeServiceLive,
	ModelDataServiceLive,
	CacheServiceLive,
	RateLimitServiceLive,
)
