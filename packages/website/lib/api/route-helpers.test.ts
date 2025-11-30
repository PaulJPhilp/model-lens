/* @vitest-environment node */
import { describe, expect, it, vi, beforeEach } from "vitest"
import { Effect } from "effect"
import {
	createSuccessResponse,
	createErrorResponse,
	withTiming,
} from "./route-helpers"

describe("Route Helpers", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("createSuccessResponse", () => {
		it("should create a success response with data", () => {
			const testData = { id: 1, name: "Test" }
			const startTime = Date.now()

			const response = createSuccessResponse(testData, startTime)

			expect(response.status).toBe(200)
		})

		it("should include data in response", async () => {
			const testData = { id: 1, name: "Test" }
			const startTime = Date.now()

			const response = createSuccessResponse(testData, startTime)
			const json = await response.json()

			expect(json.data).toEqual(testData)
		})

		it("should include metadata with timestamp", async () => {
			const testData = { count: 42 }
			const startTime = Date.now()

			const response = createSuccessResponse(testData, startTime)
			const json = await response.json()

			expect(json.metadata).toBeDefined()
			expect(json.metadata.timestamp).toBeDefined()
			expect(json.metadata.duration).toBeDefined()
		})

		it("should calculate duration correctly", async () => {
			const testData = { value: "test" }
			const startTime = Date.now()

			// Simulate some work
			await new Promise((resolve) => setTimeout(resolve, 10))

			const response = createSuccessResponse(testData, startTime)
			const json = await response.json()

			expect(json.metadata.duration).toBeGreaterThanOrEqual(10)
		})

		it("should include additional metadata if provided", async () => {
			const testData = { id: 1 }
			const startTime = Date.now()
			const additionalMetadata = { source: "test", version: "1.0" }

			const response = createSuccessResponse(testData, startTime, additionalMetadata)
			const json = await response.json()

			expect(json.metadata.source).toBe("test")
			expect(json.metadata.version).toBe("1.0")
			expect(json.metadata.duration).toBeDefined()
		})

		it("should be JSON serializable", async () => {
			const testData = { models: ["model1", "model2"] }
			const startTime = Date.now()

			const response = createSuccessResponse(testData, startTime)
			const json = await response.json()

			// Should be able to stringify and parse again
			const serialized = JSON.stringify(json)
			const parsed = JSON.parse(serialized)

			expect(parsed.data).toEqual(testData)
		})
	})

	describe("createErrorResponse", () => {
		it("should create an error response with error message", async () => {
			const errorMsg = "Something went wrong"
			const startTime = Date.now()

			const response = createErrorResponse(errorMsg, 400, startTime)

			expect(response.status).toBe(400)
		})

		it("should include error message in response", async () => {
			const errorMsg = "Not found"
			const startTime = Date.now()

			const response = createErrorResponse(errorMsg, 404, startTime)
			const json = await response.json()

			expect(json.error).toBe(errorMsg)
		})

		it("should use default status 500 if not provided", async () => {
			const errorMsg = "Internal error"
			const startTime = Date.now()

			const response = createErrorResponse(errorMsg, undefined, startTime)

			expect(response.status).toBe(500)
		})

		it("should include metadata with timestamp", async () => {
			const errorMsg = "Error occurred"
			const startTime = Date.now()

			const response = createErrorResponse(errorMsg, 400, startTime)
			const json = await response.json()

			expect(json.metadata).toBeDefined()
			expect(json.metadata.timestamp).toBeDefined()
			expect(json.metadata.duration).toBeDefined()
		})

		it("should respect provided status code", async () => {
			const errorMsg = "Forbidden"
			const startTime = Date.now()

			const response = createErrorResponse(errorMsg, 403, startTime)

			expect(response.status).toBe(403)
		})

		it("should include additional metadata if provided", async () => {
			const errorMsg = "Validation failed"
			const startTime = Date.now()
			const additionalMetadata = { field: "email", code: "INVALID_FORMAT" }

			const response = createErrorResponse(
				errorMsg,
				400,
				startTime,
				additionalMetadata,
			)
			const json = await response.json()

			expect(json.metadata.field).toBe("email")
			expect(json.metadata.code).toBe("INVALID_FORMAT")
		})

		it("should calculate duration correctly", async () => {
			const errorMsg = "Error"
			const startTime = Date.now()

			await new Promise((resolve) => setTimeout(resolve, 10))

			const response = createErrorResponse(errorMsg, 500, startTime)
			const json = await response.json()

			expect(json.metadata.duration).toBeGreaterThanOrEqual(10)
		})

		it("should handle various HTTP status codes", async () => {
			const errorMsg = "Test error"
			const startTime = Date.now()

			const statuses = [400, 401, 403, 404, 500, 503]

			for (const status of statuses) {
				const response = createErrorResponse(errorMsg, status, startTime)
				expect(response.status).toBe(status)
			}
		})
	})

	describe("withTiming", () => {
		it("should wrap an effect with timing", async () => {
			const consoleLog = vi.spyOn(console, "log")
			const effect = Effect.succeed("test")

			const timedEffect = withTiming(effect, "Test Operation")
			const result = await Effect.runPromise(timedEffect)

			expect(result).toBe("test")
			expect(consoleLog).toHaveBeenCalled()

			consoleLog.mockRestore()
		})

		it("should log operation name", async () => {
			const consoleLog = vi.spyOn(console, "log")
			const effect = Effect.succeed(42)

			const timedEffect = withTiming(effect, "MyOperation")
			await Effect.runPromise(timedEffect)

			const logs = consoleLog.mock.calls.map((c) => c[0])
			expect(logs.some((l) => l.includes("MyOperation"))).toBe(true)

			consoleLog.mockRestore()
		})

		it("should log start and completion", async () => {
			const consoleLog = vi.spyOn(console, "log")
			const effect = Effect.succeed("value")

			const timedEffect = withTiming(effect, "TestOp")
			await Effect.runPromise(timedEffect)

			const logs = consoleLog.mock.calls.map((c) => c[0])
			expect(logs.some((l) => l.includes("Starting"))).toBe(true)
			expect(logs.some((l) => l.includes("Completed"))).toBe(true)

			consoleLog.mockRestore()
		})

		it("should report duration in milliseconds", async () => {
			const consoleLog = vi.spyOn(console, "log")

			// Create an effect that takes some time
			const effect = Effect.gen(function* () {
				yield* Effect.sync(() => {
					// Simulate work with busy wait
					const start = Date.now()
					while (Date.now() - start < 10) {}
				})
				return "done"
			})

			const timedEffect = withTiming(effect, "TimedOp")
			await Effect.runPromise(timedEffect)

			const logs = consoleLog.mock.calls.map((c) => c[0])
			const completedLog = logs.find((l) => l.includes("Completed"))

			expect(completedLog).toMatch(/\d+ms/)

			consoleLog.mockRestore()
		})

		it("should pass through effect result unchanged", async () => {
			const testData = { id: 1, value: "test" }
			const effect = Effect.succeed(testData)

			const timedEffect = withTiming(effect, "PassThrough")
			const result = await Effect.runPromise(timedEffect)

			expect(result).toEqual(testData)
		})

		it("should propagate effect errors", async () => {
			const effect = Effect.fail(new Error("Test error"))
			const timedEffect = withTiming(effect, "ErrorOp")

			await expect(Effect.runPromise(timedEffect)).rejects.toThrow("Test error")
		})

		it("should work with async operations", async () => {
			const effect = Effect.tryPromise({
				try: () => Promise.resolve("async-result"),
				catch: (error) => new Error(String(error)),
			})

			const timedEffect = withTiming(effect, "AsyncOp")
			const result = await Effect.runPromise(timedEffect)

			expect(result).toBe("async-result")
		})
	})

	describe("timing accuracy", () => {
		it("should measure time correctly for fast operations", async () => {
			const consoleLog = vi.spyOn(console, "log")
			const effect = Effect.succeed(123)

			const timedEffect = withTiming(effect, "FastOp")
			await Effect.runPromise(timedEffect)

			const completedLog = consoleLog.mock.calls
				.map((c) => c[0])
				.find((l) => l.includes("Completed"))

			// Should be very fast, < 100ms
			const match = completedLog?.match(/(\d+)ms/)
			const duration = match ? parseInt(match[1]) : 0

			expect(duration).toBeLessThan(100)

			consoleLog.mockRestore()
		})

		it("should handle operations that take time", async () => {
			const consoleLog = vi.spyOn(console, "log")

			const effect = Effect.gen(function* () {
				yield* Effect.sync(() => {
					const start = Date.now()
					while (Date.now() - start < 20) {}
				})
				return "delayed"
			})

			const startTime = Date.now()
			const timedEffect = withTiming(effect, "DelayedOp")
			await Effect.runPromise(timedEffect)
			const actualDuration = Date.now() - startTime

			expect(actualDuration).toBeGreaterThanOrEqual(20)

			consoleLog.mockRestore()
		})
	})

	describe("response formatting consistency", () => {
		it("should have consistent structure across success responses", async () => {
			const response1 = createSuccessResponse({ a: 1 }, Date.now())
			const response2 = createSuccessResponse({ b: 2 }, Date.now())

			const json1 = await response1.json()
			const json2 = await response2.json()

			// Both should have same structure
			expect(Object.keys(json1).sort()).toEqual(Object.keys(json2).sort())
			expect(json1).toHaveProperty("data")
			expect(json1).toHaveProperty("metadata")
			expect(json2).toHaveProperty("data")
			expect(json2).toHaveProperty("metadata")
		})

		it("should have consistent structure across error responses", async () => {
			const response1 = createErrorResponse("Error 1", 400, Date.now())
			const response2 = createErrorResponse("Error 2", 500, Date.now())

			const json1 = await response1.json()
			const json2 = await response2.json()

			// Both should have same structure
			expect(Object.keys(json1).sort()).toEqual(Object.keys(json2).sort())
			expect(json1).toHaveProperty("error")
			expect(json1).toHaveProperty("metadata")
			expect(json2).toHaveProperty("error")
			expect(json2).toHaveProperty("metadata")
		})
	})
})
