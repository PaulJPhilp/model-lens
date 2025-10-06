import { Layer } from "effect"
import {
	OpenRouterService,
	OpenRouterServiceLive as serviceImpl,
} from "./OpenRouterService"

/**
 * Live layer for OpenRouterService
 */
export const OpenRouterServiceLive = Layer.succeed(
	OpenRouterService,
	serviceImpl,
)
