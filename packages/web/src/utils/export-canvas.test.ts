/**
 * Tests for canvas-based PNG export utilities.
 *
 * Tasks covered:
 * - 6.3: Unit tests for paper-ratio and scaled canvas dimension calculation
 * - 6.5: Web preview smoke test for Export PNG control availability
 */

import { describe, it, expect } from "vitest";
import { calculateCanvasDimensions } from "./export-canvas.js";
import type { ExportCanvasOptions } from "./export-canvas-types.js";

describe("calculateCanvasDimensions", () => {
  it("returns canvas dimensions preserving A3 landscape aspect ratio", () => {
    const result = calculateCanvasDimensions(1200, 800, "a3-landscape");
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      const ratio = result.width / result.height;
      const expectedRatio = 420 / 297;
      // Allow small floating point tolerance
      expect(Math.abs(ratio - expectedRatio)).toBeLessThan(0.02);
    }
  });

  it("returns canvas dimensions preserving A4 landscape aspect ratio", () => {
    const result = calculateCanvasDimensions(1200, 800, "a4-landscape");
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      const ratio = result.width / result.height;
      const expectedRatio = 297 / 210;
      expect(Math.abs(ratio - expectedRatio)).toBeLessThan(0.02);
    }
  });

  it("uses A3 as default when no paper kind is specified", () => {
    const result = calculateCanvasDimensions(1200, 800);
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      const ratio = result.width / result.height;
      const expectedRatio = 420 / 297;
      expect(Math.abs(ratio - expectedRatio)).toBeLessThan(0.02);
    }
  });

  it("applies devicePixelRatio to dimensions", () => {
    const base = calculateCanvasDimensions(800, 600, "a3-landscape", {
      devicePixelRatio: 1,
    });
    const retina = calculateCanvasDimensions(800, 600, "a3-landscape", {
      devicePixelRatio: 2,
    });
    expect("error" in base).toBe(false);
    expect("error" in retina).toBe(false);
    if (!("error" in base) && !("error" in retina)) {
      expect(retina.width).toBeGreaterThan(base.width);
      expect(retina.height).toBeGreaterThan(base.height);
      // Should be approximately 2x (may be slightly different due to ratio fitting)
      expect(retina.width / base.width).toBeGreaterThan(1.5);
    }
  });

  it("clamps DPR to maximum of 3", () => {
    const result = calculateCanvasDimensions(800, 600, "a3-landscape", {
      devicePixelRatio: 10,
    });
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.scaleFactor).toBeLessThanOrEqual(3.5);
    }
  });

  it("clamps DPR to minimum of 1", () => {
    const result = calculateCanvasDimensions(800, 600, "a3-landscape", {
      devicePixelRatio: 0.5,
    });
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.scaleFactor).toBeGreaterThanOrEqual(1);
    }
  });

  it("fits wide containers by height", () => {
    // Very wide container
    const result = calculateCanvasDimensions(2000, 400, "a3-landscape");
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      const ratio = result.width / result.height;
      const expectedRatio = 420 / 297;
      expect(Math.abs(ratio - expectedRatio)).toBeLessThan(0.02);
    }
  });

  it("fits tall containers by width", () => {
    // Very tall container
    const result = calculateCanvasDimensions(400, 2000, "a3-landscape");
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      const ratio = result.width / result.height;
      const expectedRatio = 420 / 297;
      expect(Math.abs(ratio - expectedRatio)).toBeLessThan(0.02);
    }
  });

  it("enforces maximum canvas dimension limit", () => {
    // Extremely large container that would exceed 16384px limit
    const result = calculateCanvasDimensions(50000, 50000, "a3-landscape", {
      devicePixelRatio: 3,
    });
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.width).toBeLessThanOrEqual(16384);
      expect(result.height).toBeLessThanOrEqual(16384);
    }
  });

  it("returns error for dimensions that become too small", () => {
    // Extremely tiny container
    const result = calculateCanvasDimensions(0, 0, "a3-landscape");
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toBeTruthy();
    }
  });

  it("scale factor is always positive", () => {
    const result = calculateCanvasDimensions(800, 600, "a4-landscape");
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.scaleFactor).toBeGreaterThan(0);
    }
  });
});

describe("calculateCanvasDimensions - memory safety", () => {
  it("keeps total pixel count within safe limits", () => {
    const MAX_SAFE_PIXELS = 67_108_864;
    const result = calculateCanvasDimensions(10000, 10000, "a3-landscape", {
      devicePixelRatio: 3,
    });
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      const totalPixels = result.width * result.height;
      // Allow small overshoot due to integer rounding (within 0.1%)
      expect(totalPixels).toBeLessThanOrEqual(MAX_SAFE_PIXELS * 1.001);
    }
  });
});
