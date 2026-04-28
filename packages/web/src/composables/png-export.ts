/**
 * PNG export composable for the Web preview.
 *
 * Provides reactive state and methods for the Export PNG button:
 * - Export readiness (disabled until SVG + assets are ready)
 * - Export trigger with error handling
 * - Loading state during export
 *
 * Tasks covered:
 * - 1.1: Export PNG control integration
 * - 1.2: Disable or guard the control until preview SVG and assets are ready
 * - 1.3: Show simple local export errors
 * - 4.1-4.6: Asset readiness enforcement (built-in assets, no Web Fonts)
 * - 5.1: Keep PNG export in the Web preview code path
 */

import { ref, computed, type Ref } from "vue";
import { prepareSvgForExport } from "../utils/svg-serialization.js";
import { exportPng } from "../utils/export-canvas.js";
import {
  isCenterVisualSafeForExport,
} from "../utils/export-helpers.js";
import type { ExportCanvasOptions } from "../utils/export-canvas-types.js";

export type PngExportState = {
  /** Whether the export is currently in progress. */
  exporting: Readonly<Ref<boolean>>;
  /** Error message from the last failed export, or null. */
  exportError: Readonly<Ref<string | null>>;
  /** Whether the Export PNG button should be enabled. */
  canExport: Readonly<Ref<boolean>>;
  /**
   * Trigger PNG export.
   *
   * @param container - The DOM element holding the rendered SVG
   * @param containerWidth - Container width in CSS pixels
   * @param containerHeight - Container height in CSS pixels
   * @param paperKind - Paper kind for aspect ratio
   * @param options - Optional export configuration
   */
  doExport: (
    container: HTMLElement,
    containerWidth: number,
    containerHeight: number,
    paperKind?: string,
    options?: ExportCanvasOptions & { filename?: string },
  ) => Promise<void>;
};

/**
 * Create PNG export state for the preview page.
 *
 * @param params - Reactive state from the preview
 * @returns Reactive export state and action
 */
export function usePngExport(params: {
  /** Whether the preview has rendered successfully. */
  renderReady: Readonly<Ref<boolean>>;
  /** The loaded inline SVG for the center visual (null = not loaded). */
  inlineSvg: Readonly<Ref<string | null>>;
  /** Whether the center visual fell back to built-in. */
  fellBack: Readonly<Ref<boolean>>;
}): PngExportState {
  const exporting = ref(false);
  const exportError = ref<string | null>(null);

  /**
   * Export is ready when:
   * - Preview has rendered (renderReady)
   * - Center visual is safe for export (tasks 4.1-4.3)
   * - Not already exporting
   */
  const canExport = computed(() => {
    if (exporting.value) return false;
    if (!params.renderReady.value) return false;

    // Check center visual safety (task 4.2)
    const safe = isCenterVisualSafeForExport(
      params.inlineSvg.value,
      params.fellBack.value,
    );
    if (!safe) return false;

    return true;
  });

  async function doExport(
    container: HTMLElement,
    containerWidth: number,
    containerHeight: number,
    paperKind?: string,
    options?: ExportCanvasOptions & { filename?: string },
  ): Promise<void> {
    if (!canExport.value) return;

    exporting.value = true;
    exportError.value = null;

    try {
      // Prepare SVG: clone, inline assets, serialize
      const { svg, error: prepareError } =
        await prepareSvgForExport(container);

      if (prepareError || !svg) {
        exportError.value = prepareError ?? "SVG preparation failed.";
        return;
      }

      // Export to PNG via canvas pipeline
      const result = await exportPng(
        svg,
        containerWidth,
        containerHeight,
        paperKind,
        options,
      );

      if (!result.success) {
        exportError.value = result.error;
      }
      // On success, the download has been triggered automatically
    } catch (e) {
      exportError.value =
        e instanceof Error ? e.message : "Export failed with an unexpected error.";
    } finally {
      exporting.value = false;
    }
  }

  return {
    exporting,
    exportError,
    canExport,
    doExport,
  };
}
