/**
 * Shared types for canvas-based PNG export.
 */

/**
 * Options for PNG export canvas dimension calculation.
 */
export type ExportCanvasOptions = {
  /**
   * Override for window.devicePixelRatio.
   * Used in tests or for explicit control.
   * Default: window.devicePixelRatio (clamped to 1–3).
   */
  devicePixelRatio?: number;
};
