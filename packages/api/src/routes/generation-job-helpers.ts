/**
 * Shared helpers for generation job route handlers.
 */
import type { ArtifactKind, ArtifactRecord, StageEvent } from "../models/index";
import { AppError } from "../errors/index";
import { contentHash } from "../services/ids";
import { nowIso } from "../temporal";

const TRANSPARENT_PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

/** Builds the canonical completed generation stage timeline. */
export function buildStages(timestamp: string): StageEvent[] {
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

/** Builds artifact metadata from stored content. */
export function artifactRecord(params: {
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

/** Fetches generated reference image bytes and enforces the PNG contract. */
export async function fetchReferencePng(imageUrl: string): Promise<Buffer> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch generated reference image: ${imageUrl}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/png")) {
    throw new Error(`Generated reference image is not PNG: ${contentType}`);
  }
  return Buffer.from(new Uint8Array(await response.arrayBuffer()));
}

/** Returns a valid local-development PNG placeholder. */
export function referencePlaceholderPng(): Buffer {
  return TRANSPARENT_PNG_1X1;
}

/** Worker-result artifact payload accepted by the internal callback. */
export type WorkerResultArtifact = {
  kind: ArtifactKind;
  content?: string;
  contentBase64?: string;
  mimeType: string;
  name: string;
};

/** Decodes inline worker artifact content into persisted bytes. */
export function decodeWorkerArtifactContent(artifact: WorkerResultArtifact) {
  if (artifact.contentBase64) {
    return Buffer.from(artifact.contentBase64, "base64");
  }
  if (artifact.content !== undefined) return artifact.content;
  throw new AppError(
    "validation_failed",
    "Worker artifact content is required.",
  );
}
