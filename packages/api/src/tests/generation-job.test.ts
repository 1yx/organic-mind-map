/**
 * Generation job tests for persisted job, artifact, document, and
 * cancellation behavior.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, max-lines-per-function */
import { beforeEach, describe, it, expect } from "vitest";
import type { GenerationJobRecord } from "../models/index";
import { nowIso } from "../temporal";
import { createTestApp, type TestHarness, testUser } from "./helpers";

let harness: TestHarness;

beforeEach(async () => {
  harness = await createTestApp();
});

describe("Generation job creation", () => {
  it("creates persisted artifacts, job, and generated document", async () => {
    const res = await harness.app.request("/api/generation-jobs", {
      method: "POST",
      headers: { ...harness.authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test Map",
        input: {
          kind: "content_outline_text",
          text: "Center\n  Branch1\n    Sub1",
        },
        options: { locale: "en", extractionProfile: "phase2-default" },
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe("completed");
    expect(body.data).toHaveProperty("jobId");
    expect(body.data).toHaveProperty("quotaReservationId");
    expect(body.data).toHaveProperty("documentId");

    const job = await harness.storage.getGenerationJob(body.data.jobId);
    expect(job?.status).toBe("completed");
    expect(job?.artifacts.contentOutline).toBeTruthy();
    expect(job?.artifacts.referenceImage).toBeTruthy();
    expect(job?.artifacts.predictionOmm).toBeTruthy();

    const document = await harness.storage.getDocument(body.data.documentId);
    expect(document?.lifecycle).toBe("generated");
    expect(document?.currentEditableSource?.kind).toBe("prediction_omm");
  });

  it("rejects invalid content-outline-text before document creation", async () => {
    const res = await harness.app.request("/api/generation-jobs", {
      method: "POST",
      headers: { ...harness.authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        input: {
          kind: "content_outline_text",
          text: "Center\n    Skipped",
        },
      }),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("validation_failed");
  });

  it("returns 401 without auth on job creation", async () => {
    const res = await harness.app.request("/api/generation-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { kind: "text_prompt", text: "test" },
      }),
    });
    expect(res.status).toBe(401);
  });
});

describe("Generation job status and cancellation", () => {
  it("gets a persisted job status by ID", async () => {
    const create = await harness.app.request("/api/generation-jobs", {
      method: "POST",
      headers: { ...harness.authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { kind: "text_prompt", text: "Create a mind map about AI" },
      }),
    });
    const created = await create.json();

    const res = await harness.app.request(
      `/api/generation-jobs/${created.data.jobId}`,
      { headers: harness.authHeaders },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe("completed");
    expect(body.data.documentId).toBe(created.data.documentId);
    expect(Array.isArray(body.data.stages)).toBe(true);
  });

  it("cancels a queued job and releases quota", async () => {
    const timestamp = nowIso();
    const job: GenerationJobRecord = {
      id: "job_cancel_test",
      ownerUserId: testUser.id,
      status: "queued",
      inputKind: "text_prompt",
      inputText: "cancel me",
      options: {},
      stages: [],
      artifacts: {},
      quotaReservationId: "quota_cancel_test",
      diagnostics: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await harness.storage.saveGenerationJob(job);
    await harness.storage.saveQuotaReservation({
      id: "quota_cancel_test",
      userId: testUser.id,
      jobId: job.id,
      status: "reserved",
      createdAt: timestamp,
    });

    const res = await harness.app.request(
      "/api/generation-jobs/job_cancel_test/cancel",
      { method: "POST", headers: harness.authHeaders },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("canceled");
    const updated = await harness.storage.getGenerationJob(job.id);
    const quota =
      await harness.storage.getQuotaReservation("quota_cancel_test");
    expect(updated?.status).toBe("canceled");
    expect(quota?.status).toBe("released");
  });
});
