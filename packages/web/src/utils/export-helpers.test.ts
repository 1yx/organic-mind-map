/**
 * Tests for export helper utilities.
 *
 * Covers:
 * - resolveExportCenterVisual: returns inline SVG or null
 * - isCenterVisualSafeForExport: safety checks for PNG export
 */

import { describe, it, expect } from "vitest";
import {
  resolveExportCenterVisual,
  isCenterVisualSafeForExport,
} from "./export-helpers";

describe("resolveExportCenterVisual", () => {
  it("returns inline SVG when loaded", () => {
    const svg = "<svg><circle/></svg>";
    expect(resolveExportCenterVisual(svg)).toBe(svg);
  });

  it("returns null when no inline SVG is available (fallback)", () => {
    expect(resolveExportCenterVisual(null)).toBeNull();
  });
});

describe("isCenterVisualSafeForExport", () => {
  it("returns true when inline SVG is loaded", () => {
    expect(isCenterVisualSafeForExport("<svg/>", false)).toBe(true);
  });

  it("returns true when using built-in fallback", () => {
    expect(isCenterVisualSafeForExport(null, true)).toBe(true);
  });

  it("returns false when neither loaded SVG nor fallback", () => {
    expect(isCenterVisualSafeForExport(null, false)).toBe(false);
  });
});
