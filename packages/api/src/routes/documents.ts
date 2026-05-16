/**
 * Document CRUD and save routes.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, max-lines-per-function */
import type { AppHono } from "../types";
import { ok } from "../envelope/index";
import { AppError } from "../errors/index";
import type { ArtifactRecord, EditableSource } from "../models/index";
import { contentHash, createId } from "../services/ids";
import { nowIso } from "../temporal";

function validateUserSavedOmm(value: unknown): string {
  if (!value || typeof value !== "object") {
    throw new AppError("validation_failed", "omm is required.");
  }
  const omm = value as Record<string, unknown>;
  if (omm.schema !== "omm.document" || typeof omm.version !== "number") {
    throw new AppError("validation_failed", "Invalid OMM document schema.");
  }
  if ("masks" in omm || "rawOcrEvidence" in omm || "debugInternals" in omm) {
    throw new AppError(
      "validation_failed",
      "user_saved_omm cannot include masks, raw OCR evidence, or debug internals.",
    );
  }
  return JSON.stringify(value);
}

function userSavedArtifact(params: {
  id: string;
  content: string;
  ownerUserId: string;
  documentId: string;
}): ArtifactRecord {
  return {
    id: params.id,
    kind: "user_saved_omm",
    mimeType: "application/vnd.omm+json",
    name: "user-saved.omm",
    byteSize: Buffer.byteLength(params.content),
    contentHash: contentHash(params.content),
    ownerUserId: params.ownerUserId,
    documentId: params.documentId,
    accessPolicy: "owner",
    cachePolicy: "immutable",
    createdAt: nowIso(),
  };
}

/** Creates a document from a frontend-submitted OMM. */
async function handleCreateDocument(c: import("hono").Context) {
  const user = c.get("user");
  if (!user) throw new AppError("unauthorized", "Authentication required.");
  const storage = c.get("storage");

  const body: Record<string, unknown> = await c.req.json();
  const ommContent = validateUserSavedOmm(body?.omm);

  const timestamp = nowIso();
  const docId = createId("doc");
  const artifactId = createId("artifact_user_saved_omm");
  const editableSource: EditableSource = {
    kind: "user_saved_omm",
    artifactId,
  };
  await storage.saveArtifact(
    userSavedArtifact({
      id: artifactId,
      content: ommContent,
      ownerUserId: user.id,
      documentId: docId,
    }),
    ommContent,
  );
  await storage.saveDocument({
    id: docId,
    name: typeof body.name === "string" ? body.name : "Untitled Map",
    ownerUserId: user.id,
    lifecycle: "saved",
    artifacts: { userSavedOmm: artifactId },
    currentEditableSource: editableSource,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  return c.json(
    ok(
      { documentId: docId, artifactId, currentEditableSource: editableSource },
      c.get("requestId"),
    ),
    201,
  );
}

/** Returns a document with artifact references and currentEditableSource. */
async function handleGetDocument(c: import("hono").Context) {
  const user = c.get("user");
  if (!user) throw new AppError("unauthorized", "Authentication required.");
  const document = await c
    .get("storage")
    .getDocument(c.req.param("documentId"));
  if (!document || document.ownerUserId !== user.id) {
    throw new AppError("not_found", "Document not found.");
  }
  const currentEditableSource = await c
    .get("storage")
    .resolveCurrentEditableSource(document.id);

  return c.json(
    ok(
      {
        ...document,
        currentEditableSource,
      },
      c.get("requestId"),
    ),
  );
}

/** Stores a complete user_saved_omm snapshot for a document. */
async function handleSaveCurrentOmm(c: import("hono").Context) {
  const user = c.get("user");
  if (!user) throw new AppError("unauthorized", "Authentication required.");
  const storage = c.get("storage");
  const documentId = String(c.req.param("documentId"));
  const document = await storage.getDocument(documentId);
  if (!document || document.ownerUserId !== user.id) {
    throw new AppError("not_found", "Document not found.");
  }

  const body: Record<string, unknown> = await c.req.json();
  const ommContent = validateUserSavedOmm(body?.omm);
  const currentSource = await storage.resolveCurrentEditableSource(documentId);

  if (
    typeof body.baseArtifactId === "string" &&
    currentSource &&
    body.baseArtifactId !== currentSource.artifactId
  ) {
    throw new AppError(
      "stale_document",
      "Document has been modified since last load.",
    );
  }

  const artifactId = createId("artifact_user_saved_omm");
  const editableSource: EditableSource = {
    kind: "user_saved_omm",
    artifactId,
  };
  await storage.saveArtifact(
    userSavedArtifact({
      id: artifactId,
      content: ommContent,
      ownerUserId: user.id,
      documentId,
    }),
    ommContent,
  );
  await storage.updateDocument(documentId, {
    lifecycle: "saved",
    artifacts: {
      ...document.artifacts,
      userSavedOmm: artifactId,
    },
    currentEditableSource: editableSource,
  });
  return c.json(
    ok(
      {
        documentId,
        artifactId,
        currentEditableSource: editableSource,
        savedAt: nowIso(),
      },
      c.get("requestId"),
    ),
  );
}

async function handleArchiveDocument(c: import("hono").Context) {
  const user = c.get("user");
  if (!user) throw new AppError("unauthorized", "Authentication required.");
  const storage = c.get("storage");
  const documentId = c.req.param("documentId");
  const document = await storage.getDocument(documentId);
  if (!document || document.ownerUserId !== user.id) {
    throw new AppError("not_found", "Document not found.");
  }
  await storage.updateDocument(documentId, { lifecycle: "archived" });
  return c.json(ok({ documentId, lifecycle: "archived" }, c.get("requestId")));
}

/** Registers document routes on the app. */
export function registerDocumentRoutes(app: AppHono) {
  app.post("/api/documents", handleCreateDocument);
  app.get("/api/documents/:documentId", handleGetDocument);
  app.put("/api/documents/:documentId/current-omm", handleSaveCurrentOmm);
  app.post("/api/documents/:documentId/archive", handleArchiveDocument);
}
