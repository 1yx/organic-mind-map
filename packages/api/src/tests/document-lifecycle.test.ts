/**
 * Document lifecycle tests for generated, saved, archived, and
 * correction-does-not-mutate-user-state behavior.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { beforeEach, describe, it, expect } from "vitest";
import { createTestApp, type TestHarness } from "./helpers";

let harness: TestHarness;

beforeEach(async () => {
  harness = await createTestApp();
});

async function createSavedDocument() {
  const res = await harness.app.request("/api/documents", {
    method: "POST",
    headers: { ...harness.authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test Map",
      omm: { schema: "omm.document", version: 1 },
    }),
  });
  const body = await res.json();
  return body.data as {
    documentId: string;
    artifactId: string;
    currentEditableSource: { kind: string; artifactId: string };
  };
}

describe("Document creation and retrieval", () => {
  it("creates and persists a document from frontend-submitted omm", async () => {
    const data = await createSavedDocument();
    const document = await harness.storage.getDocument(data.documentId);
    const artifact = await harness.storage.getArtifact(data.artifactId);

    expect(document?.lifecycle).toBe("saved");
    expect(document?.artifacts.userSavedOmm).toBe(data.artifactId);
    expect(artifact?.kind).toBe("user_saved_omm");
    expect(data.currentEditableSource.kind).toBe("user_saved_omm");
  });

  it("requires a valid OMM in document creation", async () => {
    const res = await harness.app.request("/api/documents", {
      method: "POST",
      headers: { ...harness.authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test", omm: { schema: "bad" } }),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("validation_failed");
  });

  it("GET returns persisted artifact references and currentEditableSource", async () => {
    const created = await createSavedDocument();
    const res = await harness.app.request(
      `/api/documents/${created.documentId}`,
      {
        headers: harness.authHeaders,
      },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(created.documentId);
    expect(body.data.lifecycle).toBe("saved");
    expect(body.data.currentEditableSource.kind).toBe("user_saved_omm");
  });

  it("denies reads across owners", async () => {
    const created = await createSavedDocument();
    const res = await harness.app.request(
      `/api/documents/${created.documentId}`,
      {
        headers: harness.otherAuthHeaders,
      },
    );
    expect(res.status).toBe(404);
  });
});

describe("Document save and archive", () => {
  it("saves user_saved_omm with PUT current-omm and updates current source", async () => {
    const created = await createSavedDocument();
    const res = await harness.app.request(
      `/api/documents/${created.documentId}/current-omm`,
      {
        method: "PUT",
        headers: { ...harness.authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          omm: { schema: "omm.document", version: 2 },
          baseArtifactId: created.artifactId,
        }),
      },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.artifactId).not.toBe(created.artifactId);
    const document = await harness.storage.getDocument(created.documentId);
    expect(document?.artifacts.userSavedOmm).toBe(body.data.artifactId);
    expect(document?.lifecycle).toBe("saved");
  });

  it("rejects normal saves that include internal masks/debug evidence", async () => {
    const created = await createSavedDocument();
    const res = await harness.app.request(
      `/api/documents/${created.documentId}/current-omm`,
      {
        method: "PUT",
        headers: { ...harness.authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          omm: { schema: "omm.document", version: 1, masks: [] },
          baseArtifactId: created.artifactId,
        }),
      },
    );
    expect(res.status).toBe(422);
  });

  it("archives without deleting linked artifacts", async () => {
    const created = await createSavedDocument();
    const res = await harness.app.request(
      `/api/documents/${created.documentId}/archive`,
      { method: "POST", headers: harness.authHeaders },
    );
    expect(res.status).toBe(200);
    const document = await harness.storage.getDocument(created.documentId);
    const artifact = await harness.storage.getArtifact(created.artifactId);
    expect(document?.lifecycle).toBe("archived");
    expect(artifact).toBeTruthy();
  });
});

describe("Generated document editable source", () => {
  it("generated document starts from prediction_omm", async () => {
    const res = await harness.app.request("/api/generation-jobs", {
      method: "POST",
      headers: { ...harness.authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { kind: "content_outline_text", text: "Center\n  Branch" },
      }),
    });
    const body = await res.json();
    const document = await harness.storage.getDocument(body.data.documentId);
    expect(document?.lifecycle).toBe("generated");
    expect(document?.currentEditableSource?.kind).toBe("prediction_omm");
  });
});
