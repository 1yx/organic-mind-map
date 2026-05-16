/**
 * Additional API coverage for failure, entitlement, and boundary cases.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, max-lines-per-function */
import { createHmac } from "node:crypto";
import { beforeEach, describe, it, expect } from "vitest";
import type { GenerationJobRecord } from "../models/index";
import { contentHash } from "../services/ids";
import { nowIso } from "../temporal";
import {
  createSessionCookieValue,
  SESSION_USER_ID_COOKIE,
} from "../middleware/auth";
import {
  adminUser,
  createTestApp,
  testUser,
  type TestHarness,
} from "./helpers";

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
  if (!job?.artifacts.predictionOmm) throw new Error("missing prediction_omm");
  return {
    documentId: body.data.documentId as string,
    sourceArtifactId: job.artifacts.predictionOmm,
  };
}

async function saveInitialDocument() {
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

async function seedQueuedJob(jobId: string) {
  const timestamp = nowIso();
  const job: GenerationJobRecord = {
    id: jobId,
    ownerUserId: testUser.id,
    status: "extracting",
    inputKind: "content_outline_text",
    inputText: "Center\n  Branch",
    options: {},
    stages: [],
    artifacts: {},
    diagnostics: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await harness.storage.saveGenerationJob(job);
}

function signedStripeHeaders(payload: string) {
  const timestamp = "1778880000";
  const signature = createHmac("sha256", "whsec_test")
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  return {
    "Content-Type": "application/json",
    "stripe-signature": `t=${timestamp},v1=${signature}`,
  };
}

describe("Provider and worker failure coverage", () => {
  it("returns provider_failed and creates no product document on provider error", async () => {
    harness = await createTestApp({
      useExternalModels: true,
      replicate: {
        enrichOutline: () => Promise.reject(new Error("llm unavailable")),
        generateReferenceImage: () => Promise.resolve({ imageUrl: "unused" }),
      },
    });

    const res = await harness.app.request("/api/generation-jobs", {
      method: "POST",
      headers: { ...harness.authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { kind: "text_prompt", text: "Provider failure" },
      }),
    });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error.code).toBe("provider_failed");
    expect(await harness.storage.listDocumentsByOwner(testUser.id)).toEqual([]);
  });

  it("records worker_failed diagnostics without creating a document", async () => {
    await seedQueuedJob("job_worker_fail");
    const res = await harness.app.request(
      "/api/generation-jobs/job_worker_fail/worker-result",
      {
        method: "POST",
        headers: {
          ...harness.adminHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          output: {
            ok: false,
            diagnostics: [{ code: "worker_failed", message: "OCR failed" }],
          },
        }),
      },
    );
    expect(res.status).toBe(200);
    const job = await harness.storage.getGenerationJob("job_worker_fail");
    expect(job?.status).toBe("failed");
    expect(job?.diagnostics[0].code).toBe("worker_failed");
    expect(await harness.storage.listDocumentsByOwner(testUser.id)).toEqual([]);
  });

  it("imports worker outputs and creates a generated document on success", async () => {
    await seedQueuedJob("job_worker_success");
    const res = await harness.app.request(
      "/api/generation-jobs/job_worker_success/worker-result",
      {
        method: "POST",
        headers: {
          ...harness.adminHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          output: {
            ok: true,
            predictionOmm: { schema: "omm.document", version: 1 },
            artifacts: [
              {
                kind: "mask",
                content: "mask",
                mimeType: "image/png",
                name: "mask.png",
              },
            ],
          },
        }),
      },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const document = await harness.storage.getDocument(body.data.documentId);
    expect(document?.lifecycle).toBe("generated");
    expect(document?.currentEditableSource?.kind).toBe("prediction_omm");
    expect(body.data.artifactIds).toHaveLength(1);
    const job = await harness.storage.getGenerationJob("job_worker_success");
    expect(job?.artifacts.workerArtifacts).toEqual(body.data.artifactIds);
  });

  it("keeps existing job document linkage on worker success", async () => {
    await seedQueuedJob("job_worker_existing_doc");
    await harness.storage.saveDocument({
      id: "doc_existing_worker",
      name: "Existing worker doc",
      ownerUserId: testUser.id,
      generationJobId: "job_worker_existing_doc",
      lifecycle: "generated",
      artifacts: {},
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    await harness.storage.updateGenerationJob("job_worker_existing_doc", {
      documentId: "doc_existing_worker",
    });

    const res = await harness.app.request(
      "/api/generation-jobs/job_worker_existing_doc/worker-result",
      {
        method: "POST",
        headers: {
          ...harness.adminHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          output: {
            ok: true,
            predictionOmm: { schema: "omm.document", version: 1 },
          },
        }),
      },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.documentId).toBe("doc_existing_worker");
    const job = await harness.storage.getGenerationJob(
      "job_worker_existing_doc",
    );
    expect(job?.documentId).toBe("doc_existing_worker");
  });
});

describe("Quota, billing, and session coverage", () => {
  it("returns quota_exhausted and rate_limited envelopes", async () => {
    await harness.storage.updateUser(testUser.id, {
      generationQuotaRemaining: 0,
    });
    const exhausted = await harness.app.request("/api/generation-jobs", {
      method: "POST",
      headers: { ...harness.authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { kind: "text_prompt", text: "No quota" },
      }),
    });
    expect(exhausted.status).toBe(429);
    expect((await exhausted.json()).error.code).toBe("quota_exhausted");

    await harness.storage.updateUser(testUser.id, {
      generationQuotaRemaining: 5,
      rateLimited: true,
    });
    const limited = await harness.app.request("/api/generation-jobs", {
      method: "POST",
      headers: { ...harness.authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { kind: "text_prompt", text: "Rate limited" },
      }),
    });
    expect(limited.status).toBe(429);
    expect((await limited.json()).error.code).toBe("rate_limited");
  });

  it("consumes and releases quota reservations", async () => {
    await harness.storage.updateUser(testUser.id, {
      generationQuotaRemaining: 2,
      generationQuotaReserved: 0,
    });
    const created = await harness.app.request("/api/generation-jobs", {
      method: "POST",
      headers: { ...harness.authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { kind: "text_prompt", text: "Quota consume" },
      }),
    });
    const body = await created.json();
    const reservation = await harness.storage.getQuotaReservation(
      body.data.quotaReservationId,
    );
    const user = await harness.storage.getUser(testUser.id);
    expect(reservation?.status).toBe("consumed");
    expect(user?.generationQuotaRemaining).toBe(1);

    await seedQueuedJob("job_quota_release");
    await harness.storage.saveQuotaReservation({
      id: "quota_release",
      userId: testUser.id,
      jobId: "job_quota_release",
      status: "reserved",
      createdAt: nowIso(),
    });
    await harness.storage.updateGenerationJob("job_quota_release", {
      quotaReservationId: "quota_release",
    });
    await harness.app.request("/api/generation-jobs/job_quota_release/cancel", {
      method: "POST",
      headers: harness.authHeaders,
    });
    expect(
      (await harness.storage.getQuotaReservation("quota_release"))?.status,
    ).toBe("released");
    const restoredUser = await harness.storage.getUser(testUser.id);
    expect(restoredUser?.generationQuotaRemaining).toBe(2);
    expect(restoredUser?.generationQuotaReserved).toBe(0);
  });

  it("updates paid plan from billing webhook and ignores duplicate events", async () => {
    const event = {
      id: "evt_paid_1",
      userId: testUser.id,
      type: "checkout.session.completed",
    };
    const payload = JSON.stringify(event);
    const first = await harness.app.request("/api/billing/webhooks/stripe", {
      method: "POST",
      headers: signedStripeHeaders(payload),
      body: payload,
    });
    expect(first.status).toBe(200);
    expect((await harness.storage.getUser(testUser.id))?.plan).toBe("paid");

    const duplicate = await harness.app.request(
      "/api/billing/webhooks/stripe",
      {
        method: "POST",
        headers: signedStripeHeaders(payload),
        body: payload,
      },
    );
    expect((await duplicate.json()).data.duplicate).toBe(true);

    const malformed = await harness.app.request(
      "/api/billing/webhooks/stripe",
      {
        method: "POST",
        headers: signedStripeHeaders(JSON.stringify({ id: "bad" })),
        body: JSON.stringify({ id: "bad" }),
      },
    );
    expect(malformed.status).toBe(422);
  });

  it("authenticates only through signed omm_user_id cookie", async () => {
    const res = await harness.app.request("/api/session", {
      headers: {
        cookie: `${SESSION_USER_ID_COOKIE}=${createSessionCookieValue(
          testUser.id,
          "dev-secret-change-me",
        )}`,
      },
    });
    expect(res.status).toBe(200);
    expect((await res.json()).data.authenticated).toBe(true);

    const rawCookie = await harness.app.request("/api/session", {
      headers: { cookie: `${SESSION_USER_ID_COOKIE}=${testUser.id}` },
    });
    expect((await rawCookie.json()).data.authenticated).toBe(false);

    const spoofedHeader = await harness.app.request("/api/session", {
      headers: { "x-omm-user-id": testUser.id },
    });
    expect((await spoofedHeader.json()).data.authenticated).toBe(false);
  });

  it("clears the session cookie on logout", async () => {
    const res = await harness.app.request("/api/auth/logout", {
      method: "POST",
      headers: harness.authHeaders,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain(
      `${SESSION_USER_ID_COOKIE}=; Max-Age=0`,
    );
  });
});

describe("Artifact, admin correction, export, and save boundaries", () => {
  it("serves immutable binary artifacts with cache headers and unavailable errors", async () => {
    const content = Buffer.from("binary");
    await harness.storage.saveArtifact(
      {
        id: "artifact_binary_test",
        kind: "reference_image",
        mimeType: "image/png",
        name: "reference.png",
        byteSize: content.byteLength,
        contentHash: contentHash(content),
        ownerUserId: testUser.id,
        accessPolicy: "owner",
        cachePolicy: "immutable",
        createdAt: nowIso(),
      },
      content,
    );
    const okRes = await harness.app.request(
      "/api/artifacts/artifact_binary_test/content",
      { headers: harness.authHeaders },
    );
    expect(okRes.status).toBe(200);
    expect(okRes.headers.get("cache-control")).toContain("immutable");

    await harness.storage.saveArtifact(
      {
        id: "artifact_missing_content",
        kind: "reference_image",
        mimeType: "image/png",
        name: "missing.png",
        byteSize: 1,
        contentHash: "missing",
        ownerUserId: testUser.id,
        accessPolicy: "owner",
        cachePolicy: "immutable",
        createdAt: nowIso(),
      },
      "temp",
    );
    await harness.storage.deleteArtifactContent("artifact_missing_content");
    const unavailable = await harness.app.request(
      "/api/artifacts/artifact_missing_content/content",
      { headers: harness.authHeaders },
    );
    expect(unavailable.status).toBe(503);
    expect((await unavailable.json()).error.code).toBe("artifact_unavailable");
  });

  it("rejects oversized user-saved OMM payloads", async () => {
    const initial = await saveInitialDocument();
    const res = await harness.app.request(
      `/api/documents/${initial.documentId}/current-omm`,
      {
        method: "PUT",
        headers: { ...harness.authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          omm: {
            schema: "omm.document",
            version: 1,
            data: "x".repeat(1024 * 1024),
          },
          baseArtifactId: initial.artifactId,
        }),
      },
    );
    expect(res.status).toBe(413);
  });

  it("writes admin correction without mutating lifecycle or current source", async () => {
    const doc = await createGeneratedDocument();
    const before = await harness.storage.getDocument(doc.documentId);
    const res = await harness.app.request("/api/admin/corrections", {
      method: "POST",
      headers: { ...harness.adminHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: doc.documentId,
        predictionArtifactId: doc.sourceArtifactId,
        correctionOmm: { schema: "omm.document", version: 1 },
      }),
    });
    expect(res.status).toBe(201);
    const after = await harness.storage.getDocument(doc.documentId);
    expect(after?.lifecycle).toBe(before?.lifecycle);
    expect(after?.currentEditableSource).toEqual(before?.currentEditableSource);

    const userDenied = await harness.app.request("/api/admin/corrections", {
      method: "POST",
      headers: { ...harness.authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: doc.documentId,
        predictionArtifactId: doc.sourceArtifactId,
        correctionOmm: { schema: "omm.document", version: 1 },
      }),
    });
    expect(userDenied.status).toBe(403);
  });

  it("enforces export entitlements for trial, paid, and admin users", async () => {
    const doc = await createGeneratedDocument();
    const trialSvg = await harness.app.request("/api/exports", {
      method: "POST",
      headers: { ...harness.authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: doc.documentId, format: "svg" }),
    });
    expect(trialSvg.status).toBe(403);

    await harness.storage.updateUser(testUser.id, { plan: "paid" });
    const paidSvg = await harness.app.request("/api/exports", {
      method: "POST",
      headers: { ...harness.authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: doc.documentId, format: "svg" }),
    });
    expect(paidSvg.status).toBe(201);

    const adminDataset = await harness.app.request("/api/exports", {
      method: "POST",
      headers: { ...harness.adminHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: doc.documentId,
        format: "phase3_dataset_seed",
      }),
    });
    expect(adminDataset.status).toBe(201);
    expect(adminUser.role).toBe("admin");
  });

  it("rejects one of two racing saves with the same baseArtifactId", async () => {
    const initial = await saveInitialDocument();
    const save = () =>
      harness.app.request(`/api/documents/${initial.documentId}/current-omm`, {
        method: "PUT",
        headers: { ...harness.authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          omm: { schema: "omm.document", version: 1 },
          baseArtifactId: initial.artifactId,
        }),
      });

    const results = await Promise.all([save(), save()]);
    const statuses = results.map((res) => res.status).sort();
    expect(statuses).toEqual([200, 409]);
  });
});
