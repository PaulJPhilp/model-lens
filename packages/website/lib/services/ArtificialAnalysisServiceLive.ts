import { Layer } from "effect"
import {
	ArtificialAnalysisService,
	ArtificialAnalysisServiceLive as serviceImpl,
} from "./ArtificialAnalysisService"

/**
 * Live layer for ArtificialAnalysisService
 */
export const ArtificialAnalysisServiceLive = Layer.succeed(
	ArtificialAnalysisService,
	serviceImpl,
)
