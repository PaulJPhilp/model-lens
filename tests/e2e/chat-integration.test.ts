import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch for API calls
global.fetch = vi.fn();

describe("Chat Integration E2E Tests", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Chat Functionality", () => {
    it("should render chat interface and handle user input", async () => {
      // Mock successful chat API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content:
            "Here are some models that might help: GPT-4 for general tasks, Claude-3 for reasoning.",
          meta: {
            citations: [
              {
                type: "MODEL",
                id: "gpt-4",
                title: "GPT-4",
                snippet: "General purpose model",
              },
              {
                type: "MODEL",
                id: "claude-3",
                title: "Claude-3",
                snippet: "Reasoning model",
              },
            ],
            finishReason: "completed",
          },
        }),
      });

      render(<ChatWithAISDK userId="test-user-123" />);

      // Wait for chat interface to load
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/type your message/i)
        ).toBeInTheDocument();
      });

      // Type a message
      const messageInput = screen.getByPlaceholderText(/type your message/i);
      fireEvent.change(messageInput, {
        target: { value: "What models support vision?" },
      });

      // Send the message
      const sendButton = screen.getByRole("button", { name: /send/i });
      fireEvent.click(sendButton);

      // Wait for response
      await waitFor(() => {
        expect(
          screen.getByText("What models support vision?")
        ).toBeInTheDocument();
        expect(
          screen.getByText(/here are some models that might help/i)
        ).toBeInTheDocument();
      });

      // Verify citations are displayed
      expect(screen.getByText("GPT-4")).toBeInTheDocument();
      expect(screen.getByText("Claude-3")).toBeInTheDocument();
    });

    it("should handle streaming responses", async () => {
      // Mock streaming response
      const mockStream = new ReadableStream({
        start(controller) {
          const chunks = [
            "Here are ",
            "some models ",
            "that support ",
            "vision: ",
            "GPT-4V and ",
            "Claude-3.",
          ];

          let index = 0;
          const interval = setInterval(() => {
            if (index < chunks.length) {
              controller.enqueue(new TextEncoder().encode(chunks[index]));
              index++;
            } else {
              controller.close();
              clearInterval(interval);
            }
          }, 50);
        },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: mockStream,
      });

      render(<ChatWithAISDK userId="test-user-123" />);

      // Wait for chat interface to load
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/type your message/i)
        ).toBeInTheDocument();
      });

      // Type and send a message
      const messageInput = screen.getByPlaceholderText(/type your message/i);
      fireEvent.change(messageInput, {
        target: { value: "What models support vision?" },
      });

      const sendButton = screen.getByRole("button", { name: /send/i });
      fireEvent.click(sendButton);

      // Wait for streaming response to complete
      await waitFor(() => {
        expect(
          screen.getByText(/here are some models that support vision/i)
        ).toBeInTheDocument();
      });
    });

    it("should handle conversation history", async () => {
      // Mock multiple chat responses
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            content: "GPT-4 is a general purpose model.",
            meta: { citations: [], finishReason: "completed" },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            content: "Claude-3 is good for reasoning tasks.",
            meta: { citations: [], finishReason: "completed" },
          }),
        });

      render(<ChatWithAISDK userId="test-user-123" />);

      // Wait for chat interface to load
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/type your message/i)
        ).toBeInTheDocument();
      });

      // Send first message
      const messageInput = screen.getByPlaceholderText(/type your message/i);
      fireEvent.change(messageInput, {
        target: { value: "Tell me about GPT-4" },
      });

      const sendButton = screen.getByRole("button", { name: /send/i });
      fireEvent.click(sendButton);

      // Wait for first response
      await waitFor(() => {
        expect(screen.getByText("Tell me about GPT-4")).toBeInTheDocument();
        expect(
          screen.getByText("GPT-4 is a general purpose model.")
        ).toBeInTheDocument();
      });

      // Send second message
      fireEvent.change(messageInput, {
        target: { value: "What about Claude-3?" },
      });
      fireEvent.click(sendButton);

      // Wait for second response
      await waitFor(() => {
        expect(screen.getByText("What about Claude-3?")).toBeInTheDocument();
        expect(
          screen.getByText("Claude-3 is good for reasoning tasks.")
        ).toBeInTheDocument();
      });

      // Verify conversation history is maintained
      expect(screen.getByText("Tell me about GPT-4")).toBeInTheDocument();
      expect(
        screen.getByText("GPT-4 is a general purpose model.")
      ).toBeInTheDocument();
      expect(screen.getByText("What about Claude-3?")).toBeInTheDocument();
      expect(
        screen.getByText("Claude-3 is good for reasoning tasks.")
      ).toBeInTheDocument();
    });

    it("should handle system message configuration", async () => {
      const customSystemMessage =
        "You are a specialized AI model assistant for ModelLens.";

      // Mock chat response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: "I can help you find the perfect AI model for your needs.",
          meta: { citations: [], finishReason: "completed" },
        }),
      });

      render(
        <ChatWithAISDK
          userId="test-user-123"
          initialSystemMessage={customSystemMessage}
        />
      );

      // Wait for chat interface to load
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/type your message/i)
        ).toBeInTheDocument();
      });

      // Send a message
      const messageInput = screen.getByPlaceholderText(/type your message/i);
      fireEvent.change(messageInput, { target: { value: "Hello" } });

      const sendButton = screen.getByRole("button", { name: /send/i });
      fireEvent.click(sendButton);

      // Wait for response
      await waitFor(() => {
        expect(
          screen.getByText(/i can help you find the perfect ai model/i)
        ).toBeInTheDocument();
      });
    });

    it("should handle chat errors gracefully", async () => {
      // Mock API error
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: "Internal server error" }),
      });

      render(<ChatWithAISDK userId="test-user-123" />);

      // Wait for chat interface to load
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/type your message/i)
        ).toBeInTheDocument();
      });

      // Send a message
      const messageInput = screen.getByPlaceholderText(/type your message/i);
      fireEvent.change(messageInput, { target: { value: "Hello" } });

      const sendButton = screen.getByRole("button", { name: /send/i });
      fireEvent.click(sendButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/error sending message/i)).toBeInTheDocument();
      });
    });

    it("should handle unauthorized requests", async () => {
      // Mock unauthorized response
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      });

      render(<ChatWithAISDK userId="test-user-123" />);

      // Wait for chat interface to load
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/type your message/i)
        ).toBeInTheDocument();
      });

      // Send a message
      const messageInput = screen.getByPlaceholderText(/type your message/i);
      fireEvent.change(messageInput, { target: { value: "Hello" } });

      const sendButton = screen.getByRole("button", { name: /send/i });
      fireEvent.click(sendButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/unauthorized/i)).toBeInTheDocument();
      });
    });

    it("should handle network errors", async () => {
      // Mock network error
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      render(<ChatWithAISDK userId="test-user-123" />);

      // Wait for chat interface to load
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/type your message/i)
        ).toBeInTheDocument();
      });

      // Send a message
      const messageInput = screen.getByPlaceholderText(/type your message/i);
      fireEvent.change(messageInput, { target: { value: "Hello" } });

      const sendButton = screen.getByRole("button", { name: /send/i });
      fireEvent.click(sendButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it("should handle empty messages", async () => {
      render(<ChatWithAISDK userId="test-user-123" />);

      // Wait for chat interface to load
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/type your message/i)
        ).toBeInTheDocument();
      });

      // Try to send empty message
      const sendButton = screen.getByRole("button", { name: /send/i });
      fireEvent.click(sendButton);

      // Send button should be disabled or message should not be sent
      expect(sendButton).toBeDisabled();
    });

    it("should handle long messages", async () => {
      // Mock successful response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: "I understand your long message.",
          meta: { citations: [], finishReason: "completed" },
        }),
      });

      render(<ChatWithAISDK userId="test-user-123" />);

      // Wait for chat interface to load
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/type your message/i)
        ).toBeInTheDocument();
      });

      // Send a long message
      const longMessage =
        "This is a very long message that contains a lot of text and should be handled properly by the chat system. It includes multiple sentences and should test the system's ability to handle longer user inputs without issues.";

      const messageInput = screen.getByPlaceholderText(/type your message/i);
      fireEvent.change(messageInput, { target: { value: longMessage } });

      const sendButton = screen.getByRole("button", { name: /send/i });
      fireEvent.click(sendButton);

      // Wait for response
      await waitFor(() => {
        expect(screen.getByText(longMessage)).toBeInTheDocument();
        expect(
          screen.getByText(/i understand your long message/i)
        ).toBeInTheDocument();
      });
    });

    it("should handle message input validation", async () => {
      render(<ChatWithAISDK userId="test-user-123" />);

      // Wait for chat interface to load
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/type your message/i)
        ).toBeInTheDocument();
      });

      const messageInput = screen.getByPlaceholderText(/type your message/i);

      // Test various input scenarios
      fireEvent.change(messageInput, { target: { value: "   " } }); // Only spaces
      expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();

      fireEvent.change(messageInput, { target: { value: "Valid message" } });
      expect(screen.getByRole("button", { name: /send/i })).not.toBeDisabled();

      fireEvent.change(messageInput, { target: { value: "" } }); // Empty
      expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
    });

    it("should handle chat with citations and metadata", async () => {
      // Mock response with citations
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content:
            "Based on your requirements, I recommend GPT-4 for general tasks and Claude-3 for reasoning.",
          meta: {
            citations: [
              {
                type: "MODEL",
                id: "gpt-4",
                title: "GPT-4",
                snippet: "General purpose model with 128K context window",
              },
              {
                type: "MODEL",
                id: "claude-3",
                title: "Claude-3",
                snippet: "Advanced reasoning model with 200K context window",
              },
            ],
            finishReason: "completed",
          },
        }),
      });

      render(<ChatWithAISDK userId="test-user-123" />);

      // Wait for chat interface to load
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/type your message/i)
        ).toBeInTheDocument();
      });

      // Send a message
      const messageInput = screen.getByPlaceholderText(/type your message/i);
      fireEvent.change(messageInput, {
        target: { value: "Recommend models for my project" },
      });

      const sendButton = screen.getByRole("button", { name: /send/i });
      fireEvent.click(sendButton);

      // Wait for response with citations
      await waitFor(() => {
        expect(
          screen.getByText(/based on your requirements/i)
        ).toBeInTheDocument();
        expect(screen.getByText("GPT-4")).toBeInTheDocument();
        expect(screen.getByText("Claude-3")).toBeInTheDocument();
      });

      // Verify citation details are accessible
      const gpt4Citation = screen.getByText("GPT-4");
      const claude3Citation = screen.getByText("Claude-3");

      expect(gpt4Citation).toBeInTheDocument();
      expect(claude3Citation).toBeInTheDocument();
    });
  });
});
