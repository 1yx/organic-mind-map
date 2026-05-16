/**
 * Generation job creation, status, and cancellation routes.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, complexity, max-lines-per-function */
import type { AppHono } from "../types";
import { ok } from "../envelope/index";
import { AppError } from "../errors/index";
import { createId } from "../services/ids";
import {
  parseContentOutlineText,
  type ContentOutline,
} from "../services/content-outline";
import type { GenerationJobRecord } from "../models/index";
import { nowIso } from "../temporal";
import {
  artifactRecord,
  buildStages,
  decodeWorkerArtifactContent,
  fetchReferencePng,
  referencePlaceholderPng,
  type WorkerResultArtifact,
} from "./generation-job-helpers";

function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError("validation_failed", `${field} is required.`);
  }
  return value;
}

function outlineFromTextPrompt(text: string): ContentOutline {
  return {
    schema: "omm.content_outline",
    version: 1,
    center: { id: "center", concept: text.trim() },
    branches: [],
  };
}

function shouldUseExternalModels(apiToken: string): boolean {
  return !apiToken.startsWith("r8-placeholder");
}

/** Creates a new generation job. */
async function handleCreateJob(c: import("hono").Context) {
  const user = c.get("user");
  if (!user) throw new AppError("unauthorized", "Authentication required.");
  const storage = c.get("storage");
  const workerQueue = c.get("workerQueue");
  const config = c.get("config");
  const replicate = c.get("replicate");

  const body: Record<string, unknown> = await c.req.json();
  if (user.rateLimited) {
    throw new AppError("rate_limited", "Generation rate limit reached.");
  }
  if ((user.generationQuotaRemaining ?? 10) <= 0) {
    throw new AppError("quota_exhausted", "Generation quota exhausted.");
  }
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
  const inputText = requireText(input.text, "input.text");
  const inputKind = input.kind;
  const title = typeof body.title === "string" ? body.title : undefined;
  const options =
    body.options && typeof body.options === "object"
      ? (body.options as GenerationJobRecord["options"])
      : {};

  let outline: ContentOutline;
  let referenceContent: Buffer = Buffer.from("");
  try {
    outline =
      inputKind === "content_outline_text"
        ? parseContentOutlineText(inputText)
        : outlineFromTextPrompt(inputText);
  } catch (error) {
    throw new AppError(
      "validation_failed",
      error instanceof Error ? error.message : "Invalid content outline.",
    );
  }

  try {
    // LLM enrichment: prefer zhipu, fall back to replicate
    const zhipu = c.get("zhipu");
    if (zhipu) {
      outline = await zhipu.enrichOutline(outline, options.locale ?? "en");
    } else if (shouldUseExternalModels(config.models.apiToken)) {
      outline = await replicate.enrichOutline(outline, options.locale ?? "en");
    }
  } catch (_error) {
    throw new AppError("provider_failed", "LLM outline enrichment failed.", {
      retryable: true,
    });
  }

  try {
    // Image generation: replicate
    if (shouldUseExternalModels(config.models.apiToken)) {
      const reference = await replicate.generateReferenceImage(
        outline,
        options.stylePreset ?? "handdrawn-organic",
      );
      referenceContent = await fetchReferencePng(reference.imageUrl);
    } else {
      referenceContent = referencePlaceholderPng();
    }
  } catch (_error) {
    throw new AppError("provider_failed", "Image generation failed.", {
      retryable: true,
    });
  }

  const timestamp = nowIso();
  const jobId = createId("job");
  const quotaReservationId = createId("quota_res");
  const documentId = createId("doc");
  const contentOutlineArtifactId = createId("artifact_content_outline");
  const referenceArtifactId = createId("artifact_reference_image");
  const predictionArtifactId = createId("artifact_prediction_omm");

  const outlineJson = JSON.stringify(outline);
  const predictionOmm = JSON.stringify({
    schema: "omm.document",
    version: 1,
    producer: "prediction",
    title: title ?? outline.center.concept,
    contentOutline: outline,
  });

  await storage.saveQuotaReservation({
    id: quotaReservationId,
    userId: user.id,
    jobId,
    status: "reserved",
    createdAt: timestamp,
  });
  await storage.updateUser(user.id, {
    generationQuotaRemaining: (user.generationQuotaRemaining ?? 10) - 1,
    generationQuotaReserved: (user.generationQuotaReserved ?? 0) + 1,
  });

  await storage.saveGenerationJob({
    id: jobId,
    ownerUserId: user.id,
    status: "completed",
    title,
    inputKind,
    inputText,
    options,
    stages: buildStages(timestamp),
    artifacts: {
      contentOutline: contentOutlineArtifactId,
      referenceImage: referenceArtifactId,
      predictionOmm: predictionArtifactId,
    },
    documentId,
    quotaReservationId,
    diagnostics: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await storage.saveArtifact(
    artifactRecord({
      id: contentOutlineArtifactId,
      kind: "content_outline",
      mimeType: "application/json",
      name: "content_outline.json",
      content: outlineJson,
      ownerUserId: user.id,
      jobId,
      documentId,
    }),
    outlineJson,
  );
  await storage.saveArtifact(
    artifactRecord({
      id: referenceArtifactId,
      kind: "reference_image",
      mimeType: "image/webp",
      name: "reference.webp",
      content: referenceContent,
      ownerUserId: user.id,
      jobId,
      documentId,
    }),
    referenceContent,
  );
  await storage.saveArtifact(
    artifactRecord({
      id: predictionArtifactId,
      kind: "prediction_omm",
      mimeType: "application/vnd.omm+json",
      name: "prediction.omm",
      content: predictionOmm,
      ownerUserId: user.id,
      jobId,
      documentId,
    }),
    predictionOmm,
  );

  await storage.saveDocument({
    id: documentId,
    name: title ?? outline.center.concept,
    ownerUserId: user.id,
    generationJobId: jobId,
    lifecycle: "generated",
    artifacts: {
      contentOutline: contentOutlineArtifactId,
      referenceImage: referenceArtifactId,
      predictionOmm: predictionArtifactId,
    },
    currentEditableSource: {
      kind: "prediction_omm",
      artifactId: predictionArtifactId,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await storage.updateArtifact(contentOutlineArtifactId, { documentId });
  await storage.updateArtifact(referenceArtifactId, { documentId });
  await storage.updateArtifact(predictionArtifactId, { documentId });
  await storage.updateQuotaReservation(quotaReservationId, {
    status: "consumed",
  });
  await storage.updateUser(user.id, {
    generationQuotaReserved: user.generationQuotaReserved ?? 0,
  });

  await workerQueue.enqueue({
    referenceImagePath: storage.getArtifactContentPath(referenceArtifactId),
    contentOutlinePath: storage.getArtifactContentPath(
      contentOutlineArtifactId,
    ),
    outputDir: `${config.storage.localDir ?? ".omm-storage"}/worker-output/${jobId}`,
    profile: options.extractionProfile ?? config.worker.extractionProfile,
    jobId,
  });

  return c.json(
    ok(
      {
        jobId,
        status: "completed",
        quotaReservationId,
        documentId,
      },
      c.get("requestId"),
    ),
    201,
  );
}

/** Returns the current status of a generation job. */
async function handleGetJobStatus(c: import("hono").Context) {
  const user = c.get("user");
  if (!user) throw new AppError("unauthorized", "Authentication required.");
  const job = await c.get("storage").getGenerationJob(c.req.param("jobId"));
  if (!job || job.ownerUserId !== user.id) {
    throw new AppError("not_found", "Generation job not found.");
  }

  return c.json(
    ok(
      {
        id: job.id,
        status: job.status,
        stages: job.stages,
        artifacts: job.artifacts,
        diagnostics: job.diagnostics,
        documentId: job.documentId,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
      c.get("requestId"),
    ),
  );
}

/** Cancels a running generation job. */
async function handleCancelJob(c: import("hono").Context) {
  const user = c.get("user");
  if (!user) throw new AppError("unauthorized", "Authentication required.");
  const storage = c.get("storage");
  const jobId = String(c.req.param("jobId"));
  const job = await storage.getGenerationJob(jobId);
  if (!job || job.ownerUserId !== user.id) {
    throw new AppError("not_found", "Generation job not found.");
  }
  if (job.status === "completed") {
    throw new AppError(
      "validation_failed",
      "Completed jobs cannot be canceled.",
    );
  }
  await storage.updateGenerationJob(jobId, {
    status: "canceled",
    diagnostics: [
      ...job.diagnostics,
      { code: "job_canceled", message: "Generation job canceled." },
    ],
  });
  if (job.quotaReservationId) {
    const reservation = await storage.getQuotaReservation(
      job.quotaReservationId,
    );
    if (reservation?.status === "reserved") {
      await storage.updateQuotaReservation(job.quotaReservationId, {
        status: "released",
      });
      const currentUser = await storage.getUser(reservation.userId);
      if (currentUser) {
        await storage.updateUser(reservation.userId, {
          generationQuotaRemaining:
            (currentUser.generationQuotaRemaining ?? 0) + 1,
          generationQuotaReserved: Math.max(
            (currentUser.generationQuotaReserved ?? 0) - 1,
            0,
          ),
        });
      }
    }
  }

  return c.json(ok({ jobId, status: "canceled" }, c.get("requestId")));
}

async function handleWorkerResult(c: import("hono").Context) {
  const user = c.get("user");
  if (!user) throw new AppError("unauthorized", "Authentication required.");
  if (user.role !== "admin") {
    throw new AppError("forbidden", "Admin access required.");
  }
  const storage = c.get("storage");
  const jobId = String(c.req.param("jobId"));
  const job = await storage.getGenerationJob(jobId);
  if (!job) throw new AppError("not_found", "Generation job not found.");

  const body: Record<string, unknown> = await c.req.json();
  const output = body.output as
    | {
        ok?: boolean;
        predictionOmm?: unknown;
        artifacts?: Array<WorkerResultArtifact>;
        diagnostics?: Array<{ code: string; message: string }>;
      }
    | undefined;
  if (!output || typeof output.ok !== "boolean") {
    throw new AppError("validation_failed", "output.ok is required.");
  }

  if (!output.ok) {
    await storage.updateGenerationJob(jobId, {
      status: "failed",
      diagnostics: [
        ...job.diagnostics,
        ...(output.diagnostics ?? [
          { code: "worker_failed", message: "Worker failed." },
        ]),
      ],
      stages: [
        ...job.stages,
        {
          stage: "extracting",
          status: "failed",
          startedAt: nowIso(),
          finishedAt: nowIso(),
          message: "Worker failed.",
        },
      ],
    });
    return c.json(ok({ jobId, status: "failed" }, c.get("requestId")));
  }

  if (!output.predictionOmm) {
    throw new AppError("validation_failed", "predictionOmm is required.");
  }

  const timestamp = nowIso();
  const documentId = job.documentId ?? createId("doc");
  const predictionArtifactId = createId("artifact_prediction_omm");
  const predictionContent = JSON.stringify(output.predictionOmm);
  await storage.saveArtifact(
    artifactRecord({
      id: predictionArtifactId,
      kind: "prediction_omm",
      mimeType: "application/vnd.omm+json",
      name: "prediction.omm",
      content: predictionContent,
      ownerUserId: job.ownerUserId,
      jobId,
      documentId,
    }),
    predictionContent,
  );

  const workerArtifactIds: string[] = [];
  for (const artifact of output.artifacts ?? []) {
    const artifactId = createId(`artifact_${artifact.kind}`);
    const content = decodeWorkerArtifactContent(artifact);
    await storage.saveArtifact(
      artifactRecord({
        id: artifactId,
        kind: artifact.kind,
        mimeType: artifact.mimeType,
        name: artifact.name,
        content,
        ownerUserId: job.ownerUserId,
        jobId,
        documentId,
        accessPolicy:
          artifact.kind === "mask" || artifact.kind === "debug_overlay"
            ? "admin"
            : "owner",
      }),
      content,
    );
    workerArtifactIds.push(artifactId);
  }

  const document = await storage.getDocument(documentId);
  const documentArtifacts = {
    ...(document?.artifacts ?? job.artifacts),
    predictionOmm: predictionArtifactId,
    workerArtifacts: workerArtifactIds,
  };
  if (document) {
    await storage.updateDocument(documentId, {
      artifacts: documentArtifacts,
      currentEditableSource: {
        kind: "prediction_omm",
        artifactId: predictionArtifactId,
      },
    });
  } else {
    await storage.saveDocument({
      id: documentId,
      name: job.title ?? "Generated Map",
      ownerUserId: job.ownerUserId,
      generationJobId: jobId,
      lifecycle: "generated",
      artifacts: documentArtifacts,
      currentEditableSource: {
        kind: "prediction_omm",
        artifactId: predictionArtifactId,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
  await storage.updateGenerationJob(jobId, {
    status: "completed",
    documentId,
    artifacts: {
      ...job.artifacts,
      predictionOmm: predictionArtifactId,
      workerArtifacts: workerArtifactIds,
    },
    diagnostics: [...job.diagnostics, ...(output.diagnostics ?? [])],
    stages: buildStages(timestamp),
  });

  return c.json(
    ok(
      {
        jobId,
        status: "completed",
        documentId,
        artifactIds: workerArtifactIds,
      },
      c.get("requestId"),
    ),
  );
}

/** Registers generation job routes on the app. */
export function registerGenerationJobRoutes(app: AppHono) {
  app.post("/api/generation-jobs", handleCreateJob);
  app.get("/api/generation-jobs/:jobId", handleGetJobStatus);
  app.post("/api/generation-jobs/:jobId/cancel", handleCancelJob);
  app.post("/api/generation-jobs/:jobId/worker-result", handleWorkerResult);
}
