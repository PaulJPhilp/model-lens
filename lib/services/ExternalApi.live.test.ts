/* @vitest-environment node */
import { describe, expect, it } from "vitest";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Always-on live test. Requires internet and the public models.dev API.
describe("External API (live) - models.dev", () => {
  it(
    "fetches real data from https://models.dev/api.json",
    { timeout: 30000 },
    async () => {
      const response = await fetch("https://models.dev/api.json");
      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(isObject(data)).toBe(true);
      const providers = Object.keys(data as Record<string, unknown>);
      expect(providers.length).toBeGreaterThan(0);

      const firstProviderKey = providers[0]
      const firstProvider = (data as Record<string, unknown>)[firstProviderKey]
      expect(isObject(firstProvider)).toBe(true)
      // Expect provider has a models map/object
      const hasModels =
        isObject(firstProvider) &&
        "models" in firstProvider &&
        isObject((firstProvider as Record<string, unknown>).models)
      expect(hasModels).toBe(true)
      const modelIds = isObject(firstProvider) && isObject((firstProvider as Record<string, unknown>).models)
        ? Object.keys((firstProvider as { models: Record<string, unknown> }).models)
        : []
      expect(modelIds.length).toBeGreaterThan(0)

      const models = (firstProvider as { models: Record<string, unknown> }).models
      const firstModelId = modelIds[0]
      const firstModel = models[firstModelId]
      expect(isObject(firstModel)).toBe(true)
    }
  )
})
