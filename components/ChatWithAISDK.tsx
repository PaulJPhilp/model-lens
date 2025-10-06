import { Chat, useChat } from "@ai-sdk/react"
import type { UIMessage } from "ai"
import { DefaultChatTransport } from "ai"
// components/ChatWithAISDK.tsx
// Enhanced Chat component using Vercel AI SDK for cleaner streaming integration
import type { ChangeEvent, FormEvent } from "react"
import { useEffect, useRef, useState } from "react"

/**
 * Chat component using Vercel AI SDK's useChat hook.
 *
 * Benefits over manual fetch:
 * - Automatic streaming handling
 * - Built-in message management
 * - Optimistic updates
 * - Error handling
 * - Abort functionality
 * - Simpler code
 */

/* ==== Types ==== */

export type ChatMessage = {
	id: string
	role: "user" | "assistant" | "system"
	content: string
	createdAt?: string
	editedAt?: string
}

type Citation =
	| { type: "MODEL"; id: string; title?: string; snippet?: string }
	| { type: "FILTER"; id: string; title?: string; snippet?: string }
	| {
			type: "RUN"
			id: string
			title?: string
			snippet?: string
			filterId?: string
	  }
	| { type: "DOC"; id: string; title?: string; snippet?: string }

type Conversation = {
	id: string
	title: string
	messages: ChatMessage[]
	createdAt: string
	updatedAt: string
}

/* ==== Helpers ==== */

function nowIso() {
	return new Date().toISOString()
}

function generateId(prefix = "msg") {
	return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

function formatRelativeTime(isoDate: string): string {
	const now = new Date()
	const date = new Date(isoDate)
	const diffMs = now.getTime() - date.getTime()
	const diffSec = Math.floor(diffMs / 1000)
	const diffMin = Math.floor(diffSec / 60)
	const diffHour = Math.floor(diffMin / 60)
	const diffDay = Math.floor(diffHour / 24)

	if (diffSec < 60) return "just now"
	if (diffMin < 60) return `${diffMin}m ago`
	if (diffHour < 24) return `${diffHour}h ago`
	if (diffDay < 7) return `${diffDay}d ago`
	return date.toLocaleDateString()
}

function isTextUIPart(part: unknown): part is { type: "text"; text: string } {
	return (
		typeof part === "object" &&
		part !== null &&
		"type" in part &&
		(part as { type: unknown }).type === "text" &&
		"text" in part &&
		typeof (part as { text: unknown }).text === "string"
	)
}

function getMessageText(msg: { parts?: unknown[] }): string {
	return (msg.parts ?? [])
		.filter(isTextUIPart)
		.map((p) => p.text)
		.join("")
}

/* ==== Component ==== */

export default function ChatWithAISDK({
	initialSystemMessage,
	userId,
	apiEndpoint = "/api/chat",
}: {
	initialSystemMessage?: string
	userId?: string
	apiEndpoint?: string
}) {
	// Vercel AI SDK hook - handles all streaming logic
	const { messages, error, stop, setMessages, status, sendMessage } = useChat({
		chat: new Chat({
			transport: new DefaultChatTransport({
				api: apiEndpoint,
				headers: {
					"x-user-id": userId ?? "00000000-0000-0000-0000-000000000001",
				},
				body: {
					options: {
						topK: 6,
						includeRuns: true,
						includeFilters: true,
						stream: true,
					},
				},
			}),
		}),
	})

	const isLoading = status === "submitted" || status === "streaming"

	// Editing state
	const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
	const [editingText, setEditingText] = useState("")

	// Input state for v5 API
	const [input, setInput] = useState("")

	function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
		setInput(e.target.value)
	}

	function handleSubmit(e?: FormEvent<HTMLFormElement>) {
		e?.preventDefault()
		const value = input.trim()
		if (!value || isLoading) return
		void sendMessage({ text: value })
		setInput("")
	}

	// Conversation save/load state
	const [currentConversationId, setCurrentConversationId] = useState<string>(
		generateId("conv"),
	)
	const [savedConversations, setSavedConversations] = useState<Conversation[]>(
		[],
	)
	const [showSavedList, setShowSavedList] = useState(false)

	// Citations state (fetched from companion endpoint)
	const [citations, setCitations] = useState<Citation[] | null>(null)

	// auto-scroll to bottom
	const endRef = useRef<HTMLDivElement | null>(null)
	useEffect(() => {
		endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
	}, [])

	// Load saved conversations from localStorage on mount
	useEffect(() => {
		try {
			const saved = localStorage.getItem("chat-conversations-ai-sdk")
			if (saved) {
				setSavedConversations(JSON.parse(saved))
			}
		} catch (err) {
			console.warn("Failed to load conversations:", err)
		}
	}, [])

	// Save conversations to localStorage whenever they change
	useEffect(() => {
		try {
			localStorage.setItem(
				"chat-conversations-ai-sdk",
				JSON.stringify(savedConversations),
			)
		} catch (err) {
			console.warn("Failed to save conversations:", err)
		}
	}, [savedConversations])

	// Fetch citations when last message is from assistant
	useEffect(() => {
		const lastMsg = messages[messages.length - 1]
		if (lastMsg && lastMsg.role === "assistant" && !isLoading) {
			// Find the user message that triggered this response
			const userMsg = messages[messages.length - 2]
			if (userMsg && userMsg.role === "user") {
				const userText = (userMsg.parts ?? [])
					.filter(isTextUIPart)
					.map((p) => p.text)
					.join("")
				void fetchCitationsForQuery(userText)
			}
		}
	}, [messages, isLoading, fetchCitationsForQuery])

	// Best-effort fetch of metadata / citations using companion endpoint
	async function fetchCitationsForQuery(queryText: string) {
		try {
			const res = await fetch("/api/chat/meta", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ query: queryText }),
			})
			if (!res.ok) {
				// silently ignore - meta endpoint optional
				return
			}
			const data = await res.json()
			setCitations(data.citations ?? null)
		} catch (_err) {
			// ignore errors for meta fetch
		}
	}

	// Message editing functions
	function startEditMessage(msg: UIMessage) {
		if (msg.role !== "user") return // Only allow editing user messages
		setEditingMessageId(msg.id)
		setEditingText(
			(msg.parts ?? [])
				.filter(isTextUIPart)
				.map((p) => p.text)
				.join(""),
		)
	}

	function cancelEdit() {
		setEditingMessageId(null)
		setEditingText("")
	}

	function saveEdit() {
		if (!editingMessageId) return
		setMessages(
			messages.map((m) =>
				m.id === editingMessageId
					? { ...m, parts: [{ type: "text", text: editingText }] }
					: m,
			),
		)
		setEditingMessageId(null)
		setEditingText("")
	}

	function deleteMessage(id: string) {
		if (!confirm("Delete this message?")) return
		setMessages(messages.filter((m) => m.id !== id))
	}

	// Conversation save/load functions
	function saveConversation() {
		if (messages.length === 0) return

		const firstUser = messages.find((m) => m.role === "user")
		const title = firstUser
			? getMessageText(firstUser).slice(0, 50)
			: "New Conversation"
		const now = nowIso()

		const chatMessages: ChatMessage[] = messages.map((m) => ({
			id: m.id,
			role: m.role as "user" | "assistant" | "system",
			content: getMessageText(m),
			createdAt:
				typeof m === "object" &&
				"createdAt" in m &&
				typeof m.createdAt === "string"
					? m.createdAt
					: "",
		}))

		const existing = savedConversations.find(
			(c) => c.id === currentConversationId,
		)
		if (existing) {
			// Update existing
			setSavedConversations((prev) =>
				prev.map((c) =>
					c.id === currentConversationId
						? { ...c, messages: chatMessages, updatedAt: now, title }
						: c,
				),
			)
		} else {
			// Create new
			const newConv: Conversation = {
				id: currentConversationId,
				title,
				messages: chatMessages,
				createdAt: now,
				updatedAt: now,
			}
			setSavedConversations((prev) => [newConv, ...prev])
		}
	}

	function loadConversation(conv: Conversation) {
		setMessages(
			conv.messages.map((m) => ({
				id: m.id,
				role: m.role,
				parts: [{ type: "text", text: m.content }],
			})),
		)
		setCurrentConversationId(conv.id)
		setShowSavedList(false)
		setCitations(null)
	}

	function deleteConversation(id: string) {
		if (!confirm("Delete this conversation?")) return
		setSavedConversations((prev) => prev.filter((c) => c.id !== id))
	}

	function newConversation() {
		setMessages(
			initialSystemMessage
				? [
						{
							id: generateId("sys"),
							role: "system",
							parts: [{ type: "text", text: initialSystemMessage }],
						},
					]
				: [],
		)
		setCurrentConversationId(generateId("conv"))
		setCitations(null)
		setShowSavedList(false)
	}

	// Message renderer
	function renderMessage(m: UIMessage) {
		const isAssistant = m.role === "assistant"
		const isEditing = editingMessageId === m.id

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
							/>
							<div style={{ marginTop: 8, display: "flex", gap: 8 }}>
								<button
									type="button"
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
									type="button"
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
							<div style={{ fontSize: 14 }}>{getMessageText(m)}</div>
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
									{(() => {
										const raw = (m as unknown as { createdAt?: unknown })
											.createdAt
										const iso =
											typeof raw === "string"
												? raw
												: raw instanceof Date
													? raw.toISOString()
													: undefined
										return iso ? formatRelativeTime(iso) : "just now"
									})()}
								</span>
								{m.role === "user" && !isLoading && (
									<div style={{ display: "flex", gap: 6 }}>
										<button
											type="button"
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
											type="button"
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
		)
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
			<div
				style={{
					padding: 12,
					borderBottom: "1px solid #eee",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<strong>ModelLens Assistant (AI SDK)</strong>
				<div style={{ display: "flex", gap: 8 }}>
					<button
						type="button"
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
						type="button"
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
						type="button"
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
						<div
							style={{
								padding: 16,
								textAlign: "center",
								color: "#666",
								fontSize: 13,
							}}
						>
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
										background:
											conv.id === currentConversationId
												? "#e8f0fe"
												: "transparent",
										cursor: "default",
									}}
								>
									<button
										type="button"
										onClick={() => loadConversation(conv)}
										style={{
											flex: 1,
											overflow: "hidden",
											textAlign: "left",
											background: "transparent",
											border: "none",
											cursor: "pointer",
											padding: 0,
										}}
									>
										<div
											style={{
												fontSize: 13,
												fontWeight: 500,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}
										>
											{conv.title}
										</div>
										<div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
											{conv.messages.length} messages •{" "}
											{formatRelativeTime(conv.updatedAt)}
										</div>
									</button>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation()
											deleteConversation(conv.id)
										}}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.stopPropagation()
												deleteConversation(conv.id)
											}
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

			<div className="p-3 border-t border-gray-200">
				<form onSubmit={handleSubmit} className="flex gap-2">
					<input
						value={input}
						onChange={handleInputChange}
						placeholder="Ask about models, filters, or runs..."
						className="flex-1 px-3 py-2 rounded border border-gray-300"
						disabled={isLoading}
					/>
					{!isLoading ? (
						<button
							type="submit"
							style={{
								padding: "10px 14px",
								borderRadius: 6,
								background: "#0b5cff",
								color: "#fff",
								border: "none",
								cursor: "pointer",
							}}
						>
							Send
						</button>
					) : (
						<button
							type="button"
							onClick={stop}
							style={{
								padding: "10px 14px",
								borderRadius: 6,
								background: "#e53e3e",
								color: "#fff",
								border: "none",
								cursor: "pointer",
							}}
						>
							Stop
						</button>
					)}
				</form>

				{error && (
					<div style={{ color: "crimson", marginTop: 8 }}>
						{error.message || String(error)}
					</div>
				)}

				<div style={{ marginTop: 12 }}>
					<strong>Sources</strong>
					{!citations && (
						<div style={{ color: "#666", fontSize: 13 }}>No sources yet</div>
					)}
					{citations && citations.length === 0 && (
						<div style={{ color: "#666", fontSize: 13 }}>
							No sources returned
						</div>
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
											<a
												href={`/models/${c.id}`}
												target="_blank"
												rel="noreferrer"
											>
												View model
											</a>
										)}
										{c.type === "FILTER" && (
											<a
												href={`/filters/${c.id}`}
												target="_blank"
												rel="noreferrer"
											>
												View filter
											</a>
										)}
										{c.type === "RUN" && (
											<a
												href={`/filters/${c.filterId ?? ""}/runs/${c.id}`}
												target="_blank"
												rel="noreferrer"
											>
												View run
											</a>
										)}
										{c.type === "DOC" && (
											<a
												href={`/docs/${encodeURIComponent(c.id)}`}
												target="_blank"
												rel="noreferrer"
											>
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
	)
}
