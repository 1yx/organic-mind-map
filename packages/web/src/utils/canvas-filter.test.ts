import { describe, it, expect } from "vitest";
import {
  filterInternalFields,
  extractInternalFields,
} from "./canvas-filter.js";

describe("filterInternalFields", () => {
  it("removes masks, rawOcrEvidence, and debugInternals", () => {
    const input = {
      version: 1,
      title: "test",
      masks: [{ id: "m1" }],
      rawOcrEvidence: { blocks: [] },
      debugInternals: { trace: true },
      rootMap: { id: "r1" },
    };
    const result = filterInternalFields(input);
    expect(result).toEqual({
      version: 1,
      title: "test",
      rootMap: { id: "r1" },
    });
  });

  it("returns clean copy when no internal fields present", () => {
    const input = { version: 1, title: "clean" };
    const result = filterInternalFields(input);
    expect(result).toEqual(input);
    expect(result).not.toBe(input);
  });

  it("does not mutate the input", () => {
    const input = { masks: [1, 2, 3], title: "keep" };
    filterInternalFields(input);
    expect(input.masks).toEqual([1, 2, 3]);
  });
});

describe("extractInternalFields", () => {
  it("extracts only internal fields", () => {
    const input = {
      masks: [{ id: "m1" }],
      rawOcrEvidence: { blocks: [] },
      title: "visible",
    };
    const result = extractInternalFields(input);
    expect(result).toEqual({
      masks: [{ id: "m1" }],
      rawOcrEvidence: { blocks: [] },
    });
  });

  it("returns empty object when no internal fields", () => {
    const result = extractInternalFields({ title: "clean" });
    expect(result).toEqual({});
  });
});
