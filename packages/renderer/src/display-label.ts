/**
 * English-only uppercase display label transform.
 *
 * Per AGENTS.md: "English keywords default to uppercase."
 * This module provides a conservative transform that applies uppercase
 * only to pure-English/Latin concept strings. Mixed-language (CJK + ASCII),
 * CJK-only, numbers-only, and already-uppercase strings pass through unchanged.
 *
 * The original concept is preserved in OrganicTree and .omm semantic nodes.
 * This transform is applied only in the renderer display path.
 */

/**
 * Regex matching a string that starts with an ASCII letter (A-Z or a-z)
 * and contains ONLY ASCII letters, digits, spaces, and hyphens.
 * This is intentionally conservative to avoid corrupting mixed-language labels.
 */
const ENGLISH_ONLY_RE = /^[A-Za-z][A-Za-z0-9 \-]*$/;

/**
 * Transform a concept string for display.
 * Returns the uppercase version if the concept is pure English/Latin text.
 * Returns the original string for CJK, mixed-language, numbers-only, etc.
 */
export function toDisplayLabel(concept: string): string {
  if (isEnglishOnly(concept)) {
    return concept.toUpperCase();
  }
  return concept;
}

/**
 * Check if a concept string is pure English/Latin text.
 * Returns true if the string starts with a letter and contains only
 * ASCII letters, digits, spaces, and hyphens.
 */
export function isEnglishOnly(concept: string): boolean {
  return ENGLISH_ONLY_RE.test(concept);
}
