/**
 * Tests for CLI JSON mode (`--json` flag).
 *
 * Validates the JSON result envelope for success, usage errors,
 * malformed JSON, contract/quality/capacity validation failures,
 * server startup errors, warning-only results, and JSON Pointer paths.
 *
 * Tasks 7.1–7.6 from cli-error-schema.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolve } from "node:path";
import { previewCommand } from "./preview.js";
import { cliExitCode, type CliJsonResult } from "./types.js";
import { toJsonPointer } from "./json-result.js";

// ---------------------------------------------------------------------------
// Mock node:tty
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

/**
 * Capture console.error and console.log calls during a fn.
 */
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MOCK_SERVER = {} as any;

/**
 * Parse the first stdout line as a CliJsonResult.
 */
function parseJsonStdout(stdout: string[]): CliJsonResult {
  expect(stdout.length).toBeGreaterThanOrEqual(1);
  const line = stdout[0]!;
  return JSON.parse(line) as CliJsonResult;
}

// ---------------------------------------------------------------------------
// Tests: JSON mode success (7.1)
// ---------------------------------------------------------------------------

describe("previewCommand --json — success result", () => {
  usePreviewLifecycle();

  it("outputs a parseable JSON result with ready.pid and ready.url (7.1)", async () => {
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

    const { code, stdout, stderr } = await captureOutput(() =>
      previewCommand(["--json", fixture("valid-handoff.json")]),
    );

    spy.mockRestore();

    expect(code).toBe(cliExitCode.OK);
    // JSON mode: no stderr for expected outcomes
    expect(stderr).toEqual([]);
    expect(stdout.length).toBeGreaterThanOrEqual(1);

    const result = parseJsonStdout(stdout);
    expect(result.schema).toBe("omm.cli.result");
    expect(result.version).toBe(1);
    expect(result.command).toBe("preview");
    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.agentAction).toBe("open-preview");
    expect(result.structuredContent.kind).toBe("success");
    expect(result.structuredContent.ready).toBeDefined();
    expect(result.structuredContent.ready!.pid).toBe(12345);
    expect(result.structuredContent.ready!.url).toBe("http://127.0.0.1:5173");
    expect(result.structuredContent.findings).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Tests: JSON mode error results (7.2)
// ---------------------------------------------------------------------------

describe("previewCommand --json — error results: usage & file-read (7.2)", () => {
  usePreviewLifecycle();

  it("returns usage error with fix-command action", async () => {
    mockIsatty.mockReturnValue(true);

    const { code, stdout, stderr } = await captureOutput(() =>
      previewCommand(["--json"]),
    );

    expect(code).toBe(cliExitCode.INPUT_ERROR);
    expect(stderr).toEqual([]);

    const result = parseJsonStdout(stdout);
    expect(result.ok).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.agentAction).toBe("fix-command");
    expect(result.structuredContent.kind).toBe("usage");
    expect(result.structuredContent.findings).toHaveLength(1);
    expect(result.structuredContent.findings[0]!.code).toBe("MISSING_INPUT");
    expect(result.structuredContent.findings[0]!.severity).toBe("error");
  });

  it("returns file-read error with fix-command action", async () => {
    const { code, stdout, stderr } = await captureOutput(() =>
      previewCommand(["--json", "/nonexistent/file.json"]),
    );

    expect(code).toBe(cliExitCode.INPUT_ERROR);
    expect(stderr).toEqual([]);

    const result = parseJsonStdout(stdout);
    expect(result.ok).toBe(false);
    expect(result.agentAction).toBe("fix-command");
    expect(result.structuredContent.kind).toBe("file-read");
    expect(result.structuredContent.findings[0]!.code).toBe("FILE_READ_ERROR");
  });
});

describe("previewCommand --json — error results: parse & contract (7.2)", () => {
  usePreviewLifecycle();

  it("returns json-parse error with fix-json-syntax action", async () => {
    const { code, stdout, stderr } = await captureOutput(() =>
      previewCommand(["--json", fixture("invalid-json.json")]),
    );

    expect(code).toBe(cliExitCode.INPUT_ERROR);
    expect(stderr).toEqual([]);

    const result = parseJsonStdout(stdout);
    expect(result.ok).toBe(false);
    expect(result.agentAction).toBe("fix-json-syntax");
    expect(result.structuredContent.kind).toBe("json-parse");
    expect(result.structuredContent.findings[0]!.code).toBe("JSON_PARSE_ERROR");
  });

  it("returns contract error with regenerate-organic-tree action", async () => {
    const { code, stdout, stderr } = await captureOutput(() =>
      previewCommand([
        "--json",
        fixture("invalid-contract-missing-fields.json"),
      ]),
    );

    expect(code).toBe(cliExitCode.INPUT_ERROR);
    expect(stderr).toEqual([]);

    const result = parseJsonStdout(stdout);
    expect(result.ok).toBe(false);
    expect(result.agentAction).toBe("regenerate-organic-tree");
    expect(result.structuredContent.kind).toBe("contract");
    expect(result.structuredContent.findings.length).toBeGreaterThan(0);
    expect(result.structuredContent.findings[0]!.code).toBe("CONTRACT_ERROR");
    expect(result.structuredContent.findings[0]!.severity).toBe("error");
  });

  it("passes valid input with no quality errors", async () => {
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

    const validResult = await captureOutput(() =>
      previewCommand(["--json", fixture("valid-handoff.json")]),
    );
    expect(validResult.code).toBe(0);

    spy.mockRestore();
  });
});

describe("previewCommand --json — error results: capacity & server (7.2)", () => {
  usePreviewLifecycle();

  it("returns capacity error with exit code 2 and regenerate action", async () => {
    const { code, stdout, stderr } = await captureOutput(() =>
      previewCommand(["--json", fixture("oversized-capacity.json")]),
    );

    expect(code).toBe(cliExitCode.CAPACITY_EXCEEDED);
    expect(stderr).toEqual([]);

    const result = parseJsonStdout(stdout);
    expect(result.ok).toBe(false);
    expect(result.exitCode).toBe(2);
    expect(result.agentAction).toBe("regenerate-organic-tree");
    expect(result.structuredContent.kind).toBe("capacity");
    expect(result.structuredContent.findings.length).toBeGreaterThan(0);
    expect(result.structuredContent.findings[0]!.code).toBe(
      "CAPACITY_EXCEEDED",
    );
    // Capacity findings should have limit and actual
    const capFinding = result.structuredContent.findings.find(
      (f) => f.limit !== undefined,
    );
    expect(capFinding).toBeDefined();
    expect(capFinding!.limit).toBeDefined();
    expect(capFinding!.actual).toBeDefined();
    expect(capFinding!.repair).toContain("shorter");
  });

  it("returns server-startup error with exit code 3 and retry action", async () => {
    const serverModule = await import("./preview-server.js");
    const spy = vi
      .spyOn(serverModule, "startPreviewServerAsync")
      .mockRejectedValue(new Error("EADDRINUSE: port already in use"));

    const { code, stdout, stderr } = await captureOutput(() =>
      previewCommand(["--json", fixture("valid-handoff.json")]),
    );

    spy.mockRestore();

    expect(code).toBe(cliExitCode.SERVER_HANDOFF_ERROR);
    expect(stderr).toEqual([]);

    const result = parseJsonStdout(stdout);
    expect(result.ok).toBe(false);
    expect(result.exitCode).toBe(3);
    expect(result.agentAction).toBe("retry-later-or-change-port");
    expect(result.structuredContent.kind).toBe("server-startup");
    expect(result.structuredContent.findings[0]!.code).toBe(
      "SERVER_STARTUP_ERROR",
    );
    expect(result.structuredContent.findings[0]!.repair).toContain("--port");
  });
});

// ---------------------------------------------------------------------------
// Tests: JSON mode stderr behavior (7.3)
describe("previewCommand --json — no stderr for expected outcomes (7.3)", () => {
  usePreviewLifecycle();

  it("does not write stderr on success", async () => {
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

    const { stderr } = await captureOutput(() =>
      previewCommand(["--json", fixture("valid-handoff.json")]),
    );

    spy.mockRestore();
    expect(stderr).toEqual([]);
  });

  it("does not write stderr on usage error", async () => {
    mockIsatty.mockReturnValue(true);
    const { stderr } = await captureOutput(() => previewCommand(["--json"]));
    expect(stderr).toEqual([]);
  });

  it("does not write stderr on malformed JSON error", async () => {
    const { stderr } = await captureOutput(() =>
      previewCommand(["--json", fixture("invalid-json.json")]),
    );
    expect(stderr).toEqual([]);
  });

  it("does not write stderr on contract error", async () => {
    const { stderr } = await captureOutput(() =>
      previewCommand([
        "--json",
        fixture("invalid-contract-missing-fields.json"),
      ]),
    );
    expect(stderr).toEqual([]);
  });
});

describe("previewCommand --json — no stderr for capacity & server (7.3)", () => {
  usePreviewLifecycle();

  it("does not write stderr on capacity error", async () => {
    const { stderr } = await captureOutput(() =>
      previewCommand(["--json", fixture("oversized-capacity.json")]),
    );
    expect(stderr).toEqual([]);
  });

  it("does not write stderr on server startup error", async () => {
    const serverModule = await import("./preview-server.js");
    const spy = vi
      .spyOn(serverModule, "startPreviewServerAsync")
      .mockRejectedValue(new Error("EADDRINUSE"));

    const { stderr } = await captureOutput(() =>
      previewCommand(["--json", fixture("valid-handoff.json")]),
    );

    spy.mockRestore();
    expect(stderr).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Tests: Warning-only result (7.4)
// ---------------------------------------------------------------------------

describe("previewCommand --json — warning-only result (7.4)", () => {
  usePreviewLifecycle();

  it("supports ok:true with warning findings", async () => {
    // Direct test of the result builder — warning findings with ok:true
    const { buildJsonResult } = await import("./json-result.js");
    const result = buildJsonResult({
      ok: true,
      exitCode: 0,
      agentAction: "none",
      kind: "success",
      findings: [
        {
          severity: "warning",
          code: "SOFT_WARNING",
          path: "/title",
          message: "Title is short for visibility.",
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.structuredContent.findings).toHaveLength(1);
    expect(result.structuredContent.findings[0].severity).toBe("warning");
    // Error findings go in content, warnings don't pollute it
    expect(result.content[0].text).toBe("Preview server is ready.");
  });
});

// ---------------------------------------------------------------------------
// Tests: JSON Pointer path conversion (7.5)
// ---------------------------------------------------------------------------

describe("toJsonPointer — JSON Pointer path conversion (7.5)", () => {
  it("converts empty string to empty string", () => {
    expect(toJsonPointer("")).toBe("");
  });

  it("converts simple field", () => {
    expect(toJsonPointer("center.concept")).toBe("/center/concept");
  });

  it("converts bracket notation", () => {
    expect(toJsonPointer("branches[0].concept")).toBe("/branches/0/concept");
  });

  it("converts nested bracket notation", () => {
    expect(toJsonPointer("branches[2].children[0].concept")).toBe(
      "/branches/2/children/0/concept",
    );
  });

  it("strips leading dot", () => {
    expect(toJsonPointer(".center.concept")).toBe("/center/concept");
  });

  it("handles paths with leading dot and brackets", () => {
    expect(toJsonPointer(".branches[0].children[1].children[2].concept")).toBe(
      "/branches/0/children/1/children/2/concept",
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: Human mode preserved (7.6)
// ---------------------------------------------------------------------------

describe("previewCommand — human mode still works (7.6)", () => {
  usePreviewLifecycle();

  it("prints [OMM_SERVER_READY] marker in human mode on success", async () => {
    // Use real server to verify the ready marker is printed to stdout.
    // Use a high port to avoid conflicts with other tests.
    const { code, stdout } = await captureOutput(() =>
      previewCommand(["--port", "45999", fixture("valid-handoff.json")]),
    );

    expect(code).toBe(cliExitCode.OK);
    expect(stdout).toEqual(
      expect.arrayContaining([
        expect.stringContaining("[OMM_SERVER_READY]"),
        expect.stringContaining("PID:"),
        expect.stringContaining("http://"),
      ]),
    );
  });

  it("prints human-readable usage error to stderr without --json", async () => {
    mockIsatty.mockReturnValue(true);

    const { code, stderr } = await captureOutput(() => previewCommand([]));

    expect(code).toBe(cliExitCode.INPUT_ERROR);
    expect(stderr.join(" ")).toContain("Usage: omm preview <input.json>");
  });

  it("prints human-readable malformed JSON error to stderr", async () => {
    const { code, stderr } = await captureOutput(() =>
      previewCommand([fixture("invalid-json.json")]),
    );

    expect(code).toBe(cliExitCode.INPUT_ERROR);
    expect(stderr.join(" ")).toContain("malformed JSON");
  });

  it("prints human-readable capacity error to stderr", async () => {
    const { code, stderr } = await captureOutput(() =>
      previewCommand([fixture("oversized-capacity.json")]),
    );

    expect(code).toBe(cliExitCode.CAPACITY_EXCEEDED);
    expect(stderr.join(" ")).toContain("Input exceeds MVP capacity");
  });
});

// ---------------------------------------------------------------------------
// Tests: JSON result envelope shape validation
// ---------------------------------------------------------------------------

describe("previewCommand --json — result envelope shape", () => {
  usePreviewLifecycle();

  it("always has schema, version, command fields", async () => {
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

    const { stdout } = await captureOutput(() =>
      previewCommand(["--json", fixture("valid-handoff.json")]),
    );

    spy.mockRestore();

    const result = parseJsonStdout(stdout);
    expect(result).toHaveProperty("schema", "omm.cli.result");
    expect(result).toHaveProperty("version", 1);
    expect(result).toHaveProperty("command", "preview");
    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("exitCode");
    expect(result).toHaveProperty("agentAction");
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("structuredContent");
    expect(result.structuredContent).toHaveProperty("kind");
    expect(result.structuredContent).toHaveProperty("findings");
  });

  it("emits a single-line JSON object (no pretty-printing)", async () => {
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

    const { stdout } = await captureOutput(() =>
      previewCommand(["--json", fixture("valid-handoff.json")]),
    );

    spy.mockRestore();

    // Should be exactly one line
    expect(stdout.length).toBe(1);
    // Should not contain newlines
    expect(stdout[0]).not.toContain("\n");
  });
});
