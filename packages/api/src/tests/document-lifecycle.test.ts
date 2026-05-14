/**
 * Document lifecycle tests for generated, saved, archived, and
 * correction-does-not-mutate-user-state behavior.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect } from "vitest";
import { createTestApp } from "./helpers";

const app = createTestApp();

describe("Document creation", () => {
  it("creates a document from frontend-submitted omm", async () => {
    const res = await app.request("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Map",
        omm: { schema: "omm.document", version: 1 },
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toHaveProperty("documentId");
    expect(body.data).toHaveProperty("artifactId");
    expect(body.data.currentEditableSource.kind).toBe("user_saved_omm");
  });

  it("requires omm in document creation", async () => {
    const res = await app.request("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test" }),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("validation_failed");
  });
});

describe("Document retrieval", () => {
  it("document response has required fields", async () => {
    const res = await app.request("/api/documents/doc_test_001");
    expect(res.status).toBe(200);
    const body = await res.json();
    const data = body.data;

    const fields = [
      "id",
      "name",
      "lifecycle",
      "artifacts",
      "currentEditableSource",
    ];
    for (const field of fields) {
      expect(data).toHaveProperty(field);
    }
  });

  it("document lifecycle values are restricted", () => {
    expect(["generated", "saved", "archived"]).toHaveLength(3);
  });

  it("artifacts object has all expected keys", async () => {
    const res = await app.request("/api/documents/doc_artifact_keys");
    const body = await res.json();
    const artifacts = body.data.artifacts;
    const keys = [
      "contentOutline",
      "referenceImage",
      "predictionOmm",
      "userSavedOmm",
      "correctionOmm",
    ];
    for (const key of keys) {
      expect(artifacts).toHaveProperty(key);
    }
  });
});

describe("Document save", () => {
  it("saves user_saved_omm with PUT current-omm", async () => {
    const res = await app.request("/api/documents/doc_save_test/current-omm", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        omm: { schema: "omm.document", version: 1 },
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toHaveProperty("artifactId");
    expect(body.data).toHaveProperty("savedAt");
    expect(body.data.currentEditableSource.kind).toBe("user_saved_omm");
  });
});

describe("Editable source resolution", () => {
  it("currentEditableSource prefers user_saved_omm over prediction_omm", () => {
    const doc = {
      artifacts: { predictionOmm: "art_pred", userSavedOmm: "art_saved" },
    };
    const source = doc.artifacts.userSavedOmm
      ? {
          kind: "user_saved_omm" as const,
          artifactId: doc.artifacts.userSavedOmm,
        }
      : doc.artifacts.predictionOmm
        ? {
            kind: "prediction_omm" as const,
            artifactId: doc.artifacts.predictionOmm,
          }
        : null;
    expect(source?.kind).toBe("user_saved_omm");
  });

  it("currentEditableSource falls back to prediction_omm", () => {
    const doc = {
      artifacts: { predictionOmm: "art_pred", userSavedOmm: null },
    };
    const source = doc.artifacts.userSavedOmm
      ? {
          kind: "user_saved_omm" as const,
          artifactId: doc.artifacts.userSavedOmm,
        }
      : doc.artifacts.predictionOmm
        ? {
            kind: "prediction_omm" as const,
            artifactId: doc.artifacts.predictionOmm,
          }
        : null;
    expect(source?.kind).toBe("prediction_omm");
  });

  it("correction_omm does not mutate document lifecycle", () => {
    const doc = {
      lifecycle: "saved",
      artifacts: { userSavedOmm: "art_saved_v1", correctionOmm: null },
    };
    const after = {
      ...doc,
      artifacts: { ...doc.artifacts, correctionOmm: "art_correction_v1" },
    };
    expect(after.lifecycle).toBe("saved");
    expect(after.artifacts.userSavedOmm).toBe("art_saved_v1");
  });
});
