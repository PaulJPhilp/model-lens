import { Layer } from "effect"
import {
	ModelDataService,
	ModelDataServiceLive as serviceImpl,
} from "./ModelDataService"

/**
 * Live layer for ModelDataService
 * Provides the actual implementation of model data persistence operations
 */
export const ModelDataServiceLive = Layer.succeed(ModelDataService, serviceImpl)
