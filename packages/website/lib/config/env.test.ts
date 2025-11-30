/* @vitest-environment node */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { validateApiKey, getValidatedApiKey } from "./env"
import type { EnvironmentConfig } from "./env"

describe("Environment Configuration", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe("validateApiKey", () => {
		describe("OpenAI API Key", () => {
			it("should validate correct OpenAI API key format", () => {
				const validKey = "sk-" + "a".repeat(18)
				const result = validateApiKey(validKey, "OPENAI_API_KEY")
				expect(result).toBe(true)
			})

			it("should reject OpenAI key without sk- prefix", () => {
				const invalidKey = "ak-" + "a".repeat(18)
				const result = validateApiKey(invalidKey, "OPENAI_API_KEY")
				expect(result).toBe(false)
			})

			it("should reject OpenAI key that's too short", () => {
				const shortKey = "sk-short"
				const result = validateApiKey(shortKey, "OPENAI_API_KEY")
				expect(result).toBe(false)
			})

			it("should reject empty OpenAI key", () => {
				const result = validateApiKey("", "OPENAI_API_KEY")
				expect(result).toBe(false)
			})

			it("should reject undefined OpenAI key", () => {
				const result = validateApiKey(undefined, "OPENAI_API_KEY")
				expect(result).toBe(false)
			})
		})

		describe("Anthropic API Key", () => {
			it("should validate correct Anthropic API key format", () => {
				const validKey = "sk-ant-" + "a".repeat(30)
				const result = validateApiKey(validKey, "ANTHROPIC_API_KEY")
				expect(result).toBe(true)
			})

			it("should reject Anthropic key without sk-ant- prefix", () => {
				const invalidKey = "sk-" + "a".repeat(30)
				const result = validateApiKey(invalidKey, "ANTHROPIC_API_KEY")
				expect(result).toBe(false)
			})

			it("should reject Anthropic key that's too short", () => {
				const shortKey = "sk-ant-short"
				const result = validateApiKey(shortKey, "ANTHROPIC_API_KEY")
				expect(result).toBe(false)
			})
		})

		describe("HuggingFace API Key", () => {
			it("should validate correct HuggingFace API key format", () => {
				const validKey = "hf_" + "a".repeat(20)
				const result = validateApiKey(validKey, "HUGGINGFACE_API_KEY")
				expect(result).toBe(true)
			})

			it("should reject HuggingFace key without hf_ prefix", () => {
				const invalidKey = "api_" + "a".repeat(20)
				const result = validateApiKey(invalidKey, "HUGGINGFACE_API_KEY")
				expect(result).toBe(false)
			})

			it("should reject HuggingFace key that's too short", () => {
				const shortKey = "hf_short"
				const result = validateApiKey(shortKey, "HUGGINGFACE_API_KEY")
				expect(result).toBe(false)
			})
		})

		describe("OpenRouter API Key", () => {
			it("should validate correct OpenRouter API key format", () => {
				const validKey = "sk-or-" + "a".repeat(30)
				const result = validateApiKey(validKey, "OPENROUTER_API_KEY")
				expect(result).toBe(true)
			})

			it("should reject OpenRouter key without sk-or- prefix", () => {
				const invalidKey = "sk-" + "a".repeat(30)
				const result = validateApiKey(invalidKey, "OPENROUTER_API_KEY")
				expect(result).toBe(false)
			})

			it("should reject OpenRouter key that's too short", () => {
				const shortKey = "sk-or-short"
				const result = validateApiKey(shortKey, "OPENROUTER_API_KEY")
				expect(result).toBe(false)
			})
		})

		describe("Generic API Key", () => {
			it("should validate generic key with minimum length", () => {
				const validKey = "a".repeat(10)
				const result = validateApiKey(validKey, "CUSTOM_API_KEY")
				expect(result).toBe(true)
			})

			it("should reject generic key that's too short", () => {
				const shortKey = "tooshort"
				const result = validateApiKey(shortKey, "CUSTOM_API_KEY")
				expect(result).toBe(false)
			})

			it("should reject whitespace-only key", () => {
				const whitespaceKey = "   "
				const result = validateApiKey(whitespaceKey, "CUSTOM_API_KEY")
				expect(result).toBe(false)
			})
		})

		describe("edge cases", () => {
			it("should handle non-string input gracefully", () => {
				const result = validateApiKey(123 as any, "SOME_KEY")
				expect(result).toBe(false)
			})

			it("should handle keys with special characters", () => {
				const keyWithSpecialChars = "sk-" + "a!@#$%^&*()" + "a".repeat(10)
				const result = validateApiKey(keyWithSpecialChars, "OPENAI_API_KEY")
				expect(result).toBe(true)
			})

			it("should handle keys with numbers", () => {
				const keyWithNumbers = "sk-" + "a1b2c3" + "a".repeat(15)
				const result = validateApiKey(keyWithNumbers, "OPENAI_API_KEY")
				expect(result).toBe(true)
			})

			it("should handle very long keys", () => {
				const longKey = "sk-" + "a".repeat(1000)
				const result = validateApiKey(longKey, "OPENAI_API_KEY")
				expect(result).toBe(true)
			})
		})
	})

	describe("getValidatedApiKey", () => {
		let consoleWarn: ReturnType<typeof vi.spyOn>
		let consoleError: ReturnType<typeof vi.spyOn>
		let consoleLog: ReturnType<typeof vi.spyOn>

		beforeEach(() => {
			consoleWarn = vi.spyOn(console, "warn").mockImplementation()
			consoleError = vi.spyOn(console, "error").mockImplementation()
			consoleLog = vi.spyOn(console, "log").mockImplementation()
		})

		afterEach(() => {
			consoleWarn.mockRestore()
			consoleError.mockRestore()
			consoleLog.mockRestore()
		})

		it("should return valid API key", () => {
			const config: Partial<EnvironmentConfig> = {
				OPENAI_API_KEY: "sk-" + "a".repeat(20),
				NODE_ENV: "development",
			}

			const result = getValidatedApiKey(
				config as EnvironmentConfig,
				"OPENAI_API_KEY",
			)

			expect(result).toBe(config.OPENAI_API_KEY)
		})

		it("should return undefined for missing key in development", () => {
			const config: Partial<EnvironmentConfig> = {
				NODE_ENV: "development",
			}

			const result = getValidatedApiKey(
				config as EnvironmentConfig,
				"OPENAI_API_KEY",
			)

			expect(result).toBeUndefined()
		})

		it("should warn about missing key in production", () => {
			const config: Partial<EnvironmentConfig> = {
				NODE_ENV: "production",
			}

			getValidatedApiKey(config as EnvironmentConfig, "OPENAI_API_KEY")

			expect(consoleWarn).toHaveBeenCalled()
			const warns = consoleWarn.mock.calls.map((c) => c[0])
			expect(warns.some((w) => w.includes("not configured"))).toBe(true)
		})

		it("should return undefined for invalid API key format", () => {
			const config: Partial<EnvironmentConfig> = {
				OPENAI_API_KEY: "invalid-key",
				NODE_ENV: "development",
			}

			const result = getValidatedApiKey(
				config as EnvironmentConfig,
				"OPENAI_API_KEY",
			)

			expect(result).toBeUndefined()
			expect(consoleError).toHaveBeenCalled()
		})

		it("should log successful validation with masked key", () => {
			const fullKey = "sk-" + "a".repeat(20)
			const config: Partial<EnvironmentConfig> = {
				OPENAI_API_KEY: fullKey,
				NODE_ENV: "development",
			}

			const result = getValidatedApiKey(
				config as EnvironmentConfig,
				"OPENAI_API_KEY",
			)

			expect(result).toBe(fullKey)
			expect(consoleLog).toHaveBeenCalled()

			const logs = consoleLog.mock.calls.map((c) => c[0])
			const validationLog = logs.find((l) => l.includes("validated"))

			// Key should be masked in logs
			expect(validationLog).not.toContain(fullKey)
		})

		it("should mask first 8 characters and last 4 characters of key in log", () => {
			const fullKey = "sk-" + "a".repeat(20) // Full key
			const config: Partial<EnvironmentConfig> = {
				OPENAI_API_KEY: fullKey,
				NODE_ENV: "development",
			}

			getValidatedApiKey(config as EnvironmentConfig, "OPENAI_API_KEY")

			const logs = consoleLog.mock.calls.map((c) => c[0])
			const validationLog = logs.find((l) => l.includes("validated"))

			// Should show format like "sk-aaa...aaaa"
			expect(validationLog).toMatch(/sk-aaa\.\.\./)
		})

		it("should validate different API key types", () => {
			const validKeys = {
				OPENAI_API_KEY: "sk-" + "a".repeat(20),
				ANTHROPIC_API_KEY: "sk-ant-" + "a".repeat(30),
				HUGGINGFACE_API_KEY: "hf_" + "a".repeat(20),
				OPENROUTER_API_KEY: "sk-or-" + "a".repeat(30),
			}

			for (const [keyName, keyValue] of Object.entries(validKeys)) {
				const config: Partial<EnvironmentConfig> = {
					[keyName]: keyValue,
					NODE_ENV: "development",
				}

				const result = getValidatedApiKey(
					config as EnvironmentConfig,
					keyName as any,
				)

				expect(result).toBe(keyValue)
			}
		})

		it("should handle empty string API key", () => {
			const config: Partial<EnvironmentConfig> = {
				OPENAI_API_KEY: "",
				NODE_ENV: "development",
			}

			const result = getValidatedApiKey(
				config as EnvironmentConfig,
				"OPENAI_API_KEY",
			)

			expect(result).toBeUndefined()
			expect(consoleError).toHaveBeenCalled()
		})

		it("should not warn in development when key is missing", () => {
			const config: Partial<EnvironmentConfig> = {
				NODE_ENV: "development",
			}

			getValidatedApiKey(config as EnvironmentConfig, "OPENAI_API_KEY")

			// Should not warn in development
			expect(
				consoleWarn.mock.calls.some((c) =>
					c[0].includes("not configured in production"),
				),
			).toBe(false)
		})

		it("should warn specifically in production when key is missing", () => {
			const config: Partial<EnvironmentConfig> = {
				NODE_ENV: "production",
			}

			getValidatedApiKey(config as EnvironmentConfig, "ANTHROPIC_API_KEY")

			expect(consoleWarn).toHaveBeenCalled()
			const warns = consoleWarn.mock.calls.map((c) => c[0])
			const warningAboutProduction = warns.find((w) =>
				w.includes("production"),
			)
			expect(warningAboutProduction).toBeDefined()
		})
	})

	describe("environment config validation flow", () => {
		let consoleLog: ReturnType<typeof vi.spyOn>
		let consoleError: ReturnType<typeof vi.spyOn>

		beforeEach(() => {
			consoleLog = vi.spyOn(console, "log").mockImplementation()
			consoleError = vi.spyOn(console, "error").mockImplementation()
		})

		afterEach(() => {
			consoleLog.mockRestore()
			consoleError.mockRestore()
		})

		it("should validate multiple API keys in sequence", () => {
			const config: Partial<EnvironmentConfig> = {
				OPENAI_API_KEY: "sk-" + "a".repeat(20),
				ANTHROPIC_API_KEY: "sk-ant-" + "a".repeat(30),
				HUGGINGFACE_API_KEY: "hf_" + "a".repeat(20),
				NODE_ENV: "development",
			}

			const openaiKey = getValidatedApiKey(
				config as EnvironmentConfig,
				"OPENAI_API_KEY",
			)
			const anthropicKey = getValidatedApiKey(
				config as EnvironmentConfig,
				"ANTHROPIC_API_KEY",
			)
			const huggingfaceKey = getValidatedApiKey(
				config as EnvironmentConfig,
				"HUGGINGFACE_API_KEY",
			)

			expect(openaiKey).toBe(config.OPENAI_API_KEY)
			expect(anthropicKey).toBe(config.ANTHROPIC_API_KEY)
			expect(huggingfaceKey).toBe(config.HUGGINGFACE_API_KEY)
		})

		it("should handle partial validation (some keys valid, some invalid)", () => {
			const config: Partial<EnvironmentConfig> = {
				OPENAI_API_KEY: "sk-" + "a".repeat(20), // Valid
				ANTHROPIC_API_KEY: "invalid", // Invalid
				HUGGINGFACE_API_KEY: undefined, // Missing
				NODE_ENV: "development",
			}

			const openaiKey = getValidatedApiKey(
				config as EnvironmentConfig,
				"OPENAI_API_KEY",
			)
			const anthropicKey = getValidatedApiKey(
				config as EnvironmentConfig,
				"ANTHROPIC_API_KEY",
			)
			const huggingfaceKey = getValidatedApiKey(
				config as EnvironmentConfig,
				"HUGGINGFACE_API_KEY",
			)

			expect(openaiKey).toBe(config.OPENAI_API_KEY)
			expect(anthropicKey).toBeUndefined()
			expect(huggingfaceKey).toBeUndefined()
		})
	})
})
