/**
 * Local file-based storage adapter for development.
 *
 * Stores artifact metadata, content, documents, jobs, users, and quota
 * reservations as JSON files on disk. Will be replaced with a real
 * database adapter for production.
 */
/* eslint-disable max-lines-per-function */
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AppConfig } from "../config/index";
import type {
  ArtifactRecord,
  DocumentRecord,
  EditableSource,
  ExportJobRecord,
  GenerationJobRecord,
  QuotaReservation,
  StageEvent,
  UserRecord,
} from "../models/index";
import { nowIso } from "../temporal";

/** Storage interface for all persistence operations. */
export type Storage = {
  /** Persists an artifact record and its content. */
  saveArtifact(record: ArtifactRecord, content: Buffer | string): Promise<void>;
  /** Reads artifact binary content, or null if not found. */
  readArtifactContent(artifactId: string): Promise<Buffer | null>;
  /** Deletes artifact content while preserving metadata, for unavailable tests. */
  deleteArtifactContent(artifactId: string): Promise<void>;
  /** Returns the local content path for an artifact ID. */
  getArtifactContentPath(artifactId: string): string;
  /** Reads artifact metadata, or null if not found. */
  getArtifact(artifactId: string): Promise<ArtifactRecord | null>;
  /** Patches an existing artifact metadata record. */
  updateArtifact(
    artifactId: string,
    patch: Partial<ArtifactRecord>,
  ): Promise<void>;
  /** Persists a document record. */
  saveDocument(record: DocumentRecord): Promise<void>;
  /** Reads a document record, or null if not found. */
  getDocument(documentId: string): Promise<DocumentRecord | null>;
  /** Lists documents owned by a user. */
  listDocumentsByOwner(ownerUserId: string): Promise<DocumentRecord[]>;
  /** Patches an existing document record. */
  updateDocument(
    documentId: string,
    patch: Partial<DocumentRecord>,
  ): Promise<void>;
  /** Resolves the current editable source for a document. */
  resolveCurrentEditableSource(
    documentId: string,
  ): Promise<EditableSource | null>;
  /** Persists a generation job record. */
  saveGenerationJob(record: GenerationJobRecord): Promise<void>;
  /** Reads a generation job record, or null if not found. */
  getGenerationJob(jobId: string): Promise<GenerationJobRecord | null>;
  /** Patches an existing generation job record. */
  updateGenerationJob(
    jobId: string,
    patch: Partial<GenerationJobRecord>,
  ): Promise<void>;
  /** Replaces generation job stages. */
  updateJobStages(jobId: string, stages: StageEvent[]): Promise<void>;
  /** Persists an export job record. */
  saveExportJob(record: ExportJobRecord): Promise<void>;
  /** Reads an export job record, or null if not found. */
  getExportJob(jobId: string): Promise<ExportJobRecord | null>;
  /** Patches an existing export job record. */
  updateExportJob(
    jobId: string,
    patch: Partial<ExportJobRecord>,
  ): Promise<void>;
  /** Persists a user record. */
  saveUser(record: UserRecord): Promise<void>;
  /** Reads a user record, or null if not found. */
  getUser(userId: string): Promise<UserRecord | null>;
  /** Patches an existing user record. */
  updateUser(userId: string, patch: Partial<UserRecord>): Promise<void>;
  /** Persists a quota reservation. */
  saveQuotaReservation(record: QuotaReservation): Promise<void>;
  /** Reads a quota reservation, or null if not found. */
  getQuotaReservation(id: string): Promise<QuotaReservation | null>;
  /** Patches an existing quota reservation. */
  updateQuotaReservation(
    id: string,
    patch: Partial<QuotaReservation>,
  ): Promise<void>;
};

/** Shared helper context for storage operations. */
type StorageCtx = {
  storageDir: string;
  artifactDir: string;
  ensureDir(): Promise<void>;
};

/** Creates artifact storage methods. */
function createArtifactStore(ctx: StorageCtx) {
  function artifactPath(id: string) {
    return join(ctx.artifactDir, id);
  }

  return {
    async saveArtifact(record: ArtifactRecord, content: Buffer | string) {
      await ctx.ensureDir();
      await writeFile(
        join(ctx.artifactDir, `${record.id}.meta.json`),
        JSON.stringify(record),
      );
      await writeFile(artifactPath(record.id), content);
    },

    async readArtifactContent(artifactId: string) {
      try {
        return await readFile(artifactPath(artifactId));
      } catch {
        return null;
      }
    },

    async deleteArtifactContent(artifactId: string) {
      try {
        await unlink(artifactPath(artifactId));
      } catch {
        // Missing content is the target state.
      }
    },

    getArtifactContentPath: artifactPath,

    async getArtifact(artifactId: string) {
      try {
        const data = await readFile(
          join(ctx.artifactDir, `${artifactId}.meta.json`),
          "utf-8",
        );
        return JSON.parse(data) as ArtifactRecord;
      } catch {
        return null;
      }
    },

    async updateArtifact(artifactId: string, patch: Partial<ArtifactRecord>) {
      const raw = await readFile(
        join(ctx.artifactDir, `${artifactId}.meta.json`),
        "utf-8",
      );
      const existing = JSON.parse(raw) as ArtifactRecord;
      await writeFile(
        join(ctx.artifactDir, `${artifactId}.meta.json`),
        JSON.stringify({ ...existing, ...patch }),
      );
    },
  };
}

/** Creates document storage methods. */
function createDocumentStore(ctx: StorageCtx) {
  async function getDocumentRaw(
    documentId: string,
  ): Promise<DocumentRecord | null> {
    try {
      const data = await readFile(
        join(ctx.storageDir, `doc_${documentId}.json`),
        "utf-8",
      );
      return JSON.parse(data) as DocumentRecord;
    } catch {
      return null;
    }
  }

  return {
    async saveDocument(record: DocumentRecord) {
      await ctx.ensureDir();
      await writeFile(
        join(ctx.storageDir, `doc_${record.id}.json`),
        JSON.stringify(record),
      );
    },

    getDocument: getDocumentRaw,

    async listDocumentsByOwner(ownerUserId: string) {
      await ctx.ensureDir();
      const files = await readdir(ctx.storageDir);
      const documents = await Promise.all(
        files
          .filter((file) => file.startsWith("doc_") && file.endsWith(".json"))
          .map(async (file) => {
            const data = await readFile(join(ctx.storageDir, file), "utf-8");
            return JSON.parse(data) as DocumentRecord;
          }),
      );
      return documents.filter((doc) => doc.ownerUserId === ownerUserId);
    },

    async updateDocument(documentId: string, patch: Partial<DocumentRecord>) {
      const existing = await getDocumentRaw(documentId);
      if (!existing) throw new Error(`Document not found: ${documentId}`);
      await writeFile(
        join(ctx.storageDir, `doc_${documentId}.json`),
        JSON.stringify({ ...existing, ...patch, updatedAt: nowIso() }),
      );
    },

    async resolveCurrentEditableSource(documentId: string) {
      const doc = await getDocumentRaw(documentId);
      if (!doc) return null;
      if (doc.artifacts.userSavedOmm) {
        const kind = "user_saved_omm" as const;
        return { kind, artifactId: doc.artifacts.userSavedOmm };
      }
      if (doc.artifacts.predictionOmm) {
        const kind = "prediction_omm" as const;
        return { kind, artifactId: doc.artifacts.predictionOmm };
      }
      return null;
    },
  };
}

/** Creates job storage methods. */
function createJobStore(ctx: StorageCtx) {
  async function getJobRaw(jobId: string) {
    try {
      const data = await readFile(
        join(ctx.storageDir, `job_${jobId}.json`),
        "utf-8",
      );
      return JSON.parse(data) as GenerationJobRecord;
    } catch {
      return null;
    }
  }

  return {
    async saveGenerationJob(record: GenerationJobRecord) {
      await ctx.ensureDir();
      await writeFile(
        join(ctx.storageDir, `job_${record.id}.json`),
        JSON.stringify(record),
      );
    },
    getGenerationJob: getJobRaw,
    async updateGenerationJob(
      jobId: string,
      patch: Partial<GenerationJobRecord>,
    ) {
      const existing = await getJobRaw(jobId);
      if (!existing) throw new Error(`Job not found: ${jobId}`);
      await writeFile(
        join(ctx.storageDir, `job_${jobId}.json`),
        JSON.stringify({ ...existing, ...patch, updatedAt: nowIso() }),
      );
    },
    async updateJobStages(jobId: string, stages: StageEvent[]) {
      const existing = await getJobRaw(jobId);
      if (!existing) throw new Error(`Job not found: ${jobId}`);
      await writeFile(
        join(ctx.storageDir, `job_${jobId}.json`),
        JSON.stringify({ ...existing, stages, updatedAt: nowIso() }),
      );
    },
  };
}

/** Creates export job storage methods. */
function createExportStore(ctx: StorageCtx) {
  async function getExportRaw(jobId: string) {
    try {
      const data = await readFile(
        join(ctx.storageDir, `export_${jobId}.json`),
        "utf-8",
      );
      return JSON.parse(data) as ExportJobRecord;
    } catch {
      return null;
    }
  }

  return {
    async saveExportJob(record: ExportJobRecord) {
      await ctx.ensureDir();
      await writeFile(
        join(ctx.storageDir, `export_${record.id}.json`),
        JSON.stringify(record),
      );
    },
    getExportJob: getExportRaw,
    async updateExportJob(jobId: string, patch: Partial<ExportJobRecord>) {
      const existing = await getExportRaw(jobId);
      if (!existing) throw new Error(`Export job not found: ${jobId}`);
      await writeFile(
        join(ctx.storageDir, `export_${jobId}.json`),
        JSON.stringify({ ...existing, ...patch, updatedAt: nowIso() }),
      );
    },
  };
}

/** Creates user storage methods. */
function createUserStore(ctx: StorageCtx) {
  async function getUserRaw(userId: string) {
    try {
      const data = await readFile(
        join(ctx.storageDir, `user_${userId}.json`),
        "utf-8",
      );
      return JSON.parse(data) as UserRecord;
    } catch {
      return null;
    }
  }

  return {
    async saveUser(record: UserRecord) {
      await ctx.ensureDir();
      await writeFile(
        join(ctx.storageDir, `user_${record.id}.json`),
        JSON.stringify(record),
      );
    },
    getUser: getUserRaw,
    async updateUser(userId: string, patch: Partial<UserRecord>) {
      const existing = await getUserRaw(userId);
      if (!existing) throw new Error(`User not found: ${userId}`);
      await writeFile(
        join(ctx.storageDir, `user_${userId}.json`),
        JSON.stringify({ ...existing, ...patch }),
      );
    },
  };
}

/** Creates quota reservation storage methods. */
function createQuotaStore(ctx: StorageCtx) {
  async function getQuotaReservationRaw(id: string) {
    try {
      const data = await readFile(
        join(ctx.storageDir, `quota_${id}.json`),
        "utf-8",
      );
      return JSON.parse(data) as QuotaReservation;
    } catch {
      return null;
    }
  }

  return {
    async saveQuotaReservation(record: QuotaReservation) {
      await ctx.ensureDir();
      await writeFile(
        join(ctx.storageDir, `quota_${record.id}.json`),
        JSON.stringify(record),
      );
    },
    getQuotaReservation: getQuotaReservationRaw,
    async updateQuotaReservation(id: string, patch: Partial<QuotaReservation>) {
      const existing = await getQuotaReservationRaw(id);
      if (!existing) throw new Error(`Quota reservation not found: ${id}`);
      await writeFile(
        join(ctx.storageDir, `quota_${id}.json`),
        JSON.stringify({ ...existing, ...patch }),
      );
    },
  };
}

/** Creates a local file-backed storage adapter. */
export function createStorage(config: AppConfig): Storage {
  const storageDir = config.storage.localDir ?? ".omm-storage";
  const artifactDir = join(storageDir, "artifacts");

  const ctx: StorageCtx = {
    storageDir,
    artifactDir,
    async ensureDir() {
      await mkdir(artifactDir, { recursive: true });
    },
  };

  const artifacts = createArtifactStore(ctx);
  const documents = createDocumentStore(ctx);
  const jobs = createJobStore(ctx);
  const exports = createExportStore(ctx);
  const users = createUserStore(ctx);
  const quotas = createQuotaStore(ctx);

  return {
    ...artifacts,
    ...documents,
    ...jobs,
    ...exports,
    ...users,
    ...quotas,
  };
}
