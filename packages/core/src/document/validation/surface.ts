import type { OmmValidationIssue } from "./types";
import { SURFACE_PRESETS } from "../constants";
import type { SurfacePreset } from "../types";

/**
 * Validates surface specification.
 *
 * - `surface.preset` must be a supported SurfacePreset.
 * - `surface.aspectRatio` must match the canonical ratio for the preset.
 */
export function validateSurface(
  surface: unknown,
  path = "surface",
): OmmValidationIssue[] {
  const issues: OmmValidationIssue[] = [];

  if (!surface || typeof surface !== "object") {
    issues.push({
      path,
      message: "Surface must be an object",
      code: "surface.missing",
    });
    return issues;
  }

  const s = surface as Record<string, unknown>;
  const preset = s.preset;

  if (typeof preset !== "string" || !(preset in SURFACE_PRESETS)) {
    issues.push({
      path: `${path}.preset`,
      message: `Unsupported surface preset: "${String(preset)}". Supported presets: ${Object.keys(SURFACE_PRESETS).join(", ")}`,
      code: "surface.unsupported_preset",
    });
    return issues;
  }

  const canonical = SURFACE_PRESETS[preset as SurfacePreset];
  const expectedRatio = canonical.width / canonical.height;

  if (
    typeof s.aspectRatio !== "number" ||
    Math.abs(s.aspectRatio - expectedRatio) > 0.001
  ) {
    issues.push({
      path: `${path}.aspectRatio`,
      message: `aspectRatio must be ${expectedRatio.toFixed(4)} for ${preset}, got ${s.aspectRatio}`,
      code: "surface.invalid_ratio",
    });
  }

  return issues;
}
