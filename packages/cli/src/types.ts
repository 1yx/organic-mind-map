/**
 * CLI types — options and exit codes.
 */

/** Options accepted by the preview command. */
export type PreviewOptions = {
  /** Host forwarded to the local preview server. Default: "127.0.0.1". */
  host?: string;
  /** Port forwarded to the local preview server. */
  port?: number;
  /** Path to the input JSON file. When absent, stdin is checked. */
  input?: string;
  /** Emit machine-readable JSON result envelope to stdout. */
  json?: boolean;
};

// Re-export JSON result types for convenience
export type {
  CliJsonResult,
  CliFinding,
  FindingSeverity,
  AgentAction,
  ResultKind,
  ResultBuilderOptions,
} from "./json-result.js";
export { toJsonPointer, buildJsonResult } from "./json-result.js";

/** CLI exit codes for the preview command. */
export const cliExitCode = {
  /** Success. */
  OK: 0,
  /** Input parse or validation error (structural or quality). */
  INPUT_ERROR: 1,
  /** Capacity threshold exceeded. */
  CAPACITY_EXCEEDED: 2,
  /** Local preview server handoff error. */
  SERVER_HANDOFF_ERROR: 3,
} as const;

export type CliExitCodeType = (typeof cliExitCode)[keyof typeof cliExitCode];
