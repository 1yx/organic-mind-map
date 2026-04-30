/**
 * Structural validation for OrganicTree.
 *
 * Validates required fields, correct types, depth limits, and
 * preserves optional hints without semantic rewriting.
 */

import type { ValidationError } from "./types";

/**
 * Validate the structure of an OrganicTree input.
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
    errors.push({
      path: "center.visualHint",
      message: "visualHint must be a string if provided",
    });
  }

  // svgUrl is optional — type-check when present
  if (c.svgUrl !== undefined && typeof c.svgUrl !== "string") {
    errors.push({
      path: "center.svgUrl",
      message: "svgUrl must be a string if provided",
    });
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
    errors.push(...validateOrganicMainBranch(branches[i], `branches[${i}]`));
  }

  return errors;
}

function validateOrganicMainBranch(
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
    errors.push({
      path: `${path}.concept`,
      message: "concept must be a non-empty string",
    });
  }

  validateHints(b, path, errors);
  errors.push(...validateChildren(b.children, path, validateOrganicSubBranch));

  return errors;
}

function validateHints(
  obj: Record<string, unknown>,
  path: string,
  errors: ValidationError[],
): void {
  if (obj.visualHint !== undefined && typeof obj.visualHint !== "string") {
    errors.push({
      path: `${path}.visualHint`,
      message: "visualHint must be a string if provided",
    });
  }
  if (obj.colorHint !== undefined && typeof obj.colorHint !== "string") {
    errors.push({
      path: `${path}.colorHint`,
      message: "colorHint must be a string if provided",
    });
  }
}

function validateChildren(
  children: unknown,
  path: string,
  validateChild: (child: unknown, childPath: string) => ValidationError[],
): ValidationError[] {
  if (children === undefined) return [];
  if (!Array.isArray(children)) {
    return [{ path: `${path}.children`, message: "children must be an array" }];
  }
  const errors: ValidationError[] = [];
  for (let i = 0; i < children.length; i++) {
    errors.push(...validateChild(children[i], `${path}.children[${i}]`));
  }
  return errors;
}

function validateOrganicSubBranch(
  branch: unknown,
  path: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!branch || typeof branch !== "object") {
    errors.push({ path, message: "OrganicSubBranch must be an object" });
    return errors;
  }

  const b = branch as Record<string, unknown>;

  if (typeof b.concept !== "string" || b.concept.trim().length === 0) {
    errors.push({
      path: `${path}.concept`,
      message: "concept must be a non-empty string",
    });
  }

  validateHints(b, path, errors);
  errors.push(...validateChildren(b.children, path, validateOrganicLeafNode));

  return errors;
}

function validateOrganicLeafNode(
  node: unknown,
  path: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!node || typeof node !== "object") {
    errors.push({ path, message: "OrganicLeafNode must be an object" });
    return errors;
  }

  const n = node as Record<string, unknown>;

  if (typeof n.concept !== "string" || n.concept.trim().length === 0) {
    errors.push({
      path: `${path}.concept`,
      message: "concept must be a non-empty string",
    });
  }

  if (n.visualHint !== undefined && typeof n.visualHint !== "string") {
    errors.push({
      path: `${path}.visualHint`,
      message: "visualHint must be a string if provided",
    });
  }

  if (n.children !== undefined) {
    errors.push({
      path: `${path}.children`,
      message:
        "Nesting exceeds maximum depth of 3 levels (OrganicMainBranch -> OrganicSubBranch -> OrganicLeafNode)",
      code: "DEPTH_EXCEEDED",
    });
  }

  return errors;
}
