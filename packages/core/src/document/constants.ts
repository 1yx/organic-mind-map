import type { PaperKind, PaperSpec } from "./types";

/**
 * Canonical paper specifications for supported formats.
 * All dimensions are in millimeters.
 */
export const PAPER_SPECS: Record<PaperKind, { widthMm: number; heightMm: number }> = {
  "a3-landscape": { widthMm: 420, heightMm: 297 },
  "a4-landscape": { widthMm: 297, heightMm: 210 },
};

/**
 * Returns the canonical PaperSpec for a given paper kind.
 * @throws Error if the paper kind is not supported.
 */
export function getPaperSpec(kind: PaperKind): PaperSpec {
  const spec = PAPER_SPECS[kind];
  if (!spec) throw new Error(`Unknown paper kind: ${kind}`);
  return { kind, ...spec };
}
