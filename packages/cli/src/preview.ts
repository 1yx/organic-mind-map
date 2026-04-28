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
  traverseBranches,
} from "@omm/core";
import type { AgentMindMapList } from "@omm/core";

import type { PreviewPayload, PreviewOptions } from "./types.js";
import { CliExitCode } from "./types.js";
import { startPreviewServer } from "./preview-server.js";

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

interface ParsedArgs {
  positional: string[];
  paper: "a3-landscape" | "a4-landscape" | undefined;
  port: number | undefined;
}

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  let paper: "a3-landscape" | "a4-landscape" | undefined;
  let port: number | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--paper") {
      const val = argv[++i];
      if (val !== "a3-landscape" && val !== "a4-landscape") {
        return { positional, paper: undefined, port };
      }
      paper = val as "a3-landscape" | "a4-landscape";
    } else if (arg === "--port") {
      const val = argv[++i];
      const num = Number(val);
      if (Number.isFinite(num) && num > 0 && num < 65536) {
        port = num;
      }
    } else if (!arg.startsWith("-") || arg === "--") {
      positional.push(arg);
    }
  }

  return { positional, paper, port };
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
    center: { ...input.center, concept: normalize(input.center.concept) },
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
// Public API
// ---------------------------------------------------------------------------

export { type PreviewPayload, type PreviewOptions } from "./types.js";
export type { PreviewServerOptions } from "./preview-server.js";
export { startPreviewServer } from "./preview-server.js";

/**
 * Run the preview command.
 *
 * @param argv  Raw process.argv (or subset starting from the command).
 * @returns     Exit code (0–3). Sets `process.exitCode` as a side-effect.
 */
export async function previewCommand(argv: string[]): Promise<number> {
  const args = parseArgs(argv);

  // Determine input source
  let rawJson: string;
  const hasPositional = args.positional.length > 0;

  if (hasPositional) {
    try {
      rawJson = readInput(args.positional[0]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error reading file: ${message}`);
      process.exitCode = CliExitCode.INPUT_ERROR;
      return CliExitCode.INPUT_ERROR;
    }
  } else {
    const stdin = await readStdin();
    if (stdin === null) {
      console.error("Usage: omm preview <input.json>");
      console.error("");
      console.error("Options:");
      console.error("  --paper <paper>   Paper size: a3-landscape | a4-landscape (default: a3-landscape)");
      console.error("  --port <port>     Port for the local preview server");
      process.exitCode = CliExitCode.INPUT_ERROR;
      return CliExitCode.INPUT_ERROR;
    }
    rawJson = stdin;
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    console.error("Error: malformed JSON input.");
    process.exitCode = CliExitCode.INPUT_ERROR;
    return CliExitCode.INPUT_ERROR;
  }

  // Layer 1: Structural validation → exit 1
  const structuralErrors = validateStructural(parsed);
  if (structuralErrors.length > 0) {
    console.error(formatValidationErrors(structuralErrors));
    process.exitCode = CliExitCode.INPUT_ERROR;
    return CliExitCode.INPUT_ERROR;
  }

  const tree = parsed as AgentMindMapList;

  // Layer 2: Quality validation → exit 1
  const qualityErrors = validateQuality(tree, DEFAULT_LIMITS.maxConceptUnitWidth);
  if (qualityErrors.length > 0) {
    console.error(formatValidationErrors(qualityErrors));
    process.exitCode = CliExitCode.INPUT_ERROR;
    return CliExitCode.INPUT_ERROR;
  }

  // Layer 3: Capacity validation → exit 2
  const capacityErrors = validateCapacity(tree, DEFAULT_LIMITS);
  if (capacityErrors.length > 0) {
    console.error(formatCapacityFeedback(capacityErrors));
    process.exitCode = CliExitCode.CAPACITY_EXCEEDED;
    return CliExitCode.CAPACITY_EXCEEDED;
  }

  // Normalise whitespace (never rewrites semantics)
  const normalised = normalizeConcepts(tree);

  // Resolve paper: CLI flag > input contract > default
  const paper = args.paper ?? normalised.paper ?? "a3-landscape";

  // Build PreviewPayload — NO IDs, NO colors, NO organic seeds, NO OmmDocument
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

  // Hand off to local preview server → exit 3 on failure
  try {
    await startPreviewServer(payload, { port: args.port });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Preview server error: ${message}`);
    process.exitCode = CliExitCode.SERVER_HANDOFF_ERROR;
    return CliExitCode.SERVER_HANDOFF_ERROR;
  }

  process.exitCode = CliExitCode.OK;
  return CliExitCode.OK;
}
