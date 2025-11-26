import { Layer } from "effect"
import { CacheServiceLive } from "./services/CacheService"
import { FilterServiceLive } from "./services/FilterServiceLive"
import { FilterDataServiceLive } from "../src/services/FilterDataServiceLive"
import { ModelDataServiceLive } from "./services/ModelDataServiceLive"
import { ModelServiceLive } from "./services/ModelServiceLive"
import { RateLimitServiceLive } from "./services/RateLimitService"

export const AppLayer = Layer.mergeAll(
	ModelServiceLive,
	FilterServiceLive,
	FilterDataServiceLive,
	ModelDataServiceLive,
	CacheServiceLive,
	RateLimitServiceLive,
)
