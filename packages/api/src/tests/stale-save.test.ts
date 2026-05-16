/**
 * Stale save detection tests using baseArtifactId.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { beforeEach, describe, it, expect } from "vitest";
import { ERROR_CODE_TO_STATUS } from "../errors/index";
import { createTestApp, type TestHarness } from "./helpers";

let harness: TestHarness;

beforeEach(async () => {
  harness = await createTestApp();
});

async function createDocument() {
  const res = await harness.app.request("/api/documents", {
    method: "POST",
    headers: { ...harness.authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      omm: { schema: "omm.document", version: 1 },
    }),
  });
  const body = await res.json();
  return body.data as { documentId: string; artifactId: string };
}

describe("Stale save rejection", () => {
  it("returns stale_document when baseArtifactId is stale", async () => {
    const created = await createDocument();
    const res = await harness.app.request(
      `/api/documents/${created.documentId}/current-omm`,
      {
        method: "PUT",
        headers: { ...harness.authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          omm: { schema: "omm.document", version: 1 },
          baseArtifactId: "artifact_old",
        }),
      },
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("stale_document");
    expect(body.error.retryable).toBe(false);
  });

  it("succeeds when baseArtifactId is current", async () => {
    const created = await createDocument();
    const res = await harness.app.request(
      `/api/documents/${created.documentId}/current-omm`,
      {
        method: "PUT",
        headers: { ...harness.authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          omm: { schema: "omm.document", version: 1 },
          baseArtifactId: created.artifactId,
        }),
      },
    );
    expect(res.status).toBe(200);
  });

  it("succeeds without baseArtifactId on first explicit save", async () => {
    const created = await createDocument();
    const res = await harness.app.request(
      `/api/documents/${created.documentId}/current-omm`,
      {
        method: "PUT",
        headers: { ...harness.authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          omm: { schema: "omm.document", version: 1 },
        }),
      },
    );
    expect(res.status).toBe(200);
  });
});

describe("Error code HTTP mapping", () => {
  it("stale_document maps to HTTP 409", () => {
    expect(ERROR_CODE_TO_STATUS.stale_document).toBe(409);
  });
});
