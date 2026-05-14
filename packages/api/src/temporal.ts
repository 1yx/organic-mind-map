/**
 * Temporal API utilities for consistent timestamp handling.
 *
 * Wraps the Temporal polyfill so the rest of the codebase can import
 * from a single location.
 */
import { Temporal } from "temporal-polyfill";

/**
 * Returns the current instant as an ISO 8601 string (e.g. "2026-05-14T12:34:56.789Z").
 */
export function nowIso(): string {
  return Temporal.Now.instant().toString();
}

/**
 * Returns the current epoch time in milliseconds.
 */
export function nowEpochMs(): number {
  return Temporal.Now.instant().epochMilliseconds;
}
