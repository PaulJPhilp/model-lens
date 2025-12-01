import { Effect } from "effect"

export interface ServiceError {
	readonly service: string
	readonly error: string
	readonly timestamp: Date
}

/**
 * Service for aggregating errors from all components
 *
 * Collects and reports errors from various services for monitoring
 */
export class ErrorAggregatorService extends Effect.Service<ErrorAggregatorService>()(
	"ErrorAggregatorService",
	{
		methods: {
			/** Add an error to the aggregator */
			addError: (service: string, error: string) => Effect.Effect<void, never>,

			/** Get all aggregated errors */
			getErrors: () => Effect.Effect<ServiceError[], never>,

			/** Clear all aggregated errors */
			clearErrors: () => Effect.Effect<void, never>,
		},
	},
) {}
