/**
 * Tests for export helper utilities.
 *
 * Covers:
 * - resolveExportCenterVisual: returns inline SVG or null
 * - isCenterVisualSafeForExport: safety checks for PNG export
 * - PNG export readiness/fallback edge cases (Task 3.3)
 */

import { describe, it, expect } from "vitest";
import {
  resolveExportCenterVisual,
  isCenterVisualSafeForExport,
} from "./export-helpers";

// ─── resolveExportCenterVisual ───────────────────────────────────────────────

describe("resolveExportCenterVisual", () => {
  it("returns inline SVG when loaded", () => {
    const svg = "<svg><circle/></svg>";
    expect(resolveExportCenterVisual(svg)).toBe(svg);
  });

  it("returns null when no inline SVG is available (fallback)", () => {
    expect(resolveExportCenterVisual(null)).toBeNull();
  });

  it("preserves complex inline SVG content exactly", () => {
    const complexSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <linearGradient id="g1">
          <stop offset="0%" stop-color="#333"/>
          <stop offset="100%" stop-color="#666"/>
        </linearGradient>
      </defs>
      <rect fill="url(#g1)" width="24" height="24"/>
    </svg>`;
    expect(resolveExportCenterVisual(complexSvg)).toBe(complexSvg);
  });

  it("handles empty string as truthy (treated as loaded content)", () => {
    // Empty string is technically loaded content (though invalid SVG)
    expect(resolveExportCenterVisual("")).toBe("");
  });
});

// ─── isCenterVisualSafeForExport ─────────────────────────────────────────────

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

  it("returns true for inline SVG even when fellBack is also true", () => {
    // Both conditions true — still safe because inline SVG is available
    expect(isCenterVisualSafeForExport("<svg/>", true)).toBe(true);
  });

  it("returns true for inline SVG with complex content", () => {
    const complexSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <clipPath id="clip1">
          <rect width="50" height="50"/>
        </clipPath>
      </defs>
      <rect clip-path="url(#clip1)" width="100" height="100" fill="blue"/>
    </svg>`;
    expect(isCenterVisualSafeForExport(complexSvg, false)).toBe(true);
  });
});

// ─── Task 3.3: PNG Export Readiness / Fallback Tests ─────────────────────────

describe("PNG export readiness — center visual state combinations (Task 3.3)", () => {
  /**
   * These tests enumerate all possible center visual states to ensure
   * export readiness is correctly determined for PNG export.
   *
   * State matrix:
   * | loadedInlineSvg | usedFallback | canExport? | Reason              |
   * |-----------------|--------------|------------|---------------------|
   * | null            | false        | false      | Neither source      |
   * | null            | true         | true       | Built-in fallback   |
   * | "<svg/>"        | false        | true       | Vetted inline SVG   |
   * | "<svg/>"        | true         | true       | Vetted inline SVG   |
   */

  it("blocks export when no visual source is available (null, no fallback)", () => {
    expect(isCenterVisualSafeForExport(null, false)).toBe(false);
  });

  it("allows export when using built-in fallback (null, fallback=true)", () => {
    expect(isCenterVisualSafeForExport(null, true)).toBe(true);
  });

  it("allows export when inline SVG was successfully loaded", () => {
    expect(isCenterVisualSafeForExport("<svg></svg>", false)).toBe(true);
  });

  it("allows export when inline SVG is loaded AND fallback is true", () => {
    // Edge case: both flags set (shouldn't happen in practice, but safe)
    expect(isCenterVisualSafeForExport("<svg></svg>", true)).toBe(true);
  });

  it("allows export for single-color controlled SVG (Phase 1 exception)", () => {
    const phaseOneSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M12 2L2 22h20L12 2z" fill="currentColor"/>
    </svg>`;
    expect(isCenterVisualSafeForExport(phaseOneSvg, false)).toBe(true);
  });

  it("allows export for SVG with animation elements", () => {
    const animatedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="20" fill="red">
        <animate attributeName="r" values="20;30;20" dur="2s" repeatCount="indefinite"/>
      </circle>
    </svg>`;
    expect(isCenterVisualSafeForExport(animatedSvg, false)).toBe(true);
  });
});

describe("PNG export readiness — fallback visual scenarios (Task 3.3)", () => {
  it("built-in fallback is always safe for export", () => {
    // The built-in fallback is deterministic and contains no external references
    expect(isCenterVisualSafeForExport(null, true)).toBe(true);
  });

  it("rejects export only in the impossible state (no SVG, no fallback)", () => {
    // This state shouldn't normally occur in the app because the composable
    // always sets fellBack=true when SVG loading fails
    expect(isCenterVisualSafeForExport(null, false)).toBe(false);
  });

  it("export helper correctly resolves inline SVG for .omm export", () => {
    // When we have a loaded inline SVG, the .omm export should embed it
    const inlineSvg =
      "<svg viewBox='0 0 24 24'><circle cx='12' cy='12' r='10'/></svg>";
    expect(resolveExportCenterVisual(inlineSvg)).toBe(inlineSvg);
  });

  it("export helper returns null when no inline SVG — .omm uses fallback", () => {
    expect(resolveExportCenterVisual(null)).toBeNull();
  });

  it("export helper does NOT pass through external URLs", () => {
    // resolveExportCenterVisual only receives the resolved inline SVG (string)
    // or null. It never receives a URL. External svgUrl is stripped before export.
    // This test verifies the function's contract: it only deals with inline content.
    expect(resolveExportCenterVisual(null)).toBeNull();
    expect(resolveExportCenterVisual("<svg></svg>")).toBe("<svg></svg>");
  });
});
