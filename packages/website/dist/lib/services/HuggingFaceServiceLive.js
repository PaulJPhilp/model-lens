import { Layer } from "effect";
import { HuggingFaceService, HuggingFaceServiceLive as serviceImpl, } from "./HuggingFaceService";
/**
 * Live layer for HuggingFaceService
 */
export const HuggingFaceServiceLive = Layer.succeed(HuggingFaceService, serviceImpl);
