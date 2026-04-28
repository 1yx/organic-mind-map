/**
 * Local preview server module.
 *
 * Starts a lightweight HTTP server that:
 * - Serves prebuilt @omm/web static assets from dist/
 * - Exposes GET /api/document with the process-scoped preview data
 * - Prints a machine-parseable ready marker: [OMM_SERVER_READY] PID:<pid> <URL>
 * - Binds to localhost by default
 * - Handles port conflicts with actionable errors
 * - Stays attached to the terminal until interrupted
 *
 * Does NOT:
 * - Start Vite, Rollup, Webpack, or any frontend dev server
 * - Watch files, implement live reload, WebSocket, or SSE
 * - Expose editing, mutation, or filesystem browsing endpoints
 */

import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
  type Server,
} from "node:http";
import { readFile } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve, extname, dirname } from "node:path";
import type { PreviewPayload } from "./types.js";

// eslint-disable-next-line @typescript-eslint/naming-convention
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = dirname(__filename);

// ─── Public Types ──────────────────────────────────────────────────────────

export type PreviewServerOptions = {
  /** Host to bind to. Default: "127.0.0.1". */
  host?: string;
  /** Port to bind to. Default: 5173. */
  port?: number;
  /** Path to the prebuilt @omm/web dist directory. */
  webDistPath?: string;
};

export type PreviewServerResult = {
  host: string;
  port: number;
  url: string;
  pid: number;
  server: Server;
};

// ─── Constants ────────────────────────────────────────────────────────────

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 5173;
const READY_MARKER_PREFIX = "[OMM_SERVER_READY]";

/** MIME types for static file serving. */
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function getMimeType(ext: string): string {
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

function resolveWebDist(customPath?: string): string {
  if (customPath) return resolve(customPath);
  // Default: resolve @omm/web/dist relative to this package
  // Try several common resolution strategies
  const candidates = [
    // Monorepo: packages/web/dist relative to project root
    resolve(import.meta.dirname, "../../web/dist"),
    resolve(import.meta.dirname, "../../../web/dist"),
    // Installed package
    resolve(import.meta.dirname, "../web/dist"),
  ];
  // Return the first candidate that exists; callers should check at startup
  return candidates[0]!;
}

/**
 * Serve a static file from the dist directory.
 */
function serveStaticFile(
  webDist: string,
  reqPath: string,
  res: ServerResponse,
): void {
  // Normalize path: strip query string, prevent directory traversal
  const sanitized = reqPath.split("?")[0]!.replace(/\.\./g, "");
  let filePath: string;

  if (sanitized === "/" || sanitized === "") {
    filePath = join(webDist, "index.html");
  } else {
    filePath = join(webDist, sanitized);
  }

  readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    const ext = extname(filePath);
    const mimeType = getMimeType(ext);
    res.writeHead(200, {
      "Content-Type": mimeType,
      "Cache-Control": "no-cache",
    });
    res.end(data);
  });
}

// ─── Server Factory ───────────────────────────────────────────────────────

/**
 * Create (but do not start) an HTTP server with the preview routes.
 */
function createPreviewServer(
  documentData: PreviewPayload | Record<string, unknown>,
  webDist: string,
): Server {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(
      req.url ?? "/",
      `http://${req.headers.host ?? "localhost"}`,
    );

    // GET /api/document — return the process-scoped preview data
    if (url.pathname === "/api/document") {
      if (req.method !== "GET") {
        res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Method Not Allowed");
        return;
      }
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-cache",
      });
      res.end(JSON.stringify(documentData));
      return;
    }

    // All other routes: serve static assets from webDist
    serveStaticFile(webDist, url.pathname, res);
  });

  return server;
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Start the local preview server.
 *
 * Accepts a validated PreviewPayload or .omm document, starts an HTTP server,
 * and prints the ready marker to stdout. The process remains attached to
 * the terminal until interrupted (Ctrl+C / SIGTERM / SIGKILL).
 *
 * @param payloadOrDocument - Validated PreviewPayload or .omm document
 * @param options - Server configuration options
 * @returns Server result with host, port, URL, PID, and server instance
 */
export function startPreviewServer(
  payloadOrDocument: PreviewPayload | Record<string, unknown>,
  options?: PreviewServerOptions,
): PreviewServerResult {
  const host = options?.host ?? DEFAULT_HOST;
  const port = options?.port ?? DEFAULT_PORT;
  const webDist = resolveWebDist(options?.webDistPath);

  const server = createPreviewServer(payloadOrDocument, webDist);

  // Port conflict handling: let the OS error propagate for now
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `Error: Port ${port} is already in use. Use --port <number> to specify a different port, or stop the process using port ${port}.`,
      );
    } else {
      console.error(`Error: Failed to start preview server: ${err.message}`);
    }
    process.exitCode = 3;
    server.close();
  });

  server.listen(port, host, () => {
    const addr = server.address();
    const actualPort = typeof addr === "object" && addr ? addr.port : port;
    const url = `http://${host}:${actualPort}`;
    console.log(`${READY_MARKER_PREFIX} PID:${process.pid} ${url}`);
  });

  return {
    host,
    port,
    url: `http://${host}:${port}`,
    pid: process.pid,
    server,
  };
}

/**
 * Create a preview server for testing without starting it.
 *
 * @param documentData - The preview data to serve
 * @param webDist - Path to static assets directory
 * @returns The created (not listening) server instance
 */
export function createTestServer(
  documentData: PreviewPayload | Record<string, unknown>,
  webDist: string,
): Server {
  return createPreviewServer(documentData, webDist);
}

/**
 * Start the preview server and return a promise that resolves once the
 * server is listening. Useful for programmatic usage.
 */
export function startPreviewServerAsync(
  payloadOrDocument: PreviewPayload | Record<string, unknown>,
  options?: PreviewServerOptions,
): Promise<PreviewServerResult> {
  const host = options?.host ?? DEFAULT_HOST;
  const port = options?.port ?? DEFAULT_PORT;
  const webDist = resolveWebDist(options?.webDistPath);

  return new Promise((resolveP, reject) => {
    const server = createPreviewServer(payloadOrDocument, webDist);

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        const msg = `Port ${port} is already in use. Use --port <number> to specify a different port.`;
        reject(new Error(msg));
      } else {
        reject(err);
      }
    });

    server.listen(port, host, () => {
      const addr = server.address();
      const actualPort = typeof addr === "object" && addr ? addr.port : port;
      const url = `http://${host}:${actualPort}`;
      console.log(`${READY_MARKER_PREFIX} PID:${process.pid} ${url}`);
      resolveP({
        host,
        port: actualPort,
        url,
        pid: process.pid,
        server,
      });
    });
  });
}

// ─── Export for testing ───────────────────────────────────────────────────

export {
  READY_MARKER_PREFIX,
  DEFAULT_HOST,
  DEFAULT_PORT,
  resolveWebDist,
  getMimeType,
  MIME_TYPES,
};
