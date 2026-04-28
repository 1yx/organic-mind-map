/**
 * Tests for SVG URL allowlist (CLI URL boundary).
 *
 * Covers:
 * - Allowed HTTPS URLs pass through
 * - Non-HTTPS URLs are rejected
 * - Non-allowlisted hosts are rejected
 * - Malformed URLs are rejected
 * - URL length limits
 */

import { describe, it, expect } from "vitest";
import { isAllowedSvgUrl, getAllowedHosts } from "./svg-allowlist.js";

describe("isAllowedSvgUrl", () => {
  it("accepts valid HTTPS URL from allowlisted host (api.iconify.design)", () => {
    const result = isAllowedSvgUrl(
      "https://api.iconify.design/fluent-emoji-flat/brain.svg",
    );
    expect(result).toBe("https://api.iconify.design/fluent-emoji-flat/brain.svg");
  });

  it("accepts valid HTTPS URL from allowlisted host (cdn.jsdelivr.net)", () => {
    const result = isAllowedSvgUrl(
      "https://cdn.jsdelivr.net/npm/@iconify/json@latest/icons/mdi.json",
    );
    expect(result).toBe(
      "https://cdn.jsdelivr.net/npm/@iconify/json@latest/icons/mdi.json",
    );
  });

  it("rejects non-HTTPS URL (http)", () => {
    const result = isAllowedSvgUrl(
      "http://api.iconify.design/fluent-emoji-flat/brain.svg",
    );
    expect(result).toBeNull();
  });

  it("rejects URL from non-allowlisted host", () => {
    const result = isAllowedSvgUrl(
      "https://example.com/icon.svg",
    );
    expect(result).toBeNull();
  });

  it("rejects malformed URL", () => {
    const result = isAllowedSvgUrl("not-a-url");
    expect(result).toBeNull();
  });

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

  it("trims whitespace from URL", () => {
    const result = isAllowedSvgUrl(
      "  https://api.iconify.design/test.svg  ",
    );
    expect(result).toBe("https://api.iconify.design/test.svg");
  });

  it("rejects URL exceeding max length", () => {
    const longPath = "a".repeat(3000);
    const result = isAllowedSvgUrl(
      `https://api.iconify.design/${longPath}.svg`,
    );
    expect(result).toBeNull();
  });

  it("getAllowedHosts returns expected hosts", () => {
    const hosts = getAllowedHosts();
    expect(hosts.has("api.iconify.design")).toBe(true);
    expect(hosts.has("cdn.jsdelivr.net")).toBe(true);
    expect(hosts.has("example.com")).toBe(false);
  });
});
