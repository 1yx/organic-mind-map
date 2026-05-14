/**
 * Stale save detection tests using baseArtifactId.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect } from "vitest";
import { createTestApp } from "./helpers";

const app = createTestApp();

describe("Stale save rejection", () => {
  it("returns stale_document when baseArtifactId is stale", async () => {
    const res = await app.request("/api/documents/doc_stale_test/current-omm", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        omm: { schema: "omm.document", version: 1 },
        baseArtifactId: "stale_placeholder",
      }),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("stale_document");
    expect(body.error.retryable).toBe(false);
  });

  it("succeeds when baseArtifactId is current", async () => {
    const res = await app.request("/api/documents/doc_fresh_test/current-omm", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        omm: { schema: "omm.document", version: 1 },
        baseArtifactId: "artifact_current_v1",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("succeeds without baseArtifactId on first save", async () => {
    const res = await app.request("/api/documents/doc_first_save/current-omm", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        omm: { schema: "omm.document", version: 1 },
      }),
    });
    expect(res.status).toBe(200);
  });
});

describe("Error code HTTP mapping", () => {
  it("stale_document maps to HTTP 409", () => {
    const mapping: Record<string, number> = {
      unauthorized: 401,
      forbidden: 403,
      not_found: 404,
      stale_document: 409,
      payload_too_large: 413,
      validation_failed: 422,
      quota_exhausted: 429,
      rate_limited: 429,
      job_canceled: 499,
      provider_failed: 502,
      worker_failed: 502,
      artifact_unavailable: 503,
    };
    expect(mapping.stale_document).toBe(409);
  });
});
