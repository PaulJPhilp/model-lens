import { describe, expect, it } from "vitest"
import { cn } from "./utils"

describe("Utils", () => {
	describe("cn function", () => {
		it("should merge Tailwind classes correctly", () => {
			const result = cn("bg-red-500", "bg-blue-500")
			expect(result).toBe("bg-blue-500")
		})

		it("should handle conditional classes", () => {
			const result = cn(
				"bg-red-500",
				true && "text-white",
				false && "text-black",
			)
			expect(result).toBe("bg-red-500 text-white")
		})

		it("should handle arrays of classes", () => {
			const result = cn(["bg-red-500", "text-white"], "font-bold")
			expect(result).toBe("bg-red-500 text-white font-bold")
		})

		it("should handle undefined and null values", () => {
			const result = cn("bg-red-500", undefined, null, "text-white")
			expect(result).toBe("bg-red-500 text-white")
		})
	})
})
