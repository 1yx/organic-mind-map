import type { SurfacePreset, SurfaceSpec } from "./types";

/**
 * MVP bounded surface presets.
 *
 * Each preset defines a landscape surface ratio for the preview viewport.
 * The sqrt2-landscape ratio (~1.414:1) matches the familiar A-series paper proportion
 * without implying physical print dimensions.
 */
export const SURFACE_PRESETS: Record<
  SurfacePreset,
  { width: number; height: number }
> = {
  "sqrt2-landscape": { width: 4200, height: 2970 },
};

/**
 * Built-in center visual assets available in Phase 1.
 *
 * The renderer owns the actual SVG/template registry. Core validation keeps a
 * matching ID allowlist so .omm files cannot reference arbitrary built-in IDs.
 */
export const BUILTIN_ASSET_IDS = ["mandala-colorful"] as const;

export type BuiltinAssetId = (typeof BUILTIN_ASSET_IDS)[number];

export const BUILTIN_ASSET_ID_SET: ReadonlySet<string> = new Set(
  BUILTIN_ASSET_IDS,
);

/**
 * Returns the canonical SurfaceSpec for a given surface preset.
 * @throws Error if the surface preset is not supported.
 */
export function getSurfaceSpec(preset: SurfacePreset): SurfaceSpec {
  const spec = SURFACE_PRESETS[preset];
  if (!spec) throw new Error(`Unknown surface preset: ${preset}`);
  return { preset, aspectRatio: spec.width / spec.height };
}
