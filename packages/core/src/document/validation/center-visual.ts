import type { OmmValidationIssue } from "./types";
import type { CenterVisualMode, ComplianceState } from "../types";

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

  issues.push(...validateMode(cv, path));
  issues.push(...validateTitleText(cv, path));
  issues.push(...validateColorCount(cv, path));
  issues.push(...validateComplianceState(cv, path));

  return issues;
}

function validateMode(
  cv: Record<string, unknown>,
  path: string,
): OmmValidationIssue[] {
  if (
    typeof cv.mode !== "string" ||
    !VALID_MODES.includes(cv.mode as CenterVisualMode)
  ) {
    return [
      {
        path: `${path}.mode`,
        message: `Invalid mode "${String(cv.mode)}". Must be one of: ${VALID_MODES.join(", ")}`,
        code: "center_visual.invalid_mode",
      },
    ];
  }
  return [];
}

function validateTitleText(
  cv: Record<string, unknown>,
  path: string,
): OmmValidationIssue[] {
  if (
    typeof cv.titleText !== "string" ||
    (cv.titleText as string).length === 0
  ) {
    return [
      {
        path: `${path}.titleText`,
        message: "titleText must be a non-empty string",
        code: "center_visual.missing_titleText",
      },
    ];
  }
  return [];
}

function validateColorCount(
  cv: Record<string, unknown>,
  path: string,
): OmmValidationIssue[] {
  if (typeof cv.minColorCount !== "number") {
    return [
      {
        path: `${path}.minColorCount`,
        message: "minColorCount must be a number",
        code: "center_visual.invalid_minColorCount",
      },
    ];
  }

  if (
    typeof cv.complianceState === "string" &&
    VALID_STATES.includes(cv.complianceState as ComplianceState) &&
    cv.complianceState === "compliant" &&
    (cv.minColorCount as number) < 2
  ) {
    return [
      {
        path: `${path}.minColorCount`,
        message:
          "minColorCount must be >= 2 when complianceState is 'compliant'",
        code: "center_visual.insufficient_colors",
      },
    ];
  }
  return [];
}

function validateComplianceState(
  cv: Record<string, unknown>,
  path: string,
): OmmValidationIssue[] {
  if (
    typeof cv.complianceState !== "string" ||
    !VALID_STATES.includes(cv.complianceState as ComplianceState)
  ) {
    return [
      {
        path: `${path}.complianceState`,
        message: `Invalid complianceState "${String(cv.complianceState)}". Must be one of: ${VALID_STATES.join(", ")}`,
        code: "center_visual.invalid_complianceState",
      },
    ];
  }
  return [];
}

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
