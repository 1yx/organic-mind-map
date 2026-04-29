/**
 * Hardcoded controlled HTTPS source allowlist for center SVG URLs.
 *
 * Phase 1 allowlist is intentionally narrow — Iconify-compatible endpoints.
 *
 * The allowlist uses host + path pattern matching. For shared CDN hosts
 * (e.g. cdn.jsdelivr.net), paths must match specific allowed prefixes to
 * prevent arbitrary content paths from passing the gate.
 *
 * This module is environment-neutral and lives in the renderer package.
 * It is called by Web/browser code BEFORE any fetch. CLI does NOT import
 * or call the allowlist — CLI remains a Validator + Service Starter.
 */

/** Allowed hosts with their required path prefix patterns. */
const ALLOWED_SOURCES: ReadonlyArray<{
  host: string;
  pathPrefixes: readonly string[];
}> = [
  {
    host: "api.iconify.design",
    // All Iconify API paths are allowed (they serve SVG icons)
    pathPrefixes: ["/"],
  },
  {
    host: "api.simplesvg.com",
    // All SimpleSVG API paths are allowed
    pathPrefixes: ["/"],
  },
  {
    host: "cdn.jsdelivr.net",
    // Only allow npm-hosted Iconify JSON packages or specific SVG paths
    pathPrefixes: ["/npm/@iconify/"],
  },
];

/** Host-only hosts (any path allowed). */
const HOST_ONLY_ALLOWED = new Set<string>([
  "api.iconify.design",
  "api.simplesvg.com",
]);

/** Maximum allowed URL length for SVG URLs. */
const MAX_URL_LENGTH = 2048;

/**
 * Check whether a URL string is a valid HTTPS URL from an allowlisted host
 * with a matching path pattern.
 *
 * Returns the trimmed URL string if allowed, or null if rejected.
 *
 * Rejection reasons:
 * - Not a string
 * - Empty or whitespace-only after trim
 * - URL exceeds max length
 * - Not a valid URL structure
 * - Not HTTPS protocol
 * - Host not in allowlist
 * - Path does not match required prefix for the host
 */
export function isAllowedSvgUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  const url = raw.trim();
  if (url.length === 0 || url.length > MAX_URL_LENGTH) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    if (!isHostAllowed(parsed.hostname, parsed.pathname)) return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * Check whether a hostname + pathname combination matches the allowlist.
 */
function isHostAllowed(hostname: string, pathname: string): boolean {
  const source = ALLOWED_SOURCES.find((s) => s.host === hostname);
  if (!source) return false;

  // Host-only allowed: any path passes
  if (HOST_ONLY_ALLOWED.has(hostname)) return true;

  // Check path prefixes
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return source.pathPrefixes.some((prefix) =>
    normalizedPath.startsWith(prefix),
  );
}

/** Get the list of allowed hosts (for diagnostics / testing). */
export function getAllowedHosts(): ReadonlySet<string> {
  return new Set(ALLOWED_SOURCES.map((s) => s.host));
}

/**
 * Get the full allowlist source definitions (for diagnostics / testing).
 * Each entry includes the host and its allowed path prefixes.
 */
export function getAllowedSources(): ReadonlyArray<{
  host: string;
  pathPrefixes: readonly string[];
}> {
  return ALLOWED_SOURCES;
}
