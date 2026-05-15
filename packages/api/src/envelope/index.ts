/**
 * API response envelope helpers.
 *
 * Every API response is wrapped in either an ok or error envelope so the
 * frontend can rely on a consistent top-level shape.
 */
import type { ApiError } from "../errors/index";

/** Successful response envelope. */
export type ApiOkResponse<T> = {
  ok: true;
  data: T;
  requestId: string;
};

/** Error response envelope. */
export type ApiErrorResponse = {
  ok: false;
  error: ApiError;
  requestId: string;
};

/** Discriminated union of ok and error envelopes. */
export type ApiResponse<T> = ApiOkResponse<T> | ApiErrorResponse;

/** Creates a successful response envelope. */
export function ok<T>(data: T, requestId: string): ApiOkResponse<T> {
  return { ok: true, data, requestId };
}

/** Creates an error response envelope. */
export function err(error: ApiError, requestId: string): ApiErrorResponse {
  return { ok: false, error, requestId };
}
