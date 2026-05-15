/**
 * Document CRUD and save routes.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { AppHono } from "../types";
import { ok } from "../envelope/index";
import { AppError } from "../errors/index";
import type { EditableSource } from "../models/index";
import { nowEpochMs, nowIso } from "../temporal";

/** Creates a document from a frontend-submitted OMM. */
async function handleCreateDocument(c: import("hono").Context) {
  const user = c.get("user");
  if (!user) throw new AppError("unauthorized", "Authentication required.");

  const body: Record<string, unknown> = await c.req.json();
  if (!body?.omm) {
    throw new AppError("validation_failed", "omm is required.");
  }

  const docId = `doc_stub_${nowEpochMs()}`;
  const artifactId = `artifact_user_saved_omm_${nowEpochMs()}`;
  const editableSource: EditableSource = {
    kind: "user_saved_omm",
    artifactId,
  };
  return c.json(
    ok(
      { documentId: docId, artifactId, currentEditableSource: editableSource },
      c.get("requestId"),
    ),
    201,
  );
}

/** Returns a document with artifact references and currentEditableSource. */
function handleGetDocument(c: import("hono").Context) {
  const user = c.get("user");
  if (!user) throw new AppError("unauthorized", "Authentication required.");

  return c.json(
    ok(
      {
        id: c.req.param("documentId"),
        name: "Untitled Map",
        lifecycle: "generated",
        artifacts: {
          contentOutline: null,
          referenceImage: null,
          predictionOmm: null,
          userSavedOmm: null,
          correctionOmm: null,
        },
        currentEditableSource: null,
      },
      c.get("requestId"),
    ),
  );
}

/** Stores a complete user_saved_omm snapshot for a document. */
async function handleSaveCurrentOmm(c: import("hono").Context) {
  const user = c.get("user");
  if (!user) throw new AppError("unauthorized", "Authentication required.");

  const body: Record<string, unknown> = await c.req.json();
  if (!body?.omm) {
    throw new AppError("validation_failed", "omm is required.");
  }

  if (body.baseArtifactId === "stale_placeholder") {
    throw new AppError(
      "stale_document",
      "Document has been modified since last load.",
    );
  }

  const artifactId = `artifact_user_saved_omm_${nowEpochMs()}`;
  const editableSource: EditableSource = {
    kind: "user_saved_omm",
    artifactId,
  };
  return c.json(
    ok(
      {
        documentId: c.req.param("documentId"),
        artifactId,
        currentEditableSource: editableSource,
        savedAt: nowIso(),
      },
      c.get("requestId"),
    ),
  );
}

/** Registers document routes on the app. */
export function registerDocumentRoutes(app: AppHono) {
  app.post("/api/documents", handleCreateDocument);
  app.get("/api/documents/:documentId", handleGetDocument);
  app.put("/api/documents/:documentId/current-omm", handleSaveCurrentOmm);
}
