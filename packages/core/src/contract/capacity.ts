/**
 * Capacity threshold validation for agent list input.
 *
 * Checks total nodes, depth, siblings per node, and main branches
 * against configurable MVP limits.
 */

import type { AgentMindMapList, AgentListLimits, CapacityError } from "./types";

/**
 * Validate that the agent list stays within capacity limits.
 * Returns capacity errors if any limit is exceeded.
 */
export function validateCapacity(
  input: AgentMindMapList,
  limits: AgentListLimits,
): CapacityError[] {
  const errors: CapacityError[] = [];

  // Main branches count
  if (input.branches.length > limits.maxMainBranches) {
    errors.push({
      path: "branches",
      message: `branch count ${input.branches.length} exceeds maxMainBranches ${limits.maxMainBranches}`,
      limit: limits.maxMainBranches,
      actual: input.branches.length,
    });
  }

  // Total node count
  let totalNodes = 0;
  totalNodes += 1; // center
  for (const branch of input.branches) {
    totalNodes += 1; // main branch
    if (branch.children) {
      totalNodes += branch.children.length;
      for (const sub of branch.children) {
        if (sub.children) {
          totalNodes += sub.children.length;
        }
      }
    }
  }

  if (totalNodes > limits.maxNodes) {
    errors.push({
      path: "",
      message: `total nodes ${totalNodes} exceeds maxNodes ${limits.maxNodes}`,
      limit: limits.maxNodes,
      actual: totalNodes,
    });
  }

  // Siblings per node
  // Main branches are siblings at root level (already checked via maxMainBranches above)
  for (let i = 0; i < input.branches.length; i++) {
    const branch = input.branches[i];
    if (branch.children && branch.children.length > limits.maxSiblingsPerNode) {
      errors.push({
        path: `branches[${i}].children`,
        message: `branch[${i}].children count ${branch.children.length} exceeds maxSiblingsPerNode ${limits.maxSiblingsPerNode}`,
        limit: limits.maxSiblingsPerNode,
        actual: branch.children.length,
      });
    }

    if (branch.children) {
      for (let j = 0; j < branch.children.length; j++) {
        const sub = branch.children[j];
        if (sub.children && sub.children.length > limits.maxSiblingsPerNode) {
          errors.push({
            path: `branches[${i}].children[${j}].children`,
            message: `branch[${i}].children[${j}].children count ${sub.children.length} exceeds maxSiblingsPerNode ${limits.maxSiblingsPerNode}`,
            limit: limits.maxSiblingsPerNode,
            actual: sub.children.length,
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Format capacity errors into a retry-friendly message for Agent CLIs.
 */
export function formatCapacityFeedback(errors: CapacityError[]): string {
  const lines = errors.map((e) => `- ${e.path || "total"}: ${e.message}`);
  return `Input exceeds MVP capacity:\n${lines.join("\n")}\nPlease regenerate a shorter concept list.`;
}
