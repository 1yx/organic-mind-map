/**
 * Agent list validation — main entrypoint.
 *
 * Orchestrates structural, quality, and capacity validation.
 * Never rewrites, merges, splits, or semantically compresses concepts.
 * Always returns errors — never silently passes invalid input.
 *
 * JSON contract shape and validation behavior:
 *
 * ```json
 * {
 *   "version": 1,
 *   "title": "...",
 *   "paper": "a3-landscape" | "a4-landscape",
 *   "center": { "concept": "...", "visualHint?": "..." },
 *   "branches": [
 *     {
 *       "concept": "...",
 *       "children?": [{ "concept": "...", "children?": [{ "concept": "..." }] }],
 *       "visualHint?": "...",
 *       "colorHint?": "..."
 *     }
 *   ],
 *   "meta?": { "sourceTitle?": "...", "sourceSummary?": "..." }
 * }
 * ```
 *
 * Validation layers:
 * 1. Structural: required fields, types, depth (max 3), array shape
 * 2. Quality: sentence-like concepts (Error), unit-width \> 25 (Error)
 * 3. Capacity: total nodes, siblings, main branches against limits
 *
 * Note: Markdown outline parsing and direct LLM calls are outside this module.
 * The agent (Gemini CLI / Codex CLI / Claude Code) owns semantic compression.
 * This module only validates — it never rewrites concepts.
 *
 * Example Agent CLI retry feedback for oversized content:
 * ```
 * Input exceeds MVP capacity:
 * - total nodes 126 exceeds maxNodes 45
 * - branches[2].children count 18 exceeds maxSiblingsPerNode 8
 * Please regenerate a shorter concept list.
 * ```
 */

import {
  DEFAULT_LIMITS,
  type AgentMindMapList,
  type AgentListLimits,
  type ValidationError,
  type ValidationResult,
} from "./types";
import { validateStructural } from "./structural";
import { validateQuality } from "./quality";
import { validateCapacity } from "./capacity";

export { validateStructural } from "./structural";
export { validateQuality } from "./quality";
export { validateCapacity, formatCapacityFeedback } from "./capacity";
export { conceptUnitWidth } from "./unit-width";
export { isSentenceLike } from "./sentence-detect";
export * from "./types";

/**
 * Validate an agent list input through all layers: structural, quality, capacity.
 * Returns a ValidationResult with errors if any validation fails.
 * On success, the data field contains the typed AgentMindMapList.
 */
export function validateAgentList(
  input: unknown,
  limits: AgentListLimits = DEFAULT_LIMITS,
): ValidationResult {
  // Layer 1: Structural validation
  const structuralErrors = validateStructural(input);
  if (structuralErrors.length > 0) {
    return { valid: false, errors: structuralErrors, data: null };
  }

  const data = input as AgentMindMapList;

  // Layer 2: Quality validation
  const qualityErrors = validateQuality(data, limits.maxConceptUnitWidth);
  if (qualityErrors.length > 0) {
    return { valid: false, errors: qualityErrors, data: null };
  }

  // Layer 3: Capacity validation
  const capacityErrors = validateCapacity(data, limits);
  if (capacityErrors.length > 0) {
    const errors: ValidationError[] = capacityErrors.map((e) => ({
      path: e.path,
      message: e.message,
    }));
    return { valid: false, errors, data: null };
  }

  return { valid: true, errors: [], data };
}

/**
 * Traverse sub-branches and their leaf children for a main branch.
 */
function traverseSubBranches(
  children: import("./types").SubBranch[],
  mainPath: string,
  callback: (concept: string, path: string, depth: number) => void,
): void {
  for (let j = 0; j < children.length; j++) {
    const sub = children[j];
    const subPath = `${mainPath}.children[${j}]`;
    callback(sub.concept, `${subPath}.concept`, 2);

    if (sub.children) {
      for (let k = 0; k < sub.children.length; k++) {
        const leaf = sub.children[k];
        callback(leaf.concept, `${subPath}.children[${k}].concept`, 3);
      }
    }
  }
}

/**
 * Level-aware branch traversal that preserves sibling order
 * and reports stable path strings.
 */
export function traverseBranches(
  input: AgentMindMapList,
  callback: (concept: string, path: string, depth: number) => void,
): void {
  // Center
  callback(input.center.concept, "center.concept", 0);

  // Main branches
  for (let i = 0; i < input.branches.length; i++) {
    const main = input.branches[i];
    const mainPath = `branches[${i}]`;
    callback(main.concept, `${mainPath}.concept`, 1);

    if (main.children) {
      traverseSubBranches(main.children, mainPath, callback);
    }
  }
}
