// Type guards and utility functions
export function isRecord(value) {
    return typeof value === "object" && value !== null;
}
export function toNumber(value) {
    const num = typeof value === "string" || typeof value === "number"
        ? Number(value)
        : Number.NaN;
    return Number.isFinite(num) ? num : 0;
}
export function toStringArray(value) {
    if (Array.isArray(value)) {
        return value.map((v) => String(v));
    }
    return [];
}
export function toBoolean(value) {
    if (typeof value === "boolean")
        return value;
    if (typeof value === "string")
        return value.toLowerCase() === "true";
    return Boolean(value);
}
/**
 * Transform a raw model from models.dev API into our internal Model format
 */
export function transformModelsDevModel(raw, provider) {
    const cost = isRecord(raw) && isRecord(raw.cost)
        ? raw.cost
        : {};
    const limit = isRecord(raw) && isRecord(raw.limit)
        ? raw.limit
        : {};
    const modalitiesObj = isRecord(raw) && isRecord(raw.modalities)
        ? raw.modalities
        : {};
    const inputModalities = toStringArray(modalitiesObj.input);
    const outputModalities = toStringArray(modalitiesObj.output);
    const modalities = Array.from(new Set([...inputModalities, ...outputModalities]));
    const capabilities = [];
    if (isRecord(raw)) {
        if ("tool_call" in raw && raw.tool_call === true)
            capabilities.push("tools");
        if ("reasoning" in raw && raw.reasoning === true)
            capabilities.push("reasoning");
        if ("knowledge" in raw && raw.knowledge === true)
            capabilities.push("knowledge");
    }
    const rd = isRecord(raw)
        ? typeof raw.release_date === "string"
            ? raw.release_date
            : typeof raw.releaseDate === "string"
                ? raw.releaseDate
                : ""
        : "";
    const lu = isRecord(raw)
        ? typeof raw.last_updated === "string"
            ? raw.last_updated
            : typeof raw.lastUpdated === "string"
                ? raw.lastUpdated
                : ""
        : "";
    // Calculate if model is new (released in past 30 days)
    const isNew = rd
        ? (() => {
            const releaseDate = new Date(rd);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return releaseDate >= thirtyDaysAgo;
        })()
        : false;
    // Determine provider - use "Unknown" if model data is invalid
    const hasValidId = typeof (raw === null || raw === void 0 ? void 0 : raw.id) === "string" && raw.id.trim() !== "";
    const hasValidName = typeof (raw === null || raw === void 0 ? void 0 : raw.name) === "string" && raw.name.trim() !== "";
    const finalProvider = hasValidId && hasValidName ? provider : "Unknown";
    return {
        id: typeof (raw === null || raw === void 0 ? void 0 : raw.id) === "string" ? raw.id : "",
        name: typeof (raw === null || raw === void 0 ? void 0 : raw.name) === "string" ? raw.name : "Unknown",
        provider: finalProvider,
        contextWindow: toNumber(limit.context),
        maxOutputTokens: toNumber(limit.output),
        inputCost: toNumber(cost.input),
        outputCost: toNumber(cost.output),
        cacheReadCost: toNumber(cost.cache_read || cost.cacheRead),
        cacheWriteCost: toNumber(cost.cache_write || cost.cacheWrite),
        modalities,
        capabilities,
        releaseDate: rd,
        lastUpdated: lu,
        knowledge: isRecord(raw) && typeof raw.knowledge === "string" ? raw.knowledge : "",
        openWeights: isRecord(raw) && toBoolean(raw.open_weights),
        supportsTemperature: isRecord(raw) && toBoolean(raw.temperature),
        supportsAttachments: isRecord(raw) && toBoolean(raw.attachment),
        new: isNew,
    };
}
/**
 * Transform models from models.dev API response format
 */
export function transformModelsDevResponse(dataUnknown) {
    const allModels = [];
    if (isRecord(dataUnknown)) {
        const data = dataUnknown;
        for (const provider in data) {
            const providerData = data[provider];
            if (providerData === null || providerData === void 0 ? void 0 : providerData.models) {
                const models = providerData.models;
                for (const modelId in models) {
                    const rawModel = models[modelId];
                    const transformedModel = transformModelsDevModel(rawModel, provider);
                    allModels.push(transformedModel);
                }
            }
        }
    }
    return allModels;
}
