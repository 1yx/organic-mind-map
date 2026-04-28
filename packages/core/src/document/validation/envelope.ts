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

  // Required string fields
  for (const field of ["id", "title", "organicSeed"] as const) {
    if (typeof d[field] !== "string" || (d[field] as string).length === 0) {
      issues.push({
        path: field,
        message: `"${field}" must be a non-empty string`,
        code: `envelope.missing_${field}`,
      });
    }
  }

  // Version must be 1
  if (d.version !== 1) {
    issues.push({
      path: "version",
      message: `Document version must be 1, got ${d.version}`,
      code: "envelope.invalid_version",
    });
  }

  // paper must be an object
  if (!d.paper || typeof d.paper !== "object") {
    issues.push({
      path: "paper",
      message: `"paper" must be an object`,
      code: "envelope.missing_paper",
    });
  }

  // rootMap must be an object (not array)
  if (Array.isArray(d.rootMap)) {
    issues.push({
      path: "rootMap",
      message: "rootMap must be a single object, not an array",
      code: "envelope.multiple_maps",
    });
  } else if (!d.rootMap || typeof d.rootMap !== "object") {
    issues.push({
      path: "rootMap",
      message: `"rootMap" must be an object`,
      code: "envelope.missing_rootMap",
    });
  }

  // layout must be an object
  if (!d.layout || typeof d.layout !== "object") {
    issues.push({
      path: "layout",
      message: `"layout" must be an object`,
      code: "envelope.missing_layout",
    });
  }

  // assets must be an object
  if (!d.assets || typeof d.assets !== "object") {
    issues.push({
      path: "assets",
      message: `"assets" must be an object`,
      code: "envelope.missing_assets",
    });
  }

  // meta must be an object
  if (!d.meta || typeof d.meta !== "object") {
    issues.push({
      path: "meta",
      message: `"meta" must be an object`,
      code: "envelope.missing_meta",
    });
  }

  return issues;
}
