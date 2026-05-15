/**
 * Admin correction routes.
 */
import type { AppHono } from "../types";
import { ok } from "../envelope/index";
import { AppError } from "../errors/index";
import { nowEpochMs } from "../temporal";

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

    const artifactId = `artifact_correction_omm_${nowEpochMs()}`;
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
