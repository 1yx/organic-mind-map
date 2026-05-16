/**
 * Export job creation and status routes.
 */
/* eslint-disable complexity, max-lines-per-function */
import type { AppHono } from "../types";
import { ok } from "../envelope/index";
import { AppError } from "../errors/index";
import type { ArtifactKind, ExportFormat } from "../models/index";
import { contentHash, createId } from "../services/ids";
import { nowIso } from "../temporal";

/** Export formats restricted to admin users. */
const ADMIN_EXPORT_FORMATS: readonly string[] = [
  "debug_bundle",
  "phase3_dataset_seed",
];

function isExportFormat(value: string): value is ExportFormat {
  return ["omm", "png", "svg", "debug_bundle", "phase3_dataset_seed"].includes(
    value,
  );
}

function resultArtifactKind(format: ExportFormat): ArtifactKind {
  if (format === "omm") return "user_saved_omm";
  if (format === "png") return "png_export";
  if (format === "svg") return "svg_export";
  return format;
}

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
    if (!isExportFormat(format)) {
      throw new AppError(
        "validation_failed",
        `Invalid export format: ${format}`,
      );
    }
    if (ADMIN_EXPORT_FORMATS.includes(format) && user.role !== "admin") {
      throw new AppError(
        "forbidden",
        `${format} exports require admin access.`,
      );
    }
    const storage = c.get("storage");
    const documentId = String(body.documentId);
    const document = await storage.getDocument(documentId);
    if (
      !document ||
      (document.ownerUserId !== user.id && user.role !== "admin")
    ) {
      throw new AppError("not_found", "Document not found.");
    }

    const explicitSource =
      typeof body.sourceArtifactId === "string"
        ? body.sourceArtifactId
        : undefined;
    const currentSource =
      await storage.resolveCurrentEditableSource(documentId);
    const sourceArtifactId = explicitSource ?? currentSource?.artifactId;
    if (!sourceArtifactId) {
      throw new AppError(
        "validation_failed",
        "No export source artifact available.",
      );
    }
    const sourceArtifact = await storage.getArtifact(sourceArtifactId);
    if (!sourceArtifact || sourceArtifact.documentId !== documentId) {
      throw new AppError(
        "validation_failed",
        "sourceArtifactId does not belong to document.",
      );
    }

    const sourceContent = await storage.readArtifactContent(sourceArtifactId);
    if (!sourceContent) {
      throw new AppError(
        "artifact_unavailable",
        "Source artifact unavailable.",
        {
          retryable: true,
        },
      );
    }

    const timestamp = nowIso();
    const exportJobId = createId("export");
    const resultArtifactId = createId(`artifact_${format}`);
    const resultContent =
      format === "omm"
        ? sourceContent
        : Buffer.from(`${format} export placeholder for ${documentId}`);
    const mimeType =
      format === "omm"
        ? "application/vnd.omm+json"
        : format === "png"
          ? "image/png"
          : format === "svg"
            ? "image/svg+xml"
            : "application/zip";

    await storage.saveArtifact(
      {
        id: resultArtifactId,
        kind: resultArtifactKind(format),
        mimeType,
        name: `export.${format === "omm" ? "omm" : format}`,
        byteSize: Buffer.byteLength(resultContent),
        contentHash: contentHash(resultContent),
        ownerUserId: document.ownerUserId,
        documentId,
        accessPolicy: ADMIN_EXPORT_FORMATS.includes(format) ? "admin" : "owner",
        cachePolicy: "immutable",
        createdAt: timestamp,
      },
      resultContent,
    );
    await storage.saveExportJob({
      id: exportJobId,
      ownerUserId: user.id,
      documentId,
      format,
      sourceArtifactId,
      options:
        body.options && typeof body.options === "object"
          ? (body.options as Record<string, unknown>)
          : {},
      status: "completed",
      resultArtifactId,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return c.json(
      ok(
        { exportJobId, status: "completed", artifactId: resultArtifactId },
        c.get("requestId"),
      ),
      201,
    );
  });

  /** Returns the status of an export job. */
  app.get("/api/exports/:exportJobId", (c) => {
    const user = c.get("user");
    if (!user) throw new AppError("unauthorized", "Authentication required.");
    return c
      .get("storage")
      .getExportJob(c.req.param("exportJobId"))
      .then((job) => {
        if (!job || (job.ownerUserId !== user.id && user.role !== "admin")) {
          throw new AppError("not_found", "Export job not found.");
        }

        return c.json(
          ok(
            {
              id: job.id,
              status: job.status,
              artifactId: job.resultArtifactId,
              documentId: job.documentId,
              format: job.format,
              sourceArtifactId: job.sourceArtifactId,
            },
            c.get("requestId"),
          ),
        );
      });
  });
}
