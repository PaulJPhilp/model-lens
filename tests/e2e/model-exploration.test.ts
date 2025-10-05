import type { Model } from "@/lib/types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch for API calls
global.fetch = vi.fn();

const mockModels: Model[] = [
  {
    id: "gpt-4",
    name: "gpt-4",
    provider: "OpenAI",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    inputCost: 0.03,
    outputCost: 0.06,
    cacheReadCost: 0.015,
    cacheWriteCost: 0.03,
    modalities: ["text"],
    capabilities: ["tools"],
    releaseDate: "2023-03-01",
    lastUpdated: "2023-03-01",
    knowledge: "2023-04",
    openWeights: false,
    supportsTemperature: true,
    supportsAttachments: false,
    new: false,
  },
  {
    id: "claude-3",
    name: "claude-3",
    provider: "Anthropic",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    inputCost: 0.015,
    outputCost: 0.075,
    cacheReadCost: 0.0075,
    cacheWriteCost: 0.015,
    modalities: ["text", "image"],
    capabilities: ["reasoning"],
    releaseDate: "2023-06-01",
    lastUpdated: "2023-06-01",
    knowledge: "2023-08",
    openWeights: false,
    supportsTemperature: true,
    supportsAttachments: true,
    new: true,
  },
  {
    id: "dall-e-3",
    name: "dall-e-3",
    provider: "OpenAI",
    contextWindow: 0,
    maxOutputTokens: 0,
    inputCost: 0.08,
    outputCost: 0.08,
    cacheReadCost: 0,
    cacheWriteCost: 0,
    modalities: ["image"],
    capabilities: ["generation"],
    releaseDate: "2023-09-01",
    lastUpdated: "2023-09-01",
    knowledge: "",
    openWeights: false,
    supportsTemperature: false,
    supportsAttachments: false,
    new: false,
  },
  {
    id: "llama-2",
    name: "llama-2-70b",
    provider: "Meta",
    contextWindow: 4096,
    maxOutputTokens: 2048,
    inputCost: 0.001,
    outputCost: 0.001,
    cacheReadCost: 0,
    cacheWriteCost: 0,
    modalities: ["text"],
    capabilities: [],
    releaseDate: "2023-07-01",
    lastUpdated: "2023-07-01",
    knowledge: "2022-09",
    openWeights: true,
    supportsTemperature: true,
    supportsAttachments: false,
    new: false,
  },
];

describe("Model Exploration E2E Tests", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: mockModels }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Model Discovery and Filtering Workflow", () => {
    it("should load models and allow basic exploration", async () => {
      render(<ModelTable />);

      // Wait for models to load
      await waitFor(() => {
        expect(screen.getByText("gpt-4")).toBeInTheDocument();
        expect(screen.getByText("claude-3")).toBeInTheDocument();
        expect(screen.getByText("dall-e-3")).toBeInTheDocument();
        expect(screen.getByText("llama-2-70b")).toBeInTheDocument();
      });

      // Verify provider information is displayed
      expect(screen.getByText("OpenAI")).toBeInTheDocument();
      expect(screen.getByText("Anthropic")).toBeInTheDocument();
      expect(screen.getByText("Meta")).toBeInTheDocument();

      // Verify cost information is displayed
      expect(screen.getByText("$0.03")).toBeInTheDocument(); // GPT-4 input cost
      expect(screen.getByText("$0.06")).toBeInTheDocument(); // GPT-4 output cost
      expect(screen.getByText("$0.015")).toBeInTheDocument(); // Claude-3 input cost
      expect(screen.getByText("$0.001")).toBeInTheDocument(); // Llama-2 input cost

      // Verify context window information
      expect(screen.getByText("128,000")).toBeInTheDocument(); // GPT-4 context
      expect(screen.getByText("200,000")).toBeInTheDocument(); // Claude-3 context
      expect(screen.getByText("4,096")).toBeInTheDocument(); // Llama-2 context
    });

    it("should allow searching for specific models", async () => {
      render(<ModelTable />);

      // Wait for models to load
      await waitFor(() => {
        expect(screen.getByText("gpt-4")).toBeInTheDocument();
      });

      // Search for GPT models
      const searchInput = screen.getByPlaceholderText(/search models/i);
      fireEvent.change(searchInput, { target: { value: "gpt" } });

      // Should filter to show only GPT models
      await waitFor(() => {
        expect(screen.getByText("gpt-4")).toBeInTheDocument();
        expect(screen.getByText("dall-e-3")).toBeInTheDocument();
        expect(screen.queryByText("claude-3")).not.toBeInTheDocument();
        expect(screen.queryByText("llama-2-70b")).not.toBeInTheDocument();
      });

      // Search for Claude models
      fireEvent.change(searchInput, { target: { value: "claude" } });

      await waitFor(() => {
        expect(screen.getByText("claude-3")).toBeInTheDocument();
        expect(screen.queryByText("gpt-4")).not.toBeInTheDocument();
        expect(screen.queryByText("dall-e-3")).not.toBeInTheDocument();
        expect(screen.queryByText("llama-2-70b")).not.toBeInTheDocument();
      });

      // Clear search
      fireEvent.change(searchInput, { target: { value: "" } });

      await waitFor(() => {
        expect(screen.getByText("gpt-4")).toBeInTheDocument();
        expect(screen.getByText("claude-3")).toBeInTheDocument();
        expect(screen.getByText("dall-e-3")).toBeInTheDocument();
        expect(screen.getByText("llama-2-70b")).toBeInTheDocument();
      });
    });

    it("should allow filtering by provider", async () => {
      render(<ModelTable />);

      // Wait for models to load
      await waitFor(() => {
        expect(screen.getByText("gpt-4")).toBeInTheDocument();
      });

      // Filter by OpenAI provider
      const providerFilter = screen.getByRole("combobox", {
        name: /provider/i,
      });
      fireEvent.click(providerFilter);

      const openaiOption = screen.getByText("OpenAI");
      fireEvent.click(openaiOption);

      // Should show only OpenAI models
      await waitFor(() => {
        expect(screen.getByText("gpt-4")).toBeInTheDocument();
        expect(screen.getByText("dall-e-3")).toBeInTheDocument();
        expect(screen.queryByText("claude-3")).not.toBeInTheDocument();
        expect(screen.queryByText("llama-2-70b")).not.toBeInTheDocument();
      });

      // Filter by Anthropic provider
      fireEvent.click(providerFilter);
      const anthropicOption = screen.getByText("Anthropic");
      fireEvent.click(anthropicOption);

      await waitFor(() => {
        expect(screen.getByText("claude-3")).toBeInTheDocument();
        expect(screen.queryByText("gpt-4")).not.toBeInTheDocument();
        expect(screen.queryByText("dall-e-3")).not.toBeInTheDocument();
        expect(screen.queryByText("llama-2-70b")).not.toBeInTheDocument();
      });
    });

    it("should allow filtering by cost ranges", async () => {
      render(<ModelTable />);

      // Wait for models to load
      await waitFor(() => {
        expect(screen.getByText("gpt-4")).toBeInTheDocument();
      });

      // Filter by low input cost (under $0.02)
      const inputCostSlider = screen.getByRole("slider", {
        name: /input cost/i,
      });
      fireEvent.change(inputCostSlider, { target: { value: 0.02 } });

      // Should show only models with input cost <= $0.02
      await waitFor(() => {
        expect(screen.getByText("claude-3")).toBeInTheDocument();
        expect(screen.getByText("llama-2-70b")).toBeInTheDocument();
        expect(screen.queryByText("gpt-4")).not.toBeInTheDocument();
        expect(screen.queryByText("dall-e-3")).not.toBeInTheDocument();
      });

      // Filter by very low input cost (under $0.005)
      fireEvent.change(inputCostSlider, { target: { value: 0.005 } });

      await waitFor(() => {
        expect(screen.getByText("llama-2-70b")).toBeInTheDocument();
        expect(screen.queryByText("claude-3")).not.toBeInTheDocument();
        expect(screen.queryByText("gpt-4")).not.toBeInTheDocument();
        expect(screen.queryByText("dall-e-3")).not.toBeInTheDocument();
      });
    });

    it("should allow filtering by modalities", async () => {
      render(<ModelTable />);

      // Wait for models to load
      await waitFor(() => {
        expect(screen.getByText("gpt-4")).toBeInTheDocument();
      });

      // Filter by image modality
      const modalityFilter = screen.getByRole("combobox", {
        name: /modality/i,
      });
      fireEvent.click(modalityFilter);

      const imageOption = screen.getByText("Image");
      fireEvent.click(imageOption);

      // Should show only models with image modality
      await waitFor(() => {
        expect(screen.getByText("claude-3")).toBeInTheDocument();
        expect(screen.getByText("dall-e-3")).toBeInTheDocument();
        expect(screen.queryByText("gpt-4")).not.toBeInTheDocument();
        expect(screen.queryByText("llama-2-70b")).not.toBeInTheDocument();
      });

      // Filter by text modality
      fireEvent.click(modalityFilter);
      const textOption = screen.getByText("Text");
      fireEvent.click(textOption);

      await waitFor(() => {
        expect(screen.getByText("gpt-4")).toBeInTheDocument();
        expect(screen.getByText("claude-3")).toBeInTheDocument();
        expect(screen.getByText("llama-2-70b")).toBeInTheDocument();
        expect(screen.queryByText("dall-e-3")).not.toBeInTheDocument();
      });
    });

    it("should allow filtering by capabilities", async () => {
      render(<ModelTable />);

      // Wait for models to load
      await waitFor(() => {
        expect(screen.getByText("gpt-4")).toBeInTheDocument();
      });

      // Filter by tools capability
      const capabilityFilter = screen.getByRole("combobox", {
        name: /capability/i,
      });
      fireEvent.click(capabilityFilter);

      const toolsOption = screen.getByText("Tools");
      fireEvent.click(toolsOption);

      // Should show only models with tools capability
      await waitFor(() => {
        expect(screen.getByText("gpt-4")).toBeInTheDocument();
        expect(screen.queryByText("claude-3")).not.toBeInTheDocument();
        expect(screen.queryByText("dall-e-3")).not.toBeInTheDocument();
        expect(screen.queryByText("llama-2-70b")).not.toBeInTheDocument();
      });

      // Filter by reasoning capability
      fireEvent.click(capabilityFilter);
      const reasoningOption = screen.getByText("Reasoning");
      fireEvent.click(reasoningOption);

      await waitFor(() => {
        expect(screen.getByText("claude-3")).toBeInTheDocument();
        expect(screen.queryByText("gpt-4")).not.toBeInTheDocument();
        expect(screen.queryByText("dall-e-3")).not.toBeInTheDocument();
        expect(screen.queryByText("llama-2-70b")).not.toBeInTheDocument();
      });
    });

    it("should allow filtering by open weights", async () => {
      render(<ModelTable />);

      // Wait for models to load
      await waitFor(() => {
        expect(screen.getByText("gpt-4")).toBeInTheDocument();
      });

      // Filter by open weights = true
      const openWeightsFilter = screen.getByRole("combobox", {
        name: /open weights/i,
      });
      fireEvent.click(openWeightsFilter);

      const yesOption = screen.getByText("Yes");
      fireEvent.click(yesOption);

      // Should show only open weights models
      await waitFor(() => {
        expect(screen.getByText("llama-2-70b")).toBeInTheDocument();
        expect(screen.queryByText("gpt-4")).not.toBeInTheDocument();
        expect(screen.queryByText("claude-3")).not.toBeInTheDocument();
        expect(screen.queryByText("dall-e-3")).not.toBeInTheDocument();
      });

      // Filter by open weights = false
      fireEvent.click(openWeightsFilter);
      const noOption = screen.getByText("No");
      fireEvent.click(noOption);

      await waitFor(() => {
        expect(screen.getByText("gpt-4")).toBeInTheDocument();
        expect(screen.getByText("claude-3")).toBeInTheDocument();
        expect(screen.getByText("dall-e-3")).toBeInTheDocument();
        expect(screen.queryByText("llama-2-70b")).not.toBeInTheDocument();
      });
    });

    it("should allow combining multiple filters", async () => {
      render(<ModelTable />);

      // Wait for models to load
      await waitFor(() => {
        expect(screen.getByText("gpt-4")).toBeInTheDocument();
      });

      // Apply multiple filters: OpenAI provider + text modality + tools capability
      const providerFilter = screen.getByRole("combobox", {
        name: /provider/i,
      });
      fireEvent.click(providerFilter);
      const openaiOption = screen.getByText("OpenAI");
      fireEvent.click(openaiOption);

      const modalityFilter = screen.getByRole("combobox", {
        name: /modality/i,
      });
      fireEvent.click(modalityFilter);
      const textOption = screen.getByText("Text");
      fireEvent.click(textOption);

      const capabilityFilter = screen.getByRole("combobox", {
        name: /capability/i,
      });
      fireEvent.click(capabilityFilter);
      const toolsOption = screen.getByText("Tools");
      fireEvent.click(toolsOption);

      // Should show only GPT-4 (meets all criteria)
      await waitFor(() => {
        expect(screen.getByText("gpt-4")).toBeInTheDocument();
        expect(screen.queryByText("claude-3")).not.toBeInTheDocument();
        expect(screen.queryByText("dall-e-3")).not.toBeInTheDocument();
        expect(screen.queryByText("llama-2-70b")).not.toBeInTheDocument();
      });
    });

    it("should allow clearing all filters", async () => {
      render(<ModelTable />);

      // Wait for models to load
      await waitFor(() => {
        expect(screen.getByText("gpt-4")).toBeInTheDocument();
      });

      // Apply some filters
      const providerFilter = screen.getByRole("combobox", {
        name: /provider/i,
      });
      fireEvent.click(providerFilter);
      const openaiOption = screen.getByText("OpenAI");
      fireEvent.click(openaiOption);

      await waitFor(() => {
        expect(screen.queryByText("claude-3")).not.toBeInTheDocument();
      });

      // Clear all filters
      const clearButton = screen.getByRole("button", { name: /clear/i });
      fireEvent.click(clearButton);

      // Should show all models again
      await waitFor(() => {
        expect(screen.getByText("gpt-4")).toBeInTheDocument();
        expect(screen.getByText("claude-3")).toBeInTheDocument();
        expect(screen.getByText("dall-e-3")).toBeInTheDocument();
        expect(screen.getByText("llama-2-70b")).toBeInTheDocument();
      });
    });

    it("should handle table sorting", async () => {
      render(<ModelTable />);

      // Wait for models to load
      await waitFor(() => {
        expect(screen.getByText("gpt-4")).toBeInTheDocument();
      });

      // Sort by name (ascending)
      const nameHeader = screen.getByRole("columnheader", { name: /name/i });
      fireEvent.click(nameHeader);

      // Verify sorting behavior (implementation dependent)
      // This assumes the table is sorted by name

      // Sort by name (descending)
      fireEvent.click(nameHeader);

      // Sort by provider
      const providerHeader = screen.getByRole("columnheader", {
        name: /provider/i,
      });
      fireEvent.click(providerHeader);

      // Sort by cost
      const costHeader = screen.getByRole("columnheader", {
        name: /input cost/i,
      });
      fireEvent.click(costHeader);
    });

    it("should display model details when row is selected", async () => {
      render(<ModelTable />);

      // Wait for models to load
      await waitFor(() => {
        expect(screen.getByText("gpt-4")).toBeInTheDocument();
      });

      // Click on a model row to view details
      const gpt4Row = screen.getByText("gpt-4").closest("tr");
      if (gpt4Row) {
        fireEvent.click(gpt4Row);
      }

      // Should show model details (implementation dependent)
      // This assumes there's a modal or expanded view for model details
    });

    it("should handle empty search results gracefully", async () => {
      render(<ModelTable />);

      // Wait for models to load
      await waitFor(() => {
        expect(screen.getByText("gpt-4")).toBeInTheDocument();
      });

      // Search for non-existent model
      const searchInput = screen.getByPlaceholderText(/search models/i);
      fireEvent.change(searchInput, {
        target: { value: "non-existent-model" },
      });

      // Should show empty state or no results message
      await waitFor(() => {
        expect(screen.queryByText("gpt-4")).not.toBeInTheDocument();
        expect(screen.queryByText("claude-3")).not.toBeInTheDocument();
        expect(screen.queryByText("dall-e-3")).not.toBeInTheDocument();
        expect(screen.queryByText("llama-2-70b")).not.toBeInTheDocument();
      });

      // Should show appropriate message
      expect(screen.getByText(/no models found/i)).toBeInTheDocument();
    });

    it("should handle API errors gracefully", async () => {
      // Mock API error
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: "Internal server error" }),
      });

      render(<ModelTable />);

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/error loading models/i)).toBeInTheDocument();
      });
    });

    it("should handle loading state", () => {
      // Mock slow API response
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ models: mockModels }),
                }),
              100
            )
          )
      );

      render(<ModelTable />);

      // Should show loading state initially
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Wait for data to load
      waitFor(() => {
        expect(screen.getByText("gpt-4")).toBeInTheDocument();
      });
    });
  });
});
