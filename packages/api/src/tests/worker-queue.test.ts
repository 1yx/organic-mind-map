/**
 * Worker queue contract tests using fixture input/output artifacts.
 */
import { describe, it, expect } from "vitest";
import type { WorkerJobPayload, WorkerOutput } from "../models/index";
import { parseContentOutlineText } from "../services/content-outline";

describe("Worker queue payload/output contract", () => {
  it("WorkerJobPayload has required fields", () => {
    const payload: WorkerJobPayload = {
      referenceImagePath: "input/reference.png",
      contentOutlinePath: "input/content_outline.json",
      outputDir: "output/job_001",
      profile: "phase2-default",
      jobId: "job_001",
    };
    expect(payload.referenceImagePath).toBeTruthy();
    expect(payload.contentOutlinePath).toBeTruthy();
    expect(payload.outputDir).toBeTruthy();
    expect(payload.profile).toBeTruthy();
    expect(payload.jobId).toBeTruthy();
  });

  it("WorkerOutput has expected shape for success", () => {
    const output: WorkerOutput = {
      ok: true,
      predictionOmmPath: "output/prediction.omm",
      artifacts: [
        { kind: "mask", path: "output/branches_mask.png" },
        { kind: "debug_overlay", path: "output/debug_overlay.png" },
      ],
      diagnostics: [],
    };
    expect(output.ok).toBe(true);
    expect(output.predictionOmmPath).toBeTruthy();
    expect(Array.isArray(output.artifacts)).toBe(true);
    expect(output.artifacts.length).toBeGreaterThan(0);
    for (const art of output.artifacts) {
      expect(art).toHaveProperty("kind");
      expect(art).toHaveProperty("path");
    }
  });

  it("WorkerOutput has expected shape for failure", () => {
    const output: WorkerOutput = {
      ok: false,
      artifacts: [],
      diagnostics: [
        { code: "extraction_failed", message: "No branches found" },
      ],
      error: "Branch mask was empty after filtering",
    };
    expect(output.ok).toBe(false);
    expect(output.error).toBeTruthy();
  });
});

describe("Content outline parsing — valid input", () => {
  it("parses valid outline", () => {
    const text = `Anthropic 产品之道
  极速交付
    研究预览
    跨职能
  PM 角色
    产品品味
    角色融合`;
    const outline = parseContentOutlineText(text);
    expect(outline.schema).toBe("omm.content_outline");
    expect(outline.version).toBe(1);
    expect(outline.center.concept).toBe("Anthropic 产品之道");
    expect(outline.branches).toHaveLength(2);
    expect(outline.branches[0].concept).toBe("极速交付");
    expect(outline.branches[0].children).toHaveLength(2);
    expect(outline.branches[0].children[0].concept).toBe("研究预览");
    expect(outline.branches[1].concept).toBe("PM 角色");
    expect(outline.branches[1].children).toHaveLength(2);
  });

  it("handles deep nesting", () => {
    const text = `Center
  B1
    S1
      SS1
        SSS1`;
    const outline = parseContentOutlineText(text);
    expect(
      outline.branches[0].children[0].children[0].children[0].concept,
    ).toBe("SSS1");
  });

  it("ignores blank lines and comments", () => {
    const text = `Center
# comment
  B1

  B2`;
    const outline = parseContentOutlineText(text);
    expect(outline.branches).toHaveLength(2);
  });

  it("branch IDs follow expected pattern", () => {
    const text = `Center
  B1
    S1
  B2`;
    const outline = parseContentOutlineText(text);
    expect(outline.branches[0].id).toBe("branch_001");
    expect(outline.branches[1].id).toBe("branch_002");
    expect(outline.branches[0].children[0].id).toBe("branch_001_001");
  });
});

describe("Content outline parsing — error cases", () => {
  it("rejects tabs", () => {
    expect(() => parseContentOutlineText("Center\n\tBranch1")).toThrow(
      "Tabs are not allowed",
    );
  });

  it("rejects empty input", () => {
    expect(() => parseContentOutlineText("")).toThrow("empty");
  });

  it("rejects indented first line", () => {
    expect(() => parseContentOutlineText("  Center")).toThrow(
      "First line must be at indent 0",
    );
  });
});
