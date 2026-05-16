/**
 * Admin correction routes.
 */
/* eslint-disable complexity, max-lines-per-function */
import type { AppHono } from "../types";
import { ok } from "../envelope/index";
import { AppError } from "../errors/index";
import { contentHash, createId } from "../services/ids";
import { nowIso } from "../temporal";

/** Registers admin routes on the app. */
export function registerAdminRoutes(app: AppHono) {
  /** Creates or updates an internal correction_omm. */
  app.post("/api/admin/corrections", async (c) => {
    const user = c.get("user");
    if (!user) throw new AppError("unauthorized", "Authentication required.");
    if (user.role !== "admin")
      throw new AppError("forbidden", "Admin access required.");

    const body: Record<string, unknown> = await c.req.json();
    if (
      !body?.documentId ||
      !body?.predictionArtifactId ||
      !body?.correctionOmm
    ) {
      throw new AppError(
        "validation_failed",
        "documentId, predictionArtifactId, and correctionOmm are required.",
      );
    }
    const storage = c.get("storage");
    const documentId = String(body.documentId);
    const predictionArtifactId = String(body.predictionArtifactId);
    const document = await storage.getDocument(documentId);
    const predictionArtifact = await storage.getArtifact(predictionArtifactId);
    if (!document || !predictionArtifact) {
      throw new AppError(
        "not_found",
        "Document or prediction artifact not found.",
      );
    }
    if (document.artifacts.predictionOmm !== predictionArtifactId) {
      throw new AppError(
        "validation_failed",
        "predictionArtifactId does not belong to document.",
      );
    }

    const artifactId = createId("artifact_correction_omm");
    const content = JSON.stringify(body.correctionOmm);
    await storage.saveArtifact(
      {
        id: artifactId,
        kind: "correction_omm",
        mimeType: "application/vnd.omm+json",
        name: "correction.omm",
        byteSize: Buffer.byteLength(content),
        contentHash: contentHash(content),
        ownerUserId: document.ownerUserId,
        documentId,
        accessPolicy: "admin",
        cachePolicy: "immutable",
        createdAt: nowIso(),
      },
      content,
    );
    await storage.updateDocument(documentId, {
      artifacts: { ...document.artifacts, correctionOmm: artifactId },
    });
    return c.json(
      ok(
        {
          artifactId,
          documentId: body.documentId,
          predictionArtifactId: body.predictionArtifactId,
        },
        c.get("requestId"),
      ),
      201,
    );
  });
}
