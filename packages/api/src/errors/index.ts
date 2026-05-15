/**
 * Stable API error codes and HTTP status mapping.
 *
 * All error codes are normalised so frontend flows remain stable across
 * provider and worker implementation changes.
 */

/** Union of all stable error codes the API can return. */
export type ErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "quota_exhausted"
  | "rate_limited"
  | "payload_too_large"
  | "validation_failed"
  | "stale_document"
  | "job_canceled"
  | "provider_failed"
  | "worker_failed"
  | "artifact_unavailable";

/** Maps each stable error code to an HTTP status. */
export const ERROR_CODE_TO_STATUS: Record<ErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  stale_document: 409,
  payload_too_large: 413,
  validation_failed: 422,
  quota_exhausted: 429,
  rate_limited: 429,
  job_canceled: 499,
  provider_failed: 502,
  worker_failed: 502,
  artifact_unavailable: 503,
};

/** JSON-serialisable error payload returned in every error envelope. */
export type ApiError = {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
};

/**
 * Typed application error that carries a stable error code and HTTP status.
 *
 * Throw this from route handlers or service code; the global error handler
 * will convert it to an API error envelope.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;

  /** @param code - Stable error code from the ErrorCode union. */
  constructor(
    code: ErrorCode,
    message: string,
    opts?: { retryable?: boolean; details?: Record<string, unknown> },
  ) {
    super(message);
    this.code = code;
    this.status = ERROR_CODE_TO_STATUS[code];
    this.retryable = opts?.retryable ?? false;
    this.details = opts?.details;
  }

  /** Converts to the JSON-serialisable ApiError shape. */
  toApiError(): ApiError {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      details: this.details,
    };
  }
}
