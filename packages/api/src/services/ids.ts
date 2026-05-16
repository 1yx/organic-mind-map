/**
 * Stable local ID and hashing helpers for API records.
 */
import { createHash, randomUUID } from "node:crypto";

/** Creates a prefixed record ID. */
export function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

/** Computes a SHA-256 content hash for artifact metadata. */
export function contentHash(content: Buffer | string): string {
  return createHash("sha256").update(content).digest("hex");
}
