// src/components/Chat.tsx
import React, { useEffect, useRef, useState } from "react";

/**
 * Chat component that streams tokens from POST /api/chat.
 *
 * Assumptions:
 * - The server supports a streaming response from POST /api/chat when body
 *   includes { messages, options: { stream: true } }.
 * - A companion endpoint GET /api/chat/meta?queryHash=... or POST /api/chat/meta
 *   exists to return citations for the last query. If not present, citations
 *   panel will be empty (gracefully).
 *
 * Replace fetch calls with your auth-aware fetch wrapper if needed.
 */

/* ==== Types ==== */

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  createdAt: string;
  editedAt?: string;
};

type Citation =
  | { type: "MODEL"; id: string; title?: string; snippet?: string }
  | { type: "FILTER"; id: string; title?: string; snippet?: string }
  | { type: "RUN"; id: string; title?: string; snippet?: string }
  | { type: "DOC"; id: string; title?: string; snippet?: string };

type ChatRequestBody = {
  messages: { role: "user" | "assistant" | "system"; text: string }[];
  options?: {
    topK?: number;
    includeRuns?: boolean;
    includeFilters?: boolean;
    stream?: boolean;
  };
};

type MetaResponse = {
  citations?: Citation[];
  runId?: string | null;
};

type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

/* ==== Helpers ==== */

function nowIso() {
  return new Date().toISOString();
}

function generateId(prefix = "msg") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function formatRelativeTime(isoDate: string): string {
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

/* ==== Component ==== */

export default function Chat({
  initialSystemMessage,
  userIdHeaderName = "x-user-id",
  userId,
}: {
  initialSystemMessage?: string;
  userIdHeaderName?: string;
  userId?: string; // optional - header convenience
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialSystemMessage
      ? [
          {
            id: generateId("sys"),
            role: "system",
            text: initialSystemMessage,
            createdAt: nowIso(),
          },
        ]
      : []
  );
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [citations, setCitations] = useState<Citation[] | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const assistantBufferRef = useRef<string>(""); // accumulate current assistant text

  // Editing state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  // Conversation save/load state
  const [currentConversationId, setCurrentConversationId] = useState<string>(generateId("conv"));
  const [savedConversations, setSavedConversations] = useState<Conversation[]>([]);
  const [showSavedList, setShowSavedList] = useState(false);

  // auto-scroll to bottom
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  // Load saved conversations from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("chat-conversations");
      if (saved) {
        setSavedConversations(JSON.parse(saved));
      }
    } catch (err) {
      console.warn("Failed to load conversations:", err);
    }
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("chat-conversations", JSON.stringify(savedConversations));
    } catch (err) {
      console.warn("Failed to save conversations:", err);
    }
  }, [savedConversations]);

  // Add message to history
  function pushMessage(msg: Partial<ChatMessage>) {
    const m: ChatMessage = {
      id: msg.id ?? generateId("msg"),
      role: msg.role ?? "assistant",
      text: msg.text ?? "",
      createdAt: msg.createdAt ?? nowIso(),
    };
    setMessages((prev) => [...prev, m]);
    return m;
  }

  // Update last assistant message in place while streaming
  function upsertAssistantStreaming(text: string) {
    assistantBufferRef.current = text;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === "assistant") {
        // replace last assistant message
        return [
          ...prev.slice(0, -1),
          { ...last, text, createdAt: last.createdAt },
        ];
      } else {
        // append new assistant message
        const m: ChatMessage = {
          id: generateId("assistant"),
          role: "assistant",
          text,
          createdAt: nowIso(),
        };
        return [...prev, m];
      }
    });
  }

  // Send user input (start streaming)
  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const prompt = input.trim();
    if (!prompt) return;
    setError(null);
    setCitations(null);

    // Add user message to history
    pushMessage({ role: "user", text: prompt });

    // Prepare conversation (last N messages)
    const conv = messages
      .concat([{ id: generateId("usr"), role: "user", text: prompt, createdAt: nowIso() }])
      .slice(-8) // keep last N messages for context
      .map((m) => ({ role: m.role as "user" | "assistant" | "system", text: m.text }));

    const body: ChatRequestBody = {
      messages: conv,
      options: { topK: 6, includeRuns: true, includeFilters: true, stream: true },
    };

    setInput("");
    setIsStreaming(true);
    assistantBufferRef.current = "";

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [userIdHeaderName]: userId ?? "",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `chat request failed: ${res.status}`);
      }

      // Stream reader
      const reader = res.body?.getReader();
      if (!reader) {
        // Fallback: no streaming body - parse JSON
        const text = await res.text();
        upsertAssistantStreaming(text);
        setIsStreaming(false);
        // attempt to fetch meta
        void fetchCitationsForQuery(prompt);
        return;
      }

      // stream tokens as they arrive
      const decoder = new TextDecoder();
      let done = false;
      let acc = "";
      while (!done) {
        const read = await reader.read();
        done = !!read.done;
        if (read.value) {
          const chunk = decoder.decode(read.value, { stream: true });
          acc += chunk;
          // update assistant text progressively
          upsertAssistantStreaming(assistantBufferRef.current + chunk);
        }
      }
      // final flush
      upsertAssistantStreaming(acc);
      setIsStreaming(false);

      // Try to fetch associated metadata (citations) to display nearby sources.
      // This relies on a companion endpoint; if not implemented server-side,
      // this call may 404 or return empty list — handled gracefully.
      void fetchCitationsForQuery(prompt);
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("Streaming aborted");
      } else {
        setError(err?.message ?? String(err));
      }
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  function handleStop() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setIsStreaming(false);
    }
  }

  // Best-effort fetch of metadata / citations using companion endpoint.
  // Server can implement POST /api/chat/meta with the same messages or a query hash.
  async function fetchCitationsForQuery(queryText: string) {
    try {
      const res = await fetch("/api/chat/meta", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: queryText }),
      });
      if (!res.ok) {
        // silently ignore - meta endpoint optional
        return;
      }
      const data: MetaResponse = await res.json();
      setCitations(data.citations ?? null);
    } catch (err) {
      // ignore errors for meta fetch
    }
  }

  // Message editing functions
  function startEditMessage(msg: ChatMessage) {
    if (msg.role !== "user") return; // Only allow editing user messages
    setEditingMessageId(msg.id);
    setEditingText(msg.text);
  }

  function cancelEdit() {
    setEditingMessageId(null);
    setEditingText("");
  }

  function saveEdit() {
    if (!editingMessageId) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === editingMessageId
          ? { ...m, text: editingText, editedAt: nowIso() }
          : m
      )
    );
    setEditingMessageId(null);
    setEditingText("");
  }

  function deleteMessage(id: string) {
    if (!confirm("Delete this message?")) return;
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  // Conversation save/load functions
  function saveConversation() {
    if (messages.length === 0) return;

    const title = messages.find((m) => m.role === "user")?.text.slice(0, 50) ?? "New Conversation";
    const now = nowIso();

    const existing = savedConversations.find((c) => c.id === currentConversationId);
    if (existing) {
      // Update existing
      setSavedConversations((prev) =>
        prev.map((c) =>
          c.id === currentConversationId
            ? { ...c, messages, updatedAt: now, title }
            : c
        )
      );
    } else {
      // Create new
      const newConv: Conversation = {
        id: currentConversationId,
        title,
        messages,
        createdAt: now,
        updatedAt: now,
      };
      setSavedConversations((prev) => [newConv, ...prev]);
    }
  }

  function loadConversation(conv: Conversation) {
    setMessages(conv.messages);
    setCurrentConversationId(conv.id);
    setShowSavedList(false);
    setCitations(null);
    setError(null);
  }

  function deleteConversation(id: string) {
    if (!confirm("Delete this conversation?")) return;
    setSavedConversations((prev) => prev.filter((c) => c.id !== id));
  }

  function newConversation() {
    setMessages(
      initialSystemMessage
        ? [
            {
              id: generateId("sys"),
              role: "system",
              text: initialSystemMessage,
              createdAt: nowIso(),
            },
          ]
        : []
    );
    setCurrentConversationId(generateId("conv"));
    setCitations(null);
    setError(null);
    setShowSavedList(false);
  }

  // Small helper renderers
  function renderMessage(m: ChatMessage) {
    const isAssistant = m.role === "assistant";
    const isEditing = editingMessageId === m.id;

    return (
      <div
        key={m.id}
        style={{
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
          justifyContent: isAssistant ? "flex-start" : "flex-end",
        }}
      >
        <div
          style={{
            maxWidth: "78%",
            background: isAssistant ? "#f6f8fa" : "#0b5cff",
            color: isAssistant ? "#111" : "#fff",
            padding: "10px 12px",
            borderRadius: 8,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {isEditing ? (
            <div>
              <textarea
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: 60,
                  padding: 8,
                  borderRadius: 4,
                  border: "1px solid #ddd",
                  fontSize: 14,
                  fontFamily: "inherit",
                }}
                autoFocus
              />
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button
                  onClick={saveEdit}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 4,
                    background: "#0b5cff",
                    color: "#fff",
                    border: "none",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 4,
                    background: "#ddd",
                    color: "#111",
                    border: "none",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 14 }}>{m.text}</div>
              <div
                style={{
                  fontSize: 11,
                  color: isAssistant ? "#666" : "rgba(255,255,255,0.8)",
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  justifyContent: "space-between",
                }}
              >
                <span>
                  {formatRelativeTime(m.createdAt)}
                  {m.editedAt && " (edited)"}
                </span>
                {m.role === "user" && !isStreaming && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => startEditMessage(m)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "inherit",
                        cursor: "pointer",
                        fontSize: 11,
                        padding: "2px 4px",
                      }}
                      title="Edit message"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteMessage(m.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "inherit",
                        cursor: "pointer",
                        fontSize: 11,
                        padding: "2px 4px",
                      }}
                      title="Delete message"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        border: "1px solid #e6e6e6",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: 12, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>ModelLens Assistant</strong>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowSavedList(!showSavedList)}
            style={{
              padding: "6px 12px",
              borderRadius: 4,
              background: "#f6f8fa",
              border: "1px solid #ddd",
              fontSize: 12,
              cursor: "pointer",
            }}
            title="Saved conversations"
          >
            💬 {savedConversations.length}
          </button>
          <button
            onClick={saveConversation}
            disabled={messages.length === 0}
            style={{
              padding: "6px 12px",
              borderRadius: 4,
              background: "#0b5cff",
              color: "#fff",
              border: "none",
              fontSize: 12,
              cursor: messages.length === 0 ? "not-allowed" : "pointer",
              opacity: messages.length === 0 ? 0.5 : 1,
            }}
            title="Save conversation"
          >
            💾 Save
          </button>
          <button
            onClick={newConversation}
            style={{
              padding: "6px 12px",
              borderRadius: 4,
              background: "#f6f8fa",
              border: "1px solid #ddd",
              fontSize: 12,
              cursor: "pointer",
            }}
            title="New conversation"
          >
            ➕ New
          </button>
        </div>
      </div>

      {/* Saved conversations list */}
      {showSavedList && (
        <div
          style={{
            maxHeight: 200,
            overflowY: "auto",
            borderBottom: "1px solid #eee",
            background: "#f9f9f9",
          }}
        >
          {savedConversations.length === 0 ? (
            <div style={{ padding: 16, textAlign: "center", color: "#666", fontSize: 13 }}>
              No saved conversations yet
            </div>
          ) : (
            <div>
              {savedConversations.map((conv) => (
                <div
                  key={conv.id}
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid #e6e6e6",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: conv.id === currentConversationId ? "#e8f0fe" : "transparent",
                    cursor: "pointer",
                  }}
                  onClick={() => loadConversation(conv)}
                >
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {conv.title}
                    </div>
                    <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                      {conv.messages.length} messages • {formatRelativeTime(conv.updatedAt)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 14,
                      padding: "4px 8px",
                    }}
                    title="Delete conversation"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {messages.map(renderMessage)}
        <div ref={endRef} />
      </div>

      <div style={{ padding: 12, borderTop: "1px solid #eee" }}>
        <form onSubmit={handleSend} style={{ display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about models, filters, or runs..."
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #ddd",
            }}
            disabled={isStreaming}
          />
          {!isStreaming ? (
            <button
              type="submit"
              style={{
                padding: "10px 14px",
                borderRadius: 6,
                background: "#0b5cff",
                color: "#fff",
                border: "none",
              }}
            >
              Send
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStop}
              style={{
                padding: "10px 14px",
                borderRadius: 6,
                background: "#e53e3e",
                color: "#fff",
                border: "none",
              }}
            >
              Stop
            </button>
          )}
        </form>

        {error && <div style={{ color: "crimson", marginTop: 8 }}>{error}</div>}

        <div style={{ marginTop: 12 }}>
          <strong>Sources</strong>
          {!citations && <div style={{ color: "#666", fontSize: 13 }}>No sources yet</div>}
          {citations && citations.length === 0 && (
            <div style={{ color: "#666", fontSize: 13 }}>No sources returned</div>
          )}
          {citations && citations.length > 0 && (
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              {citations.map((c, i) => (
                <div
                  key={`${c.type}:${c.id}:${i}`}
                  style={{
                    border: "1px solid #f0f0f0",
                    padding: 8,
                    borderRadius: 6,
                    background: "#fff",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    [{c.type}] {c.title ?? c.id}
                  </div>
                  {c.snippet && (
                    <div style={{ fontSize: 12, color: "#444", marginTop: 6 }}>
                      {c.snippet}
                    </div>
                  )}
                  <div style={{ marginTop: 8 }}>
                    {c.type === "MODEL" && (
                      <a href={`/models/${c.id}`} target="_blank" rel="noreferrer">
                        View model
                      </a>
                    )}
                    {c.type === "FILTER" && (
                      <a href={`/filters/${c.id}`} target="_blank" rel="noreferrer">
                        View filter
                      </a>
                    )}
                    {c.type === "RUN" && (
                      <a
                        href={`/filters/${(c as any).filterId ?? ""}/runs/${c.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View run
                      </a>
                    )}
                    {c.type === "DOC" && (
                      <a href={`/docs/${encodeURIComponent(c.id)}`} target="_blank" rel="noreferrer">
                        Open doc
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
