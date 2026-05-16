/**
 * Artifact authorization tests for browser-readable and admin-only artifacts.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { beforeEach, describe, it, expect } from "vitest";
import { contentHash } from "../services/ids";
import { nowIso } from "../temporal";
import { createTestApp, type TestHarness, testUser } from "./helpers";

let harness: TestHarness;

beforeEach(async () => {
  harness = await createTestApp();
});

async function createGeneratedArtifacts() {
  const res = await harness.app.request("/api/generation-jobs", {
    method: "POST",
    headers: { ...harness.authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { kind: "content_outline_text", text: "Center\n  Branch" },
    }),
  });
  const body = await res.json();
  const job = await harness.storage.getGenerationJob(body.data.jobId);
  if (!job?.artifacts.predictionOmm) throw new Error("missing prediction_omm");
  return {
    predictionOmm: job.artifacts.predictionOmm,
    documentId: body.data.documentId as string,
  };
}

describe("Artifact metadata and content", () => {
  it("returns persisted artifact metadata with required fields", async () => {
    const { predictionOmm } = await createGeneratedArtifacts();
    const res = await harness.app.request(`/api/artifacts/${predictionOmm}`, {
      headers: harness.authHeaders,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(predictionOmm);
    expect(body.data.kind).toBe("prediction_omm");
    expect(body.data).toHaveProperty("byteSize");
    expect(body.data).toHaveProperty("contentHash");
  });

  it("returns browser-readable prediction_omm content", async () => {
    const { predictionOmm } = await createGeneratedArtifacts();
    const res = await harness.app.request(
      `/api/artifacts/${predictionOmm}/content`,
      { headers: harness.authHeaders },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain(
      "application/vnd.omm+json",
    );
    const body = await res.json();
    expect(body.schema).toBe("omm.document");
  });

  it("denies artifact reads across owners", async () => {
    const { predictionOmm } = await createGeneratedArtifacts();
    const res = await harness.app.request(`/api/artifacts/${predictionOmm}`, {
      headers: harness.otherAuthHeaders,
    });
    expect(res.status).toBe(404);
  });
});

describe("Admin-only artifact content", () => {
  it("denies raw mask content to non-admin and allows admin", async () => {
    const { documentId } = await createGeneratedArtifacts();
    const content = Buffer.from("mask-bytes");
    await harness.storage.saveArtifact(
      {
        id: "artifact_mask_test",
        kind: "mask",
        mimeType: "image/png",
        name: "mask.png",
        byteSize: content.byteLength,
        contentHash: contentHash(content),
        ownerUserId: testUser.id,
        documentId,
        accessPolicy: "admin",
        cachePolicy: "immutable",
        createdAt: nowIso(),
      },
      content,
    );

    const userRes = await harness.app.request(
      "/api/artifacts/artifact_mask_test/content",
      { headers: harness.authHeaders },
    );
    expect(userRes.status).toBe(404);

    const adminRes = await harness.app.request(
      "/api/artifacts/artifact_mask_test/content",
      { headers: harness.adminHeaders },
    );
    expect(adminRes.status).toBe(200);
    expect(await adminRes.text()).toBe("mask-bytes");
  });

  it("requires auth for artifact reads", async () => {
    const { predictionOmm } = await createGeneratedArtifacts();
    const res = await harness.app.request(`/api/artifacts/${predictionOmm}`);
    expect(res.status).toBe(401);
  });
});
