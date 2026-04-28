/**
 * Phase 1 .omm Validation — error types and result structure.
 *
 * Validation is pure: no side effects, no mutation of the input document.
 * Each validator returns an array of OmmValidationIssue; the orchestrator
 * aggregates them into an OmmValidationResult.
 */

export type OmmValidationError = {
  path: string;
  message: string;
  code: string;
};

export type OmmValidationResult = {
  valid: boolean;
  errors: OmmValidationError[];
  data: unknown;
};

export type OmmValidationIssue = {
  path: string;
  message: string;
  code: string;
};
