import { describe, it, expect } from "vitest";
import { computeLandscape, computePortrait } from "./use-panel-sizing.js";

describe("usePanelSizing landscape", () => {
  it("1280×800 √2: sidebar at min, toolbar capped at max", () => {
    const r = computeLandscape(1280, 800, Math.SQRT2);
    expect(r.sidebarW).toBe(240);
    expect(r.toolbarH).toBeLessThanOrEqual(56);
    expect(r.toolbarH).toBeGreaterThanOrEqual(48);
  });

  it("2560×1080 √2: sidebar capped at max, canvas matches √2", () => {
    const r = computeLandscape(2560, 1080, Math.SQRT2);
    expect(r.sidebarW).toBe(360);
    expect(r.canvasW / r.canvasH).toBeCloseTo(Math.SQRT2, 1);
    expect(r.contentMaxWidth).toBeLessThan(2560);
  });

  it("2560×1080 16:9: canvas matches 16:9", () => {
    const r = computeLandscape(2560, 1080, 16 / 9);
    expect(r.canvasW / r.canvasH).toBeCloseTo(16 / 9, 1);
  });

  it("400×300: clamps minimums gracefully, toolbar capped", () => {
    const r = computeLandscape(400, 300, Math.SQRT2);
    expect(r.canvasW).toBeGreaterThan(0);
    expect(r.canvasH).toBeGreaterThan(0);
    expect(r.sidebarW).toBeGreaterThanOrEqual(240);
    expect(r.toolbarH).toBeLessThanOrEqual(56);
    expect(r.toolbarH).toBeGreaterThanOrEqual(48);
  });

  it("1280×800: contentMaxWidth <= viewport", () => {
    const r = computeLandscape(1280, 800, Math.SQRT2);
    expect(r.contentMaxWidth).toBeLessThanOrEqual(1280);
  });
});

describe("usePanelSizing portrait", () => {
  it("800×1280 √2: sidebar capped at max", () => {
    const r = computePortrait(800, 1280, Math.SQRT2);
    expect(r.sidebarH).toBe(320);
  });

  it("300×400: clamps minimums gracefully, toolbar capped", () => {
    const r = computePortrait(300, 400, Math.SQRT2);
    expect(r.canvasW).toBeGreaterThan(0);
    expect(r.canvasH).toBeGreaterThan(0);
    expect(r.sidebarH).toBeGreaterThanOrEqual(200);
    expect(r.toolbarH).toBeLessThanOrEqual(56);
    expect(r.toolbarH).toBeGreaterThanOrEqual(48);
  });
});
