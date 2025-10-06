import { describe, expect, it } from "vitest"
import { ApiError, NetworkError, UnknownError, ValidationError } from "./errors"

describe("AppError", () => {
	it("should create ApiError", () => {
		const error = new ApiError("test error", 500)
		expect(error._tag).toBe("ApiError")
		expect(error.error).toBe("test error")
		expect(error.status).toBe(500)
	})

	it("should create ValidationError", () => {
		const error = new ValidationError("cost", "Invalid range")
		expect(error._tag).toBe("ValidationError")
		expect(error.field).toBe("cost")
		expect(error.message).toBe("Invalid range")
	})

	it("should create NetworkError", () => {
		const originalError = new Error("network fail")
		const error = new NetworkError(originalError)
		expect(error._tag).toBe("NetworkError")
		expect(error.error).toBe(originalError)
	})

	it("should create UnknownError", () => {
		const error = new UnknownError("unknown")
		expect(error._tag).toBe("UnknownError")
		expect(error.error).toBe("unknown")
	})
})
