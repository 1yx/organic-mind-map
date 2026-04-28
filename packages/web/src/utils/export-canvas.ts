/**
 * Canvas-based PNG export utilities.
 *
 * Converts a serialized SVG string into a PNG image via Canvas 2D.
 *
 * Tasks covered:
 * - 3.1: Convert serialized SVG into a Blob URL or data URL (in svg-serialization.ts)
 * - 3.2: Draw the SVG image into a browser canvas
 * - 3.3: Preserve A3/A4 landscape aspect ratio in the canvas dimensions
 * - 3.4: Derive canvas physical dimensions from container size, devicePixelRatio, and memory safety
 * - 3.5: Avoid forcing canvas dimensions to equal the full logical SVG viewBox size
 * - 3.6: Reduce scale or report a local error when canvas exceeds safe browser limits
 * - 3.7: Convert canvas with toBlob("image/png") and trigger download
 */

import {
  svgToBlobUrl,
  revokeBlobUrl,
} from "./svg-serialization.js";
import type { ExportCanvasOptions } from "./export-canvas-types.js";

// ─── Paper Aspect Ratios ─────────────────────────────────────────────────

/** Paper aspect ratios (width / height) for landscape orientations. */
const PAPER_ASPECT_RATIOS: Record<string, number> = {
  "a3-landscape": 420 / 297,
  "a4-landscape": 297 / 210,
};

const DEFAULT_ASPECT_RATIO = 420 / 297; // A3 landscape fallback

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

export interface CanvasDimensions {
  /** Canvas width in CSS pixels. */
  width: number;
  /** Canvas height in CSS pixels. */
  height: number;
  /** The scale factor applied (DPR × adjustment). */
  scaleFactor: number;
}

/**
 * Calculate safe canvas dimensions preserving paper aspect ratio.
 *
 * Tasks 3.3-3.6: Derive dimensions from container size and DPR,
 * preserve paper ratio, avoid exceeding browser limits.
 *
 * @param containerWidth - The visible container width in CSS pixels
 * @param containerHeight - The visible container height in CSS pixels
 * @param paperKind - The paper size (e.g. "a3-landscape", "a4-landscape")
 * @param options - Optional export configuration
 * @returns Canvas dimensions, or an error message if limits are exceeded
 */
export function calculateCanvasDimensions(
  containerWidth: number,
  containerHeight: number,
  paperKind?: string,
  options?: ExportCanvasOptions,
): CanvasDimensions | { error: string } {
  const aspectRatio =
    (paperKind ? PAPER_ASPECT_RATIOS[paperKind] : undefined) ??
    DEFAULT_ASPECT_RATIO;

  const dpr =
    options?.devicePixelRatio ??
    (typeof window !== "undefined" ? window.devicePixelRatio : undefined) ??
    1;
  // Clamp DPR to reasonable range
  const clampedDpr = Math.max(1, Math.min(dpr, 3));

  // Use the actual container dimensions as the base
  const baseWidth = containerWidth;
  const baseHeight = containerHeight;

  // Apply DPR
  let canvasWidth = Math.round(baseWidth * clampedDpr);
  let canvasHeight = Math.round(baseHeight * clampedDpr);

  // Adjust to match paper aspect ratio while fitting within container
  // We fit the paper ratio into the container (letterbox approach)
  const containerRatio = baseWidth / baseHeight;
  let fitWidth: number;
  let fitHeight: number;

  if (containerRatio > aspectRatio) {
    // Container is wider than paper — fit by height
    fitHeight = baseHeight;
    fitWidth = baseHeight * aspectRatio;
  } else {
    // Container is taller than paper — fit by width
    fitWidth = baseWidth;
    fitHeight = baseWidth / aspectRatio;
  }

  canvasWidth = Math.round(fitWidth * clampedDpr);
  canvasHeight = Math.round(fitHeight * clampedDpr);

  // Enforce safe limits (task 3.6)
  const totalPixels = canvasWidth * canvasHeight;

  if (canvasWidth > MAX_CANVAS_DIMENSION || canvasHeight > MAX_CANVAS_DIMENSION) {
    // Reduce scale to fit within dimension limit
    const scaleDown = Math.min(
      MAX_CANVAS_DIMENSION / canvasWidth,
      MAX_CANVAS_DIMENSION / canvasHeight,
    );
    canvasWidth = Math.round(canvasWidth * scaleDown);
    canvasHeight = Math.round(canvasHeight * scaleDown);
  }

  // Check pixel count after dimension adjustment
  if (canvasWidth * canvasHeight > MAX_CANVAS_PIXELS) {
    // Further reduce to stay within pixel budget
    const pixelScaleDown = Math.sqrt(MAX_CANVAS_PIXELS / (canvasWidth * canvasHeight));
    canvasWidth = Math.round(canvasWidth * pixelScaleDown);
    canvasHeight = Math.round(canvasHeight * pixelScaleDown);
  }

  // Final safety check
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

      // White background (paper)
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
export function downloadPngBlob(blob: Blob, filename: string = "mind-map"): void {
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

export interface ExportPngResult {
  success: true;
  filename: string;
}

export interface ExportPngError {
  success: false;
  error: string;
}

export type ExportPngOutcome = ExportPngResult | ExportPngError;

/**
 * Full PNG export pipeline.
 *
 * 1. Calculate canvas dimensions from container and paper ratio
 * 2. Draw serialized SVG onto canvas
 * 3. Convert canvas to PNG
 * 4. Trigger download
 *
 * @param svgString - The serialized, self-contained SVG string
 * @param containerWidth - The preview container width in CSS pixels
 * @param containerHeight - The preview container height in CSS pixels
 * @param paperKind - The paper kind for aspect ratio
 * @param options - Optional export configuration
 * @returns Export result or error
 */
export async function exportPng(
  svgString: string,
  containerWidth: number,
  containerHeight: number,
  paperKind?: string,
  options?: ExportCanvasOptions & { filename?: string },
): Promise<ExportPngOutcome> {
  // Calculate safe dimensions (tasks 3.3-3.6)
  const dims = calculateCanvasDimensions(
    containerWidth,
    containerHeight,
    paperKind,
    options,
  );

  if ("error" in dims) {
    return { success: false, error: dims.error };
  }

  // Draw SVG to canvas (task 3.2)
  const drawResult = await drawSvgToCanvas(
    svgString,
    dims.width,
    dims.height,
  );

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
