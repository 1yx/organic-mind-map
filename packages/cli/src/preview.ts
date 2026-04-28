/**
 * Main preview command implementation.
 *
 * Flow: parse args → read input → parse JSON → validate structural →
 * validate quality → validate capacity → build PreviewPayload →
 * hand off to local preview server.
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
  type AgentMindMapList,
} from "@omm/core";

import { startPreviewServerAsync } from "./preview-server.js";
import { isAllowedSvgUrl } from "./svg-allowlist.js";
import {
  cliExitCode,
  type PreviewPayload,
  type PreviewOptions,
} from "./types.js";

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

type ParsedArgs = {
  positional: string[];
  paper: "a3-landscape" | "a4-landscape" | undefined;
  port: number | undefined;
  host: string | undefined;
};

const VALID_PAPERS = new Set(["a3-landscape", "a4-landscape"]);

function parsePaper(
  val: string | undefined,
): "a3-landscape" | "a4-landscape" | undefined {
  if (val && VALID_PAPERS.has(val))
    return val as "a3-landscape" | "a4-landscape";
  return undefined;
}

function parsePort(val: string | undefined): number | undefined {
  if (!val) return undefined;
  const num = Number(val);
  return Number.isFinite(num) && num > 0 && num < 65536 ? num : undefined;
}

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  let paper: "a3-landscape" | "a4-landscape" | undefined;
  let port: number | undefined;
  let host: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--paper") {
      paper = parsePaper(argv[++i]);
    } else if (arg === "--port") {
      port = parsePort(argv[++i]);
    } else if (arg === "--host") {
      host = argv[++i];
    } else if (!arg.startsWith("-") || arg === "--") {
      positional.push(arg);
    }
  }

  return { positional, paper, port, host };
}

// ---------------------------------------------------------------------------
// Concept whitespace normalisation
// ---------------------------------------------------------------------------

/**
 * Normalise whitespace in an OrganicTree: trim and collapse repeated spaces
 * in every concept field. Never rewrites semantics — only whitespace.
 */
function normalizeConcepts(input: AgentMindMapList): AgentMindMapList {
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
// Error formatting
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
// Command helpers (split from previewCommand to keep complexity/lines low)
// ---------------------------------------------------------------------------

function printUsage(): void {
  console.error("Usage: omm preview <input.json>");
  console.error("");
  console.error("Options:");
  console.error(
    "  --paper <paper>   Paper size: a3-landscape | a4-landscape (default: a3-landscape)",
  );
  console.error("  --port <port>     Port for the local preview server");
  console.error("  --host <host>     Host to bind to (default: 127.0.0.1)");
}

/** Resolve raw JSON input from positional file arg or stdin. Returns null on error. */
async function resolveInput(args: ParsedArgs): Promise<string | null> {
  if (args.positional.length > 0) {
    try {
      return readInput(args.positional[0]!);
    } catch (err: unknown) {
      console.error(
        `Error reading file: ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exitCode = cliExitCode.INPUT_ERROR;
      return null;
    }
  }
  const stdin = await readStdin();
  if (stdin === null) {
    printUsage();
    process.exitCode = cliExitCode.INPUT_ERROR;
    return null;
  }
  return stdin;
}

/** Parse raw JSON string. Returns null on error. */
function parseJsonInput(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    console.error("Error: malformed JSON input.");
    process.exitCode = cliExitCode.INPUT_ERROR;
    return null;
  }
}

/** Run the 3-layer validation pipeline. Returns exit code on failure, null on success. */
function runValidationPipeline(parsed: unknown): number | null {
  const structuralErrors = validateStructural(parsed);
  if (structuralErrors.length > 0) {
    console.error(formatValidationErrors(structuralErrors));
    process.exitCode = cliExitCode.INPUT_ERROR;
    return cliExitCode.INPUT_ERROR;
  }

  const tree = parsed as AgentMindMapList;

  const qualityErrors = validateQuality(
    tree,
    DEFAULT_LIMITS.maxConceptUnitWidth,
  );
  if (qualityErrors.length > 0) {
    console.error(formatValidationErrors(qualityErrors));
    process.exitCode = cliExitCode.INPUT_ERROR;
    return cliExitCode.INPUT_ERROR;
  }

  const capacityErrors = validateCapacity(tree, DEFAULT_LIMITS);
  if (capacityErrors.length > 0) {
    console.error(formatCapacityFeedback(capacityErrors));
    process.exitCode = cliExitCode.CAPACITY_EXCEEDED;
    return cliExitCode.CAPACITY_EXCEEDED;
  }

  return null;
}

/** Build the PreviewPayload from a validated tree. */
function buildPayload(
  tree: AgentMindMapList,
  paperOverride?: "a3-landscape" | "a4-landscape",
): PreviewPayload {
  const normalised = normalizeConcepts(tree);
  const paper = paperOverride ?? normalised.paper ?? "a3-landscape";

  // Check center svgUrl against allowlist (tasks 2.1-2.3, 4.2)
  const allowedUrl = isAllowedSvgUrl(normalised.center.svgUrl);

  const payload: PreviewPayload = {
    version: 1,
    source: "organic-tree",
    paper,
    tree: normalised,
    meta: normalised.meta
      ? {
          sourceTitle: normalised.meta.sourceTitle,
          sourceSummary: normalised.meta.sourceSummary,
        }
      : undefined,
  };

  // Only populate centerVisual when svgUrl is allowlisted (task 4.2)
  if (allowedUrl) {
    payload.centerVisual = {
      svgUrl: allowedUrl,
      source: "ai-svg",
    };
  }

  return payload;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type { PreviewPayload, PreviewOptions };
export type { PreviewServerOptions, PreviewServerResult } from "./preview-server.js";
export { startPreviewServer, startPreviewServerAsync } from "./preview-server.js";

/**
 * Run the preview command.
 *
 * @param argv - Raw process.argv (or subset starting from the command).
 * @returns Exit code (0–3). Sets `process.exitCode` as a side-effect.
 */
export async function previewCommand(argv: string[]): Promise<number> {
  const args = parseArgs(argv);

  const rawJson = await resolveInput(args);
  if (rawJson === null) return cliExitCode.INPUT_ERROR;

  const parsed = parseJsonInput(rawJson);
  if (parsed === null) return cliExitCode.INPUT_ERROR;

  const validationExit = runValidationPipeline(parsed);
  if (validationExit !== null) return validationExit;

  const tree = parsed as AgentMindMapList;
  const payload = buildPayload(tree, args.paper);

  try {
    await startPreviewServerAsync(payload, { host: args.host, port: args.port });
  } catch (err: unknown) {
    console.error(
      `Preview server error: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exitCode = cliExitCode.SERVER_HANDOFF_ERROR;
    return cliExitCode.SERVER_HANDOFF_ERROR;
  }

  process.exitCode = cliExitCode.OK;
  return cliExitCode.OK;
}
