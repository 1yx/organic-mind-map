/**
 * Tests for SVG URL allowlist (renderer-owned).
 *
 * Covers:
 * - Allowed HTTPS URLs with correct paths pass through
 * - Path prefix matching for CDN hosts (cdn.jsdelivr.net)
 * - Disallowed paths on allowed hosts are rejected
 * - Non-HTTPS URLs are rejected
 * - Non-allowlisted hosts are rejected
 * - Malformed URLs are rejected
 * - Empty, whitespace, oversized strings are rejected
 * - Non-string inputs are rejected
 */

import { describe, it, expect } from "vitest";
import {
  isAllowedSvgUrl,
  getAllowedHosts,
  getAllowedSources,
} from "./svg-allowlist.js";

describe("isAllowedSvgUrl — allowed hosts and paths", () => {
  it("accepts valid HTTPS URL from api.iconify.design (any path)", () => {
    const result = isAllowedSvgUrl(
      "https://api.iconify.design/fluent-emoji-flat/brain.svg",
    );
    expect(result).toBe(
      "https://api.iconify.design/fluent-emoji-flat/brain.svg",
    );
  });

  it("accepts valid HTTPS URL from api.simplesvg.com (any path)", () => {
    const result = isAllowedSvgUrl(
      "https://api.simplesvg.com/iconify/fluent-emoji-flat/brain.svg",
    );
    expect(result).toBe(
      "https://api.simplesvg.com/iconify/fluent-emoji-flat/brain.svg",
    );
  });

  it("accepts cdn.jsdelivr.net URL with /npm/@iconify/ prefix", () => {
    const result = isAllowedSvgUrl(
      "https://cdn.jsdelivr.net/npm/@iconify/json@latest/icons/mdi.json",
    );
    expect(result).toBe(
      "https://cdn.jsdelivr.net/npm/@iconify/json@latest/icons/mdi.json",
    );
  });

  it("accepts cdn.jsdelivr.net URL with nested @iconify path", () => {
    const result = isAllowedSvgUrl(
      "https://cdn.jsdelivr.net/npm/@iconify/json@3.1.0/icons.json",
    );
    expect(result).toBe(
      "https://cdn.jsdelivr.net/npm/@iconify/json@3.1.0/icons.json",
    );
  });

  it("trims whitespace from URL", () => {
    const result = isAllowedSvgUrl("  https://api.iconify.design/test.svg  ");
    expect(result).toBe("https://api.iconify.design/test.svg");
  });
});

describe("isAllowedSvgUrl — path pattern matching (cdn.jsdelivr.net)", () => {
  it("rejects cdn.jsdelivr.net URL without /npm/@iconify/ prefix", () => {
    const result = isAllowedSvgUrl(
      "https://cdn.jsdelivr.net/gh/user/repo@main/icon.svg",
    );
    expect(result).toBeNull();
  });

  it("rejects cdn.jsdelivr.net URL with /npm/ but wrong package scope", () => {
    const result = isAllowedSvgUrl(
      "https://cdn.jsdelivr.net/npm/some-other-package/icon.svg",
    );
    expect(result).toBeNull();
  });

  it("rejects cdn.jsdelivr.net URL with /npm/@evil/ prefix", () => {
    const result = isAllowedSvgUrl(
      "https://cdn.jsdelivr.net/npm/@evil/package/exploit.svg",
    );
    expect(result).toBeNull();
  });

  it("accepts cdn.jsdelivr.net with exact /npm/@iconify/ prefix", () => {
    const result = isAllowedSvgUrl(
      "https://cdn.jsdelivr.net/npm/@iconify/svg-icons/test.svg",
    );
    expect(result).toBe(
      "https://cdn.jsdelivr.net/npm/@iconify/svg-icons/test.svg",
    );
  });

  it("accepts cdn.jsdelivr.net with /npm/@iconify/ and query params", () => {
    const result = isAllowedSvgUrl(
      "https://cdn.jsdelivr.net/npm/@iconify/json@latest/icons/mdi.json?foo=bar",
    );
    expect(result).toBe(
      "https://cdn.jsdelivr.net/npm/@iconify/json@latest/icons/mdi.json?foo=bar",
    );
  });
});

describe("isAllowedSvgUrl — rejected URLs (protocol and host)", () => {
  it("rejects non-HTTPS URL (http)", () => {
    const result = isAllowedSvgUrl(
      "http://api.iconify.design/fluent-emoji-flat/brain.svg",
    );
    expect(result).toBeNull();
  });

  it("rejects URL from non-allowlisted host", () => {
    const result = isAllowedSvgUrl("https://example.com/icon.svg");
    expect(result).toBeNull();
  });

  it("rejects malformed URL", () => {
    const result = isAllowedSvgUrl("not-a-url");
    expect(result).toBeNull();
  });

  it("rejects javascript: protocol", () => {
    const result = isAllowedSvgUrl("javascript:alert(1)");
    expect(result).toBeNull();
  });

  it("rejects data: protocol", () => {
    const result = isAllowedSvgUrl("data:image/svg+xml,<svg></svg>");
    expect(result).toBeNull();
  });

  it("rejects ftp: protocol", () => {
    const result = isAllowedSvgUrl("ftp://api.iconify.design/icon.svg");
    expect(result).toBeNull();
  });
});

describe("isAllowedSvgUrl — rejected URLs (empty, oversized, non-string)", () => {
  it("rejects empty string", () => {
    const result = isAllowedSvgUrl("");
    expect(result).toBeNull();
  });

  it("rejects whitespace-only string", () => {
    const result = isAllowedSvgUrl("   ");
    expect(result).toBeNull();
  });

  it("rejects non-string input (number)", () => {
    const result = isAllowedSvgUrl(42);
    expect(result).toBeNull();
  });

  it("rejects non-string input (null)", () => {
    const result = isAllowedSvgUrl(null);
    expect(result).toBeNull();
  });

  it("rejects non-string input (undefined)", () => {
    const result = isAllowedSvgUrl(undefined);
    expect(result).toBeNull();
  });

  it("rejects URL exceeding max length", () => {
    const longPath = "a".repeat(3000);
    const result = isAllowedSvgUrl(
      `https://api.iconify.design/${longPath}.svg`,
    );
    expect(result).toBeNull();
  });

  it("rejects object input", () => {
    const result = isAllowedSvgUrl({ url: "https://api.iconify.design/x.svg" });
    expect(result).toBeNull();
  });

  it("rejects boolean input", () => {
    expect(isAllowedSvgUrl(true)).toBeNull();
    expect(isAllowedSvgUrl(false)).toBeNull();
  });
});

describe("getAllowedHosts", () => {
  it("returns expected hosts", () => {
    const hosts = getAllowedHosts();
    expect(hosts.has("api.iconify.design")).toBe(true);
    expect(hosts.has("api.simplesvg.com")).toBe(true);
    expect(hosts.has("cdn.jsdelivr.net")).toBe(true);
    expect(hosts.has("example.com")).toBe(false);
  });
});

describe("getAllowedSources", () => {
  it("returns source definitions with host and pathPrefixes", () => {
    const sources = getAllowedSources();

    const iconify = sources.find((s) => s.host === "api.iconify.design");
    expect(iconify).toBeDefined();
    expect(iconify!.pathPrefixes).toContain("/");

    const jsdelivr = sources.find((s) => s.host === "cdn.jsdelivr.net");
    expect(jsdelivr).toBeDefined();
    expect(jsdelivr!.pathPrefixes).toContain("/npm/@iconify/");
    expect(jsdelivr!.pathPrefixes).not.toContain("/");
  });
});
