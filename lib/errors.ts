// Base error types following Effect-TS patterns
export class ApiError {
	readonly _tag = "ApiError" as const
	constructor(
		readonly error: string,
		readonly status?: number,
	) {}
}

export class ValidationError {
	readonly _tag = "ValidationError" as const
	constructor(
		readonly field: string,
		readonly message: string,
	) {}
}

export class NetworkError {
	readonly _tag = "NetworkError" as const
	constructor(readonly error: unknown) {}
}

export class UnknownError {
	readonly _tag = "UnknownError" as const
	constructor(readonly error: unknown) {}
}

export type AppErrorCause =
	| ApiError
	| ValidationError
	| NetworkError
	| UnknownError

export class AppError {
	readonly _tag = "AppError" as const
	constructor(readonly cause: AppErrorCause) {}
}
