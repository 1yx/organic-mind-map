/**
 * Phase 1 .omm Validation — web font safety.
 *
 * Fails fast on any document that contains URL-based font references.
 * Only system-safe font family values are allowed. Any fontFamily
 * field containing a URL (http://, https://, data:, @font-face) or
 * unknown font value is rejected immediately.
 *
 * Per the fixture-coverage-gaps design decision:
 * "Use Fail Fast strategy — reject through strict schema rather than
 *  normalizing forbidden font declarations."
 */

import type { OmmValidationIssue } from "./types";

/** Allowed system-safe font family values. */
const ALLOWED_FONT_VALUES = [
  "sans-serif",
  "serif",
  "system-ui",
  "monospace",
  "cursive",
  "fantasy",
] as const;

const ALLOWED_FONT_SET: Set<string> = new Set(ALLOWED_FONT_VALUES);

/** Patterns that indicate a URL-based or unsafe font reference. */
const UNSAFE_FONT_PATTERNS = [
  /^https?:\/\//i,
  /^data:/i,
  /@font-face/i,
  /\.woff2?/i,
  /\.ttf/i,
  /\.eot/i,
  /\.otf/i,
  /url\s*\(/i,
] as const;

/**
 * Check a fontFamily value for URL-based or unsafe references.
 * Returns true if the value is safe, false if it should be rejected.
 */
function isFontFamilySafe(value: string): boolean {
  if (ALLOWED_FONT_SET.has(value)) {
    return true;
  }
  for (const pattern of UNSAFE_FONT_PATTERNS) {
    if (pattern.test(value)) {
      return false;
    }
  }
  // Any non-allowlisted font family value is rejected (fail-fast)
  return false;
}

/**
 * Recursively check an object for fontFamily fields containing unsafe values.
 * Walks into nested objects and arrays.
 */
function checkObjectForFontSafety(
  obj: unknown,
  path: string,
): OmmValidationIssue[] {
  const issues: OmmValidationIssue[] = [];

  if (!obj || typeof obj !== "object") return issues;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      issues.push(...checkObjectForFontSafety(obj[i], `${path}[${i}]`));
    }
    return issues;
  }

  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key === "fontFamily" && typeof record[key] === "string") {
      const value = record[key] as string;
      if (!isFontFamilySafe(value)) {
        issues.push({
          path: `${path}.fontFamily`,
          message: `Forbidden font declaration: "${value}". Only system-safe fonts are allowed: sans-serif, serif, system-ui, monospace, cursive, fantasy`,
          code: "font_safety.forbidden_font",
        });
      }
    }
    if (typeof record[key] === "object" && record[key] !== null) {
      issues.push(...checkObjectForFontSafety(record[key], `${path}.${key}`));
    }
  }

  return issues;
}

/**
 * Validate that the document contains no forbidden web font declarations.
 * Checks all nested objects for fontFamily fields with URL-based values
 * or non-allowlisted font families.
 */
export function validateFontSafety(doc: unknown): OmmValidationIssue[] {
  if (!doc || typeof doc !== "object") return [];
  return checkObjectForFontSafety(doc, "");
}
