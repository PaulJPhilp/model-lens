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

		it("should handle empty strings", () => {
			const result = cn("bg-red-500", "", "text-white")
			expect(result).toBe("bg-red-500 text-white")
		})

		it("should handle multiple conflicting Tailwind utilities", () => {
			// When two utilities conflict, tailwind-merge should resolve the conflict
			const result = cn("p-4", "p-8", "px-2")
			// px-2 should override p-8 for padding-x
			expect(result).toBeTruthy()
			expect(result).toContain("px-2")
		})

		it("should preserve non-conflicting utilities", () => {
			const result = cn("bg-blue-500", "text-white", "p-4")
			expect(result).toContain("bg-blue-500")
			expect(result).toContain("text-white")
			expect(result).toContain("p-4")
		})

		it("should handle nested arrays", () => {
			const result = cn([["bg-red-500", "text-white"]], "font-bold")
			expect(result).toContain("font-bold")
		})

		it("should handle objects with boolean values", () => {
			const result = cn({
				"bg-red-500": true,
				"text-white": true,
				"font-bold": false,
			})
			expect(result).toContain("bg-red-500")
			expect(result).toContain("text-white")
			expect(result).not.toContain("font-bold")
		})

		it("should return empty string for no inputs", () => {
			const result = cn()
			expect(result).toBe("")
		})

		it("should return empty string for only falsy values", () => {
			const result = cn(false, null, undefined, "")
			expect(result).toBe("")
		})

		it("should handle complex combinations of input types", () => {
			const condition = true
			const classes = ["text-white", "p-2"]
			const result = cn("bg-blue-500", condition && classes, "rounded")

			expect(result).toContain("bg-blue-500")
			expect(result).toContain("text-white")
			expect(result).toContain("p-2")
			expect(result).toContain("rounded")
		})

		it("should handle responsive classes", () => {
			const result = cn(
				"px-2 md:px-4 lg:px-6",
				"text-sm md:text-base lg:text-lg",
			)
			expect(result).toContain("px-2")
			expect(result).toContain("md:px-4")
			expect(result).toContain("lg:px-6")
		})

		it("should handle pseudo-classes", () => {
			const result = cn("bg-blue-500 hover:bg-blue-600 focus:ring-2")
			expect(result).toContain("hover:bg-blue-600")
			expect(result).toContain("focus:ring-2")
		})

		it("should handle dark mode classes", () => {
			const result = cn(
				"bg-white dark:bg-gray-900",
				"text-black dark:text-white",
			)
			expect(result).toContain("dark:")
		})

		it("should handle arbitrary values", () => {
			const result = cn(
				"[mask-image:linear-gradient(90deg,black,rgba(0,0,0,0))]",
			)
			expect(result).toContain("mask-image")
		})

		it("should handle very long class strings", () => {
			const longClass =
				"px-4 py-2 bg-blue-500 text-white font-bold rounded-lg shadow-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-blue-700 dark:text-gray-100 transition-colors duration-200"
			const result = cn(longClass)
			expect(result.length).toBeGreaterThan(0)
			expect(result).toContain("px-4")
			expect(result).toContain("hover:bg-blue-600")
		})

		it("should handle whitespace-only strings", () => {
			const result = cn("bg-red-500", "  ", "text-white")
			expect(result).toContain("bg-red-500")
			expect(result).toContain("text-white")
		})

		it("should merge multiple identical classes", () => {
			const result = cn("text-white", "text-white", "text-white")
			const matches = result.match(/text-white/g)
			expect(matches).toHaveLength(1) // Should deduplicate
		})

		it("should handle all falsy values", () => {
			const result = cn(null, undefined, false, 0, "", NaN, "bg-blue-500")
			expect(result).toBe("bg-blue-500")
		})

		it("should handle numeric values (converted to strings)", () => {
			// Clsx handles numeric values by converting them
			const result = cn("p-", 4) // This might not be a valid use case, but should not error
			expect(result).toBeTruthy()
		})
	})
})
