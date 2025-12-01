/**
 * Test Helpers and Utilities
 *
 * Provides reusable test utilities, data generators, and assertion helpers
 * to support test development across all test suites.
 */

import { Effect } from "effect"
import type { Model } from "../../lib/types"

/**
 * Test Data Generators
 */
export const generators = {
	/**
	 * Generate a test model with customizable properties
	 */
	createModel: (overrides?: Partial<Model>): Model => {
		const defaults: Model = {
			id: `test-model-${Math.random().toString(36).slice(2, 9)}`,
			name: "Test Model",
			provider: "test-provider",
			description: "A test model for unit testing",
			modalities: ["text"],
			capabilities: ["chat"],
			inputCost: 0.001,
			outputCost: 0.002,
			contextWindow: 4096,
			maxOutputTokens: 2048,
			releaseDate: new Date("2024-01-01"),
			lastUpdated: new Date(),
			trainedTokens: 1000000,
			matchedTokens: 1000000,
			maxRequestsPerMinute: 100,
			maxTokensPerMinute: 100000,
			architectureFamily: "Transformer",
			architectureVersion: "1.0",
			apiStatus: "available",
			estimatedQueueTime: 0,
		}

		return { ...defaults, ...overrides }
	},

	/**
	 * Generate multiple test models with optional variation
	 */
	createModels: (count: number, overrides?: Partial<Model>): Model[] => {
		return Array.from({ length: count }, (_, i) =>
			generators.createModel({
				id: `model-${i}`,
				name: `Model ${i}`,
				...overrides,
			}),
		)
	},

	/**
	 * Generate models from different providers
	 */
	createModelsByProvider: (
		providers: string[],
		modelsPerProvider: number = 2,
	): Model[] => {
		const models: Model[] = []
		providers.forEach((provider) => {
			for (let i = 0; i < modelsPerProvider; i++) {
				models.push(
					generators.createModel({
						id: `${provider}-${i}`,
						provider,
						name: `${provider} Model ${i}`,
					}),
				)
			}
		})
		return models
	},

	/**
	 * Generate models with varying pricing
	 */
	createModelsByPrice: (prices: number[]): Model[] => {
		return prices.map((price, i) =>
			generators.createModel({
				id: `price-${i}`,
				inputCost: price,
				outputCost: price * 2,
			}),
		)
	},

	/**
	 * Generate models with varying context windows
	 */
	createModelsByContextWindow: (contextWindows: number[]): Model[] => {
		return contextWindows.map((window, i) =>
			generators.createModel({
				id: `context-${i}`,
				contextWindow: window,
			}),
		)
	},

	/**
	 * Generate a sync record object
	 */
	createSyncRecord: (overrides?: Record<string, any>) => {
		const defaults = {
			id: `sync-${Math.random().toString(36).slice(2, 9)}`,
			status: "pending",
			startedAt: new Date(),
			completedAt: null,
			totalFetched: 0,
			totalStored: 0,
			errorMessage: null,
		}

		return { ...defaults, ...overrides }
	},

	/**
	 * Generate multiple sync records
	 */
	createSyncRecords: (count: number): any[] => {
		return Array.from({ length: count }, (_, i) =>
			generators.createSyncRecord({
				id: `sync-${i}`,
				status: i === 0 ? "completed" : "pending",
				totalFetched: i * 10,
				totalStored: i * 10,
			}),
		)
	},
}

/**
 * Common Test Assertions
 */
export const assertions = {
	/**
	 * Assert a model has all required properties
	 */
	isValidModel: (model: any): boolean => {
		return (
			model &&
			typeof model.id === "string" &&
			typeof model.name === "string" &&
			typeof model.provider === "string" &&
			typeof model.inputCost === "number" &&
			typeof model.outputCost === "number" &&
			typeof model.contextWindow === "number" &&
			Array.isArray(model.modalities) &&
			Array.isArray(model.capabilities)
		)
	},

	/**
	 * Assert a model has specific properties
	 */
	hasProperties: (model: any, properties: string[]): boolean => {
		return properties.every(
			(prop) => prop in model && model[prop] !== undefined,
		)
	},

	/**
	 * Assert pricing is valid (non-negative, reasonable bounds)
	 */
	isValidPricing: (inputCost: number, outputCost: number): boolean => {
		return (
			inputCost >= 0 && outputCost >= 0 && inputCost < 1000 && outputCost < 1000
		)
	},

	/**
	 * Assert context window is valid
	 */
	isValidContextWindow: (contextWindow: number): boolean => {
		return contextWindow > 0 && contextWindow <= 1000000000 // Up to 1B tokens
	},

	/**
	 * Assert models are identical (used for integrity testing)
	 */
	modelsEqual: (m1: Model, m2: Model, ignoreFields: string[] = []): boolean => {
		const fieldsToCheck = Object.keys(m1).filter(
			(k) => !ignoreFields.includes(k),
		)
		return fieldsToCheck.every((field) => {
			const v1 = (m1 as any)[field]
			const v2 = (m2 as any)[field]

			if (Array.isArray(v1) && Array.isArray(v2)) {
				return v1.length === v2.length && v1.every((item, i) => item === v2[i])
			}

			return v1 === v2
		})
	},

	/**
	 * Assert array contains at least one item matching predicate
	 */
	containsMatch: <T>(array: T[], predicate: (item: T) => boolean): boolean => {
		return array.some(predicate)
	},

	/**
	 * Assert array contains no duplicates (by id)
	 */
	noDuplicateIds: (array: any[]): boolean => {
		const ids = new Set(array.map((item) => item.id))
		return ids.size === array.length
	},

	/**
	 * Assert value is within range
	 */
	isInRange: (value: number, min: number, max: number): boolean => {
		return value >= min && value <= max
	},
}

/**
 * Test Performance Utilities
 */
export const performance = {
	/**
	 * Measure operation duration
	 */
	measureDuration: async <T>(
		fn: () => Promise<T>,
	): Promise<{ result: T; duration: number }> => {
		const start = Date.now()
		const result = await fn()
		const duration = Date.now() - start
		return { result, duration }
	},

	/**
	 * Assert operation completes within timeout
	 */
	completesBefore: (durationMs: number, maxMs: number): boolean => {
		return durationMs <= maxMs
	},

	/**
	 * Get performance metrics for operations
	 */
	getMetrics: (durations: number[]) => ({
		min: Math.min(...durations),
		max: Math.max(...durations),
		avg: durations.reduce((a, b) => a + b, 0) / durations.length,
		p95: durations.sort((a, b) => a - b)[
			Math.ceil(durations.length * 0.95) - 1
		],
		p99: durations.sort((a, b) => a - b)[
			Math.ceil(durations.length * 0.99) - 1
		],
	}),
}

/**
 * Test Fixtures and Setup
 */
export const fixtures = {
	/**
	 * Standard test models for consistent testing
	 */
	standardModels: () => [
		generators.createModel({
			id: "gpt-4",
			provider: "openai",
			inputCost: 0.03,
			contextWindow: 8192,
		}),
		generators.createModel({
			id: "claude-3",
			provider: "anthropic",
			inputCost: 0.015,
			contextWindow: 200000,
		}),
		generators.createModel({
			id: "gemini-pro",
			provider: "google",
			inputCost: 0.0005,
			contextWindow: 32768,
		}),
	],

	/**
	 * Models with extreme values for edge case testing
	 */
	extremeModels: () => [
		generators.createModel({
			id: "extreme-expensive",
			inputCost: 999,
			outputCost: 999,
		}),
		generators.createModel({
			id: "extreme-free",
			inputCost: 0,
			outputCost: 0,
		}),
		generators.createModel({
			id: "extreme-context",
			contextWindow: 1000000000,
		}),
		generators.createModel({
			id: "extreme-small-context",
			contextWindow: 1,
		}),
	],

	/**
	 * Models with various modalities and capabilities
	 */
	diverseModels: () => [
		generators.createModel({
			id: "text-only",
			modalities: ["text"],
			capabilities: ["chat"],
		}),
		generators.createModel({
			id: "multimodal",
			modalities: ["text", "image", "audio"],
			capabilities: ["chat", "completion", "embedding", "image-generation"],
		}),
	],

	/**
	 * Standard sync progression for testing sync lifecycle
	 */
	syncProgression: () => ({
		pending: generators.createSyncRecord({ status: "pending" }),
		completed: generators.createSyncRecord({
			status: "completed",
			completedAt: new Date(),
			totalFetched: 100,
			totalStored: 95,
		}),
		failed: generators.createSyncRecord({
			status: "failed",
			errorMessage: "API failure",
			completedAt: new Date(),
		}),
	}),
}

/**
 * Effect.js Test Utilities
 */
export const effectUtils = {
	/**
	 * Run an effect and capture both success and error
	 */
	runEffect: async <A, E, R>(
		effect: Effect.Effect<A, E, R>,
		layer?: any,
	): Promise<{ success: boolean; value?: A; error?: E }> => {
		try {
			const value = layer
				? await Effect.runPromise(effect.pipe(Effect.provide(layer)))
				: await Effect.runPromise(effect)
			return { success: true, value }
		} catch (error) {
			return { success: false, error: error as E }
		}
	},

	/**
	 * Run effect with timeout
	 */
	runWithTimeout: async <A, E, R>(
		effect: Effect.Effect<A, E, R>,
		timeoutMs: number,
		layer?: any,
	): Promise<{
		success: boolean
		value?: A
		error?: string
		timedOut: boolean
	}> => {
		try {
			const result = layer
				? await Effect.runPromise(
						effect.pipe(Effect.timeout(timeoutMs), Effect.provide(layer)),
					)
				: await Effect.runPromise(effect.pipe(Effect.timeout(timeoutMs)))
			return { success: true, value: result, timedOut: false }
		} catch (error) {
			const isTimeout =
				error instanceof Error && error.message.includes("timeout")
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
				timedOut: isTimeout,
			}
		}
	},
}

/**
 * Database Test Utilities
 */
export const dbUtils = {
	/**
	 * Generate test sync ID
	 */
	generateSyncId: (): string =>
		`sync-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,

	/**
	 * Check if error is database-related
	 */
	isDatabaseError: (error: any): boolean => {
		return (
			error &&
			(error.message?.includes("database") ||
				error.message?.includes("connection") ||
				error.code === "3D000")
		)
	},

	/**
	 * Extract database error message
	 */
	getDatabaseErrorMessage: (error: any): string => {
		return error.message || String(error) || "Unknown database error"
	},
}

/**
 * Response Testing Utilities
 */
export const responseUtils = {
	/**
	 * Validate API response structure
	 */
	isValidResponse: (response: any): boolean => {
		return (
			response &&
			("data" in response || "error" in response) &&
			"timestamp" in response &&
			typeof response.timestamp === "string"
		)
	},

	/**
	 * Validate success response structure
	 */
	isSuccessResponse: (response: any): boolean => {
		return (
			responseUtils.isValidResponse(response) &&
			"data" in response &&
			"meta" in response
		)
	},

	/**
	 * Validate error response structure
	 */
	isErrorResponse: (response: any): boolean => {
		return responseUtils.isValidResponse(response) && "error" in response
	},

	/**
	 * Extract data from response
	 */
	getData: (response: any): any => {
		return response?.data
	},

	/**
	 * Extract error from response
	 */
	getError: (response: any): any => {
		return response?.error
	},

	/**
	 * Get response metadata
	 */
	getMeta: (response: any): any => {
		return response?.meta
	},
}

/**
 * Error Testing Utilities
 */
export const errorUtils = {
	/**
	 * Check if error has expected tag
	 */
	hasTag: (error: any, expectedTag: string): boolean => {
		return error?._tag === expectedTag
	},

	/**
	 * Check if error has expected message (substring match)
	 */
	hasMessage: (error: any, expectedMessage: string): boolean => {
		return (
			(error?.message && error.message.includes(expectedMessage)) ||
			(error instanceof Error && error.message.includes(expectedMessage)) ||
			String(error).includes(expectedMessage)
		)
	},

	/**
	 * Check if error contains all expected fields
	 */
	hasFields: (error: any, fields: string[]): boolean => {
		return fields.every((field) => field in error && error[field] !== undefined)
	},

	/**
	 * Extract error type from tagged error
	 */
	getTag: (error: any): string | undefined => {
		return error?._tag
	},
}

/**
 * Test Context and Logging
 */
export const testContext = {
	/**
	 * Log test progress
	 */
	log: (phase: string, message: string): void => {
		console.log(`[TEST] ${phase}: ${message}`)
	},

	/**
	 * Log test data
	 */
	logData: (label: string, data: any): void => {
		console.log(`[DATA] ${label}:`, JSON.stringify(data, null, 2))
	},

	/**
	 * Log test timing
	 */
	logTiming: (operation: string, durationMs: number): void => {
		console.log(`[TIMING] ${operation}: ${durationMs}ms`)
	},

	/**
	 * Create test context with metadata
	 */
	create: (testName: string) => ({
		testName,
		startTime: Date.now(),
		log: (msg: string) => testContext.log(testName, msg),
		duration: () => Date.now() - this.startTime,
	}),
}

export default {
	generators,
	assertions,
	performance,
	fixtures,
	effectUtils,
	dbUtils,
	responseUtils,
	errorUtils,
	testContext,
}
