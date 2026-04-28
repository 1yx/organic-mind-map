/**
 * Tests for CLI boundary enforcement in PNG export.
 *
 * Task 6.7: Boundary test confirming CLI one-shot PNG export is not available in Phase 1.
 *
 * These tests verify that:
 * - The CLI does not expose a PNG export command
 * - The CLI does not import Puppeteer, Playwright, or headless browser deps
 * - PNG export logic lives exclusively in the web package
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

describe("CLI boundary: PNG export is not in CLI", () => {
  // Resolve from this test file: web/src/utils -> packages/web/src/utils -> packages/cli/src
  const cliDir = path.resolve(__dirname, "../../../cli/src");

  // Skip all tests if CLI directory doesn't exist (e.g. in web-only test run)
  const cliExists = fs.existsSync(cliDir);

  // Get CLI files
  const cliFiles = cliExists
    ? fs
        .readdirSync(cliDir)
        .filter((f) => f.endsWith(".ts"))
        .map((f) => path.join(cliDir, f))
    : [];

  it("CLI does not expose an 'export' or 'png' command", () => {
    if (!cliExists) return;
    for (const file of cliFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const hasExportCommand =
        /case\s+["']export["']/.test(content) ||
        /case\s+["']png["']/.test(content);
      expect(
        hasExportCommand,
        `${path.basename(file)} should not have export/png command`,
      ).toBe(false);
    }
  });

  it("CLI does not import Puppeteer or Playwright", () => {
    if (!cliExists) return;
    for (const file of cliFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(
        content.includes("puppeteer"),
        `${path.basename(file)} should not import puppeteer`,
      ).toBe(false);
      expect(
        content.includes("playwright"),
        `${path.basename(file)} should not import playwright`,
      ).toBe(false);
    }
  });
});

describe("CLI boundary — no web package imports in CLI", () => {
  const cliDir = path.resolve(__dirname, "../../../cli/src");
  const cliExists = fs.existsSync(cliDir);
  const cliFiles = cliExists
    ? fs
        .readdirSync(cliDir)
        .filter((f) => f.endsWith(".ts"))
        .map((f) => path.join(cliDir, f))
    : [];

  it("CLI does not import any PNG export logic from web package", () => {
    if (!cliExists) return;
    for (const file of cliFiles) {
      const content = fs.readFileSync(file, "utf-8");
      // Check for actual import statements, not just string mentions in comments
      expect(
        /import\s+.*\s+from\s+["']@omm\/web["']/.test(content),
        `${path.basename(file)} should not import from @omm/web`,
      ).toBe(false);
      expect(
        /import\s+.*(?:export-canvas|svg-serialization|png-export)/.test(
          content,
        ),
        `${path.basename(file)} should not import PNG export modules`,
      ).toBe(false);
    }
  });
});

describe("CLI boundary — package.json", () => {
  const cliPkgPath = path.resolve(__dirname, "../../../cli/package.json");

  it("CLI package.json does not list puppeteer or playwright as dependencies", () => {
    if (!fs.existsSync(cliPkgPath)) return;
    const pkg = JSON.parse(fs.readFileSync(cliPkgPath, "utf-8"));
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    expect(allDeps["puppeteer"]).toBeUndefined();
    expect(allDeps["playwright"]).toBeUndefined();
  });
});
