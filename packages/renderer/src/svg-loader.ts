/**
 * Browser-side SVG loading and content safety guard.
 *
 * This module fetches SVG URLs (treated as UNTRUSTED content — the CLI
 * does NOT validate, allowlist, or sanitize SVG URLs), applies DOMParser-
 * based safety checks, and returns the SVG string or null on failure.
 *
 * The URL gate (isAllowedSvgUrl in svg-allowlist.ts) should be called by
 * Web BEFORE calling loadControlledSvg(). This module handles content safety
 * after fetch.
 *
 * Safety algorithm (DOMParser-based, primary):
 * 1. Parse SVG text with DOMParser as image/svg+xml
 * 2. Verify the root element is <svg>
 * 3. Traverse the parsed tree against an explicit allowlist of SVG elements
 *    and attributes
 * 4. Reject: script, foreignObject, event attributes (on*), external
 *    href/xlink:href (non-fragment), CSS url(...), raster/data image
 *    references, non-SVG content, oversized responses, any non-allowlisted
 *    elements or attributes
 *
 * Coarse preflight (regex, supplemental):
 * - Quick reject for obviously dangerous patterns before DOMParser parsing
 * - NOT the primary safety mechanism — DOMParser traversal is authoritative
 */

/** Configuration for SVG loading. */
export type SvgLoadOptions = {
  /** Request timeout in milliseconds. Default: 10000 */
  timeoutMs?: number;
  /** Maximum response size in bytes. Default: 65536 (64KB) */
  maxSizeBytes?: number;
};

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_SIZE_BYTES = 65_536;

// --- Explicit allowlists for DOMParser traversal ---

/**
 * Elements allowed in a controlled center SVG.
 * Anything not in this list is rejected.
 */
const ALLOWED_ELEMENTS = new Set([
  "svg",
  "g",
  "path",
  "circle",
  "ellipse",
  "rect",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "title",
  "desc",
  "metadata",
  "defs",
  "use",
  "clippath",
  "mask",
  "lineargradient",
  "radialgradient",
  "stop",
  "pattern",
  "symbol",
  // Animation elements
  "animate",
  "animatetransform",
  "animatemotion",
  "set",
] as const);

/**
 * Attributes allowed in a controlled center SVG.
 * Anything not in this list is rejected.
 *
 * Standard SVG presentation attributes, geometry attributes, and
 * structural attributes are included. Event attributes (on*) are
 * explicitly excluded.
 */
const ALLOWED_ATTRIBUTES = new Set([
  // Core SVG attributes
  "xmlns",
  "viewbox",
  "width",
  "height",
  "x",
  "y",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "d",
  "points",
  "x1",
  "y1",
  "x2",
  "y2",
  "dx",
  "dy",
  "rotate",
  "textlength",
  "lengthadjust",
  "startoffset",
  "method",
  "spacing",
  "preserveaspectratio",
  "transform",
  // Gradient / pattern attributes
  "id",
  "gradientunits",
  "gradienttransform",
  "patternunits",
  "patterntransform",
  "patterncontentunits",
  "spreadmethod",
  // Stop attributes
  "offset",
  "stop-color",
  "stop-opacity",
  // Clip-path / mask attributes
  "clippathunits",
  "maskcontentunits",
  "maskunits",
  // Presentation attributes
  "fill",
  "fill-rule",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-miterlimit",
  "stroke-opacity",
  "opacity",
  "display",
  "visibility",
  "color",
  "color-interpolation",
  "color-interpolation-filters",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "font-variant",
  "text-anchor",
  "text-decoration",
  "text-rendering",
  "letter-spacing",
  "word-spacing",
  "dominant-baseline",
  "alignment-baseline",
  "baseline-shift",
  "direction",
  "unicode-bidi",
  "writing-mode",
  "glyph-orientation-horizontal",
  "glyph-orientation-vertical",
  "overflow",
  "shape-rendering",
  "image-rendering",
  // Link attributes (fragment-only href is allowed via traversal logic)
  "href",
  // Masking and clipping attributes
  "clip-path",
  "clip-rule",
  "mask",
  "filter",
  // Animation attributes
  "attributename",
  "attributetype",
  "from",
  "to",
  "values",
  "begin",
  "dur",
  "end",
  "repeatcount",
  "repeatdur",
  "fill",
  "calcmode",
  "keytimes",
  "keysplines",
  "keypoints",
  "additive",
  "accumulate",
  "path",
  "origin",
  "type",
  // Use/symbol
  "externalresourcesrequired",
] as const);

/**
 * Check if an attribute name is an event handler attribute (on*).
 * These are NEVER allowed.
 */
function isEventAttribute(attrName: string): boolean {
  // Use localName comparison (lowercase) for robustness
  return /^on/i.test(attrName.toLowerCase());
}

/**
 * Check if an href or xlink:href value is a fragment reference only.
 * External URLs and data: URLs are rejected.
 */
function isFragmentOnlyHref(value: string): boolean {
  const trimmed = value.trim();
  // Fragment-only: starts with #
  if (trimmed.startsWith("#")) return true;
  // Empty is also fine (some attributes allow empty)
  if (trimmed === "") return true;
  return false;
}

/**
 * Check if a style attribute value contains url(...) with external
 * or data references.
 */
function styleContainsExternalUrl(value: string): boolean {
  return /url\s*\(\s*["']?(?:https?:\/\/|data:)/i.test(value);
}

/**
 * Check if an attribute is an href or xlink:href and validate it.
 * Returns true if safe, false if the href should cause rejection.
 * Returns undefined if this attribute is not an href.
 */
function checkHrefAttribute(attr: Attr): boolean | undefined {
  const attrName = attr.name.toLowerCase();
  const isXlinkHref =
    attrName === "xlink:href" ||
    (attr.localName === "href" &&
      attr.namespaceURI === "http://www.w3.org/1999/xlink");
  if (isXlinkHref) {
    return isFragmentOnlyHref(attr.value);
  }

  const isHref = attr.localName.toLowerCase() === "href" && !attr.namespaceURI;
  if (isHref) {
    if (!isFragmentOnlyHref(attr.value)) return false;
    return ALLOWED_ATTRIBUTES.has("href");
  }

  return undefined; // not an href attribute
}

/**
 * Validate all attributes on a DOM element against the allowlists.
 * Returns true if all attributes are safe, false on any violation.
 */
function validateAttributes(element: Element): boolean {
  const attrs = element.attributes;
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i]!;
    const attrName = attr.name.toLowerCase();

    // Reject all event attributes (on*)
    if (isEventAttribute(attrName)) return false;

    // Check href/xlink:href attributes
    const hrefCheck = checkHrefAttribute(attr);
    if (hrefCheck !== undefined) {
      if (!hrefCheck) return false;
      continue;
    }

    // Check non-allowlisted attributes (except xmlns variants)
    const isXmlns = attrName.startsWith("xmlns");

    const isAllowed =
      isXmlns ||
      (ALLOWED_ATTRIBUTES as ReadonlySet<string>).has(
        attr.localName.toLowerCase(),
      );
    if (!isAllowed) return false;

    // Check style attributes for url(...)
    if (attr.localName.toLowerCase() === "style") {
      if (styleContainsExternalUrl(attr.value)) return false;
    }
  }
  return true;
}

/**
 * Traverse a DOM node tree and validate all elements and attributes
 * against the explicit allowlists.
 *
 * Returns true if the entire tree is safe, false if any violation found.
 */
function traverseAndValidate(node: Element): boolean {
  const tagName = node.tagName.toLowerCase();
  if (!(ALLOWED_ELEMENTS as ReadonlySet<string>).has(tagName)) {
    return false;
  }

  if (!validateAttributes(node)) return false;

  // Recurse into child elements
  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    if (!traverseAndValidate(children[i]!)) {
      return false;
    }
  }

  return true;
}

// --- Unsafe patterns (coarse preflight) ---

/** Tags that are never allowed in a controlled center SVG. */
const UNSAFE_TAGS = [
  "script",
  "foreignobject",
  "iframe",
  "embed",
  "object",
  "applet",
  "form",
  "input",
  "textarea",
  "select",
  "button",
  "meta",
  "link",
  "base",
] as const;

/** Patterns that indicate external references or embedded raster data. */
const UNSAFE_PATTERNS = [
  /<script[\s>]/i,
  /<foreignobject[\s>]/i,
  /<iframe[\s>]/i,
  /<embed[\s>]/i,
  /<object[\s>]/i,
  /<applet[\s>]/i,
  /\bon\w+\s*=/i, // event handler attributes
  /href\s*=\s*["'](?!#)[^"']+/i, // href with any non-fragment target
  /xlink:href\s*=\s*["'](?!#)[^"']+/i, // xlink:href with any non-fragment target
  /url\s*\(\s*["']?(?:https?:\/\/|data:image)/i, // CSS url() with external or raster data
  /<image[\s][^>]*(?:href|xlink:href)\s*=\s*["']data:image/i, // embedded raster via image tag
  /<!\[CDATA\[\s*<script/i, // CDATA-wrapped scripts
] as const;

/**
 * Coarse preflight check using regex patterns.
 *
 * This is a fast reject for obviously dangerous content BEFORE the more
 * expensive DOMParser traversal. It is NOT the primary safety mechanism.
 */
function preflightCheck(svgContent: string): boolean {
  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(svgContent)) {
      return false;
    }
  }
  return true;
}

/**
 * DOMParser-based SVG content safety check (primary).
 *
 * Parses SVG text with DOMParser as image/svg+xml, then traverses the
 * parsed DOM tree against explicit allowlists of SVG elements and attributes.
 *
 * Returns true if the SVG is considered safe, false if rejected.
 */
export function isSvgSafe(svgContent: string): boolean {
  const trimmed = svgContent.trimStart();
  if (!trimmed.startsWith("<svg")) {
    return false;
  }

  // Coarse preflight first (fast reject for obvious dangers)
  if (!preflightCheck(svgContent)) {
    return false;
  }

  // DOMParser-based traversal (primary safety check)
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, "image/svg+xml");

    // Check for parse errors
    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      return false;
    }

    // Root must be <svg>
    const root = doc.documentElement;
    if (root.tagName.toLowerCase() !== "svg") {
      return false;
    }

    // Traverse the entire tree
    return traverseAndValidate(root);
  } catch {
    return false;
  }
}

/**
 * Fetch a controlled SVG URL with timeout and size limit.
 * Returns the SVG content string if safe, or null on any failure.
 *
 * IMPORTANT: Call isAllowedSvgUrl() BEFORE calling this function.
 * This function handles content safety AFTER fetch.
 *
 * Never throws — returns null on all failure paths.
 */
export async function loadControlledSvg(
  url: string,
  options?: SvgLoadOptions,
): Promise<string | null> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxSizeBytes = options?.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;

  try {
    const response = await fetchWithTimeout(url, timeoutMs);
    if (!response.ok) return null;

    const text = await readBodyWithSizeLimit(response, maxSizeBytes);
    if (text === null) return null;

    return validateSvgResponse(text, response);
  } catch {
    return null;
  }
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const response = await fetch(url, {
    signal: controller.signal,
    mode: "cors",
  });

  clearTimeout(timeoutId);
  return response;
}

async function readBodyWithSizeLimit(
  response: Response,
  maxSizeBytes: number,
): Promise<string | null> {
  const contentType = response.headers.get("content-type") ?? "";

  if (
    contentType.includes("text/html") ||
    contentType.includes("application/json")
  ) {
    return null;
  }

  const reader = response.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let totalSize = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalSize += value.byteLength;
    if (totalSize > maxSizeBytes) return null;

    chunks.push(value);
  }

  const combined = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(combined);
}

function validateSvgResponse(text: string, response: Response): string | null {
  const contentType = response.headers.get("content-type") ?? "";
  const isSvg =
    contentType.includes("image/svg+xml") ||
    contentType.includes("text/svg") ||
    contentType.includes("application/svg");

  if (!isSvg && !text.trimStart().startsWith("<svg")) {
    return null;
  }

  if (!isSvgSafe(text)) {
    return null;
  }

  return text;
}

/** Get the list of unsafe tag names (for testing). */
export function getUnsafeTags(): readonly string[] {
  return UNSAFE_TAGS;
}

/** Get the list of allowed element names (for testing). */
export function getAllowedElements(): ReadonlySet<string> {
  return ALLOWED_ELEMENTS;
}

/** Get the list of allowed attribute names (for testing). */
export function getAllowedAttributes(): ReadonlySet<string> {
  return ALLOWED_ATTRIBUTES;
}
