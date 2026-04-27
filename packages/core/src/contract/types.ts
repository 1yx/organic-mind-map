/**
 * Agent list contract types for organic mind map.
 *
 * This defines the structured input format that an agent skill produces
 * and the CLI consumes. The contract is explicitly limited to 3 levels
 * to ensure stable LLM structured output.
 *
 * JSON format, version 1. No recursive types.
 */

// --- Contract Types ---

export interface AgentMindMapList {
  version: 1;
  title: string;
  paper?: "a3-landscape" | "a4-landscape";
  center: AgentCenter;
  branches: MainBranch[];
  meta?: {
    sourceTitle?: string;
    sourceSummary?: string;
  };
}

export interface AgentCenter {
  concept: string;
  visualHint?: string;
}

export interface MainBranch {
  concept: string;
  children?: SubBranch[];
  visualHint?: string;
  colorHint?: string;
}

export interface SubBranch {
  concept: string;
  children?: LeafNode[];
  visualHint?: string;
}

export interface LeafNode {
  concept: string;
  visualHint?: string;
}

// --- Capacity Limits ---

export interface AgentListLimits {
  maxNodes: number;
  maxDepth: 3;
  maxSiblingsPerNode: number;
  maxConceptUnitWidth: 25;
  maxMainBranches: number;
}

export const DEFAULT_LIMITS: AgentListLimits = {
  maxNodes: 45,
  maxDepth: 3,
  maxSiblingsPerNode: 8,
  maxConceptUnitWidth: 25,
  maxMainBranches: 8,
};

// --- Validation Errors ---

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data: AgentMindMapList | null;
}

export interface CapacityError {
  path: string;
  message: string;
  limit: number;
  actual: number;
}

export interface CapacityResult {
  withinCapacity: boolean;
  errors: CapacityError[];
}
