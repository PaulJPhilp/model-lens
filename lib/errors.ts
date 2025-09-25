export class ApiError extends Error {
  readonly _tag = 'ApiError';
  constructor(public error: string, public status?: number) {
    super(error);
  }
}

export class ValidationError extends Error {
  readonly _tag = 'ValidationError';
  constructor(public field: string, public message: string) {
    super(message);
  }
}

export class NetworkError extends Error {
  readonly _tag = 'NetworkError';
  constructor(public error: unknown) {
    super('Network error');
  }
}

export class UnknownError extends Error {
  readonly _tag = 'UnknownError';
  constructor(public error: unknown) {
    super('Unknown error');
  }
}

export type AppErrorCause = ApiError | ValidationError | NetworkError | UnknownError;

export class AppError extends Error {
  readonly _tag = 'AppError';
  constructor(public cause: AppErrorCause) {
    super('AppError');
  }
}
