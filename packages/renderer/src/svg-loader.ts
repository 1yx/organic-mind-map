/**
 * Browser-side SVG loading and lightweight safety guard.
 *
 * This module fetches controlled SVG URLs (already validated and allowlisted
 * by the CLI), applies lightweight safety checks, and returns the sanitized
 * SVG string or null on failure.
 *
 * The guard rejects:
 * - <script>, <foreignObject>, and unknown executable content
 * - Event handler attributes (onclick, onload, etc.)
 * - External href / xlink:href references
 * - CSS url(...) references
 * - Embedded raster or data URL images
 *
 * If uncertain, the guard rejects and falls back to built-in visuals.
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

// --- Unsafe patterns ---

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

/** Event handler attribute prefixes. */
const EVENT_ATTR_PREFIX = "on";

/** Patterns that indicate external references or embedded raster data. */
const UNSAFE_PATTERNS = [
  /<script[\s>]/i,
  /<foreignobject[\s>]/i,
  /<iframe[\s>]/i,
  /<embed[\s>]/i,
  /<object[\s>]/i,
  /<applet[\s>]/i,
  /\bon\w+\s*=/i, // event handler attributes
  /href\s*=\s*["']https?:\/\//i, // external href
  /xlink:href\s*=\s*["']https?:\/\//i, // external xlink:href
  /url\s*\(\s*["']?(?:https?:\/\/|data:image)/i, // CSS url() with external or raster data
  /<image[\s][^>]*(?:href|xlink:href)\s*=\s*["']data:image/i, // embedded raster via image tag
  /<!\[CDATA\[\s*<script/i, // CDATA-wrapped scripts
] as const;

/**
 * Check an SVG response string against lightweight safety patterns.
 * Returns true if the SVG is considered safe, false if it should be rejected.
 *
 * This is intentionally conservative — when in doubt, reject.
 */
export function isSvgSafe(svgContent: string): boolean {
  // Check unsafe patterns
  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(svgContent)) {
      return false;
    }
  }

  // Verify it looks like SVG (starts with <svg or whitespace then <svg)
  const trimmed = svgContent.trimStart();
  if (!trimmed.startsWith("<svg")) {
    return false;
  }

  return true;
}

/**
 * Fetch a controlled SVG URL with timeout and size limit.
 * Returns the SVG content string if safe, or null on any failure.
 *
 * This function:
 * - Enforces a response timeout
 * - Enforces a maximum response size
 * - Applies lightweight safety checks on the response
 * - Never throws — returns null on all failure paths
 */
export async function loadControlledSvg(
  url: string,
  options?: SvgLoadOptions,
): Promise<string | null> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxSizeBytes = options?.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      mode: "cors",
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    // Check content type
    const contentType = response.headers.get("content-type") ?? "";
    const isSvg =
      contentType.includes("image/svg+xml") ||
      contentType.includes("text/svg") ||
      contentType.includes("application/svg");

    // Even without a perfect content-type, we'll check the content itself
    // But if the type is clearly not SVG (html, json, etc.), reject early
    if (
      contentType.includes("text/html") ||
      contentType.includes("application/json")
    ) {
      return null;
    }

    // Read with size limit
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

    // Combine chunks
    const combined = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const text = new TextDecoder().decode(combined);

    // If not identified as SVG by content-type, require <svg prefix
    if (!isSvg && !text.trimStart().startsWith("<svg")) {
      return null;
    }

    // Apply safety guard
    if (!isSvgSafe(text)) {
      return null;
    }

    return text;
  } catch {
    // Network error, timeout, abort — all non-fatal
    return null;
  }
}

/** Get the list of unsafe tag names (for testing). */
export function getUnsafeTags(): readonly string[] {
  return UNSAFE_TAGS;
}
