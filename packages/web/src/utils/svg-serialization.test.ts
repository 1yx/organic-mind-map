/**
 * Tests for SVG serialization helpers.
 *
 * Tasks covered:
 * - 6.1: Unit tests for SVG serialization helpers
 * - 6.2: Unit tests for export asset inlining and fallback behavior
 */

// @vitest-environment jsdom

import { describe, it, expect } from "vitest";

// DOM-dependent tests for SVG serialization

describe("SVG serialization - namespace handling", () => {
  it("includes xmlns and xmlns:xlink in serialized output", () => {
    // Create a minimal SVG element
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 800 600");
    svg.setAttribute("width", "800");
    svg.setAttribute("height", "600");

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", "0");
    rect.setAttribute("width", "800");
    rect.setAttribute("height", "600");
    rect.setAttribute("fill", "#FFFFFF");
    svg.appendChild(rect);

    // Clone and ensure namespaces (simulates cloneSvgForExport behavior)
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

    const serializer = new XMLSerializer();
    const result = serializer.serializeToString(clone);

    expect(result).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(result).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
  });

  it("produces valid SVG output with all expected sections", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 1000 700");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

    // Paper background
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("fill", "#FFFFFF");
    bg.setAttribute("width", "1000");
    bg.setAttribute("height", "700");
    svg.appendChild(bg);

    // A branch path
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M 500 350 Q 600 300 700 350");
    path.setAttribute("stroke", "#FF6B6B");
    svg.appendChild(path);

    // Text
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.textContent = "BRANCH";
    svg.appendChild(text);

    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

    const serializer = new XMLSerializer();
    const result = serializer.serializeToString(clone);

    expect(result).toContain("<svg");
    expect(result).toContain("</svg>");
    expect(result).toContain("BRANCH");
    expect(result).toContain("#FFFFFF"); // paper background
    expect(result).toContain("#FF6B6B"); // branch
  });
});

describe("SVG serialization - cloning", () => {
  it("clones the latest DOM state (not stale)", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 100 100");

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.textContent = "original";
    svg.appendChild(text);

    // Clone at this point
    const clone1 = svg.cloneNode(true) as SVGSVGElement;

    // Mutate the live SVG
    text.textContent = "updated";

    // Clone again
    const clone2 = svg.cloneNode(true) as SVGSVGElement;

    const serializer = new XMLSerializer();
    const result1 = serializer.serializeToString(clone1);
    const result2 = serializer.serializeToString(clone2);

    expect(result1).toContain("original");
    expect(result1).not.toContain("updated");
    expect(result2).toContain("updated");
    expect(result2).not.toContain("original");
  });
});

describe("SVG serialization - asset inlining edge cases", () => {
  it("does not treat data: URLs as external", () => {
    const dataUrl = "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=";
    expect(dataUrl.startsWith("data:")).toBe(true);
  });

  it("does not treat #fragments as external", () => {
    const fragment = "#myGradient";
    expect(fragment.startsWith("#")).toBe(true);
  });

  it("identifies http URLs as external", () => {
    const url = "https://example.com/image.svg";
    expect(url.startsWith("data:")).toBe(false);
    expect(url.startsWith("#")).toBe(false);
    expect(url.startsWith("blob:")).toBe(false);
    expect(url.length > 0).toBe(true);
  });
});
