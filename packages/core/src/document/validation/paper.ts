import type { OmmValidationIssue } from "./types";
import { PAPER_SPECS } from "../constants";
import type { PaperKind } from "../types";

/**
 * Validates paper specification.
 *
 * - `paper.kind` must be a supported PaperKind.
 * - `paper.widthMm` / `paper.heightMm` must match canonical dimensions.
 */
export function validatePaper(paper: unknown, path = "paper"): OmmValidationIssue[] {
  const issues: OmmValidationIssue[] = [];

  if (!paper || typeof paper !== "object") {
    issues.push({ path, message: "Paper must be an object", code: "paper.missing" });
    return issues;
  }

  const p = paper as Record<string, unknown>;
  const kind = p.kind;

  if (typeof kind !== "string" || !(kind in PAPER_SPECS)) {
    issues.push({
      path: `${path}.kind`,
      message: `Unsupported paper kind: "${String(kind)}". Supported kinds: ${Object.keys(PAPER_SPECS).join(", ")}`,
      code: "paper.unsupported_kind",
    });
    return issues;
  }

  const canonical = PAPER_SPECS[kind as PaperKind];

  if (p.widthMm !== canonical.widthMm) {
    issues.push({
      path: `${path}.widthMm`,
      message: `widthMm must be ${canonical.widthMm} for ${kind}, got ${p.widthMm}`,
      code: "paper.invalid_width",
    });
  }

  if (p.heightMm !== canonical.heightMm) {
    issues.push({
      path: `${path}.heightMm`,
      message: `heightMm must be ${canonical.heightMm} for ${kind}, got ${p.heightMm}`,
      code: "paper.invalid_height",
    });
  }

  return issues;
}
