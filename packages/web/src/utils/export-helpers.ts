/**
 * Export utilities for ensuring self-contained .omm documents.
 *
 * When exporting a .omm document, the center visual must be self-contained:
 * - If a controlled SVG was successfully loaded and rendered, its inline SVG
 *   content is embedded in the document.
 * - If the SVG failed to load or was rejected, the document uses the
 *   deterministic built-in fallback representation.
 *
 * PNG export must NOT draw uncontrolled external image elements. Since the
 * renderer only renders from inline SVG content or built-in fallbacks
 * (never from live URLs), PNG export is inherently safe.
 */

/**
 * Resolve the center visual for export.
 *
 * Returns the inline SVG content if available, or null indicating that
 * the built-in fallback should be used for the exported document.
 *
 * This ensures exported .omm documents remain self-contained and do not
 * depend on external URL-only center visuals.
 */
export function resolveExportCenterVisual(
  loadedInlineSvg: string | null,
): string | null {
  return loadedInlineSvg;
}

/**
 * Check whether a center visual is safe for PNG export.
 *
 * A center visual is safe for PNG export if:
 * - It was loaded as inline SVG content (not a URL reference)
 * - Or it uses the built-in fallback
 *
 * External URL references should never reach the export stage because
 * the browser renderer loads and validates SVGs before rendering.
 */
export function isCenterVisualSafeForExport(
  loadedInlineSvg: string | null,
  /** Whether the visual came from the built-in fallback */
  usedFallback: boolean,
): boolean {
  // Safe if we have inline content (already vetted by svg-loader guard)
  if (loadedInlineSvg !== null) return true;
  // Safe if using built-in fallback
  if (usedFallback) return true;
  // Unsafe: neither loaded SVG nor fallback (shouldn't happen)
  return false;
}
