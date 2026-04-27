import { describe, it, expect } from "vitest";
import { validateOmmDocument } from "./index";
import type { OmmValidationResult } from "./types";

// Helper to load fixture JSON files
function loadFixture(name: string): unknown {
  // Resolve relative to the fixtures directory
  const { readFileSync } = await_import_fs();
  const path = await_import_path();
  const fixturePath = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "..",
    "fixtures",
    "omm",
    `${name}.json`,
  );
  const raw = readFileSync(fixturePath, "utf-8");
  return JSON.parse(raw);
}

// Dynamic import helpers to keep TypeScript strict mode happy
function await_import_fs() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("node:fs");
}
function await_import_path() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("node:path");
}

describe("validateOmmDocument", () => {
  describe("valid fixtures", () => {
    it("accepts valid-minimal-a3.json", () => {
      const doc = loadFixture("valid-minimal-a3");
      const result = validateOmmDocument(doc) as OmmValidationResult;
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("accepts valid-a4-with-center-visual.json", () => {
      const doc = loadFixture("valid-a4-with-center-visual");
      const result = validateOmmDocument(doc) as OmmValidationResult;
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("envelope validation", () => {
    it("rejects missing document (not an object)", () => {
      const result = validateOmmDocument(null) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "envelope.missing")).toBe(true);
    });

    it("rejects missing version", () => {
      const doc = loadFixture("valid-minimal-a3");
      const { id, ...rest } = doc as Record<string, unknown>;
      const without = { ...rest, version: undefined };
      const result = validateOmmDocument(without) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "envelope.invalid_version")).toBe(true);
    });

    it("rejects wrong version", () => {
      const doc = loadFixture("valid-minimal-a3");
      const modified = { ...(doc as Record<string, unknown>), version: 2 };
      const result = validateOmmDocument(modified) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "envelope.invalid_version")).toBe(true);
    });

    it("rejects missing organicSeed", () => {
      const doc = loadFixture("valid-minimal-a3");
      const modified = { ...(doc as Record<string, unknown>), organicSeed: "" };
      const result = validateOmmDocument(modified) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "envelope.missing_organicSeed")).toBe(true);
    });

    it("rejects array rootMap (multiple maps)", () => {
      const doc = loadFixture("valid-minimal-a3");
      const modified = { ...(doc as Record<string, unknown>), rootMap: [{ id: "1" }] };
      const result = validateOmmDocument(modified) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "envelope.multiple_maps")).toBe(true);
    });
  });

  describe("paper validation", () => {
    it("rejects unsupported paper kind", () => {
      const doc = loadFixture("invalid-unsupported-paper");
      const result = validateOmmDocument(doc) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "paper.unsupported_kind")).toBe(true);
    });
  });

  describe("tree validation", () => {
    it("rejects duplicate node IDs", () => {
      const doc = loadFixture("invalid-duplicate-node-ids");
      const result = validateOmmDocument(doc) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "tree.duplicate_id")).toBe(true);
    });

    it("rejects persisted parentId on nodes", () => {
      const doc = loadFixture("invalid-stale-parent-child-ids");
      const result = validateOmmDocument(doc) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "tree.stale_parentId")).toBe(true);
    });

    it("rejects persisted childIds on nodes", () => {
      const doc = loadFixture("invalid-stale-parent-child-ids");
      const result = validateOmmDocument(doc) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "tree.stale_childIds")).toBe(true);
    });

    it("rejects empty concept", () => {
      const doc = loadFixture("valid-minimal-a3");
      const modified = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
      const rootMap = modified.rootMap as Record<string, unknown>;
      const children = rootMap.children as Record<string, unknown>[];
      (children[0] as Record<string, unknown>).concept = "";
      const result = validateOmmDocument(modified) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "tree.empty_concept")).toBe(true);
    });
  });

  describe("center visual validation", () => {
    it("rejects plain string center visual", () => {
      const doc = loadFixture("invalid-missing-center-visual");
      const result = validateOmmDocument(doc) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "center_visual.plain_text")).toBe(true);
    });

    it("rejects missing center visual object", () => {
      const doc = loadFixture("valid-minimal-a3");
      const modified = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
      const rootMap = modified.rootMap as Record<string, unknown>;
      delete rootMap.center;
      const result = validateOmmDocument(modified) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "center_visual.missing")).toBe(true);
    });

    it("rejects compliant state with minColorCount < 2", () => {
      const doc = loadFixture("valid-minimal-a3");
      const modified = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
      const rootMap = modified.rootMap as Record<string, unknown>;
      const center = rootMap.center as Record<string, unknown>;
      center.minColorCount = 1;
      center.complianceState = "compliant";
      const result = validateOmmDocument(modified) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "center_visual.insufficient_colors")).toBe(true);
    });
  });

  describe("asset validation", () => {
    it("rejects missing asset references", () => {
      const doc = loadFixture("invalid-missing-asset-refs");
      const result = validateOmmDocument(doc) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "assets.unresolved_ref")).toBe(true);
    });

    it("rejects source: uploaded", () => {
      const doc = loadFixture("invalid-uploaded-base64-assets");
      const result = validateOmmDocument(doc) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "assets.unsupported_source")).toBe(true);
    });

    it("rejects source: generated", () => {
      const doc = loadFixture("invalid-uploaded-base64-assets");
      const result = validateOmmDocument(doc) as OmmValidationResult;
      expect(result.valid).toBe(false);
      // generated-1 has source "generated"
      const genError = result.errors.find(
        (e) => e.code === "assets.unsupported_source" && e.path.includes("images[1]"),
      );
      expect(genError).toBeDefined();
    });

    it("rejects embedded Base64 data fields", () => {
      const doc = loadFixture("invalid-uploaded-base64-assets");
      const result = validateOmmDocument(doc) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "assets.embedded_data")).toBe(true);
    });

    it("accepts built-in assets with builtinId", () => {
      const doc = loadFixture("valid-a4-with-center-visual");
      const result = validateOmmDocument(doc) as OmmValidationResult;
      // This fixture has a valid built-in asset
      expect(result.valid).toBe(true);
    });
  });

  describe("layout validation", () => {
    it("rejects missing layout fields", () => {
      const doc = loadFixture("invalid-missing-layout");
      const result = validateOmmDocument(doc) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code.startsWith("layout."))).toBe(true);
    });

    it("rejects layout referencing unknown node ID", () => {
      const doc = loadFixture("valid-minimal-a3");
      const modified = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
      const layout = modified.layout as Record<string, unknown>;
      const nodes = layout.nodes as Record<string, unknown>;
      nodes["nonexistent-node"] = {
        nodeId: "nonexistent-node",
        textAnchor: { x: 0, y: 0 },
        textBox: { x: 0, y: 0, width: 100, height: 30 },
      };
      const result = validateOmmDocument(modified) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "layout.unknown_node_ref")).toBe(true);
    });

    it("rejects branch referencing unknown node ID", () => {
      const doc = loadFixture("valid-minimal-a3");
      const modified = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
      const layout = modified.layout as Record<string, unknown>;
      const branches = layout.branches as Record<string, unknown>;
      branches["nonexistent-branch"] = {
        nodeId: "nonexistent-branch",
        branchPath: "M0,0 L100,100",
        textPath: "branch-text-fake",
        strokeWidthStart: 5,
        strokeWidthEnd: 2,
      };
      const result = validateOmmDocument(modified) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "layout.unknown_branch_ref")).toBe(true);
    });
  });

  describe("excluded state validation", () => {
    it("rejects displayText on nodes", () => {
      const doc = loadFixture("invalid-display-text");
      const result = validateOmmDocument(doc) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "excluded_state.displayText")).toBe(true);
    });

    it("rejects ellipsisText on nodes", () => {
      const doc = loadFixture("invalid-display-text");
      const result = validateOmmDocument(doc) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "excluded_state.ellipsisText")).toBe(true);
    });

    it("rejects truncationText on nodes", () => {
      const doc = loadFixture("invalid-display-text");
      const result = validateOmmDocument(doc) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "excluded_state.truncationText")).toBe(true);
    });

    it("rejects editor state fields at document level", () => {
      const doc = loadFixture("valid-minimal-a3");
      const modified = {
        ...(doc as Record<string, unknown>),
        selection: { nodeIds: ["node-1"] },
        undoStack: [{ action: "add" }],
      };
      const result = validateOmmDocument(modified) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "excluded_state.selection")).toBe(true);
      expect(result.errors.some((e) => e.code === "excluded_state.undoStack")).toBe(true);
    });

    it("rejects Plus state fields", () => {
      const doc = loadFixture("valid-minimal-a3");
      const modified = {
        ...(doc as Record<string, unknown>),
        cloudPermissions: { canEdit: true },
        ragIndex: { enabled: false },
        versionHistory: [{ id: "v1" }],
      };
      const result = validateOmmDocument(modified) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "excluded_state.cloudPermissions")).toBe(true);
      expect(result.errors.some((e) => e.code === "excluded_state.ragIndex")).toBe(true);
      expect(result.errors.some((e) => e.code === "excluded_state.versionHistory")).toBe(true);
    });

    it("rejects source snapshots and submapNavigation", () => {
      const doc = loadFixture("valid-minimal-a3");
      const modified = {
        ...(doc as Record<string, unknown>),
        sourceSnapshots: [{ id: "s1" }],
        sourceObjectMappings: { "node-1": "s1" },
        submapNavigation: { currentMapId: "map-001" },
      };
      const result = validateOmmDocument(modified) as OmmValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "excluded_state.sourceSnapshots")).toBe(true);
      expect(result.errors.some((e) => e.code === "excluded_state.sourceObjectMappings")).toBe(true);
      expect(result.errors.some((e) => e.code === "excluded_state.submapNavigation")).toBe(true);
    });
  });
});
