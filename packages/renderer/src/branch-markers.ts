/**
 * Branch visual hint marker mapping and rendering.
 *
 * Maps a small set of normalized visual hint strings to deterministic
 * built-in SVG marker symbols. Unsupported hints are preserved in data
 * but produce no marker — no validation failure, no rendering error.
 *
 * Environment-neutral — no DOM or Canvas dependencies.
 */

// ─── Marker Definitions ──────────────────────────────────────────────────

/** A built-in marker that can be rendered as inline SVG. */
export type BuiltinMarker = {
  /** Unique marker name (lowercase). */
  readonly name: string;
  /** Inline SVG content for the marker symbol, viewBox 0 0 24 24. */
  readonly svg: string;
  /** Logical bounding box width relative to a unit square. */
  readonly relativeWidth: number;
  /** Logical bounding box height relative to a unit square. */
  readonly relativeHeight: number;
};

/** Marker size in SVG units — consistent across all depths. */
export const MARKER_SIZE = 36;

/**
 * Supported hint strings → marker definitions.
 * Keys are normalized lowercase strings matched case-insensitively.
 */
const SUPPORTED_MARKERS: Readonly<Record<string, BuiltinMarker>> = {
  star: {
    name: "star",
    svg: '<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="currentColor"/>',
    relativeWidth: 20,
    relativeHeight: 19,
  },
  heart: {
    name: "heart",
    svg: '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>',
    relativeWidth: 20,
    relativeHeight: 18.35,
  },
  arrow: {
    name: "arrow",
    svg: '<path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" fill="currentColor"/>',
    relativeWidth: 16,
    relativeHeight: 16,
  },
  check: {
    name: "check",
    svg: '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>',
    relativeWidth: 17,
    relativeHeight: 12,
  },
  warning: {
    name: "warning",
    svg: '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="currentColor"/>',
    relativeWidth: 22,
    relativeHeight: 19,
  },
  lightbulb: {
    name: "lightbulb",
    svg: '<path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" fill="currentColor"/>',
    relativeWidth: 14,
    relativeHeight: 20,
  },
  earth: {
    name: "earth",
    svg: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" fill="none" stroke="currentColor" stroke-width="1.5"/>',
    relativeWidth: 20,
    relativeHeight: 20,
  },
  lock: {
    name: "lock",
    svg: '<path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill="currentColor"/>',
    relativeWidth: 16,
    relativeHeight: 20,
  },
};

/** All supported hint strings (lowercase). */
export const SUPPORTED_HINT_NAMES: readonly string[] =
  Object.keys(SUPPORTED_MARKERS);

// ─── Lookup ───────────────────────────────────────────────────────────────

/**
 * Look up a marker by visual hint string.
 * Matching is case-insensitive.
 * Returns undefined for unsupported hints — callers should silently skip.
 */
export function resolveBranchMarker(
  hint: string | undefined | null,
): BuiltinMarker | undefined {
  if (!hint) return undefined;
  const normalized = hint.trim().toLowerCase();
  return SUPPORTED_MARKERS[normalized];
}

/**
 * Check whether a visual hint string is supported.
 */
export function isSupportedHint(hint: string | undefined | null): boolean {
  return resolveBranchMarker(hint) !== undefined;
}

// ─── SVG Rendering ───────────────────────────────────────────────────────

/** Options for marker positioning and styling. */
export type MarkerRenderOptions = {
  /** X position for the marker center. */
  x: number;
  /** Y position for the marker center. */
  y: number;
  /** Branch depth (controls marker scale). */
  depth: number;
  /** Fill color (branch color). Only used by renderMarkerSvg. */
  color?: string;
};

/** Get marker scale factor based on branch depth. */
function markerScale(depth: number): number {
  return depth === 1 ? 1.0 : depth === 2 ? 0.75 : 0.6;
}

/**
 * Render a marker as an SVG group element.
 * The marker is positioned near the branch text endpoint.
 */
export function renderMarkerSvg(
  marker: BuiltinMarker,
  opts: MarkerRenderOptions,
): string {
  const scale = markerScale(opts.depth);
  const size = MARKER_SIZE * scale;
  const half = size / 2;
  return (
    `  <g class="branch-marker" data-hint="${marker.name}" ` +
    `transform="translate(${(opts.x - half).toFixed(1)}, ${(opts.y - half).toFixed(1)}) scale(${(size / 24).toFixed(4)})" ` +
    `style="color:${opts.color}">\n` +
    `    ${marker.svg}\n` +
    `  </g>`
  );
}

/**
 * Compute the bounding box for a rendered marker.
 * This is used for collision detection and spacing.
 */
export function markerBoundingBox(
  marker: BuiltinMarker,
  opts: MarkerRenderOptions,
): { x: number; y: number; width: number; height: number } {
  const scale = markerScale(opts.depth);
  const size = MARKER_SIZE * scale;
  const half = size / 2;
  return {
    x: opts.x - half,
    y: opts.y - half,
    width: size,
    height: size,
  };
}
