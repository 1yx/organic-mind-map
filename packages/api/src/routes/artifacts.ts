/**
 * Artifact metadata and content routes.
 */
import type { AppHono } from "../types";
import { ok } from "../envelope/index";
import { AppError } from "../errors/index";
import type { ArtifactKind } from "../models/index";
import { nowIso } from "../temporal";

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
];

/** Registers artifact routes on the app. */
export function registerArtifactRoutes(app: AppHono) {
  /** Returns artifact metadata. */
  app.get("/api/artifacts/:artifactId", (c) => {
    const user = c.get("user");
    if (!user) throw new AppError("unauthorized", "Authentication required.");

    return c.json(
      ok(
        {
          id: c.req.param("artifactId"),
          kind: "prediction_omm",
          mimeType: "application/vnd.omm+json",
          name: "prediction.omm",
          ownerUserId: user.id,
          createdAt: nowIso(),
        },
        c.get("requestId"),
      ),
    );
  });

  /** Returns artifact content for browser-readable kinds. */
  app.get("/api/artifacts/:artifactId/content", (c) => {
    const user = c.get("user");
    if (!user) throw new AppError("unauthorized", "Authentication required.");

    return c.json(
      ok(
        { message: "Artifact content endpoint — storage integration pending." },
        c.get("requestId"),
      ),
    );
  });
}
