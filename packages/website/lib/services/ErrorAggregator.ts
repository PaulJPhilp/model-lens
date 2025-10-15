import { Context, Effect, Layer } from "effect"

export interface ServiceError {
	readonly service: string
	readonly error: string
	readonly timestamp: Date
}

export class ErrorAggregator {
	private errors: ServiceError[] = []

	addError(service: string, error: string): void {
		this.errors.push({
			service,
			error,
			timestamp: new Date(),
		})
	}

	getErrors(): ServiceError[] {
		return [...this.errors]
	}

	clearErrors(): void {
		this.errors = []
	}

	hasErrors(): boolean {
		return this.errors.length > 0
	}
}

export interface ErrorAggregatorServiceInterface {
	readonly addError: (service: string, error: string) => Effect.Effect<void>
	readonly getErrors: () => Effect.Effect<ServiceError[]>
	readonly clearErrors: () => Effect.Effect<void>
}

export class ErrorAggregatorService extends Context.Tag(
	"ErrorAggregatorService",
)<ErrorAggregatorService, ErrorAggregatorServiceInterface>() {}

export const ErrorAggregatorServiceLive = Layer.succeed(
	ErrorAggregatorService,
	{
		addError: (service: string, error: string) =>
			Effect.sync(() => {
				console.error(`❌ [${service}] ${error}`)
			}),

		getErrors: () =>
			Effect.sync(() => {
				// In a real implementation, this would return actual aggregated errors
				return [] as ServiceError[]
			}),

		clearErrors: () =>
			Effect.sync(() => {
				// Clear errors implementation
			}),
	},
)
