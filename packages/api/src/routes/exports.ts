/**
 * Export job creation and status routes.
 */
import type { AppHono } from "../types";
import { ok } from "../envelope/index";
import { AppError } from "../errors/index";
import { nowEpochMs } from "../temporal";

/** Export formats restricted to admin users. */
const ADMIN_EXPORT_FORMATS: readonly string[] = [
  "debug_bundle",
  "phase3_dataset_seed",
];

/** Registers export routes on the app. */
export function registerExportRoutes(app: AppHono) {
  /** Creates a new export job. */
  app.post("/api/exports", async (c) => {
    const user = c.get("user");
    if (!user) throw new AppError("unauthorized", "Authentication required.");

    const body: Record<string, unknown> = await c.req.json();
    if (!body?.documentId || !body?.format) {
      throw new AppError(
        "validation_failed",
        "documentId and format are required.",
      );
    }

    const format = String(body.format);
    if (ADMIN_EXPORT_FORMATS.includes(format) && user.role !== "admin") {
      throw new AppError(
        "forbidden",
        `${format} exports require admin access.`,
      );
    }

    return c.json(
      ok(
        { exportJobId: `export_stub_${nowEpochMs()}`, status: "queued" },
        c.get("requestId"),
      ),
      201,
    );
  });

  /** Returns the status of an export job. */
  app.get("/api/exports/:exportJobId", (c) => {
    const user = c.get("user");
    if (!user) throw new AppError("unauthorized", "Authentication required.");

    return c.json(
      ok(
        {
          id: c.req.param("exportJobId"),
          status: "completed",
          artifactId: `artifact_export_${nowEpochMs()}`,
        },
        c.get("requestId"),
      ),
    );
  });
}
