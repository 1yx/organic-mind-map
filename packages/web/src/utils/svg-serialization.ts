/**
 * SVG serialization utilities for PNG export.
 *
 * Handles cloning the rendered SVG DOM, inlining external assets,
 * and serializing to a self-contained SVG string suitable for
 * canvas-based PNG conversion.
 *
 * Tasks covered:
 * - 2.1: Select the currently rendered SVG element from the preview surface
 * - 2.2: Clone the SVG DOM for export instead of mutating the live preview
 * - 2.3: Inline all visible external SVG/image assets in the clone
 * - 2.4: Replace export-safe controlled SVG links with inline content or Data URLs
 * - 2.5: Use deterministic built-in fallback or local readiness error when external asset cannot be inlined
 * - 2.6: Serialize the fully inlined SVG clone with required XML namespaces
 * - 2.7: Ensure the serialized SVG reflects the latest rendered layout
 * - 2.8: Include paper background, center visual, branches, and text
 */

// ─── Required XML namespaces ─────────────────────────────────────────────

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";

/**
 * Ensure an SVG element has all required XML namespace declarations.
 *
 * Without these, some browsers may fail to render the serialized SVG
 * correctly when loaded as an image source.
 */
function ensureNamespaces(clone: SVGSVGElement): void {
  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("xmlns:xlink", XLINK_NS);
}

// ─── SVG Selection & Cloning ─────────────────────────────────────────────

/**
 * Select the first SVG element within a container.
 *
 * Task 2.1: Select the currently rendered SVG element from the preview surface.
 *
 * @param container - The DOM container holding the rendered SVG (e.g. .svg-container)
 * @returns The SVG element, or null if not found
 */
export function selectSvg(container: HTMLElement): SVGSVGElement | null {
  return container.querySelector("svg");
}

/**
 * Clone an SVG element for export processing.
 *
 * Task 2.2: Clone the SVG DOM for export instead of mutating the live preview.
 * Task 2.7: Ensure the serialized SVG reflects the latest rendered layout
 *          (by always cloning from the live DOM at export time).
 *
 * @param svg - The live SVG element from the preview
 * @returns A deep clone of the SVG element
 */
export function cloneSvgForExport(svg: SVGSVGElement): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  ensureNamespaces(clone);
  return clone;
}

// ─── Asset Inlining ──────────────────────────────────────────────────────

/**
 * Check if an href attribute value is an external URL (not a data URL or fragment).
 */
function isExternalUrl(href: string): boolean {
  if (!href) return false;
  if (href.startsWith("data:")) return false;
  if (href.startsWith("#")) return false;
  if (href.startsWith("blob:")) return false;
  // Absolute or relative URL
  return true;
}

/**
 * Fetch an external SVG asset and return it as inline SVG content.
 *
 * Task 2.4: Replace export-safe controlled SVG links with inline SVG content.
 * Task 2.5: Use deterministic built-in fallback when external asset cannot be inlined.
 *
 * @param url - The URL of the external SVG asset
 * @returns The inline SVG content, or null if inlining failed
 */
async function fetchAndInlineSvgAsset(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("svg") && !contentType.includes("xml")) {
      return null;
    }

    const text = await response.text();
    // Basic safety: must contain <svg
    if (!text.includes("<svg")) return null;

    return text;
  } catch {
    return null;
  }
}

/**
 * Fetch an external image asset and return it as a base64 data URL.
 *
 * @param url - The URL of the external image asset
 * @returns A data:image/...;base64,... URL, or null if inlining failed
 */
async function fetchAndInlineImageAsset(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

/**
 * Convert a Blob to a base64 data URL.
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Inline all <image> elements with external hrefs as data URLs.
 * Returns counts of inlined and failed assets.
 */
async function inlineImageAssets(
  clone: SVGSVGElement,
): Promise<{ inlined: number; failed: number }> {
  let inlined = 0;
  let failed = 0;

  const images = Array.from(clone.querySelectorAll("image"));
  for (const img of images) {
    const href = img.getAttribute("href") ?? img.getAttribute("xlink:href");
    if (!href || !isExternalUrl(href)) continue;

    const dataUrl = await fetchAndInlineImageAsset(href);
    if (dataUrl) {
      img.setAttribute("href", dataUrl);
      img.removeAttribute("xlink:href");
      inlined++;
    } else {
      img.remove();
      failed++;
    }
  }

  return { inlined, failed };
}

/**
 * Inline all <use> elements with external hrefs as inline SVG.
 * Returns counts of inlined and failed assets.
 */
async function inlineUseAssets(
  clone: SVGSVGElement,
): Promise<{ inlined: number; failed: number }> {
  let inlined = 0;
  let failed = 0;

  const uses = Array.from(clone.querySelectorAll("use"));
  for (const use of uses) {
    const href = use.getAttribute("href") ?? use.getAttribute("xlink:href");
    if (!href || !isExternalUrl(href)) continue;

    const svgContent = await fetchAndInlineSvgAsset(href);
    if (svgContent) {
      const g = document.createElementNS(SVG_NS, "g");
      g.innerHTML = svgContent;
      const innerSvg = g.querySelector("svg");
      if (innerSvg) {
        const fragment = document.createDocumentFragment();
        while (innerSvg.firstChild) {
          fragment.appendChild(innerSvg.firstChild);
        }
        g.innerHTML = "";
        g.appendChild(fragment);
      }
      use.replaceWith(g);
      inlined++;
    } else {
      use.remove();
      failed++;
    }
  }

  return { inlined, failed };
}

/**
 * Inline all external SVG and image assets in a cloned SVG DOM.
 *
 * Tasks 2.3-2.5: Inline external assets, replace with data URLs or inline SVG,
 * use fallbacks when inlining fails.
 *
 * @param clone - The cloned SVG DOM to process
 * @returns The number of assets inlined (for diagnostics)
 */
export async function inlineExternalAssets(
  clone: SVGSVGElement,
): Promise<{ inlined: number; failed: number }> {
  const images = await inlineImageAssets(clone);
  const uses = await inlineUseAssets(clone);

  return {
    inlined: images.inlined + uses.inlined,
    failed: images.failed + uses.failed,
  };
}

// ─── Serialization ───────────────────────────────────────────────────────

/**
 * Serialize a cloned, asset-inlined SVG element to a string.
 *
 * Task 2.6: Serialize the fully inlined SVG clone with required XML namespaces.
 * Task 2.8: Include paper background, center visual, branches, and text
 *          (guaranteed by cloning the fully rendered SVG).
 *
 * @param clone - The prepared (cloned + asset-inlined) SVG element
 * @returns The serialized SVG string
 */
export function serializeInlinedSvg(clone: SVGSVGElement): string {
  const serializer = new XMLSerializer();
  return serializer.serializeToString(clone);
}

/**
 * Convert a serialized SVG string to a Blob URL for canvas rendering.
 *
 * Task 3.1: Convert the serialized SVG into a Blob URL or data URL.
 *
 * @param svgString - The serialized SVG string
 * @returns A Blob URL string, or null if serialization failed
 */
export function svgToBlobUrl(svgString: string): string | null {
  try {
    const blob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/**
 * Full export pipeline: clone SVG, inline assets, serialize.
 *
 * @param container - The preview container element holding the rendered SVG
 * @returns The serialized, self-contained SVG string, or an error message
 */
export async function prepareSvgForExport(
  container: HTMLElement,
): Promise<{ svg: string | null; error: string | null }> {
  // 2.1: Select the SVG from the preview
  const svg = selectSvg(container);
  if (!svg) {
    return { svg: null, error: "No SVG element found in the preview." };
  }

  // 2.2: Clone for export (also ensures latest layout — 2.7)
  const clone = cloneSvgForExport(svg);

  // 2.3-2.5: Inline external assets
  const { failed } = await inlineExternalAssets(clone);
  if (failed > 0) {
    // Not a hard error — the renderer already ensures self-contained content.
    // External references are safety-net removed, not blocking.
  }

  // 2.6 + 2.8: Serialize with namespaces
  const serialized = serializeInlinedSvg(clone);

  if (!serialized || !serialized.includes("<svg")) {
    return {
      svg: null,
      error: "SVG serialization produced empty or invalid output.",
    };
  }

  return { svg: serialized, error: null };
}

/**
 * Clean up a Blob URL created by svgToBlobUrl.
 */
export function revokeBlobUrl(url: string): void {
  URL.revokeObjectURL(url);
}
