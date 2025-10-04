/* @vitest-environment node */
import { describe, expect, it } from "vitest";
import { GET } from "./route";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

describe("Next API route (live) - /api/models", () => {
  it(
    "returns transformed models shape from models.dev",
    { timeout: 30000 },
    async () => {
      const response = await GET();
      // NextResponse.json has a "json" method
      const body = await (response as any).json();

      expect(isObject(body)).toBe(true);
      expect(Array.isArray((body as any).models)).toBe(true);
      const models = (body as any).models;
      expect(models.length).toBeGreaterThan(0);

      const m = models[0];
      expect(typeof m.id).toBe("string");
      expect(typeof m.name).toBe("string");
      expect(typeof m.provider).toBe("string");
      expect(typeof m.contextWindow).toBe("number");
      expect(typeof m.maxOutputTokens).toBe("number");
      expect(typeof m.inputCost).toBe("number");
      expect(typeof m.outputCost).toBe("number");
      expect(typeof m.cacheReadCost).toBe("number");
      expect(Array.isArray(m.modalities)).toBe(true);
      expect(Array.isArray(m.capabilities)).toBe(true);
      expect(typeof m.releaseDate).toBe("string");
      expect(typeof m.lastUpdated).toBe("string");
      expect(typeof m.openWeights).toBe("boolean");
      expect(typeof m.supportsTemperature).toBe("boolean");
      expect(typeof m.supportsAttachments).toBe("boolean");
    }
  );
});
