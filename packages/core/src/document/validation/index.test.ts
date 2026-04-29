import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateOmmDocument } from "./index";
import type { OmmValidationResult } from "./types";

function loadFixture(name: string): unknown {
  const fixturePath = join(
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
  return JSON.parse(readFileSync(fixturePath, "utf-8"));
}

function validate(doc: unknown): OmmValidationResult {
  return validateOmmDocument(doc) as OmmValidationResult;
}

describe("validateOmmDocument — valid fixtures", () => {
  it("accepts valid-minimal-a3.json", () => {
    expect(validate(loadFixture("valid-minimal-a3")).valid).toBe(true);
  });

  it("accepts valid-a4-with-center-visual.json", () => {
    expect(validate(loadFixture("valid-a4-with-center-visual")).valid).toBe(
      true,
    );
  });
});

describe("validateOmmDocument — envelope", () => {
  it("rejects missing document (not an object)", () => {
    const result = validate(null);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "envelope.missing")).toBe(true);
  });

  it("rejects missing version", () => {
    const doc = loadFixture("valid-minimal-a3") as Record<string, unknown>;
    const { id: _id, ...rest } = doc;
    const result = validate({ ...rest, version: undefined });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === "envelope.invalid_version"),
    ).toBe(true);
  });

  it("rejects wrong version", () => {
    const doc = loadFixture("valid-minimal-a3") as Record<string, unknown>;
    const result = validate({ ...doc, version: 2 });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === "envelope.invalid_version"),
    ).toBe(true);
  });

  it("rejects missing organicSeed when no layout snapshot exists", () => {
    const doc = loadFixture("valid-minimal-a3") as Record<string, unknown>;
    const { layout: _layout, ...withoutLayout } = doc;
    const result = validate({ ...withoutLayout, organicSeed: "" });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === "envelope.missing_organicSeed"),
    ).toBe(true);
  });

  it("rejects array rootMap (multiple maps)", () => {
    const doc = loadFixture("valid-minimal-a3") as Record<string, unknown>;
    const result = validate({ ...doc, rootMap: [{ id: "1" }] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "envelope.multiple_maps")).toBe(
      true,
    );
  });
});

describe("validateOmmDocument — surface", () => {
  it("rejects unsupported surface preset", () => {
    const result = validate(loadFixture("invalid-unsupported-paper"));
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === "surface.unsupported_preset"),
    ).toBe(true);
  });
});

describe("validateOmmDocument — tree", () => {
  it("rejects duplicate node IDs", () => {
    const result = validate(loadFixture("invalid-duplicate-node-ids"));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "tree.duplicate_id")).toBe(
      true,
    );
  });

  it("rejects persisted parentId on nodes", () => {
    const result = validate(loadFixture("invalid-stale-parent-child-ids"));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "tree.stale_parentId")).toBe(
      true,
    );
  });

  it("rejects persisted childIds on nodes", () => {
    const result = validate(loadFixture("invalid-stale-parent-child-ids"));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "tree.stale_childIds")).toBe(
      true,
    );
  });

  it("rejects empty concept", () => {
    const doc = loadFixture("valid-minimal-a3") as Record<string, unknown>;
    const modified = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
    const rootMap = modified.rootMap as Record<string, unknown>;
    const children = rootMap.children as Record<string, unknown>[];
    (children[0] as Record<string, unknown>).concept = "";
    const result = validate(modified);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "tree.empty_concept")).toBe(
      true,
    );
  });
});

describe("validateOmmDocument — center visual", () => {
  it("rejects plain string center visual", () => {
    const result = validate(loadFixture("invalid-missing-center-visual"));
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === "center_visual.plain_text"),
    ).toBe(true);
  });

  it("rejects missing center visual object", () => {
    const doc = loadFixture("valid-minimal-a3") as Record<string, unknown>;
    const modified = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
    const rootMap = modified.rootMap as Record<string, unknown>;
    delete rootMap.center;
    const result = validate(modified);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "center_visual.missing")).toBe(
      true,
    );
  });

  it("rejects compliant state with minColorCount < 2", () => {
    const doc = loadFixture("valid-minimal-a3") as Record<string, unknown>;
    const modified = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
    const rootMap = modified.rootMap as Record<string, unknown>;
    const center = rootMap.center as Record<string, unknown>;
    center.minColorCount = 1;
    center.complianceState = "compliant";
    const result = validate(modified);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === "center_visual.insufficient_colors"),
    ).toBe(true);
  });
});

describe("validateOmmDocument — assets (sources)", () => {
  it("rejects missing asset references", () => {
    const result = validate(loadFixture("invalid-missing-asset-refs"));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "assets.unresolved_ref")).toBe(
      true,
    );
  });

  it("rejects source: uploaded", () => {
    const result = validate(loadFixture("invalid-uploaded-base64-assets"));
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === "assets.unsupported_source"),
    ).toBe(true);
  });

  it("rejects source: generated", () => {
    const result = validate(loadFixture("invalid-uploaded-base64-assets"));
    expect(result.valid).toBe(false);
    const genError = result.errors.find(
      (e) =>
        e.code === "assets.unsupported_source" && e.path.includes("images[1]"),
    );
    expect(genError).toBeDefined();
  });

  it("rejects embedded Base64 data fields", () => {
    const result = validate(loadFixture("invalid-uploaded-base64-assets"));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "assets.embedded_data")).toBe(
      true,
    );
  });
});

describe("validateOmmDocument — assets (builtin)", () => {
  it("accepts built-in assets with builtinId", () => {
    const result = validate(loadFixture("valid-a4-with-center-visual"));
    expect(result.valid).toBe(true);
  });

  it("rejects unknown built-in asset IDs", () => {
    const doc = loadFixture("valid-a4-with-center-visual") as Record<
      string,
      unknown
    >;
    const modified = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
    const assets = modified.assets as Record<string, unknown>;
    const images = assets.images as Record<string, unknown>[];
    images[0].builtinId = "does-not-exist";
    const result = validate(modified);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === "assets.unknown_builtinId"),
    ).toBe(true);
    expect(
      result.errors.some((e) => e.path === "assets.images[0].builtinId"),
    ).toBe(true);
  });
});

describe("validateOmmDocument — layout", () => {
  it("rejects missing layout fields", () => {
    const result = validate(loadFixture("invalid-missing-layout"));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code.startsWith("layout."))).toBe(true);
  });

  it("rejects layout referencing unknown node ID", () => {
    const doc = loadFixture("valid-minimal-a3") as Record<string, unknown>;
    const modified = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
    const layout = modified.layout as Record<string, unknown>;
    const nodes = layout.nodes as Record<string, unknown>;
    nodes["nonexistent-node"] = {
      nodeId: "nonexistent-node",
      textAnchor: { x: 0, y: 0 },
      textBox: { x: 0, y: 0, width: 100, height: 30 },
    };
    const result = validate(modified);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === "layout.unknown_node_ref"),
    ).toBe(true);
  });

  it("rejects branch referencing unknown node ID", () => {
    const doc = loadFixture("valid-minimal-a3") as Record<string, unknown>;
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
    const result = validate(modified);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === "layout.unknown_branch_ref"),
    ).toBe(true);
  });
});

describe("validateOmmDocument — excluded state (nodes)", () => {
  it("rejects displayText on nodes", () => {
    const result = validate(loadFixture("invalid-display-text"));
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === "excluded_state.displayText"),
    ).toBe(true);
  });

  it("rejects ellipsisText on nodes", () => {
    const result = validate(loadFixture("invalid-display-text"));
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === "excluded_state.ellipsisText"),
    ).toBe(true);
  });

  it("rejects truncationText on nodes", () => {
    const result = validate(loadFixture("invalid-display-text"));
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === "excluded_state.truncationText"),
    ).toBe(true);
  });
});

describe("validateOmmDocument — excluded state (editor)", () => {
  it("rejects editor state fields at document level", () => {
    const doc = loadFixture("valid-minimal-a3") as Record<string, unknown>;
    const result = validate({
      ...doc,
      selection: { nodeIds: ["node-1"] },
      undoStack: [{ action: "add" }],
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === "excluded_state.selection"),
    ).toBe(true);
    expect(
      result.errors.some((e) => e.code === "excluded_state.undoStack"),
    ).toBe(true);
  });
});

describe("validateOmmDocument — excluded state (plus)", () => {
  it("rejects Plus state fields", () => {
    const doc = loadFixture("valid-minimal-a3") as Record<string, unknown>;
    const result = validate({
      ...doc,
      cloudPermissions: { canEdit: true },
      ragIndex: { enabled: false },
      versionHistory: [{ id: "v1" }],
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === "excluded_state.cloudPermissions"),
    ).toBe(true);
    expect(
      result.errors.some((e) => e.code === "excluded_state.ragIndex"),
    ).toBe(true);
    expect(
      result.errors.some((e) => e.code === "excluded_state.versionHistory"),
    ).toBe(true);
  });
});

describe("validateOmmDocument — excluded state (source)", () => {
  it("rejects source snapshots and submapNavigation", () => {
    const doc = loadFixture("valid-minimal-a3") as Record<string, unknown>;
    const result = validate({
      ...doc,
      sourceSnapshots: [{ id: "s1" }],
      sourceObjectMappings: { "node-1": "s1" },
      submapNavigation: { currentMapId: "map-001" },
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === "excluded_state.sourceSnapshots"),
    ).toBe(true);
    expect(
      result.errors.some(
        (e) => e.code === "excluded_state.sourceObjectMappings",
      ),
    ).toBe(true);
    expect(
      result.errors.some((e) => e.code === "excluded_state.submapNavigation"),
    ).toBe(true);
  });
});
