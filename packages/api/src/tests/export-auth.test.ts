/**
 * Export authorization tests for user exports and admin-only debug/dataset exports.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect } from "vitest";
import { createTestApp } from "./helpers";

const app = createTestApp();

describe("Export job creation", () => {
  it("creates an export job for png format", async () => {
    const res = await app.request("/api/exports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: "doc_export_test",
        format: "png",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toHaveProperty("exportJobId");
    expect(body.data.status).toBe("queued");
  });

  it("creates an export job for omm format", async () => {
    const res = await app.request("/api/exports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: "doc_export_omm",
        format: "omm",
      }),
    });
    expect(res.status).toBe(201);
  });

  it("creates an export job for svg format", async () => {
    const res = await app.request("/api/exports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: "doc_export_svg",
        format: "svg",
      }),
    });
    expect(res.status).toBe(201);
  });

  it("requires documentId and format", async () => {
    const res = await app.request("/api/exports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "png" }),
    });
    expect(res.status).toBe(422);
  });
});

describe("Export admin restrictions", () => {
  it("rejects debug_bundle for non-admin", async () => {
    const res = await app.request("/api/exports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: "doc_export_debug",
        format: "debug_bundle",
      }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("forbidden");
  });

  it("rejects phase3_dataset_seed for non-admin", async () => {
    const res = await app.request("/api/exports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: "doc_export_dataset",
        format: "phase3_dataset_seed",
      }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("forbidden");
  });

  it("admin-only export formats are documented", () => {
    const adminFormats = ["debug_bundle", "phase3_dataset_seed"];
    const userFormats = ["omm", "png", "svg"];
    const overlap = adminFormats.filter((f) => userFormats.includes(f));
    expect(overlap).toEqual([]);
  });
});

describe("Export job status", () => {
  it("gets export job status", async () => {
    const res = await app.request("/api/exports/export_test_001");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toHaveProperty("id");
    expect(body.data).toHaveProperty("status");
  });

  it("export job response shape is correct", async () => {
    const res = await app.request("/api/exports/export_shape_test");
    const body = await res.json();
    const data = body.data;

    const requiredFields = ["id", "status"];
    for (const field of requiredFields) {
      expect(data).toHaveProperty(field);
    }

    const validStatuses = ["queued", "processing", "completed", "failed"];
    expect(validStatuses).toContain(data.status);
  });
});
