/**
 * Local preview server stub.
 *
 * In a full implementation (06-local-preview-server), this would start an
 * HTTP server, mount GET /api/document with the PreviewPayload, serve the
 * web preview bundle, handle port conflicts, and print the preview URL.
 *
 * For now this stub logs the payload summary so the CLI flow is exercisable.
 */

import type { PreviewPayload } from "./types.js";

export type PreviewServerOptions = {
  port?: number;
};

export function startPreviewServer(
  payload: PreviewPayload,
  options?: PreviewServerOptions,
): void {
  // Stub: in a full implementation this would start an HTTP server,
  // mount /api/document, and serve the web preview bundle.
  // For now, just log that the payload is ready for browser consumption.
  console.log("PreviewPayload ready for browser consumption.");
  console.log(`  Paper: ${payload.paper}`);
  console.log(`  Title: ${payload.tree.title}`);
  console.log(`  Source: ${payload.source}`);
  if (options?.port) {
    console.log(`  Port: ${options.port}`);
  }
}
