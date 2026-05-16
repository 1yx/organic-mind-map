/**
 * Export authorization tests for user exports and admin-only debug/dataset exports.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, max-lines-per-function */
import { beforeEach, describe, it, expect } from "vitest";
import { createTestApp, type TestHarness } from "./helpers";

let harness: TestHarness;

beforeEach(async () => {
  harness = await createTestApp();
});

async function createGeneratedDocument() {
  const res = await harness.app.request("/api/generation-jobs", {
    method: "POST",
    headers: { ...harness.authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { kind: "content_outline_text", text: "Center\n  Branch" },
    }),
  });
  const body = await res.json();
  const job = await harness.storage.getGenerationJob(body.data.jobId);
  if (!job?.artifacts.predictionOmm) throw new Error("missing source artifact");
  if (!job.artifacts.referenceImage) throw new Error("missing reference image");
  return {
    documentId: body.data.documentId as string,
    sourceArtifactId: job.artifacts.predictionOmm,
    referenceArtifactId: job.artifacts.referenceImage,
  };
}

describe("Export job creation", () => {
  it("creates a completed export job and artifact for png format", async () => {
    const doc = await createGeneratedDocument();
    const res = await harness.app.request("/api/exports", {
      method: "POST",
      headers: { ...harness.authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: doc.documentId,
        format: "png",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe("completed");
    const artifact = await harness.storage.getArtifact(body.data.artifactId);
    expect(artifact?.kind).toBe("png_export");
  });

  it("copies selected OMM source content for omm export", async () => {
    const doc = await createGeneratedDocument();
    const res = await harness.app.request("/api/exports", {
      method: "POST",
      headers: { ...harness.authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: doc.documentId,
        sourceArtifactId: doc.sourceArtifactId,
        format: "omm",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    const exported = await harness.storage.readArtifactContent(
      body.data.artifactId,
    );
    const source = await harness.storage.readArtifactContent(
      doc.sourceArtifactId,
    );
    expect(exported?.toString()).toBe(source?.toString());
  });

  it("rejects mismatched source artifact/document pairs", async () => {
    const docA = await createGeneratedDocument();
    const docB = await createGeneratedDocument();
    const res = await harness.app.request("/api/exports", {
      method: "POST",
      headers: { ...harness.authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: docA.documentId,
        sourceArtifactId: docB.sourceArtifactId,
        format: "png",
      }),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("validation_failed");
  });

  it("rejects non-OMM source artifacts for omm export", async () => {
    const doc = await createGeneratedDocument();
    const res = await harness.app.request("/api/exports", {
      method: "POST",
      headers: { ...harness.authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: doc.documentId,
        sourceArtifactId: doc.referenceArtifactId,
        format: "omm",
      }),
    });
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("validation_failed");
  });
});

describe("Export admin restrictions", () => {
  it("rejects debug_bundle for non-admin", async () => {
    const doc = await createGeneratedDocument();
    const res = await harness.app.request("/api/exports", {
      method: "POST",
      headers: { ...harness.authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: doc.documentId,
        format: "debug_bundle",
      }),
    });
    expect(res.status).toBe(403);
  });

  it("allows debug_bundle for admin", async () => {
    const doc = await createGeneratedDocument();
    const res = await harness.app.request("/api/exports", {
      method: "POST",
      headers: { ...harness.adminHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: doc.documentId,
        format: "debug_bundle",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    const artifact = await harness.storage.getArtifact(body.data.artifactId);
    expect(artifact?.kind).toBe("debug_bundle");
    expect(artifact?.accessPolicy).toBe("admin");
  });

  it("rejects phase3_dataset_seed for non-admin", async () => {
    const doc = await createGeneratedDocument();
    const res = await harness.app.request("/api/exports", {
      method: "POST",
      headers: { ...harness.authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: doc.documentId,
        format: "phase3_dataset_seed",
      }),
    });
    expect(res.status).toBe(403);
  });
});

describe("Export job status", () => {
  it("gets persisted export job status", async () => {
    const doc = await createGeneratedDocument();
    const create = await harness.app.request("/api/exports", {
      method: "POST",
      headers: { ...harness.authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: doc.documentId,
        format: "png",
      }),
    });
    const created = await create.json();

    const res = await harness.app.request(
      `/api/exports/${created.data.exportJobId}`,
      { headers: harness.authHeaders },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("completed");
    expect(body.data.artifactId).toBe(created.data.artifactId);
  });
});
