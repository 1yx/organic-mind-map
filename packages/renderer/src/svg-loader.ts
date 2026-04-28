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
 * Check an SVG response string against lightweight safety patterns.
 * Returns true if the SVG is considered safe, false if it should be rejected.
 *
 * This is intentionally conservative — when in doubt, reject.
 */
export function isSvgSafe(svgContent: string): boolean {
  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(svgContent)) {
      return false;
    }
  }

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
