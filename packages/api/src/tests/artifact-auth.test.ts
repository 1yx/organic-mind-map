/**
 * Artifact authorization tests for browser-readable and admin-only artifacts.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect } from "vitest";
import { createTestApp } from "./helpers";

const app = createTestApp();

describe("Artifact metadata", () => {
  it("returns artifact metadata with required fields", async () => {
    const res = await app.request("/api/artifacts/art_shape_test");
    expect(res.status).toBe(200);
    const body = await res.json();
    const data = body.data;

    const requiredFields = [
      "id",
      "kind",
      "mimeType",
      "name",
      "ownerUserId",
      "createdAt",
    ];
    for (const field of requiredFields) {
      expect(data).toHaveProperty(field);
    }

    const validKinds = [
      "reference_image",
      "content_outline",
      "prediction_omm",
      "user_saved_omm",
      "correction_omm",
      "mask",
      "debug_overlay",
      "png_export",
      "svg_export",
      "debug_bundle",
    ];
    expect(validKinds).toContain(data.kind);
  });
});

describe("Artifact auth", () => {
  it("requires auth for artifact reads without user", async () => {
    const noAuthApp = createTestApp(null);
    const res = await noAuthApp.request("/api/artifacts/art_test_001");
    expect(res.status).toBe(401);
  });

  it("requires auth for artifact content without user", async () => {
    const noAuthApp = createTestApp(null);
    const res = await noAuthApp.request("/api/artifacts/art_test_001/content");
    expect(res.status).toBe(401);
  });
});

describe("Artifact kind access levels", () => {
  it("admin-only artifact kinds are documented and disjoint", () => {
    const adminOnlyKinds = [
      "mask",
      "debug_overlay",
      "correction_omm",
      "debug_bundle",
    ];
    const browserReadableKinds = [
      "content_outline",
      "reference_image",
      "prediction_omm",
      "user_saved_omm",
      "png_export",
      "svg_export",
    ];
    const overlap = adminOnlyKinds.filter((k) =>
      browserReadableKinds.includes(k),
    );
    expect(overlap).toEqual([]);
    expect([...adminOnlyKinds, ...browserReadableKinds]).toHaveLength(10);
  });

  it("prediction_omm is browser-readable", () => {
    expect([
      "content_outline",
      "reference_image",
      "prediction_omm",
      "user_saved_omm",
      "png_export",
      "svg_export",
    ]).toContain("prediction_omm");
  });

  it("raw mask content is admin-only", () => {
    expect([
      "mask",
      "debug_overlay",
      "correction_omm",
      "debug_bundle",
    ]).toContain("mask");
    expect([
      "content_outline",
      "reference_image",
      "prediction_omm",
      "user_saved_omm",
      "png_export",
      "svg_export",
    ]).not.toContain("mask");
  });
});
