/**
 * Hardcoded controlled HTTPS source allowlist for center SVG URLs.
 *
 * Phase 1 allowlist is intentionally narrow — Iconify-compatible endpoints.
 * The CLI validates URL shape and source membership but does NOT fetch,
 * sanitize, cache, or inline SVG content.
 */

/** Hosts allowed for center SVG URLs. Add new controlled sources here. */
const ALLOWED_HOSTS: ReadonlySet<string> = new Set([
  "api.iconify.design",
  "api.simplesvg.com",
  "cdn.jsdelivr.net",
]);

/** Maximum allowed URL length for SVG URLs. */
const MAX_URL_LENGTH = 2048;

/**
 * Check whether a URL string is a valid HTTPS URL from an allowlisted host.
 * Returns the normalized URL string if allowed, or null if rejected.
 *
 * Rejection reasons:
 * - Not a string
 * - Not a valid HTTPS URL
 * - Host not in allowlist
 * - URL exceeds max length
 * - Malformed URL structure
 */
export function isAllowedSvgUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  const url = raw.trim();
  if (url.length === 0 || url.length > MAX_URL_LENGTH) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    if (!ALLOWED_HOSTS.has(parsed.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

/** Get the list of allowed hosts (for diagnostics / testing). */
export function getAllowedHosts(): ReadonlySet<string> {
  return ALLOWED_HOSTS;
}
