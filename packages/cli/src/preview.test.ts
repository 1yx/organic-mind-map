/**
 * Tests for the CLI preview command.
 *
 * Uses programmatic invocation (not child_process) to test the full
 * preview flow: arg parsing → input reading → validation → capacity →
 * PreviewPayload → server handoff.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolve } from "node:path";
import { previewCommand } from "./preview.js";
import { CliExitCode } from "./types.js";

// ---------------------------------------------------------------------------
// Mock node:tty so we can control TTY detection in tests
// ---------------------------------------------------------------------------
const mockIsatty = vi.fn((_fd: number) => false);
vi.mock("node:tty", () => ({
  isatty: mockIsatty,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIXTURES = resolve(import.meta.dirname, "../../../fixtures/cli-preview");

function fixture(name: string): string {
  return resolve(FIXTURES, name);
}

/** Capture console.error and console.log calls during a fn. */
function captureOutput(fn: () => Promise<number>): Promise<{
  code: number;
  stderr: string[];
  stdout: string[];
}> {
  const stderr: string[] = [];
  const stdout: string[] = [];
  const errSpy = vi.spyOn(console, "error").mockImplementation((...args) => {
    stderr.push(args.join(" "));
  });
  const logSpy = vi.spyOn(console, "log").mockImplementation((...args) => {
    stdout.push(args.join(" "));
  });

  return fn().then((code) => {
    errSpy.mockRestore();
    logSpy.mockRestore();
    return { code, stderr, stdout };
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("previewCommand", () => {
  beforeEach(() => {
    process.exitCode = undefined as unknown as number;
    // Default: stdin is NOT a TTY (pipe mode) — but we always provide
    // a positional file argument in tests so readStdin is never called.
    // For the "no input" test, we set isatty to true.
    mockIsatty.mockReturnValue(false);
  });

  afterEach(() => {
    process.exitCode = undefined as unknown as number;
    mockIsatty.mockReset();
  });

  // 7.1: Valid fixture succeeds and starts preview handoff
  it("succeeds for a valid fixture and starts preview handoff", async () => {
    const { code, stdout } = await captureOutput(() =>
      previewCommand([fixture("valid-handoff.json")]),
    );

    expect(code).toBe(CliExitCode.OK);
    expect(process.exitCode).toBe(CliExitCode.OK);
    expect(stdout).toEqual(
      expect.arrayContaining([
        expect.stringContaining("PreviewPayload ready for browser consumption"),
        expect.stringContaining("Paper:"),
        expect.stringContaining("Title: Product Strategy"),
        expect.stringContaining("Source: organic-tree"),
      ]),
    );
  });

  // 7.2: Missing input returns usage error (exit 1)
  it("returns usage error when no input and no stdin (exit 1)", async () => {
    // Make stdin appear as a TTY (interactive) so the command prints usage
    mockIsatty.mockReturnValue(true);

    const { code, stderr } = await captureOutput(() =>
      previewCommand([]),
    );

    expect(code).toBe(CliExitCode.INPUT_ERROR);
    expect(process.exitCode).toBe(CliExitCode.INPUT_ERROR);
    expect(stderr.join(" ")).toContain("Usage: omm preview <input.json>");
  });

  // 7.3: Malformed JSON exits with code 1
  it("exits with code 1 for malformed JSON", async () => {
    const { code, stderr } = await captureOutput(() =>
      previewCommand([fixture("invalid-json.json")]),
    );

    expect(code).toBe(CliExitCode.INPUT_ERROR);
    expect(process.exitCode).toBe(CliExitCode.INPUT_ERROR);
    expect(stderr.join(" ")).toContain("malformed JSON");
  });

  // 7.4: Invalid OrganicTree exits with code 1 and path-specific errors
  it("exits with code 1 for invalid contract and shows path-specific errors", async () => {
    // Test missing fields
    const missing = await captureOutput(() =>
      previewCommand([fixture("invalid-contract-missing-fields.json")]),
    );
    expect(missing.code).toBe(CliExitCode.INPUT_ERROR);
    expect(missing.stderr.join(" ")).toContain("Invalid OrganicTree");
    expect(missing.stderr.join(" ")).toContain("center.concept");

    // Test malformed hierarchy
    const malformed = await captureOutput(() =>
      previewCommand([fixture("invalid-contract-malformed-hierarchy.json")]),
    );
    expect(malformed.code).toBe(CliExitCode.INPUT_ERROR);
    expect(malformed.stderr.join(" ")).toContain("Invalid OrganicTree");
  });

  // 7.5: Oversized input exits with code 2 and retry-friendly feedback
  it("exits with code 2 for capacity exceeded and shows retry-friendly feedback", async () => {
    const { code, stderr } = await captureOutput(() =>
      previewCommand([fixture("oversized-capacity.json")]),
    );

    expect(code).toBe(CliExitCode.CAPACITY_EXCEEDED);
    expect(process.exitCode).toBe(CliExitCode.CAPACITY_EXCEEDED);
    expect(stderr.join(" ")).toContain("Input exceeds MVP capacity");
    expect(stderr.join(" ")).toContain("Please regenerate a shorter concept list");
  });

  // 7.6: CLI passes PreviewPayload to the preview server, not OmmDocument
  it("passes PreviewPayload to the preview server with correct shape", async () => {
    const serverModule = await import("./preview-server.js");
    const spy = vi.spyOn(serverModule, "startPreviewServer").mockResolvedValue();

    const code = await previewCommand([fixture("valid-handoff.json")]);

    expect(code).toBe(CliExitCode.OK);
    expect(spy).toHaveBeenCalledOnce();

    const payload = spy.mock.calls[0]![0] as unknown;
    // Verify it's a PreviewPayload, not an OmmDocument
    expect(payload).toHaveProperty("version", 1);
    expect(payload).toHaveProperty("source", "organic-tree");
    expect(payload).toHaveProperty("paper");
    expect(payload).toHaveProperty("tree");
    // Must NOT have OmmDocument fields
    expect(payload).not.toHaveProperty("layout");
    expect(payload).not.toHaveProperty("exportPng");
    expect(payload).not.toHaveProperty("snapshot");

    // The tree should be the AgentMindMapList — has center and branches
    const tree = (payload as Record<string, unknown>).tree as Record<string, unknown>;
    expect(tree).toHaveProperty("center");
    expect(tree).toHaveProperty("branches");
    expect(tree).toHaveProperty("version", 1);

    spy.mockRestore();
  });

  // 7.7: Preview server handoff failures exit with code 3
  it("exits with code 3 when preview server throws", async () => {
    const serverModule = await import("./preview-server.js");
    const spy = vi
      .spyOn(serverModule, "startPreviewServer")
      .mockRejectedValue(new Error("EADDRINUSE: port already in use"));

    const { code, stderr } = await captureOutput(() =>
      previewCommand([fixture("valid-handoff.json")]),
    );

    expect(code).toBe(CliExitCode.SERVER_HANDOFF_ERROR);
    expect(process.exitCode).toBe(CliExitCode.SERVER_HANDOFF_ERROR);
    expect(stderr.join(" ")).toContain("Preview server error");

    spy.mockRestore();
  });

  // 7.8: CLI does NOT implement ID generation, color assignment, etc.
  it("PreviewPayload contains no generated IDs, colors, organic seeds, or OmmDocument artifacts", async () => {
    const serverModule = await import("./preview-server.js");
    let capturedPayload: unknown;
    const spy = vi.spyOn(serverModule, "startPreviewServer").mockImplementation(
      async (p) => {
        capturedPayload = p;
      },
    );

    await previewCommand([fixture("no-generated-ids.json")]);

    const payload = capturedPayload as Record<string, unknown>;

    // Helper: check an object and all nested arrays for forbidden keys
    const forbiddenKeys = [
      "id",
      "nodeId",
      "color",
      "fill",
      "stroke",
      "organicSeed",
      "seed",
      "centerVisualId",
      "branchStyle",
      "layout",
      "position",
      "bounds",
      "svgPath",
      "ommVersion",
      "exportPng",
      "snapshot",
    ];

    function objectHasForbiddenKeys(obj: unknown, path: string): string[] {
      const hits: string[] = [];
      if (!obj || typeof obj !== "object") return hits;
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (forbiddenKeys.includes(key)) {
          hits.push(`${path}.${key}`);
        }
        if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            hits.push(...objectHasForbiddenKeys(value[i], `${path}[${i}]`));
          }
        } else if (value && typeof value === "object") {
          hits.push(...objectHasForbiddenKeys(value, `${path}.${key}`));
        }
      }
      return hits;
    }

    const hits = objectHasForbiddenKeys(payload, "payload");
    expect(hits).toEqual([]);

    spy.mockRestore();
  });

  // Additional: --paper flag overrides input contract
  it("respects --paper flag overriding input contract", async () => {
    const serverModule = await import("./preview-server.js");
    let capturedPayload: unknown;
    const spy = vi.spyOn(serverModule, "startPreviewServer").mockImplementation(
      async (p) => {
        capturedPayload = p;
      },
    );

    // valid-handoff.json has paper "a4-landscape"
    await previewCommand([
      "--paper",
      "a3-landscape",
      fixture("valid-handoff.json"),
    ]);

    const payload = capturedPayload as Record<string, unknown>;
    expect(payload.paper).toBe("a3-landscape");

    spy.mockRestore();
  });

  // Additional: --port flag is forwarded to preview server
  it("forwards --port to the preview server", async () => {
    const serverModule = await import("./preview-server.js");
    let capturedOptions: unknown;
    const spy = vi.spyOn(serverModule, "startPreviewServer").mockImplementation(
      async (_p, opts) => {
        capturedOptions = opts;
      },
    );

    await previewCommand([
      "--port",
      "5173",
      fixture("valid-handoff.json"),
    ]);

    expect(capturedOptions).toEqual({ port: 5173 });

    spy.mockRestore();
  });

  // Additional: defaults paper to a3-landscape when neither flag nor input specify
  it("defaults paper to a3-landscape when unspecified", async () => {
    const serverModule = await import("./preview-server.js");
    let capturedPayload: unknown;
    const spy = vi.spyOn(serverModule, "startPreviewServer").mockImplementation(
      async (p) => {
        capturedPayload = p;
      },
    );

    // no-generated-ids.json has no paper field
    await previewCommand([fixture("no-generated-ids.json")]);

    const payload = capturedPayload as Record<string, unknown>;
    expect(payload.paper).toBe("a3-landscape");

    spy.mockRestore();
  });
});
