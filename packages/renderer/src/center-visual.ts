/**
 * Center visual loading and deterministic fallback selection.
 *
 * Handles loading SVG center visuals from URLs or inline content,
 * with deterministic built-in fallback when the external visual is unavailable.
 *
 * NOTE: center.svgUrl is treated as an UNTRUSTED optional visual hint.
 * The URL gate (isAllowedSvgUrl) and SVG content safety check (isSvgSafe)
 * must be applied BEFORE passing loaded content here. The sync resolver
 * only validates inline SVG via isSvgSafe; URL loading requires the async
 * path with an external loadSvg callback that has already applied the
 * URL gate and content safety checks.
 */

import type { OrganicTreeCenter } from "@omm/core";
import { missingAssetFallbackDiagnostic } from "./diagnostics.js";
import { isSvgSafe } from "./svg-loader.js";
import type { RenderDiagnostic } from "./types.js";

// ─── Built-in Center Visual Templates ──────────────────────────────────────

export const BUILTIN_CENTER_TEMPLATES = [
  "mandala-organic",
  "radial-bloom",
  "geometric-flower",
] as const;

type BuiltinTemplateName = (typeof BUILTIN_CENTER_TEMPLATES)[number];

/**
 * Select a deterministic built-in template from the content hash.
 */
export function selectBuiltinTemplate(
  contentHash: number,
): BuiltinTemplateName {
  const index = Math.abs(contentHash) % BUILTIN_CENTER_TEMPLATES.length;
  return BUILTIN_CENTER_TEMPLATES[index]!;
}

/**
 * Generate a simple multi-color SVG for a built-in center visual template.
 *
 * These are minimal decorative SVGs with concentric/petal shapes in multiple colors.
 * They're designed to be visually compliant (multi-color) without external assets.
 */

function generateMandalaOrganic(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="95" fill="#F5F0E8" stroke="#E8DCC8" stroke-width="1"/>
  <circle cx="100" cy="100" r="80" fill="none" stroke="#E74C3C" stroke-width="3" opacity="0.6"/>
  <circle cx="100" cy="100" r="60" fill="none" stroke="#3498DB" stroke-width="2.5" opacity="0.6"/>
  <circle cx="100" cy="100" r="40" fill="none" stroke="#2ECC71" stroke-width="2" opacity="0.7"/>
  <circle cx="100" cy="100" r="20" fill="#F39C12" opacity="0.8"/>
  <circle cx="100" cy="100" r="8" fill="#9B59B6"/>
  ${[0, 45, 90, 135, 180, 225, 270, 315]
    .map((angle) => {
      const rad = (angle * Math.PI) / 180;
      const x1 = 100 + 45 * Math.cos(rad);
      const y1 = 100 + 45 * Math.sin(rad);
      const x2 = 100 + 78 * Math.cos(rad);
      const y2 = 100 + 78 * Math.sin(rad);
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#E67E22" stroke-width="1.5" opacity="0.5"/>`;
    })
    .join("\n  ")}
  ${[0, 60, 120, 180, 240, 300]
    .map((angle) => {
      const rad = (angle * Math.PI) / 180;
      const cx = 100 + 50 * Math.cos(rad);
      const cy = 100 + 50 * Math.sin(rad);
      return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6" fill="#1ABC9C" opacity="0.7"/>`;
    })
    .join("\n  ")}
</svg>`;
}

function generateRadialBloom(): string {
  const petalCount = 8;
  const colors = [
    "#E74C3C",
    "#3498DB",
    "#2ECC71",
    "#F39C12",
    "#9B59B6",
    "#1ABC9C",
    "#E67E22",
    "#34495E",
  ];
  const petals = colors
    .slice(0, petalCount)
    .map((color, i) => {
      const angle = (i * 360) / petalCount;
      return `<ellipse cx="100" cy="45" rx="18" ry="35" fill="${color}" opacity="0.5" transform="rotate(${angle} 100 100)"/>`;
    })
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="95" fill="#FDF8F0" stroke="#E8DCC8" stroke-width="1"/>
  ${petals}
  <circle cx="100" cy="100" r="22" fill="#F39C12"/>
  <circle cx="100" cy="100" r="10" fill="#E74C3C"/>
</svg>`;
}

function generateGeometricFlower(): string {
  const colors = [
    "#E74C3C",
    "#3498DB",
    "#2ECC71",
    "#F39C12",
    "#9B59B6",
    "#1ABC9C",
  ];
  const shapes = colors
    .map((color, i) => {
      const angle = (i * 60 * Math.PI) / 180;
      const cx = 100 + 45 * Math.cos(angle);
      const cy = 100 + 45 * Math.sin(angle);
      const sides = 3 + (i % 4);
      const r = 12 + i * 2;
      const points = Array.from({ length: sides }, (_, j) => {
        const a = (j * 2 * Math.PI) / sides - Math.PI / 2;
        return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
      }).join(" ");
      return `<polygon points="${points}" fill="${color}" opacity="0.6"/>`;
    })
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="95" fill="#F5F5F0" stroke="#DDD8D0" stroke-width="1"/>
  ${shapes}
  <circle cx="100" cy="100" r="25" fill="none" stroke="#34495E" stroke-width="2"/>
  <circle cx="100" cy="100" r="12" fill="#E67E22"/>
  <circle cx="100" cy="100" r="5" fill="#34495E"/>
</svg>`;
}

const TEMPLATE_GENERATORS: Record<BuiltinTemplateName, () => string> = {
  "mandala-organic": generateMandalaOrganic,
  "radial-bloom": generateRadialBloom,
  "geometric-flower": generateGeometricFlower,
};

/**
 * Generate SVG content for a built-in center visual template.
 */
export function generateBuiltinCenterSvg(
  templateName: BuiltinTemplateName,
): string {
  const generator = TEMPLATE_GENERATORS[templateName];
  if (!generator) {
    // Fallback to first template
    return TEMPLATE_GENERATORS["mandala-organic"]!();
  }
  return generator();
}

// ─── Center Visual Resolution ──────────────────────────────────────────────

/**
 * Result of resolving a center visual.
 */
export type CenterVisualResult = {
  svgContent: string;
  usedFallback: boolean;
  diagnostics: RenderDiagnostic[];
};

/**
 * Resolve center visual content with fallback chain:
 * 1. Inline SVG (if provided and safe)
 * 2. Loaded SVG from URL (if provided and loads successfully) — requires async context
 * 3. Deterministic built-in fallback
 *
 * This is the sync version that handles inline + fallback.
 * For URL loading, use resolveCenterVisualAsync().
 */
export function resolveCenterVisualSync(
  center: OrganicTreeCenter,
  inlineSvg: string | undefined,
  contentHash: number,
): CenterVisualResult {
  const diagnostics: RenderDiagnostic[] = [];

  // Try inline SVG first
  if (inlineSvg) {
    const trimmed = inlineSvg.trimStart();
    if (trimmed.startsWith("<svg") && isSvgSafe(trimmed)) {
      return {
        svgContent: inlineSvg,
        usedFallback: false,
        diagnostics: [],
      };
    }
    diagnostics.push(
      missingAssetFallbackDiagnostic("inline SVG failed safety check"),
    );
  }

  // Fall through to built-in template
  const templateName = selectBuiltinTemplate(contentHash);
  const svgContent = generateBuiltinCenterSvg(templateName);

  if (inlineSvg || center.svgUrl) {
    diagnostics.push(
      missingAssetFallbackDiagnostic(
        inlineSvg
          ? "inline SVG invalid"
          : "URL loading not available in sync context",
      ),
    );
  }

  return {
    svgContent,
    usedFallback: true,
    diagnostics,
  };
}

/**
 * Attempt to load an SVG from a URL, returning content or pushing a diagnostic.
 */
async function tryLoadSvgUrl(
  url: string | undefined,
  loadSvg: (url: string) => Promise<string | null>,
  context: { diagnostics: RenderDiagnostic[]; failureMsg: string },
): Promise<string | null> {
  if (!url) return null;
  const loaded = await loadSvg(url);
  if (loaded) return loaded;
  context.diagnostics.push(missingAssetFallbackDiagnostic(context.failureMsg));
  return null;
}

/**
 * Async version that attempts URL loading before falling back.
 */
export async function resolveCenterVisualAsync(
  center: OrganicTreeCenter,
  options: {
    contentHash: number;
    loadSvg: (url: string) => Promise<string | null>;
  },
): Promise<CenterVisualResult> {
  const diagnostics: RenderDiagnostic[] = [];

  // Try URL loading from center.svgUrl
  const url = center.svgUrl;
  const loaded = await tryLoadSvgUrl(url, options.loadSvg, {
    diagnostics,
    failureMsg: url ? "SVG URL load failed or rejected" : "",
  });
  if (loaded)
    return { svgContent: loaded, usedFallback: false, diagnostics: [] };

  // Built-in fallback
  const svgContent = generateBuiltinCenterSvg(
    selectBuiltinTemplate(options.contentHash),
  );
  return { svgContent, usedFallback: true, diagnostics };
}
