import { Effect, Schedule } from "effect"

/**
 * Standard retry policies for different types of operations
 */

// Default retry policy for external API calls
export const defaultApiRetryPolicy = Schedule.exponential(1000).pipe(
	Schedule.compose(Schedule.recurs(3)),
)

// Fast retry policy for quick operations
export const fastRetryPolicy = Schedule.exponential(500).pipe(
	Schedule.compose(Schedule.recurs(2)),
)

// Slow retry policy for expensive operations
export const slowRetryPolicy = Schedule.exponential(2000).pipe(
	Schedule.compose(Schedule.recurs(5)),
)

// Database retry policy
export const databaseRetryPolicy = Schedule.exponential(1000).pipe(
	Schedule.compose(Schedule.recurs(3)),
)

/**
 * Apply retry policy to an Effect
 */
export function withRetry<A, E>(
	effect: Effect.Effect<A, E>,
	policy: Schedule.Schedule<unknown, unknown, unknown> = defaultApiRetryPolicy,
): Effect.Effect<A, E, unknown> {
	return Effect.retry(effect, policy)
}

/**
 * Apply retry policy with error logging
 */
export function withRetryAndLogging<A, E>(
	effect: Effect.Effect<A, E>,
	operationName: string,
	policy: Schedule.Schedule<unknown, unknown, unknown> = defaultApiRetryPolicy,
): Effect.Effect<A, E, unknown> {
	return Effect.retry(
		effect.pipe(
			Effect.tapError((error) =>
				Effect.sync(() => {
					console.log(`⚠️ [Retry] ${operationName} failed, retrying:`, error)
				}),
			),
		),
		policy,
	).pipe(
		Effect.tapError((error) =>
			Effect.sync(() => {
				console.error(
					`❌ [Retry] ${operationName} failed after all retries:`,
					error,
				)
			}),
		),
	)
}
