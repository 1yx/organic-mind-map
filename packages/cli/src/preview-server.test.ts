/**
 * Tests for the local preview server module.
 *
 * Tests server startup, /api/document endpoint, localhost binding,
 * port conflict handling, ready marker format, and static asset serving.
 *
 * Uses real HTTP requests against a test server (not mocks) for integration fidelity.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import http, { type Server } from "node:http";
import { resolve } from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";
import {
  startPreviewServerAsync,
  DEFAULT_HOST,
  READY_MARKER_PREFIX,
} from "./preview-server.js";

// ─── Helpers ──────────────────────────────────────────────────────────────

const TMP_DIR = resolve(import.meta.dirname, "../../.tmp-server-test");

/** Minimal valid OrganicTree for testing (served directly via /api/document). */
const FIXTURE_TREE = {
  version: 1,
  title: "Test Map",
  center: { concept: "Center" },
  branches: [
    {
      concept: "Branch 1",
      children: [{ concept: "Sub 1.1" }],
    },
  ],
};

function httpGet(
  url: string,
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  return new Promise((resolveP, reject) => {
    http
      .get(url, (res) => {
        let body = "";
        res.on("data", (chunk: Buffer) => {
          body += chunk.toString();
        });
        res.on("end", () => {
          resolveP({
            status: res.statusCode ?? 0,
            headers: res.headers as Record<string, string>,
            body,
          });
        });
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

function httpRequest(
  options: http.RequestOptions,
): Promise<{ status: number }> {
  return new Promise((resolveP) => {
    const req = http.request(options, (res) => {
      resolveP({ status: res.statusCode ?? 0 });
      res.resume();
    });
    req.on("error", () => resolveP({ status: 0 }));
    req.end();
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolveP) => {
    server.close(() => resolveP());
  });
}

/** Create a minimal web dist directory with index.html. */
async function createFakeWebDist(): Promise<string> {
  const distDir = resolve(TMP_DIR, "web-dist");
  await mkdir(distDir, { recursive: true });
  await writeFile(
    resolve(distDir, "index.html"),
    `<!DOCTYPE html><html><body>Test Preview</body></html>`,
  );
  return distDir;
}

/** Clean up temp directory. */
async function cleanupTmp(): Promise<void> {
  await rm(TMP_DIR, { recursive: true, force: true });
}

// ─── Tests ────────────────────────────────────────────────────────────────

/** Shared afterEach for all preview-server tests. */
function afterEachCleanup(): void {
  afterEach(async () => {
    await cleanupTmp();
  });
}

describe("preview-server — startup & binding", () => {
  afterEachCleanup();

  // 6.1: Server startup with valid OrganicTree
  it("starts server with valid OrganicTree (6.1)", async () => {
    const result = await startPreviewServerAsync(FIXTURE_TREE, {
      port: 0, // random available port
      host: DEFAULT_HOST,
    });

    expect(result.host).toBe(DEFAULT_HOST);
    expect(result.port).toBeGreaterThan(0);
    expect(result.pid).toBe(process.pid);
    expect(result.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);

    // Verify server is reachable
    const res = await httpGet(`${result.url}/api/document`);
    expect(res.status).toBe(200);

    await closeServer(result.server);
  });

  // 6.3: Localhost default binding test
  it("binds to localhost (127.0.0.1) by default (6.3)", async () => {
    const result = await startPreviewServerAsync(FIXTURE_TREE, { port: 0 });

    expect(result.host).toBe("127.0.0.1");
    expect(result.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);

    await closeServer(result.server);
  });
});

describe("preview-server — port conflicts", () => {
  afterEachCleanup();

  // 6.4: Port conflict behavior test
  it("rejects with error when port is already in use (6.4)", async () => {
    // Start first server
    const first = await startPreviewServerAsync(FIXTURE_TREE, {
      port: 0,
      host: DEFAULT_HOST,
    });

    try {
      await expect(
        startPreviewServerAsync(FIXTURE_TREE, {
          port: first.port,
          host: DEFAULT_HOST,
        }),
      ).rejects.toThrow(/already in use|EADDRINUSE/i);
    } finally {
      await closeServer(first.server);
    }
  });

  // 6.8: Test for exact ready marker format including PID and URL
  it("prints ready marker with exact format: [OMM_SERVER_READY] PID:<pid> <url> (6.8)", async () => {
    const stdout: string[] = [];
    const logSpy = vi.spyOn(console, "log").mockImplementation((...args) => {
      stdout.push(args.join(" "));
    });

    const result = await startPreviewServerAsync(FIXTURE_TREE, { port: 0 });

    // Find the ready marker
    const marker = stdout.find((line) => line.includes(READY_MARKER_PREFIX));
    expect(marker).toBeDefined();

    // Exact format: [OMM_SERVER_READY] PID:<number> <url>
    expect(marker!).toMatch(
      /^\[OMM_SERVER_READY\] PID:\d+ http:\/\/127\.0\.0\.1:\d+$/,
    );

    // Extract PID and URL from marker
    const match = marker!.match(
      /^\[OMM_SERVER_READY\] PID:(\d+) (http:\/\/127\.0\.0\.1:\d+)$/,
    );
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(process.pid);
    expect(match![2]).toBe(result.url);

    logSpy.mockRestore();
    await closeServer(result.server);
  });
});

describe("preview-server — /api/document endpoint", () => {
  afterEachCleanup();

  // 6.2: /api/document response test — serves OrganicTree directly
  it("returns OrganicTree JSON from GET /api/document (6.2)", async () => {
    const result = await startPreviewServerAsync(FIXTURE_TREE, { port: 0 });

    const res = await httpGet(`${result.url}/api/document`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");

    const data = JSON.parse(res.body) as {
      version: number;
      title: string;
      center: { concept: string };
      branches: { concept: string }[];
    };
    expect(data.version).toBe(1);
    expect(data.title).toBe("Test Map");
    expect(data.center.concept).toBe("Center");
    expect(data.branches).toHaveLength(1);
    expect(data.branches[0].concept).toBe("Branch 1");
    // Top-level OrganicTree — no wrapper fields
    expect((data as Record<string, unknown>).source).toBeUndefined();
    expect((data as Record<string, unknown>).paper).toBeUndefined();

    await closeServer(result.server);
  });
});

describe("preview-server — payload shape validation", () => {
  afterEachCleanup();

  // 6.6: Renderer integration smoke test using fixture OrganicTree
  it("serves OrganicTree that can be consumed by the renderer (6.6)", async () => {
    const result = await startPreviewServerAsync(FIXTURE_TREE, { port: 0 });

    const res = await httpGet(`${result.url}/api/document`);
    const data = JSON.parse(res.body) as Record<string, unknown>;

    // Verify OrganicTree fields
    expect(data).toHaveProperty("version", 1);
    expect(data).toHaveProperty("title", "Test Map");
    expect(data).toHaveProperty("center");
    expect(data).toHaveProperty("branches");
    const center = data.center as Record<string, unknown>;
    expect(center).toHaveProperty("concept", "Center");
    const branches = data.branches as Record<string, unknown>[];
    expect(branches).toHaveLength(1);
    expect(branches[0]).toHaveProperty("concept", "Branch 1");

    // Verify no renderer-related fields (those belong in RenderResult)
    expect(data).not.toHaveProperty("svg");
    expect(data).not.toHaveProperty("viewBox");
    expect(data).not.toHaveProperty("diagnostics");
    expect(data).not.toHaveProperty("layout");

    await closeServer(result.server);
  });

  // Additional: GET /api/document with non-GET method returns 405
  it("rejects non-GET methods on /api/document with 405", async () => {
    const result = await startPreviewServerAsync(FIXTURE_TREE, { port: 0 });

    const postResult = await httpRequest({
      hostname: result.host,
      port: result.port,
      path: "/api/document",
      method: "POST",
    });
    expect(postResult.status).toBe(405);

    await closeServer(result.server);
  });
});

describe("preview-server — static assets & negative tests", () => {
  afterEachCleanup();

  // 6.5: Web preview smoke test for document fetch
  it("serves index.html for / and /api/document for data (6.5)", async () => {
    const webDist = await createFakeWebDist();
    const result = await startPreviewServerAsync(FIXTURE_TREE, {
      port: 0,
      webDistPath: webDist,
    });

    // Check index.html is served
    const indexRes = await httpGet(result.url);
    expect(indexRes.status).toBe(200);
    expect(indexRes.body).toContain("Test Preview");

    // Check /api/document returns OrganicTree JSON
    const docRes = await httpGet(`${result.url}/api/document`);
    expect(docRes.status).toBe(200);
    const doc = JSON.parse(docRes.body) as Record<string, unknown>;
    expect(doc.title).toBe("Test Map");
    expect(doc.center).toBeDefined();
    expect(doc.branches).toBeDefined();

    await closeServer(result.server);
  });

  // 6.7: Test that production serving uses static assets and does not invoke a frontend dev server
  it("serves static files from webDist without starting a dev server (6.7)", async () => {
    const webDist = await createFakeWebDist();

    // Write an additional static file
    await writeFile(resolve(webDist, "test.js"), "console.log('test');");

    const result = await startPreviewServerAsync(FIXTURE_TREE, {
      port: 0,
      webDistPath: webDist,
    });

    // Serve the custom static file
    const jsRes = await httpGet(`${result.url}/test.js`);
    expect(jsRes.status).toBe(200);
    expect(jsRes.body).toBe("console.log('test');");

    // 404 for non-existent files
    const missingRes = await httpGet(`${result.url}/nonexistent.js`);
    expect(missingRes.status).toBe(404);

    // No Vite/Webpack/Rollup dev server headers
    expect(jsRes.headers["x-vite-dev-server"]).toBeUndefined();

    await closeServer(result.server);
  });

  // 6.9: No file watcher / live reload / WebSocket / SSE
  it("does not implement WebSocket, SSE, or live reload endpoints (6.9)", async () => {
    const result = await startPreviewServerAsync(FIXTURE_TREE, { port: 0 });

    // SSE endpoint should not exist
    const sseRes = await httpGet(`${result.url}/api/events`);
    expect(sseRes.status).toBe(404);

    // __vite_hmr endpoint should not exist (no Vite dev server)
    const hmrRes = await httpGet(`${result.url}/@vite/client`);
    expect(hmrRes.status).toBe(404);

    await closeServer(result.server);
  });
});

describe("preview-server — 404 handling", () => {
  afterEachCleanup();

  // Additional: serve index.html for any non-API route (SPA fallback)
  it("returns 404 for non-existent static files", async () => {
    const webDist = await createFakeWebDist();
    const result = await startPreviewServerAsync(FIXTURE_TREE, {
      port: 0,
      webDistPath: webDist,
    });

    const res = await httpGet(`${result.url}/some/random/path`);
    expect(res.status).toBe(404);

    await closeServer(result.server);
  });
});
