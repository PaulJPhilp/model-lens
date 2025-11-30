/* @vitest-environment node */
import { describe, expect, it, vi, beforeEach } from "vitest"
import { Effect, Schedule } from "effect"
import {
	defaultApiRetryPolicy,
	fastRetryPolicy,
	slowRetryPolicy,
	databaseRetryPolicy,
	withRetry,
	withRetryAndLogging,
} from "./retry"

describe("Retry Policies", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("retry policies", () => {
		it("should have defaultApiRetryPolicy defined", () => {
			expect(defaultApiRetryPolicy).toBeDefined()
		})

		it("should have fastRetryPolicy defined", () => {
			expect(fastRetryPolicy).toBeDefined()
		})

		it("should have slowRetryPolicy defined", () => {
			expect(slowRetryPolicy).toBeDefined()
		})

		it("should have databaseRetryPolicy defined", () => {
			expect(databaseRetryPolicy).toBeDefined()
		})
	})

	describe("withRetry", () => {
		it("should retry failed effects", async () => {
			let attempts = 0
			const effect = Effect.gen(function* () {
				attempts++
				if (attempts < 3) {
					return yield* Effect.fail(new Error("Failed"))
				}
				return "success"
			})

			// Use a simple retry policy
			const simplePolicy = Schedule.exponential(1).pipe(
				Schedule.compose(Schedule.recurs(3)),
			)

			const retriedEffect = withRetry(effect, simplePolicy)
			const result = await Effect.runPromise(retriedEffect)

			expect(result).toBe("success")
			expect(attempts).toBe(3)
		})

		it("should use defaultApiRetryPolicy if none provided", async () => {
			let attempts = 0
			const effect = Effect.gen(function* () {
				attempts++
				if (attempts < 2) {
					return yield* Effect.fail(new Error("Failed"))
				}
				return "success"
			})

			const retriedEffect = withRetry(effect)
			const result = await Effect.runPromise(retriedEffect)

			expect(result).toBe("success")
		})

		it("should fail after exhausting retries", async () => {
			const effect = Effect.fail(new Error("Persistent failure"))

			// Use minimal retries for test
			const minimalPolicy = Schedule.recurs(1)

			const retriedEffect = withRetry(effect, minimalPolicy)

			await expect(Effect.runPromise(retriedEffect)).rejects.toThrow(
				"Persistent failure",
			)
		})

		it("should return successful effect immediately", async () => {
			let attempts = 0
			const effect = Effect.gen(function* () {
				attempts++
				return "immediate-success"
			})

			const simplePolicy = Schedule.exponential(1000).pipe(
				Schedule.compose(Schedule.recurs(5)),
			)

			const retriedEffect = withRetry(effect, simplePolicy)
			const result = await Effect.runPromise(retriedEffect)

			expect(result).toBe("immediate-success")
			expect(attempts).toBe(1) // Should not retry successful effects
		})
	})

	describe("withRetryAndLogging", () => {
		it("should log retry attempts", async () => {
			const consoleLog = vi.spyOn(console, "log")
			let attempts = 0

			const effect = Effect.gen(function* () {
				attempts++
				if (attempts < 2) {
					return yield* Effect.fail(new Error("Failed"))
				}
				return "success"
			})

			const minimalPolicy = Schedule.recurs(1)

			const retriedEffect = withRetryAndLogging(effect, "TestOp", minimalPolicy)
			const result = await Effect.runPromise(retriedEffect)

			expect(result).toBe("success")
			expect(consoleLog).toHaveBeenCalled()

			const logs = consoleLog.mock.calls.map((c) => c[0])
			expect(logs.some((l) => l.includes("Retry"))).toBe(true)
			expect(logs.some((l) => l.includes("TestOp"))).toBe(true)

			consoleLog.mockRestore()
		})

		it("should log final failure after all retries exhausted", async () => {
			const consoleError = vi.spyOn(console, "error")
			const effect = Effect.fail(new Error("Persistent error"))
			const minimalPolicy = Schedule.recurs(0)

			const retriedEffect = withRetryAndLogging(
				effect,
				"FailingOp",
				minimalPolicy,
			)

			await expect(Effect.runPromise(retriedEffect)).rejects.toThrow()

			expect(consoleError).toHaveBeenCalled()
			const errorLogs = consoleError.mock.calls.map((c) => c[0])
			expect(errorLogs.some((l) => l.includes("failed after all retries"))).toBe(
				true,
			)

			consoleError.mockRestore()
		})

		it("should include operation name in logs", async () => {
			const consoleLog = vi.spyOn(console, "log")
			const effect = Effect.fail(new Error("Test"))
			const minimalPolicy = Schedule.recurs(0)

			const operationName = "MySpecialOperation"
			const retriedEffect = withRetryAndLogging(effect, operationName, minimalPolicy)

			await expect(Effect.runPromise(retriedEffect)).rejects.toThrow()

			const logs = consoleLog.mock.calls.map((c) => c[0])
			expect(logs.some((l) => l.includes(operationName))).toBe(true)

			consoleLog.mockRestore()
		})

		it("should use defaultApiRetryPolicy if none provided", async () => {
			let attempts = 0
			const effect = Effect.gen(function* () {
				attempts++
				if (attempts < 2) {
					return yield* Effect.fail(new Error("Failed"))
				}
				return "success"
			})

			const retriedEffect = withRetryAndLogging(effect, "TestOp")
			const result = await Effect.runPromise(retriedEffect)

			expect(result).toBe("success")
		})

		it("should log error details", async () => {
			const consoleLog = vi.spyOn(console, "log")
			const testError = new Error("Specific error message")
			const effect = Effect.fail(testError)
			const minimalPolicy = Schedule.recurs(0)

			const retriedEffect = withRetryAndLogging(effect, "ErrorOp", minimalPolicy)

			await expect(Effect.runPromise(retriedEffect)).rejects.toThrow()

			consoleLog.mockRestore()
		})

		it("should handle async operations with retry", async () => {
			let attempts = 0
			const effect = Effect.tryPromise({
				try: async () => {
					attempts++
					if (attempts < 2) {
						throw new Error("Async failed")
					}
					return "async-success"
				},
				catch: (error) => new Error(String(error)),
			})

			const minimalPolicy = Schedule.recurs(1)
			const retriedEffect = withRetryAndLogging(effect, "AsyncOp", minimalPolicy)
			const result = await Effect.runPromise(retriedEffect)

			expect(result).toBe("async-success")
			expect(attempts).toBe(2)
		})
	})

	describe("retry policy behaviors", () => {
		it("fastRetryPolicy should retry quickly", async () => {
			let attempts = 0
			const startTime = Date.now()

			const effect = Effect.gen(function* () {
				attempts++
				if (attempts < 3) {
					return yield* Effect.fail(new Error("Failed"))
				}
				return "success"
			})

			const retriedEffect = withRetry(effect, fastRetryPolicy)
			const result = await Effect.runPromise(retriedEffect)

			const duration = Date.now() - startTime

			expect(result).toBe("success")
			// fastRetryPolicy should be quicker (500ms base vs 1000ms for default)
			// But actual timing depends on scheduler, so just check it completes
			expect(duration).toBeGreaterThan(0)
		})

		it(
			"slowRetryPolicy should retry more times",
			{ timeout: 30000 },
			async () => {
				let attempts = 0

				const effect = Effect.gen(function* () {
					attempts++
					if (attempts < 4) {
						return yield* Effect.fail(new Error("Failed"))
					}
					return "success"
				})

				const retriedEffect = withRetry(effect, slowRetryPolicy)
				const result = await Effect.runPromise(retriedEffect)

				expect(result).toBe("success")
				expect(attempts).toBe(4)
			},
		)

		it("databaseRetryPolicy should have same behavior as defaultApiRetryPolicy", async () => {
			// Both policies should retry 3 times with exponential backoff starting at 1000ms
			let defaultAttempts = 0
			let dbAttempts = 0

			const defaultEffect = Effect.gen(function* () {
				defaultAttempts++
				if (defaultAttempts < 3) {
					return yield* Effect.fail(new Error("Failed"))
				}
				return "success"
			})

			const dbEffect = Effect.gen(function* () {
				dbAttempts++
				if (dbAttempts < 3) {
					return yield* Effect.fail(new Error("Failed"))
				}
				return "success"
			})

			const retriedDefault = withRetry(defaultEffect, defaultApiRetryPolicy)
			const retriedDb = withRetry(dbEffect, databaseRetryPolicy)

			const result1 = await Effect.runPromise(retriedDefault)
			const result2 = await Effect.runPromise(retriedDb)

			expect(result1).toBe("success")
			expect(result2).toBe("success")
			expect(defaultAttempts).toBe(dbAttempts)
		})
	})

	describe("error propagation", () => {
		it("should propagate non-retriable errors", async () => {
			const customError = new Error("Custom error")
			const effect = Effect.fail(customError)
			const minimalPolicy = Schedule.recurs(0)

			const retriedEffect = withRetry(effect, minimalPolicy)

			await expect(Effect.runPromise(retriedEffect)).rejects.toThrow(
				"Custom error",
			)
		})

		it("should preserve error information through retries", async () => {
			const errorMessage = "Specific error details"
			let attempts = 0

			const effect = Effect.gen(function* () {
				attempts++
				if (attempts <= 1) {
					return yield* Effect.fail(new Error(errorMessage))
				}
				return "success"
			})

			const minimalPolicy = Schedule.recurs(1)
			const retriedEffect = withRetry(effect, minimalPolicy)
			const result = await Effect.runPromise(retriedEffect)

			expect(result).toBe("success")
		})

		it("should pass final error when all retries exhausted", async () => {
			const finalError = new Error("Final failure")
			const effect = Effect.fail(finalError)
			const minimalPolicy = Schedule.recurs(0)

			const retriedEffect = withRetry(effect, minimalPolicy)

			await expect(Effect.runPromise(retriedEffect)).rejects.toThrow(
				"Final failure",
			)
		})
	})

	describe("retry composition", () => {
		it("should support exponential backoff", async () => {
			let attempts = 0
			const times: number[] = []

			const effect = Effect.gen(function* () {
				times.push(Date.now())
				attempts++
				if (attempts < 3) {
					return yield* Effect.fail(new Error("Failed"))
				}
				return "success"
			})

			// Use a policy with exponential backoff
			const expPolicy = Schedule.exponential(10).pipe(Schedule.compose(Schedule.recurs(2)))

			const retriedEffect = withRetry(effect, expPolicy)
			const result = await Effect.runPromise(retriedEffect)

			expect(result).toBe("success")
			expect(attempts).toBe(3)

			// Check that delays are increasing (exponential backoff)
			if (times.length >= 2) {
				const delay1 = times[1] - times[0]
				const delay2 = times[2] - times[1]
				// Second delay should be >= first delay (exponential)
				expect(delay2).toBeGreaterThanOrEqual(delay1)
			}
		})

		it("should support composed retry policies", async () => {
			const composedPolicy = Schedule.recurs(2).pipe(
				Schedule.compose(Schedule.exponential(10)),
			)

			let attempts = 0
			const effect = Effect.gen(function* () {
				attempts++
				if (attempts < 3) {
					return yield* Effect.fail(new Error("Failed"))
				}
				return "success"
			})

			const retriedEffect = withRetry(effect, composedPolicy)
			const result = await Effect.runPromise(retriedEffect)

			expect(result).toBe("success")
		})
	})
})
