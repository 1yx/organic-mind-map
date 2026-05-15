/**
 * Worker queue for CV extraction jobs.
 *
 * Provides a local file-based queue adapter for development that invokes
 * the Python CV pipeline via `uv run`. Production will swap this for
 * SQS or GCP Pub/Sub adapters.
 */
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AppConfig } from "../config/index";
import type { WorkerJobPayload, WorkerOutput } from "../models/index";

/** Result of processing a queued worker job. */
export type JobResult = {
  ok: boolean;
  output?: WorkerOutput;
  error?: string;
};

/** Worker queue interface for enqueuing and processing CV extraction jobs. */
export type WorkerQueue = {
  /** Enqueues a CV extraction job. */
  enqueue(payload: WorkerJobPayload): Promise<void>;
  /** Processes the next queued job, or returns null if empty. */
  processNext(): Promise<JobResult | null>;
};

/** Creates a local file-backed worker queue. */
export function createWorkerQueue(config: AppConfig): WorkerQueue {
  const queueDir = join(config.storage.localDir ?? ".omm-storage", "queue");

  return {
    async enqueue(payload) {
      await mkdir(queueDir, { recursive: true });
      const jobFile = join(queueDir, `${payload.jobId}.json`);
      await writeFile(
        jobFile,
        JSON.stringify({ ...payload, status: "queued" }),
      );
    },

    async processNext() {
      await mkdir(queueDir, { recursive: true });
      const files = await readdir(queueDir);
      const jobFiles = files.filter(
        (f) => f.endsWith(".json") && !f.startsWith("."),
      );
      if (jobFiles.length === 0) return null;

      const jobFile = jobFiles[0];
      const raw = await readFile(join(queueDir, jobFile), "utf-8");
      const payload = JSON.parse(raw) as WorkerJobPayload;

      try {
        const output = await runExtractionPipeline(config, payload);
        await unlink(join(queueDir, jobFile));
        return { ok: true, output };
      } catch (err) {
        await unlink(join(queueDir, jobFile));
        return {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}

/** Invokes the Python CV extraction pipeline and collects outputs. */
async function runExtractionPipeline(
  config: AppConfig,
  payload: WorkerJobPayload,
): Promise<WorkerOutput> {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  const outputDir = payload.outputDir;
  await mkdir(outputDir, { recursive: true });

  const secondPath = config.worker.phase2SecondPath;
  const extractLayersScript = join(secondPath, "extract_layers.py");

  await execFileAsync(
    "uv",
    [
      "run",
      "--project",
      secondPath,
      "python",
      extractLayersScript,
      payload.referenceImagePath,
      "--out",
      outputDir,
    ],
    { timeout: config.worker.jobTimeoutMs },
  );

  const thirdPath = config.worker.phase2ThirdPath;
  const extractBranchesScript = join(thirdPath, "extract_editable_branches.py");
  const branchesMaskPath = join(outputDir, "branches_mask.png");

  await execFileAsync(
    "uv",
    [
      "run",
      "--project",
      thirdPath,
      "python",
      extractBranchesScript,
      payload.referenceImagePath,
      "--branches-mask",
      branchesMaskPath,
      "--out",
      outputDir,
    ],
    { timeout: config.worker.jobTimeoutMs },
  );

  const files = await readdir(outputDir);
  const artifacts = files
    .filter((f) => !f.endsWith(".meta.json"))
    .map((f) => ({ kind: guessKind(f), path: join(outputDir, f) }));

  return { ok: true, artifacts, diagnostics: [] };
}

/** Guesses the artifact kind from a filename. */
function guessKind(filename: string): string {
  if (filename.includes("branch") && filename.endsWith(".svg"))
    return "debug_overlay";
  if (filename.includes("mask")) return "mask";
  if (filename.includes("overlay") || filename.includes("debug"))
    return "debug_overlay";
  if (filename.endsWith(".omm") || filename.endsWith(".json"))
    return "prediction_omm";
  return "debug_overlay";
}
