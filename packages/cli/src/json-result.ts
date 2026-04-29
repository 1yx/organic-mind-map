/**
 * CLI JSON result envelope types and utilities.
 *
 * Machine-readable result shape for `omm preview --json` mode.
 * Inspired by MCP tool responses: `content` (human-readable) +
 * `structuredContent` (stable machine contract).
 */

// ---------------------------------------------------------------------------
// Agent action enum
// ---------------------------------------------------------------------------

/**
 * Suggested next action for an Agent CLI after receiving this result.
 *
 * - `open-preview` — Server is ready; open the URL in a browser.
 * - `fix-command` — CLI usage error or file not found; fix arguments.
 * - `fix-json-syntax` — Malformed JSON input; fix JSON syntax.
 * - `regenerate-organic-tree` — Structural/quality/capacity error; regenerate.
 * - `retry-later-or-change-port` — Server startup failure; retry or use `--port`.
 * - `none` — No suggested action (warnings only, or informational).
 */
export type AgentAction =
  | "open-preview"
  | "fix-command"
  | "fix-json-syntax"
  | "regenerate-organic-tree"
  | "retry-later-or-change-port"
  | "none";

// ---------------------------------------------------------------------------
// Finding severity
// ---------------------------------------------------------------------------

export type FindingSeverity = "error" | "warning";

// ---------------------------------------------------------------------------
// Finding
// ---------------------------------------------------------------------------

/**
 * A single validation finding.
 *
 * - severity: `error` blocks the command; `warning` does not.
 * - code: Machine-readable error code (e.g. `"MISSING_FIELD"`).
 * - path: JSON Pointer path to the relevant field (e.g. `"/branches/0/concept"`).
 * - message: Human-readable description of the issue.
 * - repair: Constraint-oriented repair guidance (no semantic replacements).
 * - limit: Applicable limit value for capacity/width findings.
 * - actual: Actual value that violated the constraint.
 */
export type CliFinding = {
  severity: FindingSeverity;
  code: string;
  path: string;
  message: string;
  repair?: string;
  limit?: number;
  actual?: number;
};

// ---------------------------------------------------------------------------
// Result kinds
// ---------------------------------------------------------------------------

export type ResultKind =
  | "success"
  | "usage"
  | "file-read"
  | "json-parse"
  | "contract"
  | "quality"
  | "capacity"
  | "server-startup";

// ---------------------------------------------------------------------------
// Result envelope
// ---------------------------------------------------------------------------

/**
 * The JSON result envelope emitted by `omm preview --json`.
 *
 * Always a single-line JSON object on stdout. In JSON mode, stderr is
 * reserved for uncaught/program-level failures.
 */
export type CliJsonResult = {
  schema: "omm.cli.result";
  version: 1;
  command: "preview";
  ok: boolean;
  exitCode: 0 | 1 | 2 | 3;
  agentAction: AgentAction;
  content: Array<{ type: "text"; text: string }>;
  structuredContent: {
    kind: ResultKind;
    ready?: { pid: number; url: string };
    findings: CliFinding[];
  };
};

// ---------------------------------------------------------------------------
// JSON Pointer conversion
// ---------------------------------------------------------------------------

/**
 * Convert a dot-bracket path like `branches[2].children[0].concept`
 * to a JSON Pointer like `/branches/2/children/0/concept`.
 *
 * Handles:
 * - Empty path → `""`
 * - Simple field → `/fieldName`
 * - Bracket notation → `/branches/0/concept`
 * - Leading dot → strips it
 */
export function toJsonPointer(dotPath: string): string {
  if (!dotPath) return "";

  // Remove leading dot if present (e.g. ".center.concept")
  let normalized = dotPath.startsWith(".") ? dotPath.slice(1) : dotPath;

  // Replace bracket notation: branches[2].children[0] → branches.2.children.0
  normalized = normalized.replace(/\[(\d+)]/g, ".$1");

  // Split on dots, filter empty segments, join with /
  const segments = normalized.split(".").filter((s) => s.length > 0);

  if (segments.length === 0) return "";

  return `/${segments.join("/")}`;
}

// ---------------------------------------------------------------------------
// Result builder helpers
// ---------------------------------------------------------------------------

export type ResultBuilderOptions = {
  ok: boolean;
  exitCode: 0 | 1 | 2 | 3;
  agentAction: AgentAction;
  kind: ResultKind;
  findings?: CliFinding[];
  ready?: { pid: number; url: string };
};

/**
 * Build a complete CliJsonResult envelope.
 */
export function buildJsonResult(opts: ResultBuilderOptions): CliJsonResult {
  const findings = opts.findings ?? [];
  const textLines = findings
    .filter((f) => f.severity === "error")
    .map((f) => {
      const prefix = f.path ? `${f.path} ` : "";
      return `- ${prefix}${f.message}`;
    });

  // Include repair guidance in content
  const repairs = findings
    .filter((f) => f.repair)
    .map((f) => `  → ${f.repair!}`);

  const contentText =
    textLines.length > 0
      ? [...textLines, ...repairs].join("\n")
      : opts.ok
        ? "Preview server is ready."
        : "Command failed.";

  return {
    schema: "omm.cli.result",
    version: 1,
    command: "preview",
    ok: opts.ok,
    exitCode: opts.exitCode,
    agentAction: opts.agentAction,
    content: [{ type: "text", text: contentText }],
    structuredContent: {
      kind: opts.kind,
      ready: opts.ready,
      findings,
    },
  };
}
