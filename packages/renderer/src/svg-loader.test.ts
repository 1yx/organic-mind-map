/**
 * Tests for browser-side SVG loading guard.
 *
 * Covers:
 * - isSvgSafe: safe SVG acceptance
 * - isSvgSafe: unsafe SVG rejection (script, foreignObject, events, external refs, CSS url, raster data)
 * - loadControlledSvg: integration test stubs (fetch mocking not available in all envs)
 */

import { describe, it, expect } from "vitest";
import { isSvgSafe, getUnsafeTags } from "../src/svg-loader";

describe("isSvgSafe", () => {
  it("accepts a simple safe SVG", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="blue"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(true);
  });

  it("accepts a single-color controlled SVG (Phase 1 exception)", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M12 2L2 22h20L12 2z" fill="currentColor"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(true);
  });

  it("accepts SVG with internal references", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <linearGradient id="grad1">
          <stop offset="0%" stop-color="#333"/>
          <stop offset="100%" stop-color="#666"/>
        </linearGradient>
      </defs>
      <rect fill="url(#grad1)" width="24" height="24"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(true);
  });

  it("rejects SVG containing <script> tag", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <script>alert('xss')</script>
      <circle cx="12" cy="12" r="10"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });

  it("rejects SVG containing <foreignObject> tag", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <foreignObject><body onload="alert(1)"></body></foreignObject>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });

  it("rejects SVG with onclick event handler", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" onclick="alert('xss')"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });

  it("rejects SVG with onload event handler", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">
      <circle cx="12" cy="12" r="10"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });

  it("rejects SVG with external href reference", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <a href="https://evil.com">
        <circle cx="12" cy="12" r="10"/>
      </a>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });

  it("rejects SVG with external xlink:href reference", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <use xlink:href="https://evil.com/malicious.svg#payload"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });

  it("rejects SVG with CSS url() external reference", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <style>
        .bg { background: url(https://evil.com/track.gif); }
      </style>
      <rect class="bg" width="24" height="24"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });

  it("rejects SVG with embedded raster data URL in image tag", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <image href="data:image/png;base64,iVBORw0KGgo=" width="24" height="24"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });

  it("rejects SVG with embedded raster data URL via xlink:href", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <image xlink:href="data:image/png;base64,iVBORw0KGgo=" width="24" height="24"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });

  it("rejects SVG with CSS url() data:image reference", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <style>
        .bg { background: url(data:image/png;base64,iVBORw0KGgo=); }
      </style>
      <rect class="bg" width="24" height="24"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });

  it("rejects SVG with CDATA-wrapped script", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <![CDATA[<script>alert('xss')</script>]]>
      <circle cx="12" cy="12" r="10"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });

  it("rejects content that does not start with <svg", () => {
    expect(isSvgSafe("<html><body>not svg</body></html>")).toBe(false);
    expect(isSvgSafe("just some text")).toBe(false);
    expect(isSvgSafe("<div>html fragment</div>")).toBe(false);
  });

  it("rejects SVG with <iframe> tag", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <foreignObject><iframe src="https://evil.com"/></foreignObject>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });

  it("rejects SVG with <embed> tag", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <foreignObject><embed src="malware.swf"/></foreignObject>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });
});

describe("getUnsafeTags", () => {
  it("includes script and foreignObject", () => {
    const tags = getUnsafeTags();
    expect(tags).toContain("script");
    expect(tags).toContain("foreignobject");
  });
});
