var _a;
import { Context, Effect, Schedule } from "effect";
export class OpenRouterService extends Context.Tag("OpenRouterService")() {
}
/**
 * Transform OpenRouter model to our internal Model format
 */
function transformOpenRouterModel(openRouterModel) {
    var _a, _b;
    // Extract provider from model ID (e.g., "openai/gpt-4" -> "openai")
    const provider = openRouterModel.id.split("/")[0] || "unknown";
    // Extract capabilities from supported parameters
    const capabilities = [];
    if ((_a = openRouterModel.supported_parameters) === null || _a === void 0 ? void 0 : _a.includes("tools")) {
        capabilities.push("tools");
    }
    // Determine modalities
    const modalities = Array.from(new Set([
        ...openRouterModel.architecture.input_modalities,
        ...openRouterModel.architecture.output_modalities,
    ]));
    // Parse pricing
    const inputCost = parseFloat(openRouterModel.pricing.prompt) || 0;
    const outputCost = parseFloat(openRouterModel.pricing.completion) || 0;
    return {
        id: openRouterModel.id,
        name: openRouterModel.name,
        provider,
        contextWindow: openRouterModel.context_length,
        maxOutputTokens: openRouterModel.top_provider.max_completion_tokens || 4096,
        inputCost,
        outputCost,
        cacheReadCost: 0, // OpenRouter doesn't specify cache costs
        cacheWriteCost: 0,
        modalities,
        capabilities,
        releaseDate: "", // OpenRouter doesn't provide release dates
        lastUpdated: "",
        knowledge: openRouterModel.description || "",
        openWeights: false, // Assume not open weights unless specified
        supportsTemperature: ((_b = openRouterModel.supported_parameters) === null || _b === void 0 ? void 0 : _b.includes("temperature")) || false,
        supportsAttachments: modalities.includes("image"),
        new: false,
    };
}
export const OpenRouterServiceLive = {
    fetchModels: Effect.tryPromise({
        try: () => fetch("https://openrouter.ai/api/v1/models").then((res) => res.json()),
        catch: (error) => {
            throw new Error(`Failed to fetch from OpenRouter: ${error instanceof Error ? error.message : "Network error"}`);
        },
    }).pipe(Effect.flatMap((dataUnknown) => {
        const response = dataUnknown;
        const models = response.data.map(transformOpenRouterModel);
        console.log(`🌐 [OpenRouterService] Fetched ${models.length} models from OpenRouter`);
        return Effect.succeed(models);
    }), Effect.retry(Schedule.spaced(Number((_a = process.env.API_RETRY_MS) !== null && _a !== void 0 ? _a : 1000)).pipe(Schedule.compose(Schedule.recurs(3))))),
};
