import type { ChatMessage } from "@/app/api/chat/route";
import { POST } from "@/app/api/chat/route";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("POST /api/chat", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("should handle valid chat request with streaming", async () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "What are the cheapest models?",
        createdAt: new Date().toISOString(),
      },
    ];

    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "test-user-123",
      },
      body: JSON.stringify({
        messages,
        options: {
          stream: true,
          topK: 5,
        },
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/plain; charset=utf-8"
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("should handle valid chat request without streaming", async () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "Show me models with vision capabilities",
        createdAt: new Date().toISOString(),
      },
    ];

    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "test-user-123",
      },
      body: JSON.stringify({
        messages,
        options: {
          stream: false,
          topK: 3,
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.content).toBeDefined();
    expect(data.meta).toBeDefined();
    expect(data.meta.citations).toBeDefined();
    expect(data.meta.finishReason).toBe("completed");
  });

  it("should reject request without user ID", async () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "What models are available?",
      },
    ];

    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // No x-user-id header
      },
      body: JSON.stringify({
        messages,
        options: { stream: false },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should reject request with invalid JSON", async () => {
    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "test-user-123",
      },
      body: "invalid json",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("invalid JSON");
  });

  it("should reject request with invalid message format", async () => {
    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "test-user-123",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "invalid-role", // Invalid role
            content: "Test message",
          },
        ],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("invalid request");
    expect(data.detail).toBeDefined();
  });

  it("should reject request with empty messages", async () => {
    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "test-user-123",
      },
      body: JSON.stringify({
        messages: [],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("invalid request");
  });

  it("should handle request with system message", async () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "system",
        content: "You are a helpful assistant for ModelLens.",
      },
      {
        id: "2",
        role: "user",
        content: "What are the most recent models?",
      },
    ];

    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "test-user-123",
      },
      body: JSON.stringify({
        messages,
        options: { stream: false },
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("should handle request with conversation history", async () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "What is GPT-4?",
      },
      {
        id: "2",
        role: "assistant",
        content: "GPT-4 is a large language model from OpenAI.",
      },
      {
        id: "3",
        role: "user",
        content: "What about Claude?",
      },
    ];

    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "test-user-123",
      },
      body: JSON.stringify({
        messages,
        options: { stream: false },
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("should validate topK parameter range", async () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "Show me models",
      },
    ];

    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "test-user-123",
      },
      body: JSON.stringify({
        messages,
        options: {
          topK: 100, // Exceeds max of 50
          stream: false,
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("invalid request");
  });

  it("should handle options with includeRuns and includeFilters", async () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "Show me filter results",
      },
    ];

    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "test-user-123",
      },
      body: JSON.stringify({
        messages,
        options: {
          includeRuns: true,
          includeFilters: false,
          stream: false,
        },
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("should handle empty request body", async () => {
    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "test-user-123",
      },
      body: "",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("invalid request");
  });

  it("should extract query from last user message", async () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "assistant",
        content: "Hello! How can I help?",
      },
      {
        id: "2",
        role: "user",
        content: "What models support vision?",
      },
    ];

    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "test-user-123",
      },
      body: JSON.stringify({
        messages,
        options: { stream: false },
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    // The query should be extracted from the last user message
  });

  it("should handle internal server errors gracefully", async () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "Test message",
      },
    ];

    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "test-user-123",
      },
      body: JSON.stringify({
        messages,
        options: { stream: false },
      }),
    });

    // Mock an error in the structuredSearch function
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Test error"));

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("internal_server_error");

    consoleSpy.mockRestore();
  });
});
