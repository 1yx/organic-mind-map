/**
 * Phase 1 .omm Document Model Types
 *
 * Defines the complete type system for the .omm document format:
 * paper specifications, mind map tree, layout snapshots, asset manifests,
 * and the root OmmDocument envelope.
 *
 * All types are environment-neutral with no runtime dependencies.
 */

// ─── Paper ───────────────────────────────────────────────────────────────────

export type PaperKind = "a3-landscape" | "a4-landscape";

export interface PaperSpec {
  kind: PaperKind;
  widthMm: number;
  heightMm: number;
}

// ─── IDs and references ──────────────────────────────────────────────────────

export type NodeId = string;
export type AssetId = string;

export interface AssetRef {
  assetId: AssetId;
}

export interface BranchStyleRef {
  branchStyleId: string;
}

export interface BoiTag {
  label: string;
  order?: number;
}

export interface VisualToken {
  text: string;
  emphasis?: "bold" | "italic" | "underline";
}

export interface ExternalFileRef {
  path: string;
  description?: string;
}

// ─── Node model ──────────────────────────────────────────────────────────────

export interface MindNode {
  id: NodeId;
  concept: string;
  language?: "zh" | "en" | "mixed" | "unknown";
  visualTokens?: VisualToken[];
  imageRef?: AssetRef;
  branchStyle?: BranchStyleRef;
  children?: MindNode[];
  boi?: BoiTag;
  externalRefs?: ExternalFileRef[];
}

// ─── Center visual ───────────────────────────────────────────────────────────

export type CenterVisualMode = "image" | "styled-text" | "hybrid";
export type ComplianceState = "draft" | "needs-visuals" | "compliant";

export interface CenterVisual {
  mode: CenterVisualMode;
  titleText: string;
  imageRef?: AssetRef;
  visualHint?: string;
  minColorCount: number;
  complianceState: ComplianceState;
}

// ─── Mind map ────────────────────────────────────────────────────────────────

export interface RelationLink {
  id: string;
  sourceId: NodeId;
  targetId: NodeId;
}

export interface CloudOutline {
  id: string;
  nodeIds: NodeId[];
}

export interface ThemeState {
  id: string;
  name: string;
}

export interface MindMap {
  id: string;
  title: string;
  center: CenterVisual;
  children: MindNode[];
  relationLinks?: RelationLink[];
  clouds?: CloudOutline[];
  theme?: ThemeState;
}

// ─── Layout snapshot ─────────────────────────────────────────────────────────

export interface LayoutBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface CenterLayout {
  box: LayoutBox;
}

export interface NodeLayout {
  nodeId: NodeId;
  textAnchor: Point;
  textPathId?: string;
  textBox: LayoutBox;
  visualBox?: LayoutBox;
}

export interface BranchLayout {
  nodeId: NodeId;
  branchPath: string;
  textPath: string;
  strokeWidthStart: number;
  strokeWidthEnd: number;
}

export interface LayoutSnapshot {
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
}

// ─── Assets ──────────────────────────────────────────────────────────────────

export interface ImageAsset {
  id: AssetId;
  mimeType: string;
  source: "builtin";
  builtinId: string;
}

export interface AssetManifest {
  images: ImageAsset[];
}

// ─── Document metadata ───────────────────────────────────────────────────────

export interface DocumentMeta {
  createdAt?: string;
  updatedAt?: string;
  author?: string;
  tool?: string;
}

// ─── Root document ───────────────────────────────────────────────────────────

export interface OmmDocument {
  id: string;
  version: 1;
  title: string;
  paper: PaperSpec;
  organicSeed: string;
  rootMap: MindMap;
  layout: LayoutSnapshot;
  assets: AssetManifest;
  references?: ExternalFileRef[];
  meta: DocumentMeta;
}
