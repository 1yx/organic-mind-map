/**
 * Quality validation for concept units.
 *
 * Validates that each concept is a concise cognitive unit:
 * - Not sentence-like prose
 * - Within unit-width threshold (max 25)
 */

import type { AgentMindMapList, ValidationError } from "./types";
import { conceptUnitWidth } from "./unit-width";
import { isSentenceLike } from "./sentence-detect";

/**
 * Validate concept quality across the entire agent list.
 * Checks every concept for sentence-like patterns and unit-width.
 * Returns a list of quality errors. Empty list = all concepts valid.
 */
export function validateQuality(
  input: AgentMindMapList,
  maxUnitWidth: number = 25,
): ValidationError[] {
  const errors: ValidationError[] = [];

  errors.push(
    ...checkConcept(input.center.concept, "center.concept", maxUnitWidth),
  );

  for (let i = 0; i < input.branches.length; i++) {
    const branch = input.branches[i];
    const path = `branches[${i}]`;

    errors.push(
      ...checkConcept(branch.concept, `${path}.concept`, maxUnitWidth),
    );

    if (branch.children) {
      errors.push(...checkSubBranches(branch.children, path, maxUnitWidth));
    }
  }

  return errors;
}

function checkSubBranches(
  children: AgentMindMapList["branches"][number]["children"],
  parentPath: string,
  maxUnitWidth: number,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (let j = 0; j < children!.length; j++) {
    const sub = children![j];
    const subPath = `${parentPath}.children[${j}]`;

    errors.push(
      ...checkConcept(sub.concept, `${subPath}.concept`, maxUnitWidth),
    );

    if (sub.children) {
      for (let k = 0; k < sub.children.length; k++) {
        const leaf = sub.children[k];
        const leafPath = `${subPath}.children[${k}]`;
        errors.push(
          ...checkConcept(leaf.concept, `${leafPath}.concept`, maxUnitWidth),
        );
      }
    }
  }

  return errors;
}

function checkConcept(
  concept: string,
  path: string,
  maxUnitWidth: number,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Sentence-like check
  if (isSentenceLike(concept)) {
    errors.push({
      path,
      message: `concept looks like a sentence; use a concise concept unit: "${truncate(concept, 40)}"`,
    });
  }

  // Unit-width check
  const width = conceptUnitWidth(concept);
  if (width > maxUnitWidth) {
    errors.push({
      path,
      message: `concept unit-width ${width} exceeds maximum ${maxUnitWidth}: "${truncate(concept, 40)}"`,
    });
  }

  return errors;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}
