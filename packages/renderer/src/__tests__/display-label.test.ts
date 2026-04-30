/**
 * Tests for English-only uppercase display label transform.
 */

import { describe, it, expect } from "vitest";
import { toDisplayLabel, isEnglishOnly } from "../display-label";

describe("isEnglishOnly", () => {
  it("returns true for pure English words", () => {
    expect(isEnglishOnly("Strategy")).toBe(true);
    expect(isEnglishOnly("PRODUCT STRATEGY")).toBe(true);
    expect(isEnglishOnly("market-fit")).toBe(true);
    expect(isEnglishOnly("AI")).toBe(true);
    expect(isEnglishOnly("Vue")).toBe(true);
    expect(isEnglishOnly("Chain-of-Thought")).toBe(true);
  });

  it("returns true for English with digits", () => {
    expect(isEnglishOnly("Web3")).toBe(true);
    expect(isEnglishOnly("HTTP 404")).toBe(true);
  });

  it("returns false for CJK-only text", () => {
    expect(isEnglishOnly("商业模式")).toBe(false);
    expect(isEnglishOnly("客户细分")).toBe(false);
    expect(isEnglishOnly("AI提示词工程")).toBe(false);
  });

  it("returns false for mixed CJK+ASCII text", () => {
    expect(isEnglishOnly("PROMPT设计")).toBe(false);
    expect(isEnglishOnly("Few-shot学习")).toBe(false);
  });

  it("returns false for numbers-only text", () => {
    expect(isEnglishOnly("123")).toBe(false);
    expect(isEnglishOnly("42")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isEnglishOnly("")).toBe(false);
  });

  it("returns false for strings starting with non-letter", () => {
    expect(isEnglishOnly("  Leading Space")).toBe(false);
    expect(isEnglishOnly("-dash-start")).toBe(false);
    expect(isEnglishOnly("123abc")).toBe(false);
  });
});

describe("toDisplayLabel", () => {
  it("uppercases pure English lowercase input", () => {
    expect(toDisplayLabel("Strategy")).toBe("STRATEGY");
    expect(toDisplayLabel("product strategy")).toBe("PRODUCT STRATEGY");
    expect(toDisplayLabel("market-fit")).toBe("MARKET-FIT");
  });

  it("uppercases mixed-case English input", () => {
    expect(toDisplayLabel("Chain-of-Thought")).toBe("CHAIN-OF-THOUGHT");
    expect(toDisplayLabel("ProductStrategy")).toBe("PRODUCTSTRATEGY");
  });

  it("preserves already-uppercase English input", () => {
    expect(toDisplayLabel("PRODUCT STRATEGY")).toBe("PRODUCT STRATEGY");
  });

  it("preserves CJK-only text unchanged", () => {
    expect(toDisplayLabel("商业模式")).toBe("商业模式");
    expect(toDisplayLabel("客户细分")).toBe("客户细分");
  });

  it("preserves mixed CJK+ASCII text unchanged", () => {
    expect(toDisplayLabel("AI提示词工程")).toBe("AI提示词工程");
    expect(toDisplayLabel("PROMPT设计")).toBe("PROMPT设计");
    expect(toDisplayLabel("Few-shot学习")).toBe("Few-shot学习");
  });

  it("preserves numbers-only text unchanged", () => {
    expect(toDisplayLabel("123")).toBe("123");
  });

  it("preserves empty string", () => {
    expect(toDisplayLabel("")).toBe("");
  });

  it("preserves strings starting with non-letter", () => {
    expect(toDisplayLabel("  Leading Space")).toBe("  Leading Space");
    expect(toDisplayLabel("-dash-start")).toBe("-dash-start");
  });
});
