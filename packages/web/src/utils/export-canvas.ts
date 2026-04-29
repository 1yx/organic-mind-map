/**
 * Canvas-based PNG export utilities.
 *
 * Converts a serialized SVG string into a PNG image via Canvas 2D.
 *
 * Tasks covered:
 * - 3.1: Convert serialized SVG into a Blob URL or data URL (in svg-serialization.ts)
 * - 3.2: Draw the SVG image into a browser canvas
 * - 3.3: Preserve bounded surface aspect ratio in the canvas dimensions
 * - 3.4: Derive canvas physical dimensions from container size, devicePixelRatio, and memory safety
 * - 3.5: Avoid forcing canvas dimensions to equal the full logical SVG viewBox size
 * - 3.6: Reduce scale or report a local error when canvas exceeds safe browser limits
 * - 3.7: Convert canvas with toBlob("image/png") and trigger download
 */

import { svgToBlobUrl, revokeBlobUrl } from "./svg-serialization.js";
import type { ExportCanvasOptions } from "./export-canvas-types.js";

// ─── Surface Aspect Ratios ────────────────────────────────────────────────

/** Default MVP surface aspect ratio (sqrt2-landscape ≈ 1.414). */
const DEFAULT_SURFACE_ASPECT = Math.SQRT2;

// ─── Safe Canvas Limits ──────────────────────────────────────────────────

/**
 * Maximum canvas dimension (width or height) in CSS pixels.
 *
 * Most browsers limit canvas to ~16384px on each side (varies by GPU/memory).
 * We use a conservative limit to avoid silent failures.
 */
const MAX_CANVAS_DIMENSION = 16384;

/**
 * Maximum total pixel count (width × height) for the canvas.
 *
 * Safari on macOS limits to ~16M pixels, Chrome to ~268M pixels.
 * We use a safe middle ground.
 */
const MAX_CANVAS_PIXELS = 67_108_864; // 8192 × 8192 = ~67M pixels

// ─── Canvas Dimension Calculation ────────────────────────────────────────

export type CanvasDimensions = {
  /** Canvas width in CSS pixels. */
  width: number;
  /** Canvas height in CSS pixels. */
  height: number;
  /** The scale factor applied (DPR × adjustment). */
  scaleFactor: number;
};

/**
 * Resolve effective DPR from options or window, clamped to [1, 3].
 */
function resolveDpr(options?: ExportCanvasOptions): number {
  const raw =
    options?.devicePixelRatio ??
    (typeof window !== "undefined" ? window.devicePixelRatio : undefined) ??
    1;
  return Math.max(1, Math.min(raw, 3));
}

/**
 * Fit a rectangle into the container while preserving the target aspect ratio.
 * Returns the fitted width and height (before DPR scaling).
 */
function fitToAspectRatio(
  containerWidth: number,
  containerHeight: number,
  aspectRatio: number,
): { fitWidth: number; fitHeight: number } {
  if (containerWidth / containerHeight > aspectRatio) {
    return {
      fitHeight: containerHeight,
      fitWidth: containerHeight * aspectRatio,
    };
  }
  return { fitWidth: containerWidth, fitHeight: containerWidth / aspectRatio };
}

/**
 * Clamp canvas dimensions to stay within the maximum pixel dimension limit.
 */
function clampToMaxDimension(width: number, height: number): number[] {
  if (width <= MAX_CANVAS_DIMENSION && height <= MAX_CANVAS_DIMENSION) {
    return [width, height];
  }
  const scale = Math.min(
    MAX_CANVAS_DIMENSION / width,
    MAX_CANVAS_DIMENSION / height,
  );
  return [Math.round(width * scale), Math.round(height * scale)];
}

/**
 * Clamp canvas dimensions to stay within the maximum pixel count budget.
 */
function clampToMaxPixels(width: number, height: number): number[] {
  if (width * height <= MAX_CANVAS_PIXELS) {
    return [width, height];
  }
  const scale = Math.sqrt(MAX_CANVAS_PIXELS / (width * height));
  return [Math.round(width * scale), Math.round(height * scale)];
}

export type CalculateCanvasDimensionsOptions = {
  /** The visible container width in CSS pixels. */
  containerWidth: number;
  /** The visible container height in CSS pixels. */
  containerHeight: number;
  /** Explicit aspect ratio override. Defaults to MVP surface ratio. */
  aspectRatio?: number;
  /** Optional export configuration. */
  options?: ExportCanvasOptions;
};

/**
 * Calculate safe canvas dimensions preserving surface aspect ratio.
 *
 * Tasks 3.3-3.6: Derive dimensions from container and DPR,
 * preserve surface ratio, avoid exceeding browser limits.
 */
export function calculateCanvasDimensions(
  dims: CalculateCanvasDimensionsOptions,
): CanvasDimensions | { error: string } {
  const { containerWidth, containerHeight, aspectRatio, options } = dims;
  const effectiveRatio = aspectRatio ?? DEFAULT_SURFACE_ASPECT;

  const dpr = resolveDpr(options);
  const { fitWidth, fitHeight } = fitToAspectRatio(
    containerWidth,
    containerHeight,
    effectiveRatio,
  );

  let [canvasWidth, canvasHeight] = clampToMaxDimension(
    Math.round(fitWidth * dpr),
    Math.round(fitHeight * dpr),
  );
  [canvasWidth, canvasHeight] = clampToMaxPixels(canvasWidth, canvasHeight);

  if (canvasWidth < 1 || canvasHeight < 1) {
    return { error: "Canvas dimensions too small after safety adjustments." };
  }

  return {
    width: canvasWidth,
    height: canvasHeight,
    scaleFactor: canvasWidth / fitWidth,
  };
}

// ─── SVG to Canvas ───────────────────────────────────────────────────────

/**
 * Draw a serialized SVG onto a canvas at the specified dimensions.
 *
 * Task 3.2: Draw the SVG image into a browser canvas.
 *
 * @param svgString - The serialized, self-contained SVG string
 * @param width - Canvas width in pixels
 * @param height - Canvas height in pixels
 * @returns The canvas element, or an error message
 */
export function drawSvgToCanvas(
  svgString: string,
  width: number,
  height: number,
): Promise<{ canvas: HTMLCanvasElement } | { error: string }> {
  return new Promise((resolve) => {
    const blobUrl = svgToBlobUrl(svgString);

    if (!blobUrl) {
      resolve({ error: "Failed to create SVG Blob URL." });
      return;
    }

    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        revokeBlobUrl(blobUrl);
        resolve({ error: "Browser does not support Canvas 2D context." });
        return;
      }

      // White background (surface)
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);

      // Draw SVG scaled to fill canvas
      ctx.drawImage(img, 0, 0, width, height);
      revokeBlobUrl(blobUrl);
      resolve({ canvas });
    };

    img.onerror = () => {
      revokeBlobUrl(blobUrl);
      resolve({ error: "Failed to load SVG image for canvas rendering." });
    };

    img.src = blobUrl;
  });
}

// ─── PNG Download ────────────────────────────────────────────────────────

/**
 * Convert a canvas to a PNG Blob.
 *
 * Task 3.7: Convert canvas with toBlob("image/png").
 */
export function canvasToPngBlob(
  canvas: HTMLCanvasElement,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      "image/png",
      1.0,
    );
  });
}

/**
 * Trigger a browser download of a Blob as a PNG file.
 *
 * Task 3.7: Trigger a local download.
 *
 * @param blob - The PNG Blob to download
 * @param filename - The download filename (without extension)
 */
export function downloadPngBlob(
  blob: Blob,
  filename: string = "mind-map",
): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Full Export Pipeline ─────────────────────────────────────────────────

export type ExportPngResult = {
  success: true;
  filename: string;
};

export type ExportPngError = {
  success: false;
  error: string;
};

export type ExportPngOutcome = ExportPngResult | ExportPngError;

export type ExportPngOptions = {
  /** The serialized, self-contained SVG string. */
  svgString: string;
  /** The preview container width in CSS pixels. */
  containerWidth: number;
  /** The preview container height in CSS pixels. */
  containerHeight: number;
  /** Explicit surface aspect ratio. Defaults to MVP sqrt2-landscape ratio. */
  aspectRatio?: number;
  /** Optional export configuration. */
  exportOptions?: ExportCanvasOptions & { filename?: string };
};

/**
 * Full PNG export pipeline.
 *
 * 1. Calculate canvas dimensions from container and surface ratio
 * 2. Draw serialized SVG onto canvas
 * 3. Convert canvas to PNG
 * 4. Trigger download
 */
export async function exportPng(
  opts: ExportPngOptions,
): Promise<ExportPngOutcome> {
  const {
    svgString,
    containerWidth,
    containerHeight,
    aspectRatio,
    exportOptions: options,
  } = opts;
  // Calculate safe dimensions (tasks 3.3-3.6)
  const dims = calculateCanvasDimensions({
    containerWidth,
    containerHeight,
    aspectRatio,
    options,
  });

  if ("error" in dims) {
    return { success: false, error: dims.error };
  }

  // Draw SVG to canvas (task 3.2)
  const drawResult = await drawSvgToCanvas(svgString, dims.width, dims.height);

  if ("error" in drawResult) {
    return { success: false, error: drawResult.error };
  }

  // Convert to PNG blob (task 3.7)
  const blob = await canvasToPngBlob(drawResult.canvas);
  if (!blob) {
    return {
      success: false,
      error: "Canvas toBlob conversion failed.",
    };
  }

  // Download (task 3.7)
  const filename = options?.filename ?? "mind-map";
  downloadPngBlob(blob, filename);

  return { success: true, filename: `${filename}.png` };
}
