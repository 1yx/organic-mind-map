/**
 * Structural validation for AgentMindMapList.
 *
 * Validates required fields, correct types, depth limits, and
 * preserves optional hints without semantic rewriting.
 */

import type {
  AgentMindMapList,
  AgentCenter,
  MainBranch,
  SubBranch,
  LeafNode,
  ValidationError,
} from "./types";

/**
 * Validate the structure of an agent list input.
 * Returns a list of validation errors. Empty list = valid.
 */
export function validateStructural(input: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input || typeof input !== "object") {
    return [{ path: "", message: "Input must be a non-null object" }];
  }

  const doc = input as Record<string, unknown>;

  // version
  if (doc.version !== 1) {
    errors.push({
      path: "version",
      message: `Unsupported contract version: expected 1, got ${doc.version}`,
    });
    // Don't continue validation if version is wrong
    return errors;
  }

  // title
  if (typeof doc.title !== "string" || doc.title.trim().length === 0) {
    errors.push({
      path: "title",
      message: "title must be a non-empty string",
    });
  }

  // paper (optional)
  if (doc.paper !== undefined) {
    if (doc.paper !== "a3-landscape" && doc.paper !== "a4-landscape") {
      errors.push({
        path: "paper",
        message: 'paper must be "a3-landscape" or "a4-landscape" if specified',
      });
    }
  }

  // center
  errors.push(...validateCenter(doc.center));

  // branches
  errors.push(...validateBranches(doc.branches));

  return errors;
}

function validateCenter(center: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!center || typeof center !== "object") {
    errors.push({ path: "center", message: "center must be an object" });
    return errors;
  }

  const c = center as Record<string, unknown>;

  if (typeof c.concept !== "string" || c.concept.trim().length === 0) {
    errors.push({
      path: "center.concept",
      message: "center.concept must be a non-empty string",
    });
  }

  // visualHint is optional — type-check when present
  if (c.visualHint !== undefined && typeof c.visualHint !== "string") {
    errors.push({ path: "center.visualHint", message: "visualHint must be a string if provided" });
  }
  return errors;
}

function validateBranches(branches: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!Array.isArray(branches)) {
    errors.push({ path: "branches", message: "branches must be an array" });
    return errors;
  }

  if (branches.length === 0) {
    errors.push({ path: "branches", message: "branches must not be empty" });
    return errors;
  }

  for (let i = 0; i < branches.length; i++) {
    errors.push(...validateMainBranch(branches[i], `branches[${i}]`));
  }

  return errors;
}

function validateMainBranch(
  branch: unknown,
  path: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!branch || typeof branch !== "object") {
    errors.push({ path, message: "Branch must be an object" });
    return errors;
  }

  const b = branch as Record<string, unknown>;

  if (typeof b.concept !== "string" || b.concept.trim().length === 0) {
    errors.push({ path: `${path}.concept`, message: "concept must be a non-empty string" });
  }

  // Optional hints — type-check when present
  if (b.visualHint !== undefined && typeof b.visualHint !== "string") {
    errors.push({ path: `${path}.visualHint`, message: "visualHint must be a string if provided" });
  }
  if (b.colorHint !== undefined && typeof b.colorHint !== "string") {
    errors.push({ path: `${path}.colorHint`, message: "colorHint must be a string if provided" });
  }

  if (b.children !== undefined) {
    if (!Array.isArray(b.children)) {
      errors.push({ path: `${path}.children`, message: "children must be an array" });
    } else {
      for (let j = 0; j < b.children.length; j++) {
        errors.push(...validateSubBranch(b.children[j], `${path}.children[${j}]`));
      }
    }
  }

  return errors;
}

function validateSubBranch(
  branch: unknown,
  path: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!branch || typeof branch !== "object") {
    errors.push({ path, message: "SubBranch must be an object" });
    return errors;
  }

  const b = branch as Record<string, unknown>;

  if (typeof b.concept !== "string" || b.concept.trim().length === 0) {
    errors.push({ path: `${path}.concept`, message: "concept must be a non-empty string" });
  }

  if (b.visualHint !== undefined && typeof b.visualHint !== "string") {
    errors.push({ path: `${path}.visualHint`, message: "visualHint must be a string if provided" });
  }

  if (b.children !== undefined) {
    if (!Array.isArray(b.children)) {
      errors.push({ path: `${path}.children`, message: "children must be an array" });
    } else {
      for (let k = 0; k < b.children.length; k++) {
        errors.push(...validateLeafNode(b.children[k], `${path}.children[${k}]`));
      }
    }
  }

  return errors;
}

function validateLeafNode(
  node: unknown,
  path: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!node || typeof node !== "object") {
    errors.push({ path, message: "LeafNode must be an object" });
    return errors;
  }

  const n = node as Record<string, unknown>;

  if (typeof n.concept !== "string" || n.concept.trim().length === 0) {
    errors.push({ path: `${path}.concept`, message: "concept must be a non-empty string" });
  }

  if (n.visualHint !== undefined && typeof n.visualHint !== "string") {
    errors.push({ path: `${path}.visualHint`, message: "visualHint must be a string if provided" });
  }

  // LeafNode must NOT have children — nesting deeper than 3 levels
  if (n.children !== undefined) {
    errors.push({
      path: `${path}.children`,
      message: "Nesting exceeds maximum depth of 3 levels (MainBranch -> SubBranch -> LeafNode)",
    });
  }

  return errors;
}
