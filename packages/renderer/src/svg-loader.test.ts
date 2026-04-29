/**
 * Tests for browser-side SVG loading guard.
 *
 * Covers:
 * - isSvgSafe: safe SVG acceptance (standard SVG elements)
 * - isSvgSafe: unsafe SVG rejection (script, foreignObject, events, external refs, CSS url, raster data)
 * - isSvgSafe: DOMParser-based rejection of non-allowlisted elements
 * - isSvgSafe: DOMParser-based rejection of non-allowlisted attributes
 * - isSvgSafe: rejection of namespaced attributes (xlink:href with external URLs)
 * - isSvgSafe: rejection of malformed XML
 * - isSvgSafe: rejection of non-SVG content
 * - isSvgSafe: safe internal references (fragment-only href)
 * - getUnsafeTags, getAllowedElements, getAllowedAttributes: accessor tests
 */

import { describe, it, expect } from "vitest";
import {
  isSvgSafe,
  getUnsafeTags,
  getAllowedElements,
  getAllowedAttributes,
} from "../src/svg-loader";

describe("isSvgSafe — accepts safe SVGs (basic shapes)", () => {
  it("accepts a simple safe SVG with circle", () => {
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

  it("accepts SVG with internal fragment references (url(#id))", () => {
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
});

describe("isSvgSafe — accepts safe SVGs (text, use, clipPath)", () => {
  it('accepts SVG with <use href="#id"/> (fragment-only)', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <circle id="dot" cx="12" cy="12" r="5"/>
      </defs>
      <use href="#dot"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(true);
  });

  it("accepts SVG with text and tspan elements", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <text x="50" y="50" font-size="16">Hello
        <tspan fill="red">World</tspan>
      </text>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(true);
  });

  it("accepts SVG with clipPath and mask elements", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <clipPath id="clip1">
          <rect width="50" height="50"/>
        </clipPath>
        <mask id="mask1">
          <rect width="100" height="100" fill="white"/>
        </mask>
      </defs>
      <rect clip-path="url(#clip1)" width="100" height="100" fill="blue"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(true);
  });
});

describe("isSvgSafe — accepts safe SVGs (animation, pattern, metadata)", () => {
  it("accepts SVG with animation elements", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="20" fill="red">
        <animate attributeName="r" values="20;30;20" dur="2s" repeatCount="indefinite"/>
      </circle>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(true);
  });

  it("accepts SVG with pattern and symbol elements", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <pattern id="pat1" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="5" height="5" fill="red"/>
        </pattern>
        <symbol id="sym1" viewBox="0 0 10 10">
          <rect width="10" height="10" fill="blue"/>
        </symbol>
      </defs>
      <rect fill="url(#pat1)" width="100" height="100"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(true);
  });

  it("accepts SVG with title and desc metadata elements", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <title>Test SVG</title>
      <desc>A test SVG with metadata</desc>
      <metadata/>
      <circle cx="50" cy="50" r="20" fill="blue"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(true);
  });

  it("accepts SVG with various geometry elements", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <line x1="0" y1="0" x2="100" y2="100" stroke="black"/>
      <polyline points="10,10 20,20 30,10" fill="none" stroke="black"/>
      <polygon points="50,10 90,90 10,90" fill="red"/>
      <ellipse cx="50" cy="50" rx="30" ry="20" fill="green"/>
      <rect x="10" y="10" width="30" height="20" fill="yellow"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(true);
  });
});

describe("isSvgSafe — rejects dangerous tags (DOMParser) — script/foreignObject", () => {
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

  it("rejects SVG with CDATA-wrapped script", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <![CDATA[<script>alert('xss')</script>]]>
      <circle cx="12" cy="12" r="10"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });
});

describe("isSvgSafe — rejects dangerous tags (DOMParser) — embed/object/form/style", () => {
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

  it("rejects SVG with <object> tag", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <object data="evil.swf"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });

  it("rejects SVG with <form> tag", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <form><input/></form>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });

  it("rejects SVG with <style> tag (not in allowlist)", () => {
    // <style> is NOT in ALLOWED_ELEMENTS
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <style>.bg { fill: red; }</style>
      <rect class="bg" width="24" height="24"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });
});

describe("isSvgSafe — rejects event handlers (DOMParser traversal)", () => {
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

  it("rejects SVG with onerror event handler", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <image href="x" onerror="alert(1)"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });

  it("rejects SVG with onmouseover event handler", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" onmouseover="alert(1)"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });
});

describe("isSvgSafe — rejects external references (DOMParser traversal)", () => {
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

  it("rejects SVG with CSS url() external reference in style attribute", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <rect style="background: url(https://evil.com/track.gif)" width="24" height="24"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });

  it("rejects SVG with CSS url() data:image reference in style attribute", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <rect style="background: url(data:image/png;base64,iVBOR)" width="24" height="24"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });
});

describe("isSvgSafe — rejects embedded raster data", () => {
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

  it("rejects SVG with CSS url() data:image reference (in style attr)", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <rect style="background: url(data:image/png;base64,iVBORw0KGgo=)" width="24" height="24"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });
});

describe("isSvgSafe — rejects non-allowlisted elements (DOMParser)", () => {
  it("rejects SVG with <a> element (not in allowlist)", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <a><circle cx="12" cy="12" r="10"/></a>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });

  it("rejects SVG with <image> element (not in allowlist)", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <image href="#internal" width="24" height="24"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });

  it("rejects SVG with <video> element", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <foreignObject><video src="evil.mp4"/></foreignObject>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });

  it("rejects SVG with <html> element", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <foreignObject><html><body>evil</body></html></foreignObject>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });
});

describe("isSvgSafe — rejects non-allowlisted attributes (DOMParser)", () => {
  it("rejects SVG with custom data-* attribute", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" data-evil="payload"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });

  it("rejects SVG with class attribute (not in allowlist)", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" class="my-circle"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });

  it("rejects SVG with role attribute", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" role="img"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });

  it("rejects SVG with aria-* attribute", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" aria-label="circle"/>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });
});

describe("isSvgSafe — rejects malformed XML", () => {
  it("rejects SVG with unclosed tag", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10">
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });

  it("rejects SVG with mismatched tags", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10"></rect>
    </svg>`;
    expect(isSvgSafe(svg)).toBe(false);
  });

  it("rejects completely malformed content that starts with <svg", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><><><>`;
    expect(isSvgSafe(svg)).toBe(false);
  });
});

describe("isSvgSafe — rejects non-SVG content", () => {
  it("rejects content that does not start with <svg", () => {
    expect(isSvgSafe("<html><body>not svg</body></html>")).toBe(false);
    expect(isSvgSafe("just some text")).toBe(false);
    expect(isSvgSafe("<div>html fragment</div>")).toBe(false);
    expect(isSvgSafe("<xml>random xml</xml>")).toBe(false);
  });

  it("rejects SVG that has parsererror", () => {
    // Deliberately malformed XML that triggers parsererror
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" />
      <broken tag
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

  it("includes iframe, embed, object", () => {
    const tags = getUnsafeTags();
    expect(tags).toContain("iframe");
    expect(tags).toContain("embed");
    expect(tags).toContain("object");
  });
});

describe("getAllowedElements", () => {
  it("includes basic SVG elements", () => {
    const elements = getAllowedElements();
    expect(elements.has("svg")).toBe(true);
    expect(elements.has("g")).toBe(true);
    expect(elements.has("path")).toBe(true);
    expect(elements.has("circle")).toBe(true);
    expect(elements.has("rect")).toBe(true);
  });

  it("includes structural and gradient elements", () => {
    const elements = getAllowedElements();
    expect(elements.has("defs")).toBe(true);
    expect(elements.has("use")).toBe(true);
    expect(elements.has("lineargradient")).toBe(true);
    expect(elements.has("stop")).toBe(true);
    expect(elements.has("clippath")).toBe(true);
    expect(elements.has("mask")).toBe(true);
  });

  it("does not include dangerous elements", () => {
    const elements = getAllowedElements();
    expect(elements.has("script")).toBe(false);
    expect(elements.has("foreignobject")).toBe(false);
    expect(elements.has("iframe")).toBe(false);
    expect(elements.has("style")).toBe(false);
    expect(elements.has("a")).toBe(false);
    expect(elements.has("image")).toBe(false);
  });
});

describe("getAllowedAttributes", () => {
  it("includes core SVG attributes", () => {
    const attrs = getAllowedAttributes();
    expect(attrs.has("viewbox")).toBe(true);
    expect(attrs.has("width")).toBe(true);
    expect(attrs.has("height")).toBe(true);
    expect(attrs.has("fill")).toBe(true);
    expect(attrs.has("stroke")).toBe(true);
    expect(attrs.has("transform")).toBe(true);
  });

  it("includes presentation attributes", () => {
    const attrs = getAllowedAttributes();
    expect(attrs.has("opacity")).toBe(true);
    expect(attrs.has("font-size")).toBe(true);
    expect(attrs.has("text-anchor")).toBe(true);
    expect(attrs.has("stroke-width")).toBe(true);
  });
});
