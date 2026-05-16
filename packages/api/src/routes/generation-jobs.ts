/**
 * Generation job creation, status, and cancellation routes.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, complexity, max-lines-per-function */
import type { AppHono } from "../types";
import { ok } from "../envelope/index";
import { AppError } from "../errors/index";
import { contentHash, createId } from "../services/ids";
import {
  parseContentOutlineText,
  type ContentOutline,
} from "../services/content-outline";
import type {
  ArtifactRecord,
  GenerationJobRecord,
  StageEvent,
} from "../models/index";
import { nowIso } from "../temporal";

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

function buildStages(timestamp: string): StageEvent[] {
  return [
    {
      stage: "validating_input",
      status: "completed",
      startedAt: timestamp,
      finishedAt: timestamp,
      message: "Input validated.",
    },
    {
      stage: "outlining",
      status: "completed",
      startedAt: timestamp,
      finishedAt: timestamp,
      message: "Content outline assembled.",
    },
    {
      stage: "generating_reference",
      status: "completed",
      startedAt: timestamp,
      finishedAt: timestamp,
      message: "Reference artifact prepared.",
    },
    {
      stage: "extracting",
      status: "completed",
      startedAt: timestamp,
      finishedAt: timestamp,
      message: "CV extraction payload enqueued.",
    },
    {
      stage: "assembling_artifacts",
      status: "completed",
      startedAt: timestamp,
      finishedAt: timestamp,
      message: "Managed artifacts assembled.",
    },
    {
      stage: "completed",
      status: "completed",
      startedAt: timestamp,
      finishedAt: timestamp,
      message: "Generation completed.",
    },
  ];
}

function artifactRecord(params: {
  id: string;
  kind: ArtifactRecord["kind"];
  mimeType: string;
  name: string;
  content: Buffer | string;
  ownerUserId: string;
  jobId: string;
  documentId?: string;
  accessPolicy?: ArtifactRecord["accessPolicy"];
}): ArtifactRecord {
  return {
    id: params.id,
    kind: params.kind,
    mimeType: params.mimeType,
    name: params.name,
    byteSize: Buffer.byteLength(params.content),
    contentHash: contentHash(params.content),
    ownerUserId: params.ownerUserId,
    jobId: params.jobId,
    documentId: params.documentId,
    accessPolicy: params.accessPolicy ?? "owner",
    cachePolicy: "immutable",
    createdAt: nowIso(),
  };
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
  let referenceContent = Buffer.from("");
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
    if (shouldUseExternalModels(config.models.apiToken)) {
      outline = await replicate.enrichOutline(outline, options.locale ?? "en");
      const reference = await replicate.generateReferenceImage(
        outline,
        options.stylePreset ?? "handdrawn-organic",
      );
      referenceContent = Buffer.from(
        JSON.stringify({ imageUrl: reference.imageUrl }),
      );
    } else {
      referenceContent = Buffer.from(
        `OMM reference placeholder for ${outline.center.concept}`,
      );
    }
  } catch (_error) {
    throw new AppError("provider_failed", "Outline or image provider failed.", {
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
      mimeType: "image/png",
      name: "reference.png",
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
  const jobId = c.req.param("jobId");
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
    await storage.updateQuotaReservation(job.quotaReservationId, {
      status: "released",
    });
  }

  return c.json(ok({ jobId, status: "canceled" }, c.get("requestId")));
}

/** Registers generation job routes on the app. */
export function registerGenerationJobRoutes(app: AppHono) {
  app.post("/api/generation-jobs", handleCreateJob);
  app.get("/api/generation-jobs/:jobId", handleGetJobStatus);
  app.post("/api/generation-jobs/:jobId/cancel", handleCancelJob);
}
