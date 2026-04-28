/**
 * Tests for font stack enforcement in PNG export.
 *
 * Task 6.4: Tests enforcing system font stack and absence of Web Font dependencies.
 *
 * These tests verify that:
 * - The renderer and export code use system font stacks
 * - No Web Font dependencies (\@font-face, remote fonts, WOFF/WOFF2) are introduced
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Recursively find all .ts, .vue, .css files in a directory.
 */
function findFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (
      entry.isDirectory() &&
      !entry.name.startsWith(".") &&
      entry.name !== "node_modules"
    ) {
      results.push(...findFiles(fullPath, exts));
    } else if (entry.isFile() && exts.some((ext) => entry.name.endsWith(ext))) {
      // Exclude test files from scanning (they may contain font patterns as test data)
      if (
        !entry.name.endsWith(".test.ts") &&
        !entry.name.endsWith(".test.vue")
      ) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

describe("System font stack enforcement", () => {
  const webDir = path.resolve(__dirname, "../");
  const rendererDir = path.resolve(__dirname, "../../../../renderer/src");
  const sourceFiles = [
    ...findFiles(webDir, [".ts", ".vue"]),
    ...findFiles(rendererDir, [".ts"]),
  ];

  it("no source file contains @font-face declarations", () => {
    const webFontPattern = /@font-face\s*\{/;
    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(
        webFontPattern.test(content),
        `${path.relative(webDir, file)} contains @font-face`,
      ).toBe(false);
    }
  });

  it("no source file references remote font URLs (fonts.googleapis.com)", () => {
    const remoteFontPattern = /fonts\.googleapis\.com/;
    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(
        remoteFontPattern.test(content),
        `${path.relative(webDir, file)} references Google Fonts`,
      ).toBe(false);
    }
  });

  it("no source file imports WOFF or WOFF2 font files", () => {
    const woffPattern = /\.(woff2?|eot|ttf|otf)(\?|$|['")])/;
    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(
        woffPattern.test(content),
        `${path.relative(webDir, file)} references bundled font files`,
      ).toBe(false);
    }
  });

  it("no source file uses font Base64 inlining patterns", () => {
    // Base64 font inlining would look like: font/woff2;base64, or data:application/font-*
    const base64FontPattern =
      /data:application\/font|font\/woff2?\s*;\s*base64/;
    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(
        base64FontPattern.test(content),
        `${path.relative(webDir, file)} contains font Base64 inlining`,
      ).toBe(false);
    }
  });
});
