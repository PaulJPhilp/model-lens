var _a;
import { Context, Effect, Schedule } from "effect";
export class HuggingFaceService extends Context.Tag("HuggingFaceService")() {
}
/**
 * Transform HuggingFace model to our internal Model format
 */
export function transformHuggingFaceModel(hfModel) {
    var _a, _b, _c, _d;
    // Extract provider from model ID (e.g., "microsoft/DialoGPT-medium" -> "microsoft")
    const provider = hfModel.id.split("/")[0] || "huggingface";
    // Try to infer capabilities from tags and pipeline
    const capabilities = [];
    const tags = hfModel.tags || [];
    if (tags.includes("text-generation") ||
        hfModel.pipeline_tag === "text-generation") {
        capabilities.push("text-generation");
    }
    if (tags.includes("text-classification") ||
        hfModel.pipeline_tag === "text-classification") {
        capabilities.push("classification");
    }
    if (tags.includes("question-answering") ||
        hfModel.pipeline_tag === "question-answering") {
        capabilities.push("qa");
    }
    if (tags.includes("token-classification") ||
        hfModel.pipeline_tag === "token-classification") {
        capabilities.push("ner");
    }
    // Determine modalities based on tags
    const modalities = [];
    if (tags.includes("text") || ((_a = hfModel.pipeline_tag) === null || _a === void 0 ? void 0 : _a.includes("text"))) {
        modalities.push("text");
    }
    if (tags.includes("image") || ((_b = hfModel.pipeline_tag) === null || _b === void 0 ? void 0 : _b.includes("image"))) {
        modalities.push("image");
    }
    if (tags.includes("audio") || ((_c = hfModel.pipeline_tag) === null || _c === void 0 ? void 0 : _c.includes("audio"))) {
        modalities.push("audio");
    }
    if (tags.includes("video") || ((_d = hfModel.pipeline_tag) === null || _d === void 0 ? void 0 : _d.includes("video"))) {
        modalities.push("video");
    }
    // Extract model size from tags (e.g., "7b", "13b", "70b")
    const sizeMatch = hfModel.id.match(/(\d+(?:\.\d+)?)(b|k|m|g|t)/i);
    let contextWindow = 2048; // Default
    if (sizeMatch) {
        const size = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[2].toLowerCase();
        // Rough heuristic: larger models tend to have larger context windows
        if (unit === "b" && size >= 70)
            contextWindow = 4096;
        else if (unit === "b" && size >= 30)
            contextWindow = 8192;
        else if (unit === "b" && size >= 7)
            contextWindow = 4096;
    }
    // Estimate costs (HuggingFace models are typically free or low-cost)
    const inputCost = 0; // Free for most models
    const outputCost = 0;
    return {
        id: `huggingface/${hfModel.id}`,
        name: hfModel.id,
        provider,
        contextWindow,
        maxOutputTokens: Math.min(contextWindow, 4096), // Conservative estimate
        inputCost,
        outputCost,
        cacheReadCost: 0,
        cacheWriteCost: 0,
        modalities: modalities.length > 0 ? modalities : ["text"], // Default to text
        capabilities,
        releaseDate: hfModel.createdAt || "",
        lastUpdated: hfModel.lastModified || "",
        knowledge: hfModel.pipeline_tag || "",
        openWeights: !hfModel.private && !hfModel.gated,
        supportsTemperature: capabilities.includes("text-generation"),
        supportsAttachments: modalities.includes("image"),
        new: false, // We'll calculate this based on creation date if needed
    };
}
export const HuggingFaceServiceLive = {
    fetchModels: Effect.tryPromise({
        try: () => fetch("https://huggingface.co/api/models?limit=100&sort=downloads&direction=-1").then((res) => res.json()),
        catch: (error) => {
            throw new Error(`Failed to fetch from HuggingFace: ${error instanceof Error ? error.message : "Network error"}`);
        },
    }).pipe(Effect.flatMap((dataUnknown) => {
        const models = dataUnknown.map(transformHuggingFaceModel);
        console.log(`🤗 [HuggingFaceService] Fetched ${models.length} models from HuggingFace`);
        return Effect.succeed(models);
    }), Effect.retry(Schedule.spaced(Number((_a = process.env.API_RETRY_MS) !== null && _a !== void 0 ? _a : 1000)).pipe(Schedule.compose(Schedule.recurs(3))))),
};
