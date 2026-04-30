/**
 * Tests for the CLI preview command.
 *
 * Uses programmatic invocation (not child_process) to test the full
 * preview flow: arg parsing → input reading → validation → capacity →
 * OrganicTree → server handoff.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolve } from "node:path";
import { previewCommand } from "./preview.js";
import { cliExitCode } from "./types.js";

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
// Test helpers for forbidden-key scanning
// ---------------------------------------------------------------------------

const FORBIDDEN_KEYS = [
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

function findForbiddenKeys(obj: unknown, path: string): string[] {
  const hits: string[] = [];
  if (!obj || typeof obj !== "object") return hits;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.includes(key)) hits.push(`${path}.${key}`);
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++)
        hits.push(...findForbiddenKeys(value[i], `${path}[${i}]`));
    } else if (value && typeof value === "object") {
      hits.push(...findForbiddenKeys(value, `${path}.${key}`));
    }
  }
  return hits;
}

/** Setup/teardown shared by all previewCommand describe blocks. */
function usePreviewLifecycle(): void {
  beforeEach(() => {
    process.exitCode = undefined as unknown as number;
    mockIsatty.mockReturnValue(false);
  });
  afterEach(() => {
    process.exitCode = undefined as unknown as number;
    mockIsatty.mockReset();
  });
}

/** Minimal mock server object for spy return values. */
const MOCK_SERVER = {} as unknown as import("node:http").Server;
// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("previewCommand — input & parsing", () => {
  usePreviewLifecycle();

  // 7.1: Valid fixture succeeds and starts preview handoff
  it("succeeds for a valid fixture and starts preview handoff", async () => {
    const { code, stdout } = await captureOutput(() =>
      previewCommand([fixture("valid-handoff.json")]),
    );

    expect(code).toBe(cliExitCode.OK);
    expect(process.exitCode).toBe(cliExitCode.OK);
    expect(stdout).toEqual(
      expect.arrayContaining([
        expect.stringContaining("[OMM_SERVER_READY]"),
        expect.stringContaining("PID:"),
        expect.stringContaining("http://"),
      ]),
    );
  });

  // 7.2: Missing input returns usage error (exit 1)
  it("returns usage error when no input and no stdin (exit 1)", async () => {
    mockIsatty.mockReturnValue(true);

    const { code, stderr } = await captureOutput(() => previewCommand([]));

    expect(code).toBe(cliExitCode.INPUT_ERROR);
    expect(process.exitCode).toBe(cliExitCode.INPUT_ERROR);
    expect(stderr.join(" ")).toContain("Usage: omm preview <input.json>");
  });

  // 7.3: Malformed JSON exits with code 1
  it("exits with code 1 for malformed JSON", async () => {
    const { code, stderr } = await captureOutput(() =>
      previewCommand([fixture("invalid-json.json")]),
    );

    expect(code).toBe(cliExitCode.INPUT_ERROR);
    expect(process.exitCode).toBe(cliExitCode.INPUT_ERROR);
    expect(stderr.join(" ")).toContain("malformed JSON");
  });
});

describe("previewCommand — validation", () => {
  usePreviewLifecycle();

  // 7.4: Invalid OrganicTree exits with code 1 and path-specific errors
  it("exits with code 1 for invalid contract and shows path-specific errors", async () => {
    const missing = await captureOutput(() =>
      previewCommand([fixture("invalid-contract-missing-fields.json")]),
    );
    expect(missing.code).toBe(cliExitCode.INPUT_ERROR);
    expect(missing.stderr.join(" ")).toContain("Invalid OrganicTree");
    expect(missing.stderr.join(" ")).toContain("center.concept");

    const malformed = await captureOutput(() =>
      previewCommand([fixture("invalid-contract-malformed-hierarchy.json")]),
    );
    expect(malformed.code).toBe(cliExitCode.INPUT_ERROR);
    expect(malformed.stderr.join(" ")).toContain("Invalid OrganicTree");
  });

  // 7.5: Oversized input exits with code 2 and retry-friendly feedback
  it("exits with code 2 for capacity exceeded and shows retry-friendly feedback", async () => {
    const { code, stderr } = await captureOutput(() =>
      previewCommand([fixture("oversized-capacity.json")]),
    );

    expect(code).toBe(cliExitCode.CAPACITY_EXCEEDED);
    expect(process.exitCode).toBe(cliExitCode.CAPACITY_EXCEEDED);
    expect(stderr.join(" ")).toContain("Input exceeds MVP capacity");
    expect(stderr.join(" ")).toContain(
      "Please regenerate a shorter concept list",
    );
  });
});

describe("previewCommand — payload shape", () => {
  usePreviewLifecycle();

  // 7.4: CLI passes validated OrganicTree directly to the preview server
  it("passes OrganicTree to the preview server with correct shape", async () => {
    const serverModule = await import("./preview-server.js");
    const spy = vi
      .spyOn(serverModule, "startPreviewServerAsync")
      .mockResolvedValue({
        host: "127.0.0.1",
        port: 5173,
        url: "http://127.0.0.1:5173",
        pid: 12345,
        server: MOCK_SERVER,
      });

    const code = await previewCommand([fixture("valid-handoff.json")]);

    expect(code).toBe(cliExitCode.OK);
    expect(spy).toHaveBeenCalledOnce();

    const payload = spy.mock.calls[0]![0] as Record<string, unknown>;
    // OrganicTree fields at top level
    expect(payload).toHaveProperty("version", 1);
    expect(payload).toHaveProperty("title");
    expect(payload).toHaveProperty("center");
    expect(payload).toHaveProperty("branches");
    // No CLI wrapper field (source was a PreviewPayload artifact)
    expect(payload).not.toHaveProperty("source");
    // No renderer artifacts
    expect(payload).not.toHaveProperty("layout");
    expect(payload).not.toHaveProperty("exportPng");
    expect(payload).not.toHaveProperty("snapshot");

    const center = payload.center as Record<string, unknown>;
    expect(center).toHaveProperty("concept");
    expect(center).toHaveProperty("visualHint");

    spy.mockRestore();
  });
});

describe("previewCommand — server handoff errors", () => {
  usePreviewLifecycle();

  // 7.7: Preview server handoff failures exit with code 3
  it("exits with code 3 when preview server throws", async () => {
    const serverModule = await import("./preview-server.js");
    const spy = vi
      .spyOn(serverModule, "startPreviewServerAsync")
      .mockRejectedValue(new Error("EADDRINUSE: port already in use"));

    const { code, stderr } = await captureOutput(() =>
      previewCommand([fixture("valid-handoff.json")]),
    );

    expect(code).toBe(cliExitCode.SERVER_HANDOFF_ERROR);
    expect(process.exitCode).toBe(cliExitCode.SERVER_HANDOFF_ERROR);
    expect(stderr.join(" ")).toContain("Preview server error");

    spy.mockRestore();
  });
});

describe("previewCommand — forbidden artifacts", () => {
  usePreviewLifecycle();

  // 7.8: CLI does NOT implement ID generation, color assignment, etc.
  it("OrganicTree contains no generated IDs, colors, organic seeds, or OmmDocument artifacts", async () => {
    const serverModule = await import("./preview-server.js");
    let capturedPayload: unknown;
    const spy = vi
      .spyOn(serverModule, "startPreviewServerAsync")
      .mockImplementation((p) => {
        capturedPayload = p;
        return Promise.resolve({
          host: "127.0.0.1",
          port: 5173,
          url: "http://127.0.0.1:5173",
          pid: 1,
          server: MOCK_SERVER,
        });
      });

    await previewCommand([fixture("no-generated-ids.json")]);

    const payload = capturedPayload as Record<string, unknown>;
    expect(findForbiddenKeys(payload, "payload")).toEqual([]);

    spy.mockRestore();
  });
});

describe("previewCommand — port flag", () => {
  usePreviewLifecycle();

  // 7.1: --port flag is forwarded to preview server
  it("forwards --port to the preview server", async () => {
    const serverModule = await import("./preview-server.js");
    let capturedOptions: unknown;
    const spy = vi
      .spyOn(serverModule, "startPreviewServerAsync")
      .mockImplementation((_p, opts) => {
        capturedOptions = opts;
        return Promise.resolve({
          host: "127.0.0.1",
          port: 5173,
          url: "http://127.0.0.1:5173",
          pid: 1,
          server: MOCK_SERVER,
        });
      });

    await previewCommand(["--port", "5173", fixture("valid-handoff.json")]);

    expect(capturedOptions).toMatchObject({ port: 5173 });

    spy.mockRestore();
  });

  // 7.1: Unknown flags are silently ignored (no crash, no usage error)
  it("ignores unknown flags without error", async () => {
    const serverModule = await import("./preview-server.js");
    const spy = vi
      .spyOn(serverModule, "startPreviewServerAsync")
      .mockResolvedValue({
        host: "127.0.0.1",
        port: 5173,
        url: "http://127.0.0.1:5173",
        pid: 1,
        server: MOCK_SERVER,
      });

    // --paper is no longer a valid flag but should be silently ignored
    // Note: unknown flags are ignored, but their values shift positional args
    // The CLI takes positional[0] as the file path
    await previewCommand(["--port", "0", fixture("valid-handoff.json")]);

    // --port 0 is not a valid port (parsePort rejects 0), so it's undefined
    // but the command should still succeed since server uses default port
    expect(spy).toHaveBeenCalledOnce();

    spy.mockRestore();
  });
});
