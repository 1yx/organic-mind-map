import type { OmmValidationIssue } from "./types";
import type { CenterVisual, CenterVisualMode, ComplianceState } from "../types";

const VALID_MODES: readonly CenterVisualMode[] = [
  "image",
  "styled-text",
  "hybrid",
] as const;
const VALID_STATES: readonly ComplianceState[] = [
  "draft",
  "needs-visuals",
  "compliant",
] as const;

/**
 * Validates the center visual object.
 *
 * - Must be an object (not a plain string).
 * - Must have required fields: mode, titleText, minColorCount, complianceState.
 * - minColorCount >= 2 when complianceState is "compliant".
 * - Referenced built-in assets are noted (full resolution deferred to assets validator).
 */
export function validateCenterVisual(
  center: unknown,
  path = "rootMap.center",
): OmmValidationIssue[] {
  const issues: OmmValidationIssue[] = [];

  if (typeof center === "string") {
    issues.push({
      path,
      message: "Center visual must be an object, not a plain string",
      code: "center_visual.plain_text",
    });
    return issues;
  }

  if (!center || typeof center !== "object") {
    issues.push({
      path,
      message: "Center visual must be an object",
      code: "center_visual.missing",
    });
    return issues;
  }

  const cv = center as Record<string, unknown>;

  // mode
  if (
    typeof cv.mode !== "string" ||
    !VALID_MODES.includes(cv.mode as CenterVisualMode)
  ) {
    issues.push({
      path: `${path}.mode`,
      message: `Invalid mode "${String(cv.mode)}". Must be one of: ${VALID_MODES.join(", ")}`,
      code: "center_visual.invalid_mode",
    });
  }

  // titleText
  if (
    typeof cv.titleText !== "string" ||
    (cv.titleText as string).length === 0
  ) {
    issues.push({
      path: `${path}.titleText`,
      message: "titleText must be a non-empty string",
      code: "center_visual.missing_titleText",
    });
  }

  // minColorCount
  if (typeof cv.minColorCount !== "number") {
    issues.push({
      path: `${path}.minColorCount`,
      message: "minColorCount must be a number",
      code: "center_visual.invalid_minColorCount",
    });
  } else {
    // complianceState validation (only check the rule if complianceState is present and valid)
    if (
      typeof cv.complianceState === "string" &&
      VALID_STATES.includes(cv.complianceState as ComplianceState) &&
      cv.complianceState === "compliant" &&
      (cv.minColorCount as number) < 2
    ) {
      issues.push({
        path: `${path}.minColorCount`,
        message:
          "minColorCount must be >= 2 when complianceState is 'compliant'",
        code: "center_visual.insufficient_colors",
      });
    }
  }

  // complianceState
  if (
    typeof cv.complianceState !== "string" ||
    !VALID_STATES.includes(cv.complianceState as ComplianceState)
  ) {
    issues.push({
      path: `${path}.complianceState`,
      message: `Invalid complianceState "${String(cv.complianceState)}". Must be one of: ${VALID_STATES.join(", ")}`,
      code: "center_visual.invalid_complianceState",
    });
  }

  return issues;
}

/**
 * Collects asset IDs referenced by the center visual.
 */
export function collectCenterAssetIds(center: unknown): string[] {
  const ids: string[] = [];
  if (center && typeof center === "object") {
    const cv = center as Record<string, unknown>;
    if (cv.imageRef && typeof cv.imageRef === "object") {
      const ref = cv.imageRef as Record<string, unknown>;
      if (typeof ref.assetId === "string") {
        ids.push(ref.assetId);
      }
    }
  }
  return ids;
}
