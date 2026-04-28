/**
 * Unit-width calculation for concept validation.
 *
 * CJK/fullwidth characters count as 2 unit-width.
 * ASCII/halfwidth characters count as 1 unit-width.
 */

/**
 * Sorted ranges of code points that count as wide (2 unit-width).
 * Each entry is [low, high] inclusive.
 */
const WIDE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x3040, 0x30ff], // Katakana/Hiragana
  [0x3400, 0x4dbf], // CJK Extension A
  [0x4e00, 0x9fff], // CJK Unified Ideographs
  [0xac00, 0xd7af], // Hangul Syllables
  [0xf900, 0xfaff], // CJK Compatibility Ideographs
  [0xff01, 0xff60], // Fullwidth Forms
  [0x20000, 0x2fa1f], // CJK Extension B-F
];

/**
 * Check whether a code point falls within a CJK/fullwidth range.
 * Uses binary-style early-return to keep cyclomatic complexity low.
 */
function isWideCodePoint(code: number): boolean {
  for (const [lo, hi] of WIDE_RANGES) {
    if (code >= lo && code <= hi) return true;
  }
  return false;
}

/**
 * Calculate the unit-width of a string.
 * Each CJK/fullwidth character = 2, each ASCII/halfwidth = 1.
 */
export function conceptUnitWidth(s: string): number {
  let width = 0;
  for (const char of s) {
    const code = char.codePointAt(0)!;
    width += isWideCodePoint(code) ? 2 : 1;
  }
  return width;
}
