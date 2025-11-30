/* @vitest-environment node */
import { describe, expect, it, beforeEach, vi } from "vitest"
import { ErrorAggregator } from "./ErrorAggregator"
import type { ServiceError } from "./ErrorAggregator"

describe("ErrorAggregator", () => {
	let aggregator: ErrorAggregator

	beforeEach(() => {
		aggregator = new ErrorAggregator()
	})

	describe("addError", () => {
		it("should add error with service name and message", () => {
			aggregator.addError("ModelService", "Failed to fetch models")

			const errors = aggregator.getErrors()
			expect(errors).toHaveLength(1)
			expect(errors[0].service).toBe("ModelService")
			expect(errors[0].error).toBe("Failed to fetch models")
		})

		it("should add error with timestamp", () => {
			const beforeTime = new Date()
			aggregator.addError("CacheService", "Cache write failed")
			const afterTime = new Date()

			const errors = aggregator.getErrors()
			const error = errors[0]

			expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
			expect(error.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime())
		})

		it("should add multiple errors", () => {
			aggregator.addError("Service1", "Error 1")
			aggregator.addError("Service2", "Error 2")
			aggregator.addError("Service3", "Error 3")

			const errors = aggregator.getErrors()
			expect(errors).toHaveLength(3)
		})

		it("should preserve error order", () => {
			aggregator.addError("First", "First error")
			aggregator.addError("Second", "Second error")
			aggregator.addError("Third", "Third error")

			const errors = aggregator.getErrors()
			expect(errors[0].service).toBe("First")
			expect(errors[1].service).toBe("Second")
			expect(errors[2].service).toBe("Third")
		})

		it("should handle empty service name", () => {
			aggregator.addError("", "Error with empty service")

			const errors = aggregator.getErrors()
			expect(errors[0].service).toBe("")
			expect(errors[0].error).toBe("Error with empty service")
		})

		it("should handle empty error message", () => {
			aggregator.addError("Service", "")

			const errors = aggregator.getErrors()
			expect(errors[0].service).toBe("Service")
			expect(errors[0].error).toBe("")
		})

		it("should handle special characters in service name", () => {
			const serviceNames = [
				"Service:Cache",
				"Service/DB",
				"Service@API",
				"Service#Main",
			]

			for (const name of serviceNames) {
				aggregator.addError(name, "Error")
			}

			const errors = aggregator.getErrors()
			expect(errors.map((e) => e.service)).toEqual(serviceNames)
		})

		it("should handle long error messages", () => {
			const longMessage = "a".repeat(1000)
			aggregator.addError("Service", longMessage)

			const errors = aggregator.getErrors()
			expect(errors[0].error).toBe(longMessage)
		})

		it("should log error to console", () => {
			const consoleError = vi.spyOn(console, "error")
			aggregator.addError("TestService", "Test error message")

			expect(consoleError).toHaveBeenCalled()
			const callArgs = consoleError.mock.calls[0][0]
			expect(callArgs).toContain("TestService")
			expect(callArgs).toContain("Test error message")

			consoleError.mockRestore()
		})
	})

	describe("getErrors", () => {
		it("should return empty array initially", () => {
			const errors = aggregator.getErrors()
			expect(errors).toEqual([])
			expect(Array.isArray(errors)).toBe(true)
		})

		it("should return copy of errors (not reference)", () => {
			aggregator.addError("Service", "Error")
			const errors1 = aggregator.getErrors()
			const errors2 = aggregator.getErrors()

			expect(errors1).toEqual(errors2)
			expect(errors1).not.toBe(errors2) // Different array objects
		})

		it("should not allow mutation of returned array", () => {
			aggregator.addError("Service", "Error")
			const errors = aggregator.getErrors()
			const initialLength = errors.length

			// Try to mutate the returned array
			;(errors as any).push({ service: "Fake", error: "Fake", timestamp: new Date() })

			// Internal errors should not be affected
			const errors2 = aggregator.getErrors()
			expect(errors2).toHaveLength(initialLength)
		})

		it("should return all added errors", () => {
			const errorEntries = [
				{ service: "Service1", error: "Error 1" },
				{ service: "Service2", error: "Error 2" },
				{ service: "Service3", error: "Error 3" },
			]

			for (const entry of errorEntries) {
				aggregator.addError(entry.service, entry.error)
			}

			const errors = aggregator.getErrors()
			expect(errors).toHaveLength(3)

			for (let i = 0; i < errorEntries.length; i++) {
				expect(errors[i].service).toBe(errorEntries[i].service)
				expect(errors[i].error).toBe(errorEntries[i].error)
			}
		})
	})

	describe("clearErrors", () => {
		it("should clear all errors", () => {
			aggregator.addError("Service1", "Error 1")
			aggregator.addError("Service2", "Error 2")

			expect(aggregator.getErrors()).toHaveLength(2)

			aggregator.clearErrors()

			expect(aggregator.getErrors()).toHaveLength(0)
		})

		it("should allow adding errors after clear", () => {
			aggregator.addError("Service1", "Error 1")
			aggregator.clearErrors()
			aggregator.addError("Service2", "Error 2")

			const errors = aggregator.getErrors()
			expect(errors).toHaveLength(1)
			expect(errors[0].service).toBe("Service2")
		})

		it("should not error when clearing empty aggregator", () => {
			// Should not throw
			expect(() => aggregator.clearErrors()).not.toThrow()
			expect(aggregator.getErrors()).toHaveLength(0)
		})

		it("should clear multiple times", () => {
			aggregator.addError("Service", "Error")
			aggregator.clearErrors()
			aggregator.addError("Service", "Error")
			aggregator.clearErrors()

			expect(aggregator.getErrors()).toHaveLength(0)
		})
	})

	describe("hasErrors", () => {
		it("should return false when no errors", () => {
			expect(aggregator.hasErrors()).toBe(false)
		})

		it("should return true when errors exist", () => {
			aggregator.addError("Service", "Error")
			expect(aggregator.hasErrors()).toBe(true)
		})

		it("should return false after clear", () => {
			aggregator.addError("Service", "Error")
			aggregator.clearErrors()
			expect(aggregator.hasErrors()).toBe(false)
		})

		it("should reflect multiple errors", () => {
			expect(aggregator.hasErrors()).toBe(false)

			aggregator.addError("Service1", "Error 1")
			expect(aggregator.hasErrors()).toBe(true)

			aggregator.addError("Service2", "Error 2")
			expect(aggregator.hasErrors()).toBe(true)

			aggregator.clearErrors()
			expect(aggregator.hasErrors()).toBe(false)
		})
	})

	describe("error structure", () => {
		it("should have correct ServiceError structure", () => {
			aggregator.addError("TestService", "Test error")

			const errors = aggregator.getErrors()
			const error = errors[0]

			expect(error).toHaveProperty("service")
			expect(error).toHaveProperty("error")
			expect(error).toHaveProperty("timestamp")

			expect(typeof error.service).toBe("string")
			expect(typeof error.error).toBe("string")
			expect(error.timestamp instanceof Date).toBe(true)
		})

		it("should preserve error data types", () => {
			aggregator.addError("MyService", "My error message")

			const errors = aggregator.getErrors()
			const error: ServiceError = errors[0]

			// Service should be string
			expect(typeof error.service).toBe("string")
			expect(error.service).toBe("MyService")

			// Error should be string
			expect(typeof error.error).toBe("string")
			expect(error.error).toBe("My error message")

			// Timestamp should be Date
			expect(error.timestamp).toBeInstanceOf(Date)
		})
	})

	describe("error aggregation scenarios", () => {
		it("should handle multi-service error aggregation", () => {
			const services = ["ModelService", "CacheService", "DatabaseService"]

			for (const service of services) {
				aggregator.addError(service, `Error in ${service}`)
			}

			const errors = aggregator.getErrors()

			expect(errors).toHaveLength(3)
			expect(errors.map((e) => e.service)).toEqual(services)
		})

		it("should track error progression", () => {
			aggregator.addError("Service", "First attempt failed")
			let errors = aggregator.getErrors()
			expect(errors).toHaveLength(1)

			aggregator.addError("Service", "Retry 1 failed")
			errors = aggregator.getErrors()
			expect(errors).toHaveLength(2)

			aggregator.addError("Service", "Retry 2 failed")
			errors = aggregator.getErrors()
			expect(errors).toHaveLength(3)

			// All errors preserved
			expect(errors[0].error).toContain("First attempt")
			expect(errors[1].error).toContain("Retry 1")
			expect(errors[2].error).toContain("Retry 2")
		})

		it("should handle concurrent-like error additions", () => {
			const errors = [
				{ service: "Service1", error: "Error 1" },
				{ service: "Service2", error: "Error 2" },
				{ service: "Service3", error: "Error 3" },
				{ service: "Service1", error: "Error 1b" },
			]

			for (const err of errors) {
				aggregator.addError(err.service, err.error)
			}

			const collected = aggregator.getErrors()
			expect(collected).toHaveLength(4)

			// Can filter by service
			const service1Errors = collected.filter((e) => e.service === "Service1")
			expect(service1Errors).toHaveLength(2)
		})
	})

	describe("aggregator lifecycle", () => {
		it("should support full lifecycle", () => {
			// Start: no errors
			expect(aggregator.hasErrors()).toBe(false)

			// Add errors
			aggregator.addError("Service1", "Error 1")
			aggregator.addError("Service2", "Error 2")
			expect(aggregator.hasErrors()).toBe(true)
			expect(aggregator.getErrors()).toHaveLength(2)

			// Clear
			aggregator.clearErrors()
			expect(aggregator.hasErrors()).toBe(false)
			expect(aggregator.getErrors()).toHaveLength(0)

			// Add again
			aggregator.addError("Service3", "Error 3")
			expect(aggregator.hasErrors()).toBe(true)
			expect(aggregator.getErrors()).toHaveLength(1)
		})

		it("should be reusable across multiple cycles", () => {
			for (let cycle = 0; cycle < 3; cycle++) {
				aggregator.addError("Service", `Error ${cycle}`)
				expect(aggregator.hasErrors()).toBe(true)

				aggregator.clearErrors()
				expect(aggregator.hasErrors()).toBe(false)
			}
		})
	})
})
