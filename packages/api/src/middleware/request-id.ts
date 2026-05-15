/**
 * Request ID middleware.
 *
 * Generates a unique request ID for every incoming request and attaches it
 * to both the Hono context and the `x-request-id` response header.
 */
import type { Context, Next } from "hono";
import { generateRequestId } from "../logging/index";

/** Middleware that assigns a request ID to every request. */
export async function requestIdMiddleware(c: Context, next: Next) {
  const requestId = generateRequestId();
  c.set("requestId", requestId);
  c.header("x-request-id", requestId);
  await next();
}
