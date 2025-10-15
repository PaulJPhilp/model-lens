/* @vitest-environment node */

import { createServer, type Server } from "node:http"
import { Effect } from "effect"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { ModelService } from "./ModelService"
import { ModelServiceLive } from "./ModelServiceLive"

describe("ModelService (live, real HTTP)", () => {
	let server: Server
	let hitCount = 0

	beforeAll(async () => {
		server = createServer((req, res) => {
			if (req.url?.startsWith("/api/models")) {
				hitCount += 1
				// Routes for different scenarios controlled by hitCount
				// Tests will reset hitCount between cases
				const scenario = process.env.__MODEL_TEST_SCENARIO__ || "ok"

				if (scenario === "ok") {
					res.setHeader("Content-Type", "application/json")
					res.end(
						JSON.stringify({
							models: [
								{
									id: "gpt-4",
									name: "gpt-4",
									provider: "OpenAI",
									contextWindow: 128000,
									maxOutputTokens: 4096,
									inputCost: 0.03,
									outputCost: 0.06,
									cacheReadCost: 0.015,
									modalities: ["text"],
									capabilities: ["chat"],
									releaseDate: "2023-03-01",
									lastUpdated: "2023-03-01",
									openWeights: false,
									supportsTemperature: true,
									supportsAttachments: false,
								},
							],
						}),
					)
					return
				}

				if (scenario === "retry-then-ok") {
					// First two responses send invalid JSON to force res.json() to reject
					if (hitCount < 3) {
						res.setHeader("Content-Type", "application/json")
						res.end("{ invalid-json")
						return
					}
					res.setHeader("Content-Type", "application/json")
					res.end(
						JSON.stringify({
							models: [
								{
									id: "claude-3",
									name: "claude-3",
									provider: "Anthropic",
									contextWindow: 200000,
									maxOutputTokens: 4096,
									inputCost: 0.015,
									outputCost: 0.075,
									cacheReadCost: 0.0075,
									modalities: ["text"],
									capabilities: ["chat"],
									releaseDate: "2023-06-01",
									lastUpdated: "2023-06-01",
									openWeights: false,
									supportsTemperature: true,
									supportsAttachments: true,
								},
							],
						}),
					)
					return
				}

				if (scenario === "always-error") {
					res.setHeader("Content-Type", "application/json")
					res.end("{ invalid-json")
					return
				}
			}

			res.statusCode = 404
			res.end("not found")
		})

		await new Promise<void>((resolve) => {
			server.listen(3000, "127.0.0.1", () => resolve())
		})
	})

	afterAll(async () => {
		await new Promise<void>((resolve) => server.close(() => resolve()))
	})

	it("fetches models successfully", async () => {
		process.env.__MODEL_TEST_SCENARIO__ = "ok"
		process.env.MODEL_SERVICE_BASE = "http://127.0.0.1:3000"
		hitCount = 0

		const program = Effect.gen(function* () {
			const service = yield* ModelService
			return yield* service.fetchModels
		}).pipe(Effect.provide(ModelServiceLive))

		const result = await Effect.runPromise(program)
		expect(result).toHaveLength(1)
		expect(result[0].name).toBe("gpt-4")
	})

	it("retries on failures then succeeds", async () => {
		process.env.__MODEL_TEST_SCENARIO__ = "retry-then-ok"
		process.env.MODEL_SERVICE_BASE = "http://127.0.0.1:3000"
		process.env.MODEL_SERVICE_RETRY_MS = "10"
		hitCount = 0

		const program = Effect.gen(function* () {
			const service = yield* ModelService
			return yield* service.fetchModels
		}).pipe(Effect.provide(ModelServiceLive))

		const result = await Effect.runPromise(program)
		expect(hitCount).toBeGreaterThanOrEqual(3)
		expect(result).toHaveLength(1)
		expect(result[0].name).toBe("claude-3")
	})

	it("fails after retry attempts are exhausted", async () => {
		process.env.__MODEL_TEST_SCENARIO__ = "always-error"
		process.env.MODEL_SERVICE_BASE = "http://127.0.0.1:3000"
		process.env.MODEL_SERVICE_RETRY_MS = "10"
		hitCount = 0

		const program = Effect.gen(function* () {
			const service = yield* ModelService
			return yield* service.fetchModels
		}).pipe(Effect.provide(ModelServiceLive))

		await expect(Effect.runPromise(program)).rejects.toBeInstanceOf(Error)
		expect(hitCount).toBeGreaterThanOrEqual(3)
	})
})
