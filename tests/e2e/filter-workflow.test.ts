import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch for API calls
global.fetch = vi.fn();

describe("Filter Workflow E2E Tests", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Complete Filter Creation and Application Workflow", () => {
    it("should create a filter, apply it, and view results", async () => {
      // Mock API responses for the complete workflow
      const mockCreateResponse = {
        id: "new-filter-id",
        ownerId: "test-user",
        teamId: null,
        name: "Budget Models Filter",
        description: "Models under $0.05 per 1M tokens",
        visibility: "private",
        rules: [
          {
            field: "inputCost",
            operator: "lte",
            value: 0.05,
            type: "hard",
          },
        ],
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastUsedAt: null,
        usageCount: 0,
      };

      const mockEvaluationResponse = {
        filterId: "new-filter-id",
        filterName: "Budget Models Filter",
        results: [
          {
            modelId: "llama-2",
            modelName: "llama-2-70b",
            match: true,
            score: 1.0,
            rationale: "Input cost $0.001 is within budget",
            failedHardClauses: 0,
            passedSoftClauses: 0,
            totalSoftClauses: 0,
          },
          {
            modelId: "gpt-4",
            modelName: "gpt-4",
            match: false,
            score: 0.0,
            rationale: "Input cost $0.03 exceeds budget",
            failedHardClauses: 1,
            passedSoftClauses: 0,
            totalSoftClauses: 0,
          },
        ],
        totalEvaluated: 2,
        matchCount: 1,
      };

      // Mock the complete API call sequence
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ filters: [], total: 0, page: 1, pageSize: 20 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCreateResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            filters: [mockCreateResponse],
            total: 1,
            page: 1,
            pageSize: 20,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvaluationResponse,
        });

      // Render the filter list
      render(<FilterList />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText(/no filters found/i)).toBeInTheDocument();
      });

      // Click create filter button
      const createButton = screen.getByRole("button", {
        name: /create filter/i,
      });
      fireEvent.click(createButton);

      // Wait for filter editor to open
      await waitFor(() => {
        expect(screen.getByText(/create filter/i)).toBeInTheDocument();
      });

      // Fill in filter details
      const nameInput = screen.getByLabelText(/filter name/i);
      fireEvent.change(nameInput, {
        target: { value: "Budget Models Filter" },
      });

      const descriptionInput = screen.getByLabelText(/description/i);
      fireEvent.change(descriptionInput, {
        target: { value: "Models under $0.05 per 1M tokens" },
      });

      // Add a rule
      const addRuleButton = screen.getByRole("button", { name: /add rule/i });
      fireEvent.click(addRuleButton);

      await waitFor(() => {
        const fieldSelect = screen.getByDisplayValue("");
        fireEvent.click(fieldSelect);
      });

      // Select input cost field
      const inputCostOption = screen.getByText("Input Cost");
      fireEvent.click(inputCostOption);

      // Set operator
      const operatorSelect = screen.getByDisplayValue("");
      fireEvent.click(operatorSelect);
      const lteOption = screen.getByText("Less than or equal");
      fireEvent.click(lteOption);

      // Set value
      const valueInput = screen.getByPlaceholderText(/enter value/i);
      fireEvent.change(valueInput, { target: { value: "0.05" } });

      // Submit the form
      const submitButton = screen.getByRole("button", {
        name: /create filter/i,
      });
      fireEvent.click(submitButton);

      // Wait for filter to be created and list to refresh
      await waitFor(() => {
        expect(screen.getByText("Budget Models Filter")).toBeInTheDocument();
      });

      // Apply the filter
      const applyButton = screen.getByRole("button", { name: /apply filter/i });
      fireEvent.click(applyButton);

      // Wait for evaluation results modal
      await waitFor(() => {
        expect(screen.getByText(/evaluation results/i)).toBeInTheDocument();
        expect(screen.getByText("Budget Models Filter")).toBeInTheDocument();
        expect(screen.getByText("1 of 2 models matched")).toBeInTheDocument();
      });

      // Check that results are displayed correctly
      expect(screen.getByText("llama-2-70b")).toBeInTheDocument();
      expect(screen.getByText("gpt-4")).toBeInTheDocument();
      expect(
        screen.getByText("Input cost $0.001 is within budget")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Input cost $0.03 exceeds budget")
      ).toBeInTheDocument();
    });

    it("should handle filter editing workflow", async () => {
      const existingFilter = {
        id: "existing-filter-id",
        ownerId: "test-user",
        teamId: null,
        name: "Original Filter",
        description: "Original description",
        visibility: "private",
        rules: [
          {
            field: "provider",
            operator: "eq",
            value: "OpenAI",
            type: "hard",
          },
        ],
        version: 1,
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
        lastUsedAt: null,
        usageCount: 0,
      };

      const updatedFilter = {
        ...existingFilter,
        name: "Updated Filter",
        description: "Updated description",
        version: 2,
        updatedAt: new Date().toISOString(),
      };

      // Mock API responses
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            filters: [existingFilter],
            total: 1,
            page: 1,
            pageSize: 20,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => existingFilter,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => updatedFilter,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            filters: [updatedFilter],
            total: 1,
            page: 1,
            pageSize: 20,
          }),
        });

      // Render filter list
      render(<FilterList />);

      // Wait for filters to load
      await waitFor(() => {
        expect(screen.getByText("Original Filter")).toBeInTheDocument();
      });

      // Click edit button
      const editButton = screen.getByRole("button", { name: /edit/i });
      fireEvent.click(editButton);

      // Wait for filter editor to open in edit mode
      await waitFor(() => {
        expect(screen.getByText(/edit filter/i)).toBeInTheDocument();
        expect(screen.getByDisplayValue("Original Filter")).toBeInTheDocument();
      });

      // Update the name
      const nameInput = screen.getByDisplayValue("Original Filter");
      fireEvent.change(nameInput, { target: { value: "Updated Filter" } });

      // Update the description
      const descriptionInput = screen.getByDisplayValue("Original description");
      fireEvent.change(descriptionInput, {
        target: { value: "Updated description" },
      });

      // Submit the form
      const submitButton = screen.getByRole("button", {
        name: /update filter/i,
      });
      fireEvent.click(submitButton);

      // Wait for filter to be updated and list to refresh
      await waitFor(() => {
        expect(screen.getByText("Updated Filter")).toBeInTheDocument();
        expect(screen.getByText("Updated description")).toBeInTheDocument();
      });
    });

    it("should handle filter deletion workflow", async () => {
      const filterToDelete = {
        id: "delete-filter-id",
        ownerId: "test-user",
        teamId: null,
        name: "Filter to Delete",
        description: "This filter will be deleted",
        visibility: "private",
        rules: [],
        version: 1,
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
        lastUsedAt: null,
        usageCount: 0,
      };

      // Mock API responses
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            filters: [filterToDelete],
            total: 1,
            page: 1,
            pageSize: 20,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 204,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ filters: [], total: 0, page: 1, pageSize: 20 }),
        });

      // Render filter list
      render(<FilterList />);

      // Wait for filters to load
      await waitFor(() => {
        expect(screen.getByText("Filter to Delete")).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getByRole("button", { name: /delete/i });
      fireEvent.click(deleteButton);

      // Wait for confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });

      // Confirm deletion
      const confirmButton = screen.getByRole("button", { name: /delete/i });
      fireEvent.click(confirmButton);

      // Wait for filter to be deleted and list to refresh
      await waitFor(() => {
        expect(screen.getByText(/no filters found/i)).toBeInTheDocument();
      });
    });

    it("should handle complex filter with multiple rules", async () => {
      const complexFilter = {
        id: "complex-filter-id",
        ownerId: "test-user",
        teamId: null,
        name: "Complex AI Filter",
        description: "Models with vision, tools, and low cost",
        visibility: "public",
        rules: [
          {
            field: "modalities",
            operator: "contains",
            value: "image",
            type: "hard",
          },
          {
            field: "capabilities",
            operator: "contains",
            value: "tools",
            type: "hard",
          },
          {
            field: "inputCost",
            operator: "lte",
            value: 0.05,
            type: "soft",
            weight: 0.8,
          },
        ],
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastUsedAt: null,
        usageCount: 0,
      };

      const complexEvaluationResults = {
        filterId: "complex-filter-id",
        filterName: "Complex AI Filter",
        results: [
          {
            modelId: "gpt-4-vision",
            modelName: "gpt-4-vision",
            match: true,
            score: 0.8,
            rationale: "Passes all hard clauses, soft clause adds 0.8 score",
            failedHardClauses: 0,
            passedSoftClauses: 1,
            totalSoftClauses: 1,
          },
          {
            modelId: "claude-3",
            modelName: "claude-3",
            match: false,
            score: 0.0,
            rationale: "Fails hard clause: does not have tools capability",
            failedHardClauses: 1,
            passedSoftClauses: 0,
            totalSoftClauses: 1,
          },
        ],
        totalEvaluated: 2,
        matchCount: 1,
      };

      // Mock API responses
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ filters: [], total: 0, page: 1, pageSize: 20 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => complexFilter,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            filters: [complexFilter],
            total: 1,
            page: 1,
            pageSize: 20,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => complexEvaluationResults,
        });

      // Render filter list
      render(<FilterList />);

      // Create complex filter
      await waitFor(() => {
        expect(screen.getByText(/no filters found/i)).toBeInTheDocument();
      });

      const createButton = screen.getByRole("button", {
        name: /create filter/i,
      });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/create filter/i)).toBeInTheDocument();
      });

      // Fill basic info
      const nameInput = screen.getByLabelText(/filter name/i);
      fireEvent.change(nameInput, { target: { value: "Complex AI Filter" } });

      const descriptionInput = screen.getByLabelText(/description/i);
      fireEvent.change(descriptionInput, {
        target: { value: "Models with vision, tools, and low cost" },
      });

      // Set visibility to public
      const visibilitySelect = screen.getByDisplayValue("Private");
      fireEvent.click(visibilitySelect);
      const publicOption = screen.getByText("Public");
      fireEvent.click(publicOption);

      // Add first rule (modalities)
      const addRuleButton = screen.getByRole("button", { name: /add rule/i });
      fireEvent.click(addRuleButton);

      await waitFor(() => {
        const fieldSelect = screen.getByDisplayValue("");
        fireEvent.click(fieldSelect);
      });

      const modalitiesOption = screen.getByText("Modalities");
      fireEvent.click(modalitiesOption);

      const operatorSelect = screen.getByDisplayValue("");
      fireEvent.click(operatorSelect);
      const containsOption = screen.getByText("Contains");
      fireEvent.click(containsOption);

      const valueInput = screen.getByPlaceholderText(/enter value/i);
      fireEvent.change(valueInput, { target: { value: "image" } });

      // Add second rule (capabilities)
      fireEvent.click(addRuleButton);

      await waitFor(() => {
        const fieldSelects = screen.getAllByDisplayValue("");
        const secondFieldSelect = fieldSelects[1];
        fireEvent.click(secondFieldSelect);
      });

      const capabilitiesOption = screen.getByText("Capabilities");
      fireEvent.click(capabilitiesOption);

      const secondOperatorSelect = screen.getAllByDisplayValue("")[1];
      fireEvent.click(secondOperatorSelect);
      const secondContainsOption = screen.getByText("Contains");
      fireEvent.click(secondContainsOption);

      const secondValueInput =
        screen.getAllByPlaceholderText(/enter value/i)[1];
      fireEvent.change(secondValueInput, { target: { value: "tools" } });

      // Add third rule (soft rule)
      fireEvent.click(addRuleButton);

      await waitFor(() => {
        const fieldSelects = screen.getAllByDisplayValue("");
        const thirdFieldSelect = fieldSelects[2];
        fireEvent.click(thirdFieldSelect);
      });

      const inputCostOption = screen.getByText("Input Cost");
      fireEvent.click(inputCostOption);

      const thirdOperatorSelect = screen.getAllByDisplayValue("")[2];
      fireEvent.click(thirdOperatorSelect);
      const lteOption = screen.getByText("Less than or equal");
      fireEvent.click(lteOption);

      const thirdValueInput = screen.getAllByPlaceholderText(/enter value/i)[2];
      fireEvent.change(thirdValueInput, { target: { value: "0.05" } });

      // Set type to soft
      const typeSelect = screen.getAllByDisplayValue("")[2];
      fireEvent.click(typeSelect);
      const softOption = screen.getByText("Soft");
      fireEvent.click(softOption);

      // Set weight
      const weightInput = screen.getByLabelText(/weight/i);
      fireEvent.change(weightInput, { target: { value: "0.8" } });

      // Submit the form
      const submitButton = screen.getByRole("button", {
        name: /create filter/i,
      });
      fireEvent.click(submitButton);

      // Wait for filter to be created
      await waitFor(() => {
        expect(screen.getByText("Complex AI Filter")).toBeInTheDocument();
      });

      // Apply the complex filter
      const applyButton = screen.getByRole("button", { name: /apply filter/i });
      fireEvent.click(applyButton);

      // Wait for evaluation results
      await waitFor(() => {
        expect(screen.getByText(/evaluation results/i)).toBeInTheDocument();
        expect(screen.getByText("Complex AI Filter")).toBeInTheDocument();
        expect(screen.getByText("1 of 2 models matched")).toBeInTheDocument();
      });

      // Verify complex results
      expect(screen.getByText("gpt-4-vision")).toBeInTheDocument();
      expect(screen.getByText("claude-3")).toBeInTheDocument();
      expect(
        screen.getByText("Passes all hard clauses, soft clause adds 0.8 score")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Fails hard clause: does not have tools capability")
      ).toBeInTheDocument();
    });

    it("should handle filter visibility and sharing", async () => {
      const privateFilter = {
        id: "private-filter-id",
        ownerId: "test-user",
        teamId: null,
        name: "Private Filter",
        description: "This is a private filter",
        visibility: "private",
        rules: [],
        version: 1,
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
        lastUsedAt: null,
        usageCount: 0,
      };

      const teamFilter = {
        id: "team-filter-id",
        ownerId: "test-user",
        teamId: "test-team-123",
        name: "Team Filter",
        description: "This is a team filter",
        visibility: "team",
        rules: [],
        version: 1,
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
        lastUsedAt: null,
        usageCount: 0,
      };

      const publicFilter = {
        id: "public-filter-id",
        ownerId: "other-user",
        teamId: null,
        name: "Public Filter",
        description: "This is a public filter",
        visibility: "public",
        rules: [],
        version: 1,
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
        lastUsedAt: null,
        usageCount: 0,
      };

      // Mock API responses for different visibility filters
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          filters: [privateFilter, teamFilter, publicFilter],
          total: 3,
          page: 1,
          pageSize: 20,
        }),
      });

      // Render filter list
      render(<FilterList />);

      // Wait for all filters to load
      await waitFor(() => {
        expect(screen.getByText("Private Filter")).toBeInTheDocument();
        expect(screen.getByText("Team Filter")).toBeInTheDocument();
        expect(screen.getByText("Public Filter")).toBeInTheDocument();
      });

      // Test filtering by visibility
      const visibilityFilter = screen.getByDisplayValue("All");
      fireEvent.click(visibilityFilter);

      const privateOption = screen.getByText("Private");
      fireEvent.click(privateOption);

      // Should show only private filters
      await waitFor(() => {
        expect(screen.getByText("Private Filter")).toBeInTheDocument();
        expect(screen.queryByText("Team Filter")).not.toBeInTheDocument();
        expect(screen.queryByText("Public Filter")).not.toBeInTheDocument();
      });

      // Test team visibility
      fireEvent.click(visibilityFilter);
      const teamOption = screen.getByText("Team");
      fireEvent.click(teamOption);

      await waitFor(() => {
        expect(screen.getByText("Team Filter")).toBeInTheDocument();
        expect(screen.queryByText("Private Filter")).not.toBeInTheDocument();
        expect(screen.queryByText("Public Filter")).not.toBeInTheDocument();
      });

      // Test public visibility
      fireEvent.click(visibilityFilter);
      const publicOption = screen.getByText("Public");
      fireEvent.click(publicOption);

      await waitFor(() => {
        expect(screen.getByText("Public Filter")).toBeInTheDocument();
        expect(screen.queryByText("Private Filter")).not.toBeInTheDocument();
        expect(screen.queryByText("Team Filter")).not.toBeInTheDocument();
      });
    });
  });
});
