// app/api/chat/route.ts
// Next.js App Router POST /api/chat
//
// RAG chat with Vercel AI SDK streaming support:
//  - accepts conversation => retrieves relevant docs/models/runs
//  - composes a prompt with top-K contexts
//  - calls an LLM (streaming) and returns tokens using AI SDK format
//  - returns structured metadata (citations) via companion endpoint
//
// TODO: wire fetchModelRegistry, fetchIndexedDocs, vector search, and LLM client.

import { NextResponse } from "next/server"
import { z } from "zod"

// Types for conversation messages (AI SDK compatible)
export type ChatMessage = {
	id?: string
	role: "user" | "assistant" | "system"
	content: string
	createdAt?: string
}

export type Citation =
	| { type: "MODEL"; id: string; title?: string; snippet?: string }
	| { type: "FILTER"; id: string; title?: string; snippet?: string }
	| { type: "RUN"; id: string; title?: string; snippet?: string }
	| { type: "DOC"; id: string; title?: string; snippet?: string }

type ChatRequestBody = {
	messages: ChatMessage[] // conversation history (last N)
	options?: {
		topK?: number // retrieval top-K
		includeRuns?: boolean
		includeFilters?: boolean
		stream?: boolean // whether to stream tokens
	}
}

// Response envelope streamed tokens + metadata
type ChatResponseMeta = {
	runId?: string | null
	citations: Citation[]
	finishReason?: string
}

// -------------------- Request validation --------------------

const ReqSchema = z.object({
	messages: z
		.array(
			z.object({
				role: z.enum(["user", "assistant", "system"]),
				content: z.string(),
				id: z.string().optional(),
			}),
		)
		.min(1),
	options: z
		.object({
			topK: z.number().int().positive().max(50).optional(),
			includeRuns: z.boolean().optional(),
			includeFilters: z.boolean().optional(),
			stream: z.boolean().optional(),
		})
		.optional(),
})

// -------------------- Pluggable helpers (TODO: implement) --------------------

/**
 * Auth stub: extract user id and permissions from request.
 * Replace with your auth integration (NextAuth, Clerk, etc).
 */
function getUserIdFromReq(req: Request): string | null {
	return req.headers.get("x-user-id") ?? null
}

/**
 * Structured search over registry for exact-match queries.
 * Implement using Drizzle/Postgres queries on your model registry.
 */
async function structuredSearch(
	_query: string,
	_topK: number,
): Promise<Citation[]> {
	// TODO: Implement keyword/field search to return candidate citations
	// Example return shape:
	return [
		{
			type: "MODEL",
			id: "m-open-001",
			title: "open-001",
			snippet: "cost: $0.02 / 1k, context: 8k, tags: summarization",
		},
	]
}

/**
 * Vector search over embedded docs/models/runs.
 * Implement using pgvector, Pinecone, Milvus, or Supabase Vector.
 */
async function vectorSearch(
	_query: string,
	_topK: number,
	_userId: string | null,
	_includeRuns: boolean,
	_includeFilters: boolean,
): Promise<Citation[]> {
	// TODO: Query your vector DB and return citations with snippets.
	return [
		{
			type: "DOC",
			id: "FILTERS_README_SNIPPET.md",
			title: "Filters Readme",
			snippet: "Saved filters let you persist rule sets and apply them...",
		},
	]
}

/**
 * Minimal function to build a system prompt and the RAG prompt body.
 */
function buildPrompt(
	systemMessage: string,
	messages: ChatMessage[],
	retrievedContexts: Citation[],
): string {
	// Keep prompt compact: system + few user messages + retrieved contexts
	const recent = messages.slice(-4)
	const ctxText = retrievedContexts
		.map((c) => `[${c.type}:${c.id}] ${c.title ?? ""}\n${c.snippet ?? ""}`)
		.join("\n---\n")

	const convo = recent
		.map((m) => `${m.role.toUpperCase()}: ${m.content}`)
		.join("\n")

	return [
		systemMessage,
		"\n\n-- Retrieved Contexts --\n",
		ctxText,
		"\n\n-- Conversation --\n",
		convo,
		"\n\n-- Instructions --\n",
		"Answer concisely. Always cite sources with [TYPE:id]. " +
			'If you cannot answer, say "I don\'t know" and provide steps.',
	].join("\n")
}

/**
 * LLM wrapper: call your LLM provider.
 * Must support streaming tokens (if stream = true).
 *
 * - provider-agnostic interface:
 *   const stream = llmCallStream({ prompt, stream: true })
 *   for await (const chunk of stream) { ... }
 *
 * TODO: wire OpenAI, Anthropic, or your preferred LLM here.
 */
async function* llmCallStream(_opts: {
	prompt: string
	stream?: boolean
	userId?: string | null
}): AsyncGenerator<{ text?: string; done?: boolean }, void, void> {
	// TODO: replace with provider call.
	// For now, yield a small mocked response and finish.
	yield { text: "Here are top matching models: " }
	yield { text: "[MODEL:m-open-001] (cost: $0.02/1k)\n" }
	yield { done: true }
}

/**
 * Persist minimal query telemetry for analytics (optional).
 */
async function logChatQuery(_userId: string | null, _query: string) {
	// TODO: emit analytics event to your telemetry system
	return
}

// -------------------- Streaming helpers --------------------

function _streamFromAsyncGenerator(
	gen: AsyncGenerator<{ text?: string; done?: boolean }, void, void>,
) {
	// Create a ReadableStream that pulls from the generator
	return new ReadableStream({
		async pull(controller) {
			try {
				const { value, done } = await gen.next()
				if (done || value?.done) {
					controller.close()
					return
				}
				const chunk = value?.text ?? ""
				controller.enqueue(new TextEncoder().encode(chunk))
			} catch (err) {
				controller.error(err)
			}
		},
		cancel(reason) {
			// Optionally handle cancellation
			console.info("stream cancelled", reason)
		},
	})
}

// -------------------- Route handler --------------------

export async function POST(req: Request) {
	try {
		const userId = getUserIdFromReq(req)
		if (!userId) {
			// Optionally allow anonymous queries depending on policy
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const text = await req.text()
		let parsed: unknown
		try {
			parsed = text ? JSON.parse(text) : {}
		} catch (_err) {
			return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
		}

		const ok = ReqSchema.safeParse(parsed)
		if (!ok.success) {
			return NextResponse.json(
				{ error: "invalid request", detail: ok.error.format() },
				{ status: 400 },
			)
		}
		const body = ok.data as ChatRequestBody
		const messages = body.messages
		const options = {
			topK: body.options?.topK ?? 6,
			includeRuns: body.options?.includeRuns ?? true,
			includeFilters: body.options?.includeFilters ?? true,
			stream: body.options?.stream ?? true,
		}

		// Primary query: use last user message as retrieval query
		const lastUser = [...messages].reverse().find((m) => m.role === "user")
		const queryText = lastUser?.content ?? messages[messages.length - 1].content

		// 1) Structured search (fast, exact)
		const structuredHits = await structuredSearch(queryText, options.topK)

		// 2) Vector search for docs/models/runs (contextual)
		const vectorHits = await vectorSearch(
			queryText,
			options.topK,
			userId,
			options.includeRuns,
			options.includeFilters,
		)

		// Merge retrieval results, dedupe by type+id and rank
		const mergedMap = new Map<string, Citation>()
		for (const hit of [...structuredHits, ...vectorHits]) {
			const key = `${hit.type}:${hit.id}`
			if (!mergedMap.has(key)) mergedMap.set(key, hit)
		}
		const retrieved = Array.from(mergedMap.values()).slice(0, options.topK)

		// Build system prompt and full prompt
		const systemMessage =
			"You are ModelLens assistant. Answer questions about models, " +
			"saved filters, and runs. Cite all sources using [TYPE:id]. " +
			"Do not hallucinate. If unsure, explain how to verify."
		const prompt = buildPrompt(systemMessage, messages, retrieved)

		// Log query for analytics
		void logChatQuery(userId, queryText)

		// 3) Call LLM streaming generator
		const gen = llmCallStream({ prompt, stream: options.stream, userId })

		if (options.stream) {
			// Create a ReadableStream from the async generator for AI SDK
			const stream = new ReadableStream({
				async start(controller) {
					try {
						for await (const chunk of gen) {
							if (chunk.text) {
								controller.enqueue(chunk.text)
							}
							if (chunk.done) {
								controller.close()
								return
							}
						}
						controller.close()
					} catch (error) {
						controller.error(error)
					}
				},
			})

			// Return a plain text stream response
			return new Response(stream, {
				headers: {
					"content-type": "text/plain; charset=utf-8",
					"cache-control": "no-store",
				},
			})
		}

		// Non-streaming: collect tokens
		let buf = ""
		for await (const chunk of gen) {
			if (chunk.text) buf += chunk.text
		}
		const meta: ChatResponseMeta = {
			runId: null,
			citations: retrieved,
			finishReason: "completed",
		}
		return Response.json({ content: buf, meta })
	} catch (err) {
		console.error("chat error:", err)
		const errorMessage =
			typeof err === "object" && err !== null && "message" in err
				? String((err as { message?: unknown }).message)
				: String(err)
		return Response.json(
			{ error: "internal_server_error", detail: errorMessage },
			{ status: 500 },
		)
	}
}
