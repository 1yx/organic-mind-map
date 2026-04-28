import type { OmmValidationIssue } from "./types";

const REQUIRED_STRINGS = ["id", "title", "organicSeed"] as const;

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

  issues.push(...validateRequiredStrings(d));
  issues.push(...validateVersion(d));
  issues.push(...validateRequiredObject(d, "paper", "envelope.missing_paper"));
  issues.push(...validateRootMap(d));
  issues.push(
    ...validateRequiredObject(d, "layout", "envelope.missing_layout"),
  );
  issues.push(
    ...validateRequiredObject(d, "assets", "envelope.missing_assets"),
  );
  issues.push(...validateRequiredObject(d, "meta", "envelope.missing_meta"));

  return issues;
}

function validateRequiredStrings(
  d: Record<string, unknown>,
): OmmValidationIssue[] {
  const issues: OmmValidationIssue[] = [];
  for (const field of REQUIRED_STRINGS) {
    if (typeof d[field] !== "string" || (d[field] as string).length === 0) {
      issues.push({
        path: field,
        message: `"${field}" must be a non-empty string`,
        code: `envelope.missing_${field}`,
      });
    }
  }
  return issues;
}

function validateVersion(d: Record<string, unknown>): OmmValidationIssue[] {
  if (d.version !== 1) {
    return [
      {
        path: "version",
        message: `Document version must be 1, got ${d.version}`,
        code: "envelope.invalid_version",
      },
    ];
  }
  return [];
}

function validateRequiredObject(
  d: Record<string, unknown>,
  field: string,
  code: string,
): OmmValidationIssue[] {
  const value = d[field];
  if (!value || typeof value !== "object") {
    return [{ path: field, message: `"${field}" must be an object`, code }];
  }
  return [];
}

function validateRootMap(d: Record<string, unknown>): OmmValidationIssue[] {
  if (Array.isArray(d.rootMap)) {
    return [
      {
        path: "rootMap",
        message: "rootMap must be a single object, not an array",
        code: "envelope.multiple_maps",
      },
    ];
  }
  return validateRequiredObject(d, "rootMap", "envelope.missing_rootMap");
}
