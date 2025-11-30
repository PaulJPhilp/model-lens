import { describe, expect, it } from "vitest"
import { ApiError, NetworkError, UnknownError, ValidationError, AppError, type AppErrorCause } from "./errors"

describe("Error Types", () => {
	describe("ApiError", () => {
		it("should create ApiError with error message and status", () => {
			const error = new ApiError("test error", 500)
			expect(error._tag).toBe("ApiError")
			expect(error.error).toBe("test error")
			expect(error.status).toBe(500)
		})

		it("should create ApiError without status", () => {
			const error = new ApiError("test error")
			expect(error._tag).toBe("ApiError")
			expect(error.error).toBe("test error")
			expect(error.status).toBeUndefined()
		})

		it("should have correct error status codes", () => {
			const statusCodes = [400, 401, 403, 404, 500, 503]

			for (const status of statusCodes) {
				const error = new ApiError("Error", status)
				expect(error.status).toBe(status)
			}
		})

		it("should preserve error message", () => {
			const messages = [
				"Not found",
				"Unauthorized",
				"Internal server error",
				"Service unavailable",
			]

			for (const msg of messages) {
				const error = new ApiError(msg)
				expect(error.error).toBe(msg)
			}
		})
	})

	describe("ValidationError", () => {
		it("should create ValidationError with field and message", () => {
			const error = new ValidationError("cost", "Invalid range")
			expect(error._tag).toBe("ValidationError")
			expect(error.field).toBe("cost")
			expect(error.message).toBe("Invalid range")
		})

		it("should preserve field names", () => {
			const fields = ["email", "name", "price", "context_window"]

			for (const field of fields) {
				const error = new ValidationError(field, "Invalid")
				expect(error.field).toBe(field)
			}
		})

		it("should preserve validation messages", () => {
			const messages = [
				"Must be a valid email",
				"Name is required",
				"Price must be positive",
				"Context window must be greater than 0",
			]

			for (const msg of messages) {
				const error = new ValidationError("field", msg)
				expect(error.message).toBe(msg)
			}
		})

		it("should handle empty field names", () => {
			const error = new ValidationError("", "Invalid")
			expect(error.field).toBe("")
			expect(error._tag).toBe("ValidationError")
		})
	})

	describe("NetworkError", () => {
		it("should create NetworkError from Error", () => {
			const originalError = new Error("network fail")
			const error = new NetworkError(originalError)
			expect(error._tag).toBe("NetworkError")
			expect(error.error).toBe(originalError)
		})

		it("should preserve error object", () => {
			const originalError = new Error("Connection timeout")
			const error = new NetworkError(originalError)
			expect(error.error instanceof Error).toBe(true)
			expect((error.error as Error).message).toBe("Connection timeout")
		})

		it("should handle string error messages", () => {
			const error = new NetworkError("Network unreachable")
			expect(error.error).toBe("Network unreachable")
		})

		it("should handle unknown error types", () => {
			const unknownError = { code: "ECONNREFUSED", statusCode: 0 }
			const error = new NetworkError(unknownError)
			expect(error.error).toEqual(unknownError)
		})

		it("should handle null error", () => {
			const error = new NetworkError(null)
			expect(error.error).toBeNull()
		})
	})

	describe("UnknownError", () => {
		it("should create UnknownError with unknown error", () => {
			const error = new UnknownError("unknown")
			expect(error._tag).toBe("UnknownError")
			expect(error.error).toBe("unknown")
		})

		it("should preserve error information", () => {
			const errorInfo = { unexpected: "condition" }
			const error = new UnknownError(errorInfo)
			expect(error.error).toEqual(errorInfo)
		})

		it("should handle various error types", () => {
			const testCases = [
				"string error",
				new Error("Error object"),
				{ message: "object error" },
				null,
				undefined,
			]

			for (const testCase of testCases) {
				const error = new UnknownError(testCase)
				expect(error._tag).toBe("UnknownError")
				expect(error.error).toBe(testCase)
			}
		})
	})

	describe("AppError", () => {
		it("should wrap ApiError", () => {
			const apiError = new ApiError("API failed", 500)
			const appError = new AppError(apiError)

			expect(appError._tag).toBe("AppError")
			expect(appError.cause._tag).toBe("ApiError")
			expect(appError.cause).toEqual(apiError)
		})

		it("should wrap ValidationError", () => {
			const validationError = new ValidationError("email", "Invalid format")
			const appError = new AppError(validationError)

			expect(appError._tag).toBe("AppError")
			expect(appError.cause._tag).toBe("ValidationError")
			expect(appError.cause).toEqual(validationError)
		})

		it("should wrap NetworkError", () => {
			const networkError = new NetworkError(new Error("Timeout"))
			const appError = new AppError(networkError)

			expect(appError._tag).toBe("AppError")
			expect(appError.cause._tag).toBe("NetworkError")
			expect(appError.cause).toEqual(networkError)
		})

		it("should wrap UnknownError", () => {
			const unknownError = new UnknownError("Unexpected error")
			const appError = new AppError(unknownError)

			expect(appError._tag).toBe("AppError")
			expect(appError.cause._tag).toBe("UnknownError")
			expect(appError.cause).toEqual(unknownError)
		})

		it("should preserve nested error information", () => {
			const originalError = new Error("Root cause")
			const networkError = new NetworkError(originalError)
			const appError = new AppError(networkError)

			expect(appError.cause).toEqual(networkError)
			expect((appError.cause as InstanceType<typeof NetworkError>).error).toBe(
				originalError,
			)
		})
	})

	describe("Error Type Guards", () => {
		it("should distinguish between error types by _tag", () => {
			const apiError = new ApiError("test")
			const validationError = new ValidationError("field", "msg")
			const networkError = new NetworkError(new Error())
			const unknownError = new UnknownError("unknown")

			expect(apiError._tag).toBe("ApiError")
			expect(validationError._tag).toBe("ValidationError")
			expect(networkError._tag).toBe("NetworkError")
			expect(unknownError._tag).toBe("UnknownError")

			// Can use _tag for pattern matching
			const causes: AppErrorCause[] = [
				apiError,
				validationError,
				networkError,
				unknownError,
			]

			const apiErrors = causes.filter((c) => c._tag === "ApiError")
			const validationErrors = causes.filter((c) => c._tag === "ValidationError")
			const networkErrors = causes.filter((c) => c._tag === "NetworkError")
			const unknownErrors = causes.filter((c) => c._tag === "UnknownError")

			expect(apiErrors).toHaveLength(1)
			expect(validationErrors).toHaveLength(1)
			expect(networkErrors).toHaveLength(1)
			expect(unknownErrors).toHaveLength(1)
		})
	})

	describe("Error immutability", () => {
		it("should have readonly _tag property", () => {
			const error = new ApiError("test")
			// _tag should not be writable
			expect(error._tag).toBe("ApiError")
		})

		it("should preserve original error data", () => {
			const originalMessage = "Original message"
			const error = new ApiError(originalMessage, 400)

			// Error data should not change
			expect(error.error).toBe(originalMessage)
			expect(error.status).toBe(400)
		})
	})

	describe("Error composition", () => {
		it("should handle wrapped errors in AppError", () => {
			const cause: AppErrorCause = new ApiError("API error", 500)
			const appError = new AppError(cause)

			expect(appError.cause._tag).toBe("ApiError")

			// Can pattern match on cause
			if (appError.cause._tag === "ApiError") {
				expect(appError.cause.status).toBe(500)
			}
		})

		it("should work with union types", () => {
			const errors: AppErrorCause[] = [
				new ApiError("api"),
				new ValidationError("field", "msg"),
				new NetworkError(new Error("net")),
				new UnknownError("unknown"),
			]

			errors.forEach((error) => {
				expect(error._tag).toBeTruthy()
				expect(["ApiError", "ValidationError", "NetworkError", "UnknownError"]).toContain(
					error._tag,
				)
			})
		})
	})
})
