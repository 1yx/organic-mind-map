/**
 * CLI types — PreviewPayload, options, and exit codes.
 */

import type { AgentMindMapList } from "@omm/core";

/** CLI-to-browser handoff type. The CLI builds this; the browser consumes it. */
export type PreviewPayload = {
  version: 1;
  source: "organic-tree";
  paper: "a3-landscape" | "a4-landscape";
  tree: AgentMindMapList;
  centerVisual?: {
    inlineSvg?: string;
    source?: "ai-svg";
  };
  meta?: {
    sourceTitle?: string;
    sourceSummary?: string;
  };
};

/** Options accepted by the preview command. */
export type PreviewOptions = {
  /** Paper size, defaults to "a3-landscape". CLI flag \> input contract \> default. */
  paper?: "a3-landscape" | "a4-landscape";
  /** Port forwarded to the local preview server (06-local-preview-server). */
  port?: number;
  /** Path to the input JSON file. When absent, stdin is checked. */
  input?: string;
};

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
