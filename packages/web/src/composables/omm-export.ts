/**
 * .omm export composable for the Web preview.
 *
 * Builds a canonical OmmDocument from OrganicTree + RenderResult layout
 * and triggers a JSON file download as .omm.
 *
 * Tasks covered:
 * - 2.1: Export .omm with canonical nested document shape + layout snapshot
 */

import { ref, computed, type Ref } from "vue";
import {
  buildLayoutSnapshot,
  stableSerializeTree,
  deriveOrganicSeed,
  type RenderResult,
} from "@omm/renderer";
import type {
  OmmDocument,
  OrganicTree,
  MindMap,
  MindNode,
  CenterVisual,
  SurfaceSpec,
  AssetManifest,
  DocumentMeta,
  OrganicMainBranch,
} from "@omm/core";

// ─── Types ──────────────────────────────────────────────────────────────────

export type OmmExportState = {
  /** Whether the export is currently in progress. */
  exporting: Readonly<Ref<boolean>>;
  /** Error message from the last failed export, or null. */
  exportError: Readonly<Ref<string | null>>;
  /** Whether the Export .omm button should be enabled. */
  canExport: Readonly<Ref<boolean>>;
  /** Trigger .omm export. */
  doExport: () => void;
};

// ─── Tree Conversion ────────────────────────────────────────────────────────

/**
 * Build stable node IDs for an OrganicTree following the renderer's scheme.
 * Returns a map from branch path to node ID.
 */
function buildNodeIdMap(tree: OrganicTree): Map<string, string> {
  const map = new Map<string, string>();
  let index = 0;

  for (let i = 0; i < tree.branches.length; i++) {
    const branch = tree.branches[i]!;
    const mainId = `n-${index}`;
    map.set(`main-${i}`, mainId);
    index++;

    if (branch.children) {
      index = collectSubNodeIds(branch, i, index, map);
    }
  }

  return map;
}

/** Collect sub-node and leaf IDs for a branch. */
// eslint-disable-next-line max-params
function collectSubNodeIds(
  branch: OrganicMainBranch,
  mainIndex: number,
  index: number,
  map: Map<string, string>,
): number {
  if (!branch.children) return index;

  for (let j = 0; j < branch.children.length; j++) {
    const sub = branch.children[j]!;
    const subId = `n-${index}`;
    map.set(`sub-${mainIndex}-${j}`, subId);
    index++;

    if (sub.children) {
      for (let k = 0; k < sub.children.length; k++) {
        const _leaf = sub.children[k]!;
        const leafId = `n-${index}`;
        map.set(`leaf-${mainIndex}-${j}-${k}`, leafId);
        index++;
        void _leaf;
      }
    }
  }

  return index;
}

/**
 * Convert an OrganicTree into a nested MindMap structure.
 */
function convertTreeToMindMap(
  tree: OrganicTree,
  idMap: Map<string, string>,
): MindMap {
  const centerVisual: CenterVisual = {
    mode: tree.center.svgUrl ? "image" : "styled-text",
    titleText: tree.center.concept,
    visualHint: tree.center.visualHint,
    minColorCount: 1,
    complianceState: "draft",
  };

  const children: MindNode[] = tree.branches.map((branch, i) => {
    const mainId = idMap.get(`main-${i}`) ?? `n-${i}`;
    return {
      id: mainId,
      concept: branch.concept,
      visualTokens: branch.visualHint
        ? [{ text: branch.visualHint }]
        : undefined,
      children: branch.children?.map((sub, j) => {
        const subId = idMap.get(`sub-${i}-${j}`) ?? `n-${i}-${j}`;
        return {
          id: subId,
          concept: sub.concept,
          visualTokens: sub.visualHint ? [{ text: sub.visualHint }] : undefined,
          children: sub.children?.map((_leaf, k) => {
            const leafId =
              idMap.get(`leaf-${i}-${j}-${k}`) ?? `n-${i}-${j}-${k}`;
            return {
              id: leafId,
              concept: sub.children![k]!.concept,
              visualTokens: sub.children![k]!.visualHint
                ? [{ text: sub.children![k]!.visualHint! }]
                : undefined,
            };
          }),
        };
      }),
    };
  });

  return {
    id: "root-map",
    title: tree.title,
    center: centerVisual,
    children,
  };
}

// ─── File Download ──────────────────────────────────────────────────────────

/** Trigger a browser file download of JSON content as a .omm file. */
function downloadJsonAsFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/** Sanitize a title string for use as a filename. */
function sanitizeFilename(title: string): string {
  return (
    title
      .replace(/[^a-zA-Z0-9\u4e00-\u9fff\u3400-\u4dbf\s\-_.]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80) || "mind-map"
  );
}

// ─── Document Assembly ──────────────────────────────────────────────────────

/** Assemble a complete OmmDocument from the resolved components. */
function assembleOmmDocument(
  tree: OrganicTree,
  title: string,
  result: RenderResult,
): OmmDocument {
  const idMap = buildNodeIdMap(tree);
  const rootMap = convertTreeToMindMap(tree, idMap);
  const layoutSnapshot = buildLayoutSnapshot(result.layout);
  const serialized = stableSerializeTree(tree);
  const organicSeed = String(deriveOrganicSeed(serialized));
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    version: 1,
    title,
    surface: {
      preset: "sqrt2-landscape",
      aspectRatio: Math.SQRT2,
    } satisfies SurfaceSpec,
    organicSeed,
    rootMap,
    layout: layoutSnapshot,
    assets: { images: [] } satisfies AssetManifest,
    meta: {
      createdAt: now,
      updatedAt: now,
      tool: "@omm/web",
    } satisfies DocumentMeta,
  };
}

// ─── Type Guards & Conversion ───────────────────────────────────────────────

/** Type guard: check if data is an OrganicTree. */
function isOrganicTree(data: OrganicTree | OmmDocument): data is OrganicTree {
  return "center" in data && "branches" in data;
}

/** Convert an OmmDocument back to OrganicTree format. */
function convertOmmDocumentToTree(doc: OmmDocument): OrganicTree {
  return {
    version: 1,
    title: doc.title,
    center: {
      concept: doc.rootMap.center.titleText,
      visualHint: doc.rootMap.center.visualHint,
    },
    branches: (doc.rootMap.children ?? []).map((node) => ({
      concept: node.concept,
      visualHint: node.visualTokens?.[0]?.text,
      children: (node.children ?? []).map((child) => ({
        concept: child.concept,
        visualHint: child.visualTokens?.[0]?.text,
        children: (child.children ?? []).map((leaf) => ({
          concept: leaf.concept,
          visualHint: leaf.visualTokens?.[0]?.text,
        })),
      })),
    })),
  };
}

// ─── Composable ─────────────────────────────────────────────────────────────

/**
 * Create .omm export state for the preview page.
 *
 * @param params - Reactive state from the preview
 * @returns Reactive export state and action
 */
export function useOmmExport(params: {
  /** Whether the preview has rendered successfully. */
  renderReady: Readonly<Ref<boolean>>;
  /** The loaded document data (OrganicTree or OmmDocument). */
  documentData: Readonly<Ref<OrganicTree | OmmDocument | null>>;
  /** The render result with layout geometry. */
  renderResult: Readonly<Ref<RenderResult | null>>;
  /** The loaded inline SVG for the center visual (null = not loaded). */
  inlineSvg: Readonly<Ref<string | null>>;
  /** Whether the center visual fell back to built-in. */
  fellBack: Readonly<Ref<boolean>>;
}): OmmExportState {
  const exporting = ref(false);
  const exportError = ref<string | null>(null);

  const canExport = computed(() => {
    if (exporting.value) return false;
    if (!params.renderReady.value) return false;
    if (!params.documentData.value) return false;
    if (!params.renderResult.value) return false;
    return true;
  });

  function doExport(): void {
    if (!canExport.value) return;

    const doc = params.documentData.value;
    const result = params.renderResult.value;
    if (!doc || !result) return;

    exporting.value = true;
    exportError.value = null;

    try {
      const tree = isOrganicTree(doc) ? doc : convertOmmDocumentToTree(doc);
      const title = doc.title;

      const ommDocument = assembleOmmDocument(tree, title, result);
      const json = JSON.stringify(ommDocument, null, 2);
      const filename = `${sanitizeFilename(title)}.omm`;
      downloadJsonAsFile(json, filename);
    } catch (e) {
      exportError.value =
        e instanceof Error ? e.message : "Failed to export .omm file.";
    } finally {
      exporting.value = false;
    }
  }

  return { exporting, exportError, canExport, doExport };
}
