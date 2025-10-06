import { Context, Effect, Layer } from "effect"

export interface EnvironmentConfig {
	readonly DATABASE_URL: string
	readonly NODE_ENV: "development" | "production" | "test"
	readonly MODEL_SERVICE_RETRY_MS: number
	readonly DB_RETRY_MS: number
	readonly UPSTASH_REDIS_REST_URL?: string
	readonly UPSTASH_REDIS_REST_TOKEN?: string
	readonly OPENAI_API_KEY?: string
	readonly ANTHROPIC_API_KEY?: string
	readonly HUGGINGFACE_API_KEY?: string
	readonly OPENROUTER_API_KEY?: string
}

export class EnvironmentError {
	readonly _tag = "EnvironmentError" as const
	constructor(
		readonly message: string,
		readonly missingVariables: string[] = [],
	) {}
}

/**
 * Validates and extracts environment variables
 */
export function validateEnvironment(): Effect.Effect<
	EnvironmentConfig,
	EnvironmentError
> {
	return Effect.gen(function* () {
		const requiredVars = ["DATABASE_URL", "NODE_ENV"] as const
		const missing: string[] = []

		// Check required variables
		for (const varName of requiredVars) {
			if (!process.env[varName]) {
				missing.push(varName)
			}
		}

		if (missing.length > 0) {
			yield* Effect.fail(
				new EnvironmentError(
					`Missing required environment variables: ${missing.join(", ")}`,
					missing,
				),
			)
		}

		// Validate NODE_ENV
		const nodeEnv = process.env.NODE_ENV
		if (nodeEnv && !["development", "production", "test"].includes(nodeEnv)) {
			yield* Effect.fail(
				new EnvironmentError(
					`Invalid NODE_ENV: ${nodeEnv}. Must be one of: development, production, test`,
				),
			)
		}

		// Parse numeric values with defaults
		const modelServiceRetryMs = parseInt(
			process.env.MODEL_SERVICE_RETRY_MS || "1000",
			10,
		)
		const dbRetryMs = parseInt(process.env.DB_RETRY_MS || "1000", 10)

		if (Number.isNaN(modelServiceRetryMs) || modelServiceRetryMs < 0) {
			yield* Effect.fail(
				new EnvironmentError(
					"MODEL_SERVICE_RETRY_MS must be a non-negative number",
				),
			)
		}

		if (Number.isNaN(dbRetryMs) || dbRetryMs < 0) {
			yield* Effect.fail(
				new EnvironmentError("DB_RETRY_MS must be a non-negative number"),
			)
		}

		// Validate DATABASE_URL format
		const databaseUrl = process.env.DATABASE_URL || ""
		if (
			!databaseUrl.startsWith("postgresql://") &&
			!databaseUrl.startsWith("postgres://")
		) {
			yield* Effect.fail(
				new EnvironmentError(
					"DATABASE_URL must be a valid PostgreSQL connection string starting with 'postgresql://' or 'postgres://'",
				),
			)
		}

		return {
			DATABASE_URL: databaseUrl,
			NODE_ENV: (nodeEnv as EnvironmentConfig["NODE_ENV"]) || "development",
			MODEL_SERVICE_RETRY_MS: modelServiceRetryMs,
			DB_RETRY_MS: dbRetryMs,
			UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
			UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
			OPENAI_API_KEY: process.env.OPENAI_API_KEY,
			ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
			HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY,
			OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
		} as const
	})
}

/**
 * Get validated environment configuration or throw error
 */
export function getEnvironmentConfig(): EnvironmentConfig {
	return Effect.runSync(validateEnvironment())
}

/**
 * Environment configuration service for dependency injection
 */
export interface EnvironmentServiceInterface {
	readonly config: Effect.Effect<EnvironmentConfig, EnvironmentError>
}

export class EnvironmentService extends Context.Tag("EnvironmentService")<
	EnvironmentService,
	EnvironmentServiceInterface
>() {}

export const EnvironmentServiceLive = Layer.succeed(EnvironmentService, {
	config: validateEnvironment(),
})

/**
 * Validate API key format (basic validation)
 * @param apiKey - API key to validate
 * @param keyName - Name of the API key for error messages
 * @returns true if valid, false otherwise
 */
export function validateApiKey(
	apiKey: string | undefined,
	keyName: string,
): boolean {
	if (!apiKey) return false

	// Basic validation - API keys should be non-empty strings
	if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
		return false
	}

	// Additional validation based on provider patterns
	switch (keyName) {
		case "OPENAI_API_KEY":
			return apiKey.startsWith("sk-") && apiKey.length >= 20
		case "ANTHROPIC_API_KEY":
			return apiKey.startsWith("sk-ant-") && apiKey.length >= 30
		case "HUGGINGFACE_API_KEY":
			return apiKey.startsWith("hf_") && apiKey.length >= 20
		case "OPENROUTER_API_KEY":
			return apiKey.startsWith("sk-or-") && apiKey.length >= 30
		default:
			return apiKey.length >= 10 // Generic minimum length
	}
}

/**
 * Get validated API key with security warnings
 * @param config - Environment configuration
 * @param keyName - Name of the API key
 * @returns API key if valid, undefined otherwise
 */
export function getValidatedApiKey(
	config: EnvironmentConfig,
	keyName: keyof Pick<
		EnvironmentConfig,
		| "OPENAI_API_KEY"
		| "ANTHROPIC_API_KEY"
		| "HUGGINGFACE_API_KEY"
		| "OPENROUTER_API_KEY"
	>,
): string | undefined {
	const apiKey = config[keyName]

	if (!apiKey) {
		if (config.NODE_ENV === "production") {
			console.warn(
				`⚠️ [Security] ${keyName} not configured in production environment`,
			)
		}
		return undefined
	}

	if (!validateApiKey(apiKey, keyName)) {
		console.error(`❌ [Security] Invalid ${keyName} format`)
		return undefined
	}

	// Log successful validation (but mask the key)
	const maskedKey = `${apiKey.substring(0, 8)}...${apiKey.substring(
		apiKey.length - 4,
	)}`
	console.log(`✅ [Security] ${keyName} validated (${maskedKey})`)

	return apiKey
}
