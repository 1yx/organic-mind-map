/**
 * Artifact metadata and content routes.
 */
/* eslint-disable max-lines-per-function */
import type { AppHono } from "../types";
import { ok } from "../envelope/index";
import { AppError } from "../errors/index";
import type { ArtifactKind } from "../models/index";

/** Artifact kinds that non-admin users can read. */
export const BROWSER_READABLE_KINDS: ArtifactKind[] = [
  "content_outline",
  "reference_image",
  "prediction_omm",
  "user_saved_omm",
  "png_export",
  "svg_export",
];

/** Artifact kinds restricted to admin users. */
export const ADMIN_ONLY_KINDS: ArtifactKind[] = [
  "mask",
  "debug_overlay",
  "correction_omm",
  "debug_bundle",
  "phase3_dataset_seed",
];

function canReadArtifact(
  artifact: { ownerUserId: string; accessPolicy: string; kind: ArtifactKind },
  user: { id: string; role: string },
): boolean {
  if (user.role === "admin") return true;
  if (ADMIN_ONLY_KINDS.includes(artifact.kind)) return false;
  if (artifact.accessPolicy === "public") return true;
  return artifact.ownerUserId === user.id;
}

/** Registers artifact routes on the app. */
export function registerArtifactRoutes(app: AppHono) {
  /** Returns artifact metadata. */
  app.get("/api/artifacts/:artifactId", async (c) => {
    const user = c.get("user");
    if (!user) throw new AppError("unauthorized", "Authentication required.");
    const artifact = await c
      .get("storage")
      .getArtifact(c.req.param("artifactId"));
    if (!artifact || !canReadArtifact(artifact, user)) {
      throw new AppError("not_found", "Artifact not found.");
    }

    return c.json(
      ok(
        {
          id: artifact.id,
          kind: artifact.kind,
          mimeType: artifact.mimeType,
          name: artifact.name,
          byteSize: artifact.byteSize,
          contentHash: artifact.contentHash,
          ownerUserId: artifact.ownerUserId,
          jobId: artifact.jobId,
          documentId: artifact.documentId,
          accessPolicy: artifact.accessPolicy,
          cachePolicy: artifact.cachePolicy,
          createdAt: artifact.createdAt,
        },
        c.get("requestId"),
      ),
    );
  });

  /** Returns artifact content for browser-readable kinds. */
  app.get("/api/artifacts/:artifactId/content", async (c) => {
    const user = c.get("user");
    if (!user) throw new AppError("unauthorized", "Authentication required.");
    const storage = c.get("storage");
    const artifact = await storage.getArtifact(c.req.param("artifactId"));
    if (!artifact || !canReadArtifact(artifact, user)) {
      throw new AppError("not_found", "Artifact not found.");
    }
    if (
      !BROWSER_READABLE_KINDS.includes(artifact.kind) &&
      user.role !== "admin"
    ) {
      throw new AppError(
        "forbidden",
        `${artifact.kind} content requires admin access.`,
      );
    }
    const content = await storage.readArtifactContent(artifact.id);
    if (!content) {
      throw new AppError(
        "artifact_unavailable",
        "Artifact content unavailable.",
        {
          retryable: true,
        },
      );
    }

    return new Response(new Uint8Array(content), {
      status: 200,
      headers: {
        "Content-Type": artifact.mimeType,
        "Cache-Control":
          artifact.cachePolicy === "immutable"
            ? "public, max-age=31536000, immutable"
            : "no-cache",
      },
    });
  });
}
