/**
 * Unit-width calculation for concept validation.
 *
 * CJK/fullwidth characters count as 2 unit-width.
 * ASCII/halfwidth characters count as 1 unit-width.
 */

/**
 * Calculate the unit-width of a string.
 * Each CJK/fullwidth character = 2, each ASCII/halfwidth = 1.
 */
export function conceptUnitWidth(s: string): number {
  let width = 0;
  for (const char of s) {
    const code = char.codePointAt(0)!;
    // CJK Unified Ideographs: 4E00-9FFF, Extension A: 3400-4DBF, Extension B-F: 20000-2FA1F
    // CJK Compatibility Ideographs: F900-FAFF
    // Fullwidth Forms: FF01-FF60, Fullwidth digits/letters: FF21-FF3A, FF41-FF5A, FF10-FF19
    // Katakana/Hiragana/Hangul ranges
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xff01 && code <= 0xff60) ||
      (code >= 0x3040 && code <= 0x30ff) ||
      (code >= 0xac00 && code <= 0xd7af) ||
      (code >= 0x20000 && code <= 0x2fa1f)
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}
