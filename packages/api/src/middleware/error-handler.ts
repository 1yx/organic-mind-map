/**
 * Global error handler middleware.
 *
 * Converts AppError instances into stable API error envelopes.
 * Unhandled errors are wrapped as 500 provider_failed.
 */
import type { Context } from "hono";
import type { Bindings } from "../types";
import { AppError } from "../errors/index";
import { err as apiErr } from "../envelope/index";

/** Global error handler that normalises errors into API envelopes. */
export function errorHandler(error: Error, c: Context<Bindings>) {
  const requestId: string = c.get("requestId") ?? "unknown";

  if (error instanceof AppError) {
    return new Response(JSON.stringify(apiErr(error.toApiError(), requestId)), {
      status: error.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.error("Unhandled error:", error);
  return new Response(
    JSON.stringify(
      apiErr(
        {
          code: "provider_failed",
          message: "Internal server error.",
          retryable: false,
        },
        requestId,
      ),
    ),
    { status: 500, headers: { "Content-Type": "application/json" } },
  );
}
