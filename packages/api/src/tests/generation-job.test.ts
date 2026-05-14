/**
 * Generation job tests for creation, status, and cancellation.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect } from "vitest";
import { createTestApp } from "./helpers";

const app = createTestApp();

describe("Generation job creation", () => {
  it("creates a job with text_prompt input", async () => {
    const res = await app.request("/api/generation-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { kind: "text_prompt", text: "Create a mind map about AI" },
        options: { locale: "en" },
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toHaveProperty("jobId");
    expect(body.data.status).toBe("queued");
    expect(body.data).toHaveProperty("quotaReservationId");
  });

  it("creates a job with content_outline_text input", async () => {
    const res = await app.request("/api/generation-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: {
          kind: "content_outline_text",
          text: "Center\n  Branch1\n    Sub1",
        },
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toHaveProperty("jobId");
  });

  it("returns 401 without auth on job creation", async () => {
    const noAuthApp = createTestApp(null);
    const res = await noAuthApp.request("/api/generation-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { kind: "text_prompt", text: "test" },
      }),
    });
    expect(res.status).toBe(401);
  });
});

describe("Generation job status", () => {
  it("gets job status by ID", async () => {
    const res = await app.request("/api/generation-jobs/job_test_123");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toHaveProperty("id");
    expect(body.data).toHaveProperty("status");
    expect(body.data).toHaveProperty("stages");
    expect(body.data).toHaveProperty("artifacts");
    expect(body.data).toHaveProperty("diagnostics");
    expect(body.data).toHaveProperty("createdAt");
    expect(body.data).toHaveProperty("updatedAt");
  });

  it("cancels a job", async () => {
    const res = await app.request("/api/generation-jobs/job_test_123/cancel", {
      method: "POST",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe("canceled");
  });
});

describe("Generation job response shape", () => {
  it("response includes expected shape", async () => {
    const res = await app.request("/api/generation-jobs/job_shape_test");
    const body = await res.json();
    const data = body.data;

    const requiredFields = [
      "id",
      "status",
      "stages",
      "artifacts",
      "diagnostics",
      "createdAt",
      "updatedAt",
    ];
    for (const field of requiredFields) {
      expect(data).toHaveProperty(field);
    }

    const validStatuses = [
      "queued",
      "validating_input",
      "outlining",
      "generating_reference",
      "extracting",
      "assembling_artifacts",
      "completed",
      "failed",
      "canceled",
    ];
    expect(validStatuses).toContain(data.status);
    expect(Array.isArray(data.stages)).toBe(true);
    expect(Array.isArray(data.diagnostics)).toBe(true);
  });
});
