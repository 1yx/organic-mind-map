/**
 * OrganicTree contract types for organic mind map.
 *
 * This defines the structured input format that the CLI consumes
 * and the renderer uses. The contract is explicitly limited to 3 levels
 * to ensure stable LLM structured output.
 *
 * JSON format, version 1. No recursive types.
 */

// --- Contract Types ---

export type OrganicTree = {
  version: 1;
  title: string;
  paper?: "a3-landscape" | "a4-landscape";
  center: OrganicTreeCenter;
  branches: OrganicMainBranch[];
  meta?: {
    sourceTitle?: string;
    sourceSummary?: string;
  };
};

export type OrganicTreeCenter = {
  concept: string;
  visualHint?: string;
  /** Optional controlled SVG URL from an allowlisted HTTPS source. */
  svgUrl?: string;
};

export type OrganicMainBranch = {
  concept: string;
  children?: OrganicSubBranch[];
  visualHint?: string;
  colorHint?: string;
};

export type OrganicSubBranch = {
  concept: string;
  children?: OrganicLeafNode[];
  visualHint?: string;
};

export type OrganicLeafNode = {
  concept: string;
  visualHint?: string;
  /** Optional children for structural forward-compatibility. MVP validation still enforces max depth 3. */
  children?: OrganicLeafNode[];
};

// --- Capacity Limits ---

export type OrganicTreeLimits = {
  maxNodes: number;
  maxDepth: 3;
  maxSiblingsPerNode: number;
  maxConceptUnitWidth: 25;
  maxMainBranches: number;
};

export const DEFAULT_LIMITS: OrganicTreeLimits = {
  maxNodes: 45,
  maxDepth: 3,
  maxSiblingsPerNode: 8,
  maxConceptUnitWidth: 25,
  maxMainBranches: 8,
};

// --- Validation Errors ---

export type ValidationError = {
  path: string;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
  data: OrganicTree | null;
};

export type CapacityError = {
  path: string;
  message: string;
  limit: number;
  actual: number;
};

export type CapacityResult = {
  withinCapacity: boolean;
  errors: CapacityError[];
};
