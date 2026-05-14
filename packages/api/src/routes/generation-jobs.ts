/**
 * Generation job creation, status, and cancellation routes.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { AppHono } from "../types";
import { ok } from "../envelope/index";
import { AppError } from "../errors/index";
import { nowIso, nowEpochMs } from "../temporal";

/** Creates a new generation job. */
async function handleCreateJob(c: import("hono").Context) {
  const user = c.get("user");
  if (!user) throw new AppError("unauthorized", "Authentication required.");

  const body: Record<string, unknown> = await c.req.json();
  if (!body?.input || typeof body.input !== "object") {
    throw new AppError(
      "validation_failed",
      "input.kind and input.text are required.",
    );
  }
  const input = body.input as Record<string, unknown>;
  if (!input.kind || !input.text) {
    throw new AppError(
      "validation_failed",
      "input.kind and input.text are required.",
    );
  }
  if (input.kind !== "text_prompt" && input.kind !== "content_outline_text") {
    throw new AppError(
      "validation_failed",
      `Invalid input.kind: ${input.kind}`,
    );
  }

  const jobId = `job_stub_${nowEpochMs()}`;
  return c.json(
    ok(
      {
        jobId,
        status: "queued",
        quotaReservationId: `quota_res_stub_${nowEpochMs()}`,
      },
      c.get("requestId"),
    ),
    201,
  );
}

/** Returns the current status of a generation job. */
function handleGetJobStatus(c: import("hono").Context) {
  const user = c.get("user");
  if (!user) throw new AppError("unauthorized", "Authentication required.");

  const timestamp = nowIso();
  return c.json(
    ok(
      {
        id: c.req.param("jobId"),
        status: "queued",
        stages: [],
        artifacts: {},
        diagnostics: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      c.get("requestId"),
    ),
  );
}

/** Cancels a running generation job. */
function handleCancelJob(c: import("hono").Context) {
  const user = c.get("user");
  if (!user) throw new AppError("unauthorized", "Authentication required.");

  return c.json(
    ok({ jobId: c.req.param("jobId"), status: "canceled" }, c.get("requestId")),
  );
}

/** Registers generation job routes on the app. */
export function registerGenerationJobRoutes(app: AppHono) {
  app.post("/api/generation-jobs", handleCreateJob);
  app.get("/api/generation-jobs/:jobId", handleGetJobStatus);
  app.post("/api/generation-jobs/:jobId/cancel", handleCancelJob);
}
