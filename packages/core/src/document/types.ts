/**
 * Phase 1 .omm Document Model Types
 *
 * Defines the complete type system for the .omm document format:
 * surface specifications, mind map tree, layout snapshots, asset manifests,
 * and the root OmmDocument envelope.
 *
 * All types are environment-neutral with no runtime dependencies.
 */

// ─── Surface ──────────────────────────────────────────────────────────────────

/**
 * MVP bounded surface preset.
 * Future presets (e.g. "16-9") may be added in later phases.
 */
export type SurfacePreset = "sqrt2-landscape";

export type SurfaceSpec = {
  preset: SurfacePreset;
  aspectRatio: number;
};

// ─── IDs and references ──────────────────────────────────────────────────────

export type NodeId = string;
export type AssetId = string;

export type AssetRef = {
  assetId: AssetId;
};

export type BranchStyleRef = {
  branchStyleId: string;
};

export type BoiTag = {
  label: string;
  order?: number;
};

export type VisualToken = {
  text: string;
  emphasis?: "bold" | "italic" | "underline";
};

export type ExternalFileRef = {
  path: string;
  description?: string;
};

// ─── Node model ──────────────────────────────────────────────────────────────

export type MindNode = {
  id: NodeId;
  concept: string;
  language?: "zh" | "en" | "mixed" | "unknown";
  visualTokens?: VisualToken[];
  imageRef?: AssetRef;
  branchStyle?: BranchStyleRef;
  children?: MindNode[];
  boi?: BoiTag;
  externalRefs?: ExternalFileRef[];
};

// ─── Center visual ───────────────────────────────────────────────────────────

export type CenterVisualMode = "image" | "styled-text" | "hybrid";
export type ComplianceState = "draft" | "needs-visuals" | "compliant";

export type CenterVisual = {
  mode: CenterVisualMode;
  titleText: string;
  imageRef?: AssetRef;
  visualHint?: string;
  minColorCount: number;
  complianceState: ComplianceState;
};

// ─── Mind map ────────────────────────────────────────────────────────────────

export type RelationLink = {
  id: string;
  sourceId: NodeId;
  targetId: NodeId;
};

export type CloudOutline = {
  id: string;
  nodeIds: NodeId[];
};

export type ThemeState = {
  id: string;
  name: string;
};

export type MindMap = {
  id: string;
  title: string;
  center: CenterVisual;
  children: MindNode[];
  relationLinks?: RelationLink[];
  clouds?: CloudOutline[];
  theme?: ThemeState;
};

// ─── Layout snapshot ─────────────────────────────────────────────────────────

export type LayoutBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Point = {
  x: number;
  y: number;
};

export type CenterLayout = {
  box: LayoutBox;
};

export type NodeLayout = {
  nodeId: NodeId;
  textAnchor: Point;
  textPathId?: string;
  textBox: LayoutBox;
  visualBox?: LayoutBox;
};

export type BranchLayout = {
  nodeId: NodeId;
  branchPath: string;
  textPath: string;
  strokeWidthStart: number;
  strokeWidthEnd: number;
};

export type LayoutSnapshot = {
  engineVersion: string;
  measuredAt: string;
  viewport: {
    widthPx: number;
    heightPx: number;
    viewBox: string;
  };
  environment?: {
    fontFamily?: string;
    fontVersion?: string;
    userAgent?: string;
  };
  center: CenterLayout;
  nodes: Record<NodeId, NodeLayout>;
  branches: Record<NodeId, BranchLayout>;
};

// ─── Assets ──────────────────────────────────────────────────────────────────

export type ImageAsset = {
  id: AssetId;
  mimeType: string;
  source: "builtin";
  builtinId: string;
};

export type AssetManifest = {
  images: ImageAsset[];
};

// ─── Document metadata ───────────────────────────────────────────────────────

export type DocumentMeta = {
  createdAt?: string;
  updatedAt?: string;
  author?: string;
  tool?: string;
};

// ─── Root document ───────────────────────────────────────────────────────────

export type OmmDocument = {
  id: string;
  version: 1;
  title: string;
  surface: SurfaceSpec;
  organicSeed: string;
  rootMap: MindMap;
  layout: LayoutSnapshot;
  assets: AssetManifest;
  references?: ExternalFileRef[];
  meta: DocumentMeta;
};
