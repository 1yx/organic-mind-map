import type { OmmValidationIssue } from "./types";

/**
 * Validates the document envelope (top-level required fields).
 *
 * Required fields: id, version (must be 1), title, paper, organicSeed,
 * rootMap, layout, assets, meta.
 *
 * organicSeed must be a non-empty string.
 * rootMap must be a single object, not an array.
 */

function ensureObject(
  doc: Record<string, unknown>,
  field: string,
  issues: OmmValidationIssue[],
): void {
  if (!doc[field] || typeof doc[field] !== "object") {
    issues.push({
      path: field,
      message: `"${field}" must be an object`,
      code: `envelope.missing_${field}`,
    });
  }
}

function validateRequiredStrings(
  doc: Record<string, unknown>,
  issues: OmmValidationIssue[],
): void {
  for (const field of ["id", "title", "organicSeed"] as const) {
    if (typeof doc[field] !== "string" || (doc[field] as string).length === 0) {
      issues.push({
        path: field,
        message: `"${field}" must be a non-empty string`,
        code: `envelope.missing_${field}`,
      });
    }
  }
}

function validateVersion(
  doc: Record<string, unknown>,
  issues: OmmValidationIssue[],
): void {
  if (doc.version !== 1) {
    issues.push({
      path: "version",
      message: `Document version must be 1, got ${doc.version}`,
      code: "envelope.invalid_version",
    });
  }
}

function validateRootMap(
  doc: Record<string, unknown>,
  issues: OmmValidationIssue[],
): void {
  if (Array.isArray(doc.rootMap)) {
    issues.push({
      path: "rootMap",
      message: "rootMap must be a single object, not an array",
      code: "envelope.multiple_maps",
    });
  } else if (!doc.rootMap || typeof doc.rootMap !== "object") {
    issues.push({
      path: "rootMap",
      message: `"rootMap" must be an object`,
      code: "envelope.missing_rootMap",
    });
  }
}

export function validateEnvelope(doc: unknown): OmmValidationIssue[] {
  const issues: OmmValidationIssue[] = [];

  if (!doc || typeof doc !== "object") {
    issues.push({
      path: "",
      message: "Document must be an object",
      code: "envelope.missing",
    });
    return issues;
  }

  const d = doc as Record<string, unknown>;

  validateRequiredStrings(d, issues);
  validateVersion(d, issues);
  validateRootMap(d, issues);

  for (const field of ["paper", "layout", "assets", "meta"] as const) {
    ensureObject(d, field, issues);
  }

  return issues;
}
