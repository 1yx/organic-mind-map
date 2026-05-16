/**
 * Typed API client for the OMM backend.
 *
 * All methods return the discriminated ApiResponse\<T\> envelope so callers
 * can narrow with `if (res.ok)`.
 */

import type {
  ApiResponse,
  SessionData,
  GenerationJobInput,
  GenerationJobOptions,
  CreateGenerationJobResponse,
  GenerationJobResponse,
  DocumentResponse,
  CreateDocumentResponse,
  SaveOmmResponse,
  ArtifactResponse,
  ExportFormat,
  CreateExportResponse,
  ExportJobResponse,
  QuotaResponse,
} from "./types.js";

// ─── Low-level helper ───────────────────────────────────────────────────

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  const body: unknown = await res.json();
  return body as ApiResponse<T>;
}

// ─── Session ────────────────────────────────────────────────────────────

export function getSession(): Promise<ApiResponse<SessionData>> {
  return request<SessionData>("/api/session");
}

export function logout(): Promise<ApiResponse<{ loggedOut: boolean }>> {
  return request<{ loggedOut: boolean }>("/api/auth/logout", {
    method: "POST",
  });
}

// ─── Generation Jobs ────────────────────────────────────────────────────

export function createGenerationJob(input: {
  input: GenerationJobInput;
  title?: string;
  options?: GenerationJobOptions;
}): Promise<ApiResponse<CreateGenerationJobResponse>> {
  return request<CreateGenerationJobResponse>("/api/generation-jobs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getGenerationJob(
  jobId: string,
): Promise<ApiResponse<GenerationJobResponse>> {
  return request<GenerationJobResponse>(`/api/generation-jobs/${jobId}`);
}

export function cancelGenerationJob(
  jobId: string,
): Promise<ApiResponse<{ jobId: string; status: string }>> {
  return request<{ jobId: string; status: string }>(
    `/api/generation-jobs/${jobId}/cancel`,
    { method: "POST" },
  );
}

// ─── Documents ──────────────────────────────────────────────────────────

export function createDocument(input: {
  omm: Record<string, unknown>;
  name?: string;
}): Promise<ApiResponse<CreateDocumentResponse>> {
  return request<CreateDocumentResponse>("/api/documents", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getDocument(
  documentId: string,
): Promise<ApiResponse<DocumentResponse>> {
  return request<DocumentResponse>(`/api/documents/${documentId}`);
}

export function saveCurrentOmm(
  documentId: string,
  omm: Record<string, unknown>,
  baseArtifactId?: string,
): Promise<ApiResponse<SaveOmmResponse>> {
  return request<SaveOmmResponse>(`/api/documents/${documentId}/current-omm`, {
    method: "PUT",
    body: JSON.stringify(baseArtifactId ? { omm, baseArtifactId } : { omm }),
  });
}

export function archiveDocument(
  documentId: string,
): Promise<ApiResponse<{ documentId: string; lifecycle: string }>> {
  return request<{ documentId: string; lifecycle: string }>(
    `/api/documents/${documentId}/archive`,
    { method: "POST" },
  );
}

// ─── Artifacts ──────────────────────────────────────────────────────────

export function getArtifact(
  artifactId: string,
): Promise<ApiResponse<ArtifactResponse>> {
  return request<ArtifactResponse>(`/api/artifacts/${artifactId}`);
}

/** Fetches raw artifact content (returns Response directly, not envelope). */
export function getArtifactContent(artifactId: string): Promise<Response> {
  return fetch(`/api/artifacts/${artifactId}/content`);
}

// ─── Exports ────────────────────────────────────────────────────────────

export function createExport(input: {
  documentId: string;
  format: ExportFormat;
  sourceArtifactId?: string;
  options?: Record<string, unknown>;
}): Promise<ApiResponse<CreateExportResponse>> {
  return request<CreateExportResponse>("/api/exports", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getExportJob(
  exportJobId: string,
): Promise<ApiResponse<ExportJobResponse>> {
  return request<ExportJobResponse>(`/api/exports/${exportJobId}`);
}

// ─── Quota ──────────────────────────────────────────────────────────────

export function getQuota(): Promise<ApiResponse<QuotaResponse>> {
  return request<QuotaResponse>("/api/quota");
}
