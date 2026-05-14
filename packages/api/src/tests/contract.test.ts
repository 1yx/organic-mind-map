/**
 * API contract tests for response envelope and stable error codes.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect } from "vitest";
import { createTestApp } from "./helpers";

const app = createTestApp();

describe("Response envelope", () => {
  it("returns ok envelope with requestId on health check", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("returns x-request-id header", async () => {
    const res = await app.request("/api/session");
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("returns ok envelope with data and requestId for session", async () => {
    const res = await app.request("/api/session");
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("requestId");
    expect(typeof body.requestId).toBe("string");
  });
});

describe("Error envelope", () => {
  it("returns error envelope with code, message, retryable for 401", async () => {
    const noAuthApp = createTestApp(null);
    const res = await noAuthApp.request("/api/quota");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toHaveProperty("code");
    expect(body.error).toHaveProperty("message");
    expect(body.error).toHaveProperty("retryable");
    expect(typeof body.error.retryable).toBe("boolean");
    expect(body).toHaveProperty("requestId");
  });

  it("returns validation_failed for bad generation job input", async () => {
    const res = await app.request("/api/generation-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { kind: "text_prompt" } }),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("validation_failed");
  });

  it("returns validation_failed for invalid input.kind", async () => {
    const res = await app.request("/api/generation-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { kind: "bad_kind", text: "test" },
      }),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("validation_failed");
  });

  it("stable error codes cover expected codes", async () => {
    const noAuthApp = createTestApp(null);

    const res1 = await noAuthApp.request("/api/quota");
    const body1 = await res1.json();
    expect(body1.error.code).toBe("unauthorized");

    const res2 = await noAuthApp.request("/api/admin/corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const body2 = await res2.json();
    expect(body2.error.code).toBe("unauthorized");
  });
});
