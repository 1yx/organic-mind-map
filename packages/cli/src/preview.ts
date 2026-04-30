/**
 * Main preview command implementation.
 *
 * Flow: parse args → read input → parse JSON → validate structural →
 * validate quality → validate capacity → normalize whitespace →
 * hand off validated OrganicTree to local preview server.
 *
 * Exit codes:
 *   0 — success
 *   1 — input parse / structural / quality error
 *   2 — capacity threshold exceeded
 *   3 — preview server handoff error
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  validateStructural,
  validateQuality,
  validateCapacity,
  formatCapacityFeedback,
  DEFAULT_LIMITS,
  type OrganicTree,
  type ValidationError,
} from "@omm/core";

import { startPreviewServerAsync } from "./preview-server.js";
import { cliExitCode } from "./types.js";
import {
  toJsonPointer,
  buildJsonResult,
  type CliJsonResult,
  type CliFinding,
  type AgentAction,
  type ResultKind,
} from "./json-result.js";

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

type ParsedArgs = {
  positional: string[];
  port: number | undefined;
  host: string | undefined;
  json: boolean;
};

function parsePort(val: string | undefined): number | undefined {
  if (!val) return undefined;
  const num = Number(val);
  return Number.isFinite(num) && num > 0 && num < 65536 ? num : undefined;
}

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  let port: number | undefined;
  let host: string | undefined;
  let json = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--port") {
      port = parsePort(argv[++i]);
    } else if (arg === "--host") {
      host = argv[++i];
    } else if (arg === "--json") {
      json = true;
    } else if (!arg.startsWith("-") || arg === "--") {
      positional.push(arg);
    }
  }

  return { positional, port, host, json };
}

// ---------------------------------------------------------------------------
// Concept whitespace normalisation
// ---------------------------------------------------------------------------

/**
 * Normalise whitespace in an OrganicTree: trim and collapse repeated spaces
 * in every concept field. Never rewrites semantics — only whitespace.
 */
function normalizeConcepts(input: OrganicTree): OrganicTree {
  const normalize = (s: string): string => s.trim().replace(/ {2,}/g, " ");

  return {
    ...input,
    title: normalize(input.title),
    center: {
      ...input.center,
      concept: normalize(input.center.concept),
      svgUrl: input.center.svgUrl,
    },
    branches: input.branches.map((branch) => ({
      ...branch,
      concept: normalize(branch.concept),
      children: branch.children?.map((sub) => ({
        ...sub,
        concept: normalize(sub.concept),
        children: sub.children?.map((leaf) => ({
          ...leaf,
          concept: normalize(leaf.concept),
        })),
      })),
    })),
  };
}

// ---------------------------------------------------------------------------
// Input reading
// ---------------------------------------------------------------------------

function readInput(filePath: string): string {
  const abs = resolve(filePath);
  return readFileSync(abs, "utf-8");
}

/**
 * Read all of stdin as a string. Returns null when stdin is a TTY (interactive).
 */
async function readStdin(): Promise<string | null> {
  const { isatty } = await import("node:tty");
  if (isatty(0)) {
    return null;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

// ---------------------------------------------------------------------------
// Error formatting (human mode)
// ---------------------------------------------------------------------------

function formatValidationErrors(
  errors: ReadonlyArray<{ path: string; message: string }>,
): string {
  const lines = errors.map((e) => {
    const prefix = e.path ? `${e.path} ` : "";
    return `- ${prefix}${e.message}`;
  });
  return `Invalid OrganicTree:\n${lines.join("\n")}`;
}

// ---------------------------------------------------------------------------
// JSON result builders
// ---------------------------------------------------------------------------

/**
 * Convert validation errors (structural/quality) into CLI findings with
 * JSON Pointer paths. Depth errors get a dedicated code and repair hint.
 */
function validationErrorsToFindings(
  errors: ReadonlyArray<ValidationError>,
  kind: "contract" | "quality",
): CliFinding[] {
  return errors.map((e) => {
    const isDepthError = e.code === "DEPTH_EXCEEDED";
    return {
      severity: "error" as const,
      code: isDepthError
        ? "DEPTH_EXCEEDED"
        : kind === "contract"
          ? "CONTRACT_ERROR"
          : "QUALITY_ERROR",
      path: toJsonPointer(e.path),
      message: e.message,
      repair: isDepthError
        ? "Reduce nesting to max 3 levels: MainBranch \u2192 SubBranch \u2192 LeafNode. Flatten or regroup deeper concepts."
        : undefined,
    };
  });
}

/**
 * Convert capacity errors into CLI findings with limits/actuals.
 */
function capacityErrorsToFindings(
  errors: ReadonlyArray<{
    path: string;
    message: string;
    limit: number;
    actual: number;
  }>,
): CliFinding[] {
  return errors.map((e) => ({
    severity: "error" as const,
    code: "CAPACITY_EXCEEDED",
    path: toJsonPointer(e.path),
    message: e.message,
    repair:
      "Regenerate a shorter concept list that stays within capacity limits.",
    limit: e.limit,
    actual: e.actual,
  }));
}

/**
 * Emit a JSON result to stdout and return the exit code.
 */
function emitJsonResult(opts: {
  ok: boolean;
  exitCode: 0 | 1 | 2 | 3;
  agentAction: AgentAction;
  kind: ResultKind;
  findings?: CliFinding[];
  ready?: { pid: number; url: string };
}): number {
  const result: CliJsonResult = buildJsonResult(opts);
  // Single-line JSON to stdout
  console.log(JSON.stringify(result));
  process.exitCode = opts.exitCode;
  return opts.exitCode;
}

// ---------------------------------------------------------------------------
// Command helpers (split from previewCommand to keep complexity/lines low)
// ---------------------------------------------------------------------------

function printUsage(): void {
  console.error("Usage: omm preview <input.json>");
  console.error("");
  console.error("Options:");
  console.error("  --port <port>     Port for the local preview server");
  console.error("  --host <host>     Host to bind to (default: 127.0.0.1)");
  console.error(
    "  --json            Emit machine-readable JSON result to stdout",
  );
}

/** Resolve raw JSON input from positional file arg or stdin. Returns null on error. */
async function resolveInput(
  args: ParsedArgs,
): Promise<{ raw: string; error?: { kind: ResultKind; message: string } }> {
  if (args.positional.length > 0) {
    try {
      return { raw: readInput(args.positional[0]!) };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        raw: "",
        error: {
          kind: "file-read",
          message: `Error reading file: ${message}`,
        },
      };
    }
  }
  const stdin = await readStdin();
  if (stdin === null) {
    return {
      raw: "",
      error: {
        kind: "usage",
        message: "No input file provided and stdin is a TTY.",
      },
    };
  }
  return { raw: stdin };
}

/** Parse raw JSON string. Returns the parsed value or a json-parse error. */
function parseJsonInput(
  raw: string,
): { data: unknown } | { error: { message: string } } {
  try {
    return { data: JSON.parse(raw) };
  } catch {
    return {
      error: { message: "Error: malformed JSON input." },
    };
  }
}

/**
 * Run the 3-layer validation pipeline.
 * Returns exit code + findings on failure, null on success.
 */
function runValidationPipeline(
  parsed: unknown,
): { exitCode: number; kind: ResultKind; findings: CliFinding[] } | null {
  const structuralErrors = validateStructural(parsed);
  if (structuralErrors.length > 0) {
    return {
      exitCode: cliExitCode.INPUT_ERROR,
      kind: "contract",
      findings: validationErrorsToFindings(structuralErrors, "contract"),
    };
  }

  const tree = parsed as OrganicTree;

  const qualityErrors = validateQuality(
    tree,
    DEFAULT_LIMITS.maxConceptUnitWidth,
  );
  if (qualityErrors.length > 0) {
    return {
      exitCode: cliExitCode.INPUT_ERROR,
      kind: "quality",
      findings: validationErrorsToFindings(qualityErrors, "quality"),
    };
  }

  const capacityErrors = validateCapacity(tree, DEFAULT_LIMITS);
  if (capacityErrors.length > 0) {
    return {
      exitCode: cliExitCode.CAPACITY_EXCEEDED,
      kind: "capacity",
      findings: capacityErrorsToFindings(capacityErrors),
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type { PreviewOptions } from "./types.js";
export type {
  PreviewServerOptions,
  PreviewServerResult,
} from "./preview-server.js";
export {
  startPreviewServer,
  startPreviewServerAsync,
} from "./preview-server.js";

// ---------------------------------------------------------------------------
// Dual-mode output helpers
// ---------------------------------------------------------------------------

type InputError = {
  kind: ResultKind;
  message: string;
  code: string;
  repair: string;
};

/** Handle input resolution error in the appropriate mode. Returns exit code. */
function handleInputError(error: InputError, isJsonMode: boolean): number {
  if (isJsonMode) {
    return emitJsonResult({
      ok: false,
      exitCode: 1,
      agentAction: "fix-command",
      kind: error.kind,
      findings: [
        {
          severity: "error",
          code: error.code,
          path: "",
          message: error.message,
          repair: error.repair,
        },
      ],
    });
  }
  if (error.kind === "usage") {
    printUsage();
  } else {
    console.error(error.message);
  }
  process.exitCode = cliExitCode.INPUT_ERROR;
  return cliExitCode.INPUT_ERROR;
}

/** Handle JSON parse error in the appropriate mode. Returns exit code. */
function handleJsonParseError(message: string, isJsonMode: boolean): number {
  if (isJsonMode) {
    return emitJsonResult({
      ok: false,
      exitCode: 1,
      agentAction: "fix-json-syntax",
      kind: "json-parse",
      findings: [
        {
          severity: "error",
          code: "JSON_PARSE_ERROR",
          path: "",
          message,
          repair: "Fix the JSON syntax in the input file.",
        },
      ],
    });
  }
  console.error(message);
  process.exitCode = cliExitCode.INPUT_ERROR;
  return cliExitCode.INPUT_ERROR;
}

/** Handle validation failure in the appropriate mode. Returns exit code. */
function handleValidationFailure(
  failure: { exitCode: number; kind: ResultKind; findings: CliFinding[] },
  isJsonMode: boolean,
): number {
  const { exitCode, kind, findings } = failure;
  if (isJsonMode) {
    return emitJsonResult({
      ok: false,
      exitCode: exitCode as 1 | 2,
      agentAction: "regenerate-organic-tree",
      kind,
      findings,
    });
  }
  if (kind === "capacity") {
    console.error(
      formatCapacityFeedback(
        findings.map((f) => ({
          path: f.path,
          message: f.message,
          limit: f.limit ?? 0,
          actual: f.actual ?? 0,
        })),
      ),
    );
  } else {
    console.error(
      formatValidationErrors(
        findings.map((f) => ({ path: f.path, message: f.message })),
      ),
    );
  }
  process.exitCode = exitCode;
  return exitCode;
}

/** Handle server startup error in the appropriate mode. Returns exit code. */
function handleServerError(message: string, isJsonMode: boolean): number {
  if (isJsonMode) {
    return emitJsonResult({
      ok: false,
      exitCode: 3,
      agentAction: "retry-later-or-change-port",
      kind: "server-startup",
      findings: [
        {
          severity: "error",
          code: "SERVER_STARTUP_ERROR",
          path: "",
          message: `Preview server error: ${message}`,
          repair: "Retry later or specify a different port with --port.",
        },
      ],
    });
  }
  console.error(`Preview server error: ${message}`);
  process.exitCode = cliExitCode.SERVER_HANDOFF_ERROR;
  return cliExitCode.SERVER_HANDOFF_ERROR;
}

/** Start the preview server and handle success/error in the appropriate mode. */
async function startServer(
  tree: OrganicTree,
  options: { host?: string; port?: number; silent?: boolean },
  isJsonMode: boolean,
): Promise<number> {
  try {
    const normalizedTree = normalizeConcepts(tree);
    const result = await startPreviewServerAsync(normalizedTree, {
      ...options,
      silent: options.silent ?? isJsonMode,
    });

    if (isJsonMode) {
      return emitJsonResult({
        ok: true,
        exitCode: 0,
        agentAction: "open-preview",
        kind: "success",
        ready: { pid: result.pid, url: result.url },
      });
    }

    // Human mode: success marker already printed by startPreviewServerAsync
    process.exitCode = cliExitCode.OK;
    return cliExitCode.OK;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return handleServerError(message, isJsonMode);
  }
}

/**
 * Run the preview command.
 *
 * @param argv - Raw process.argv (or subset starting from the command).
 * @returns Exit code (0–3). Sets `process.exitCode` as a side-effect.
 */
export async function previewCommand(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  const isJsonMode = args.json;

  // --- Resolve input ---
  const inputResult = await resolveInput(args);
  if (inputResult.error) {
    const isUsage = inputResult.error.kind === "usage";
    const err: InputError = {
      kind: inputResult.error.kind,
      message: inputResult.error.message,
      code: isUsage ? "MISSING_INPUT" : "FILE_READ_ERROR",
      repair: isUsage
        ? "Provide an input JSON file: omm preview <input.json>"
        : "Check the file path and permissions.",
    };
    return handleInputError(err, isJsonMode);
  }

  // --- Parse JSON ---
  const parseResult = parseJsonInput(inputResult.raw);
  if ("error" in parseResult) {
    return handleJsonParseError(parseResult.error.message, isJsonMode);
  }

  // --- Validation pipeline ---
  const validationFailure = runValidationPipeline(parseResult.data);
  if (validationFailure !== null) {
    return handleValidationFailure(validationFailure, isJsonMode);
  }

  // --- Start preview server ---
  return startServer(parseResult.data as OrganicTree, args, isJsonMode);
}
