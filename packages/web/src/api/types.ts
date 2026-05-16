/**
 * Frontend API type definitions mirroring the backend envelopes and models.
 */

// ─── Error codes (must match packages/api/src/errors/index.ts) ──────────

export type ErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "quota_exhausted"
  | "rate_limited"
  | "payload_too_large"
  | "validation_failed"
  | "stale_document"
  | "job_canceled"
  | "provider_failed"
  | "worker_failed"
  | "artifact_unavailable";

export type ApiError = {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
};

// ─── Response envelope ──────────────────────────────────────────────────

export type ApiOkResponse<T> = { ok: true; data: T; requestId: string };
export type ApiErrorResponse = {
  ok: false;
  error: ApiError;
  requestId: string;
};
export type ApiResponse<T> = ApiOkResponse<T> | ApiErrorResponse;

// ─── Session ────────────────────────────────────────────────────────────

export type SessionData = {
  authenticated: boolean;
  user: { id: string; email: string; name: string } | null;
};

// ─── Generation jobs ────────────────────────────────────────────────────

export type GenerationJobInput = {
  kind: "text_prompt" | "content_outline_text";
  text: string;
};

export type GenerationJobOptions = {
  locale?: string;
  stylePreset?: string;
  extractionProfile?: string;
};

export type CreateGenerationJobResponse = {
  jobId: string;
  status: string;
  quotaReservationId: string;
  documentId: string;
};

export type StageEvent = {
  stage: string;
  at: string;
  message?: string;
};

export type GenerationJobResponse = {
  id: string;
  status: string;
  stages: StageEvent[];
  artifacts: {
    contentOutline?: string;
    referenceImage?: string;
    predictionOmm?: string;
  };
  diagnostics: Array<{ code: string; message: string }>;
  documentId?: string;
  createdAt: string;
  updatedAt: string;
};

// ─── Documents ──────────────────────────────────────────────────────────

export type EditableSource = {
  kind: "prediction_omm" | "user_saved_omm";
  artifactId: string;
};

export type DocumentArtifacts = {
  contentOutline?: string;
  referenceImage?: string;
  predictionOmm?: string;
  userSavedOmm?: string;
  correctionOmm?: string;
};

export type DocumentResponse = {
  id: string;
  name: string;
  ownerUserId: string;
  generationJobId?: string;
  lifecycle: "generated" | "saved" | "archived";
  artifacts: DocumentArtifacts;
  currentEditableSource?: EditableSource;
  createdAt: string;
  updatedAt: string;
};

export type CreateDocumentResponse = {
  documentId: string;
  artifactId: string;
  currentEditableSource: EditableSource;
};

export type SaveOmmResponse = {
  documentId: string;
  artifactId: string;
  currentEditableSource: EditableSource;
  savedAt: string;
};

// ─── Artifacts ──────────────────────────────────────────────────────────

export type ArtifactResponse = {
  id: string;
  kind: string;
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

// ─── Exports ────────────────────────────────────────────────────────────

export type ExportFormat =
  | "omm"
  | "png"
  | "svg"
  | "debug_bundle"
  | "phase3_dataset_seed";

export type CreateExportResponse = {
  exportJobId: string;
  status: string;
  artifactId: string;
};

export type ExportJobResponse = {
  id: string;
  status: string;
  artifactId?: string;
  documentId: string;
  format: ExportFormat;
  sourceArtifactId?: string;
};

// ─── Quota ──────────────────────────────────────────────────────────────

export type QuotaResponse = {
  plan: "trial" | "paid";
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
