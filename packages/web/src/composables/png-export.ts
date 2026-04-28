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

import { ref, computed, type Ref, type ComputedRef } from "vue";
import { prepareSvgForExport } from "../utils/svg-serialization.js";
import { exportPng } from "../utils/export-canvas.js";
import { isCenterVisualSafeForExport } from "../utils/export-helpers.js";
import type { ExportCanvasOptions } from "../utils/export-canvas-types.js";

export type DoExportParams = {
  /** The DOM element holding the rendered SVG. */
  container: HTMLElement;
  /** Container width in CSS pixels. */
  containerWidth: number;
  /** Container height in CSS pixels. */
  containerHeight: number;
  /** Paper kind for aspect ratio. */
  paperKind?: string;
  /** Optional export configuration. */
  options?: ExportCanvasOptions & { filename?: string };
};

export type PngExportState = {
  /** Whether the export is currently in progress. */
  exporting: Readonly<Ref<boolean>>;
  /** Error message from the last failed export, or null. */
  exportError: Readonly<Ref<string | null>>;
  /** Whether the Export PNG button should be enabled. */
  canExport: Readonly<Ref<boolean>>;
  /** Trigger PNG export. */
  doExport: (params: DoExportParams) => Promise<void>;
};

/** Compute whether export is currently allowed. */
function computeCanExport(
  exporting: Ref<boolean>,
  params: {
    renderReady: Readonly<Ref<boolean>>;
    inlineSvg: Readonly<Ref<string | null>>;
    fellBack: Readonly<Ref<boolean>>;
  },
): ComputedRef<boolean> {
  return computed(() => {
    if (exporting.value) return false;
    if (!params.renderReady.value) return false;
    if (
      !isCenterVisualSafeForExport(
        params.inlineSvg.value,
        params.fellBack.value,
      )
    )
      return false;
    return true;
  });
}

export type ExportExecutionState = {
  canExport: ComputedRef<boolean>;
  exporting: Ref<boolean>;
  exportError: Ref<string | null>;
};

/** Execute the PNG export pipeline. */
async function executeExport(
  state: ExportExecutionState,
  params: DoExportParams,
): Promise<void> {
  if (!state.canExport.value) return;

  const { container, containerWidth, containerHeight, paperKind, options } =
    params;

  state.exporting.value = true;
  state.exportError.value = null;

  try {
    const { svg, error: prepareError } = await prepareSvgForExport(container);
    if (prepareError || !svg) {
      state.exportError.value = prepareError ?? "SVG preparation failed.";
      return;
    }

    const result = await exportPng({
      svgString: svg,
      containerWidth,
      containerHeight,
      paperKind,
      exportOptions: options,
    });

    if (!result.success) {
      state.exportError.value = (
        result as { success: false; error: string }
      ).error;
    }
  } catch (e) {
    state.exportError.value =
      e instanceof Error
        ? e.message
        : "Export failed with an unexpected error.";
  } finally {
    state.exporting.value = false;
  }
}

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
  const canExport = computeCanExport(exporting, params);

  async function doExport(doParams: DoExportParams): Promise<void> {
    await executeExport({ canExport, exporting, exportError }, doParams);
  }

  return { exporting, exportError, canExport, doExport };
}
