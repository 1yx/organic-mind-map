/**
 * Persistence and domain model types for the \@omm/api backend.
 *
 * These types define the shape of records stored in the backend's
 * persistence layer. They are shared across routes, services, and storage.
 */

// ── Artifact ──

/** Kinds of artifacts the backend manages. */
export type ArtifactKind =
  | "reference_image"
  | "content_outline"
  | "prediction_omm"
  | "user_saved_omm"
  | "correction_omm"
  | "mask"
  | "debug_overlay"
  | "png_export"
  | "svg_export"
  | "debug_bundle"
  | "phase3_dataset_seed";

/** Persisted metadata for a stored artifact. */
export type ArtifactRecord = {
  id: string;
  kind: ArtifactKind;
  mimeType: string;
  name: string;
  byteSize: number;
  contentHash: string;
  ownerUserId: string;
  jobId?: string;
  documentId?: string;
  accessPolicy: "owner" | "admin" | "public";
  cachePolicy: "immutable" | "revalidate";
  createdAt: string;
};

// ── Document ──

/** Product document lifecycle states. */
export type DocumentLifecycle = "generated" | "saved" | "archived";

/** Resolved editable source pointing to the current OMM artifact. */
export type EditableSource = {
  kind: "prediction_omm" | "user_saved_omm";
  artifactId: string;
};

/** Product document record linking all related artifacts. */
export type DocumentRecord = {
  id: string;
  name: string;
  ownerUserId: string;
  generationJobId?: string;
  lifecycle: DocumentLifecycle;
  artifacts: {
    contentOutline?: string;
    referenceImage?: string;
    predictionOmm?: string;
    userSavedOmm?: string;
    correctionOmm?: string;
  };
  currentEditableSource?: EditableSource;
  createdAt: string;
  updatedAt: string;
};

// ── Generation Job ──

/** Generation job lifecycle stages. */
export type JobStatus =
  | "queued"
  | "validating_input"
  | "outlining"
  | "generating_reference"
  | "extracting"
  | "assembling_artifacts"
  | "completed"
  | "failed"
  | "canceled";

/** Status of an individual generation stage. */
export type StageStatus = "pending" | "running" | "completed" | "failed";

/** Timeline event for a single generation stage. */
export type StageEvent = {
  stage: JobStatus;
  status: StageStatus;
  startedAt: string | null;
  finishedAt: string | null;
  message: string | null;
};

/** Persisted generation job record. */
export type GenerationJobRecord = {
  id: string;
  ownerUserId: string;
  status: JobStatus;
  title?: string;
  inputKind: "text_prompt" | "content_outline_text";
  inputText: string;
  options: {
    locale?: string;
    stylePreset?: string;
    extractionProfile?: string;
  };
  stages: StageEvent[];
  artifacts: {
    contentOutline?: string;
    referenceImage?: string;
    predictionOmm?: string;
  };
  documentId?: string;
  quotaReservationId?: string;
  diagnostics: Array<{ code: string; message: string }>;
  createdAt: string;
  updatedAt: string;
};

// ── Export ──

/** Export formats the backend supports. */
export type ExportFormat =
  | "omm"
  | "png"
  | "svg"
  | "debug_bundle"
  | "phase3_dataset_seed";

/** Export job lifecycle states. */
export type ExportJobStatus = "queued" | "processing" | "completed" | "failed";

/** Persisted export job record. */
export type ExportJobRecord = {
  id: string;
  ownerUserId: string;
  documentId: string;
  format: ExportFormat;
  sourceArtifactId?: string;
  options: Record<string, unknown>;
  status: ExportJobStatus;
  resultArtifactId?: string;
  createdAt: string;
  updatedAt: string;
};

// ── User ──

/** User account record. */
export type UserRecord = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  plan: "trial" | "paid";
  generationQuotaRemaining?: number;
  generationQuotaReserved?: number;
  rateLimited?: boolean;
  processedPaymentEventIds?: string[];
  createdAt: string;
};

// ── Quota ──

/** Current quota balance for a user. */
export type QuotaBalance = {
  plan: string;
  generation: {
    remaining: number;
    reserved: number;
    resetAt: string | null;
  };
  exports: {
    png: boolean;
    svg: boolean;
    debugBundle: boolean;
  };
  upgradeRequired: boolean;
};

/** Quota reservation linked to a generation job. */
export type QuotaReservation = {
  id: string;
  userId: string;
  jobId: string;
  status: "reserved" | "consumed" | "released";
  createdAt: string;
};

// ── Worker Queue ──

/** Payload sent to the CV worker queue. */
export type WorkerJobPayload = {
  referenceImagePath: string;
  contentOutlinePath: string;
  outputDir: string;
  profile: string;
  jobId: string;
};

/** Output returned by the CV worker after extraction. */
export type WorkerOutput = {
  ok: boolean;
  predictionOmmPath?: string;
  artifacts: Array<{ kind: string; path: string }>;
  diagnostics: Array<{ code: string; message: string }>;
  error?: string;
};
