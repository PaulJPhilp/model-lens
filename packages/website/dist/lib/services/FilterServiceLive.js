import "server-only";
import { Effect, Layer } from "effect";
import { FilterService } from "./FilterService";
export const FilterServiceLive = Layer.succeed(FilterService, {
    applyFilters: (models, search, filters) => Effect.gen(function* () {
        console.log(`🔍 [FilterService] Applying filters to ${models.length} models`);
        console.log(`🔍 [FilterService] Search: "${search}", Filters:`, {
            providers: filters.providers,
            inputCostRange: filters.inputCostRange,
            outputCostRange: filters.outputCostRange,
            capabilities: filters.capabilities,
            modalities: filters.modalities,
        });
        const startTime = Date.now();
        let filtered = models;
        filtered = filtered.filter((m) => search === "" || m.name.toLowerCase().includes(search.toLowerCase()));
        if (filters.providers.length > 0)
            filtered = filtered.filter((m) => filters.providers.includes(m.provider));
        if (filters.modalities.length > 0)
            filtered = filtered.filter((m) => filters.modalities.some((mod) => m.modalities.includes(mod)));
        if (filters.capabilities.length > 0)
            filtered = filtered.filter((m) => filters.capabilities.some((cap) => m.capabilities.includes(cap)));
        if (filters.years.length > 0) {
            filtered = filtered.filter((m) => {
                if (!m.releaseDate)
                    return false;
                const year = new Date(m.releaseDate).getFullYear();
                return filters.years.includes(year);
            });
        }
        if (filters.openWeights !== null)
            filtered = filtered.filter((m) => m.openWeights === filters.openWeights);
        if (filters.supportsTemperature !== null)
            filtered = filtered.filter((m) => m.supportsTemperature === filters.supportsTemperature);
        if (filters.supportsAttachments !== null)
            filtered = filtered.filter((m) => m.supportsAttachments === filters.supportsAttachments);
        filtered = filtered.filter((m) => m.inputCost >= filters.inputCostRange[0] &&
            m.inputCost <= filters.inputCostRange[1]);
        filtered = filtered.filter((m) => m.outputCost >= filters.outputCostRange[0] &&
            m.outputCost <= filters.outputCostRange[1]);
        filtered = filtered.filter((m) => m.cacheReadCost >= filters.cacheReadCostRange[0] &&
            m.cacheReadCost <= filters.cacheReadCostRange[1]);
        filtered = filtered.filter((m) => m.cacheWriteCost >= filters.cacheWriteCostRange[0] &&
            m.cacheWriteCost <= filters.cacheWriteCostRange[1]);
        filtered.sort((a, b) => a.inputCost - b.inputCost);
        const duration = Date.now() - startTime;
        console.log(`✅ [FilterService] Filtered ${models.length} models to ${filtered.length} results (${duration}ms)`);
        return filtered;
    }),
    validateFilters: (filters) => Effect.gen(function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        // Provide default values for missing filters
        const validated = {
            providers: (_a = filters.providers) !== null && _a !== void 0 ? _a : [],
            inputCostRange: (_b = filters.inputCostRange) !== null && _b !== void 0 ? _b : [0, 1000],
            outputCostRange: (_c = filters.outputCostRange) !== null && _c !== void 0 ? _c : [0, 1000],
            cacheReadCostRange: (_d = filters.cacheReadCostRange) !== null && _d !== void 0 ? _d : [0, 1000],
            cacheWriteCostRange: (_e = filters.cacheWriteCostRange) !== null && _e !== void 0 ? _e : [0, 1000],
            modalities: (_f = filters.modalities) !== null && _f !== void 0 ? _f : [],
            capabilities: (_g = filters.capabilities) !== null && _g !== void 0 ? _g : [],
            years: (_h = filters.years) !== null && _h !== void 0 ? _h : [],
            openWeights: (_j = filters.openWeights) !== null && _j !== void 0 ? _j : null,
            supportsTemperature: (_k = filters.supportsTemperature) !== null && _k !== void 0 ? _k : null,
            supportsAttachments: (_l = filters.supportsAttachments) !== null && _l !== void 0 ? _l : null,
        };
        return validated;
    }),
});
