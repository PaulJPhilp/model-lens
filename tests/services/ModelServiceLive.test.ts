import { ModelService } from "@/lib/services/ModelService";
import { ModelServiceLive } from "@/lib/services/ModelServiceLive";
import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("ModelServiceLive", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("fetchModels", () => {
    it("should fetch and transform models from external API", async () => {
      // Mock the external API response format (raw models.dev format)
      const mockExternalApiResponse = {
        OpenAI: {
          models: {
            "gpt-4": {
              id: "gpt-4",
              name: "gpt-4",
              cost: {
                input: 0.03,
                output: 0.06,
                cache_read: 0.015,
                cache_write: 0.03,
              },
              limit: {
                context: 128000,
                output: 4096,
              },
              modalities: {
                input: ["text"],
                output: ["text"],
              },
              tool_call: true,
              release_date: "2023-03-01",
              last_updated: "2023-03-01",
              knowledge: "2023-04",
              temperature: true,
            },
          },
        },
        Anthropic: {
          models: {
            "claude-3": {
              id: "claude-3",
              name: "claude-3",
              cost: {
                input: 0.015,
                output: 0.075,
                cache_read: 0.0075,
                cache_write: 0.015,
              },
              limit: {
                context: 200000,
                output: 4096,
              },
              modalities: {
                input: ["text"],
                output: ["text", "image"],
              },
              reasoning: true,
              release_date: "2023-06-01",
              last_updated: "2023-06-01",
              knowledge: "2023-08",
              temperature: true,
              attachment: true,
            },
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockExternalApiResponse,
      });

      const program = Effect.gen(function* () {
        const service = yield* ModelService;
        return yield* service.fetchModels;
      }).pipe(Effect.provide(ModelServiceLive));

      const result = await Effect.runPromise(program);

      expect(result).toHaveLength(2);

      const gpt4Model = result.find((m) => m.id === "gpt-4");
      expect(gpt4Model).toBeDefined();
      expect(gpt4Model!.name).toBe("gpt-4");
      expect(gpt4Model!.provider).toBe("OpenAI");
      expect(gpt4Model!.contextWindow).toBe(128000);
      expect(gpt4Model!.inputCost).toBe(0.03);
      expect(gpt4Model!.outputCost).toBe(0.06);
      expect(gpt4Model!.cacheReadCost).toBe(0.015);
      expect(gpt4Model!.cacheWriteCost).toBe(0.03);
      expect(gpt4Model!.modalities).toEqual(["text"]);
      expect(gpt4Model!.capabilities).toEqual(["tools"]);
      expect(gpt4Model!.openWeights).toBe(false);
      expect(gpt4Model!.supportsTemperature).toBe(true);
      expect(gpt4Model!.supportsAttachments).toBe(false);

      const claudeModel = result.find((m) => m.id === "claude-3");
      expect(claudeModel).toBeDefined();
      expect(claudeModel!.name).toBe("claude-3");
      expect(claudeModel!.provider).toBe("Anthropic");
      expect(claudeModel!.contextWindow).toBe(200000);
      expect(claudeModel!.inputCost).toBe(0.015);
      expect(claudeModel!.outputCost).toBe(0.075);
      expect(claudeModel!.cacheReadCost).toBe(0.0075);
      expect(claudeModel!.cacheWriteCost).toBe(0.015);
      expect(claudeModel!.modalities).toEqual(["text", "image"]);
      expect(claudeModel!.capabilities).toEqual(["reasoning"]);
      expect(claudeModel!.openWeights).toBe(false);
      expect(claudeModel!.supportsTemperature).toBe(true);
      expect(claudeModel!.supportsAttachments).toBe(true);
    });

    it("should handle models with new release date (within 30 days)", async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 15);
      const recentDate = thirtyDaysAgo.toISOString().split("T")[0];

      // Mock the external API response format (raw models.dev format)
      const mockExternalApiResponse = {
        OpenAI: {
          models: {
            "gpt-4-turbo": {
              id: "gpt-4-turbo",
              name: "gpt-4-turbo",
              cost: {
                input: 0.01,
                output: 0.03,
              },
              limit: {
                context: 128000,
                output: 4096,
              },
              modalities: {
                input: ["text"],
                output: ["text"],
              },
              tool_call: true,
              release_date: recentDate,
              last_updated: recentDate,
              temperature: true,
            },
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockExternalApiResponse,
      });

      const program = Effect.gen(function* () {
        const service = yield* ModelService;
        return yield* service.fetchModels;
      }).pipe(Effect.provide(ModelServiceLive));

      const result = await Effect.runPromise(program);

      expect(result[0].new).toBe(true);
    });

    it("should handle missing or invalid data gracefully", async () => {
      const mockExternalResponse = {
        OpenAI: {
          models: {
            "invalid-model": {
              // Missing most fields
              id: "invalid-model",
            },
            "partial-model": {
              id: "partial-model",
              name: "partial-model",
              cost: { input: "invalid" }, // Invalid number
              limit: { context: "not-a-number" },
            },
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockExternalResponse,
      });

      const program = Effect.gen(function* () {
        const service = yield* ModelService;
        return yield* service.fetchModels;
      }).pipe(Effect.provide(ModelServiceLive));

      const result = await Effect.runPromise(program);

      expect(result).toHaveLength(2);

      const invalidModel = result.find((m) => m.id === "invalid-model");
      expect(invalidModel!.name).toBe("Unknown");
      expect(invalidModel!.provider).toBe("Unknown");
      expect(invalidModel!.contextWindow).toBe(0);
      expect(invalidModel!.inputCost).toBe(0);

      const partialModel = result.find((m) => m.id === "partial-model");
      expect(partialModel!.inputCost).toBe(0); // Invalid string converted to 0
      expect(partialModel!.contextWindow).toBe(0); // Invalid string converted to 0
    });

    it("should handle external API errors", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const program = Effect.gen(function* () {
        const service = yield* ModelService;
        return yield* service.fetchModels;
      }).pipe(Effect.provide(ModelServiceLive));

      const result = Effect.runPromise(program);

      await expect(result).rejects.toThrow();
    });

    it("should handle network errors", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const program = Effect.gen(function* () {
        const service = yield* ModelService;
        return yield* service.fetchModels;
      }).pipe(Effect.provide(ModelServiceLive));

      const result = Effect.runPromise(program);

      await expect(result).rejects.toThrow();
    });

    it("should handle empty API response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const program = Effect.gen(function* () {
        const service = yield* ModelService;
        return yield* service.fetchModels;
      }).pipe(Effect.provide(ModelServiceLive));

      const result = await Effect.runPromise(program);

      expect(result).toEqual([]);
    });

    it("should handle malformed JSON response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const program = Effect.gen(function* () {
        const service = yield* ModelService;
        return yield* service.fetchModels;
      }).pipe(Effect.provide(ModelServiceLive));

      const result = Effect.runPromise(program);

      await expect(result).rejects.toThrow();
    });

    it("should properly merge input and output modalities", async () => {
      const mockExternalResponse = {
        OpenAI: {
          models: {
            "multimodal-model": {
              id: "multimodal-model",
              name: "multimodal-model",
              provider: "OpenAI",
              cost: { input: 0.01, output: 0.03 },
              limit: { context: 128000, output: 4096 },
              modalities: {
                input: ["text", "image"],
                output: ["text", "audio"],
              },
              release_date: "2023-01-01",
            },
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockExternalResponse,
      });

      const program = Effect.gen(function* () {
        const service = yield* ModelService;
        return yield* service.fetchModels;
      }).pipe(Effect.provide(ModelServiceLive));

      const result = await Effect.runPromise(program);

      const model = result[0];
      expect(model.modalities).toEqual(["text", "image", "audio"]);
    });

    it("should extract capabilities correctly", async () => {
      const mockExternalResponse = {
        OpenAI: {
          models: {
            "capable-model": {
              id: "capable-model",
              name: "capable-model",
              provider: "OpenAI",
              cost: { input: 0.01, output: 0.03 },
              limit: { context: 128000, output: 4096 },
              modalities: { input: ["text"], output: ["text"] },
              release_date: "2023-01-01",
              tool_call: true,
              reasoning: true,
              knowledge: "2024-01",
            },
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockExternalResponse,
      });

      const program = Effect.gen(function* () {
        const service = yield* ModelService;
        return yield* service.fetchModels;
      }).pipe(Effect.provide(ModelServiceLive));

      const result = await Effect.runPromise(program);

      const model = result[0];
      expect(model.capabilities).toEqual(["tools", "reasoning"]); // Only boolean true values are included
    });

    it("should handle different date field formats", async () => {
      const mockExternalResponse = {
        OpenAI: {
          models: {
            "date-test-model": {
              id: "date-test-model",
              name: "date-test-model",
              provider: "OpenAI",
              cost: { input: 0.01, output: 0.03 },
              limit: { context: 128000, output: 4096 },
              modalities: { input: ["text"], output: ["text"] },
              releaseDate: "2023-01-01", // camelCase format
              lastUpdated: "2023-01-02", // camelCase format
            },
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockExternalResponse,
      });

      const program = Effect.gen(function* () {
        const service = yield* ModelService;
        return yield* service.fetchModels;
      }).pipe(Effect.provide(ModelServiceLive));

      const result = await Effect.runPromise(program);

      const model = result[0];
      expect(model.releaseDate).toBe("2023-01-01");
      expect(model.lastUpdated).toBe("2023-01-02");
    });

    it("should handle different cost field formats", async () => {
      const mockExternalResponse = {
        OpenAI: {
          models: {
            "cost-test-model": {
              id: "cost-test-model",
              name: "cost-test-model",
              provider: "OpenAI",
              cost: {
                input: 0.01,
                output: 0.03,
                cacheRead: 0.005, // camelCase format
                cacheWrite: 0.01, // camelCase format
              },
              limit: { context: 128000, output: 4096 },
              modalities: { input: ["text"], output: ["text"] },
              release_date: "2023-01-01",
            },
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockExternalResponse,
      });

      const program = Effect.gen(function* () {
        const service = yield* ModelService;
        return yield* service.fetchModels;
      }).pipe(Effect.provide(ModelServiceLive));

      const result = await Effect.runPromise(program);

      const model = result[0];
      expect(model.cacheReadCost).toBe(0.005);
      expect(model.cacheWriteCost).toBe(0.01);
    });

    it("should handle boolean capability flags", async () => {
      const mockExternalResponse = {
        OpenAI: {
          models: {
            "boolean-test-model": {
              id: "boolean-test-model",
              name: "boolean-test-model",
              provider: "OpenAI",
              cost: { input: 0.01, output: 0.03 },
              limit: { context: 128000, output: 4096 },
              modalities: { input: ["text"], output: ["text"] },
              release_date: "2023-01-01",
              tool_call: false,
              reasoning: false,
              knowledge: false,
              open_weights: true,
              temperature: false,
              attachment: true,
            },
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockExternalResponse,
      });

      const program = Effect.gen(function* () {
        const service = yield* ModelService;
        return yield* service.fetchModels;
      }).pipe(Effect.provide(ModelServiceLive));

      const result = await Effect.runPromise(program);

      const model = result[0];
      expect(model.capabilities).toEqual([]); // All capabilities are false
      expect(model.openWeights).toBe(true);
      expect(model.supportsTemperature).toBe(false);
      expect(model.supportsAttachments).toBe(true);
    });

    it("should handle mixed capability values", async () => {
      const mockExternalResponse = {
        OpenAI: {
          models: {
            "mixed-test-model": {
              id: "mixed-test-model",
              name: "mixed-test-model",
              provider: "OpenAI",
              cost: { input: 0.01, output: 0.03 },
              limit: { context: 128000, output: 4096 },
              modalities: { input: ["text"], output: ["text"] },
              release_date: "2023-01-01",
              tool_call: true,
              reasoning: "yes", // String value
              knowledge: 1, // Number value
              open_weights: "true", // String value
              temperature: false,
              attachment: null, // Null value
            },
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockExternalResponse,
      });

      const program = Effect.gen(function* () {
        const service = yield* ModelService;
        return yield* service.fetchModels;
      }).pipe(Effect.provide(ModelServiceLive));

      const result = await Effect.runPromise(program);

      const model = result[0];
      expect(model.capabilities).toEqual(["tools"]); // Only boolean true is included
      expect(model.openWeights).toBe(true); // String 'true' converted to boolean
      expect(model.supportsTemperature).toBe(false);
      expect(model.supportsAttachments).toBe(false); // Null converted to false
    });
  });
});
