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
import type {
  ArtifactKind,
  WorkerJobPayload,
  WorkerOutput,
} from "../models/index";

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

type ExecFileAsync = (
  file: string,
  args: string[],
  options: { timeout: number },
) => Promise<unknown>;

async function createExecFileAsync(): Promise<ExecFileAsync> {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  return promisify(execFile) as ExecFileAsync;
}

async function extractLayers(
  config: AppConfig,
  payload: WorkerJobPayload,
  execFileAsync: ExecFileAsync,
) {
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
      payload.outputDir,
    ],
    { timeout: config.worker.jobTimeoutMs },
  );
}

async function extractBranches(
  config: AppConfig,
  payload: WorkerJobPayload,
  execFileAsync: ExecFileAsync,
) {
  const thirdPath = config.worker.phase2ThirdPath;
  const extractBranchesScript = join(thirdPath, "extract_editable_branches.py");
  const branchesMaskPath = join(payload.outputDir, "branches_mask.png");
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
      payload.outputDir,
    ],
    { timeout: config.worker.jobTimeoutMs },
  );
}

async function collectWorkerOutput(outputDir: string): Promise<WorkerOutput> {
  const files = await readdir(outputDir);
  const predictionFile = files.find(
    (f) =>
      (f.includes("prediction") || f.endsWith(".omm")) &&
      (f.endsWith(".json") || f.endsWith(".omm")),
  );
  const predictionOmm: unknown = predictionFile
    ? JSON.parse(await readFile(join(outputDir, predictionFile), "utf-8"))
    : undefined;
  const artifacts = files
    .filter((f) => !f.endsWith(".meta.json") && f !== predictionFile)
    .map(async (f) => {
      const path = join(outputDir, f);
      const content = await readFile(path);
      return {
        kind: guessKind(f),
        contentBase64: content.toString("base64"),
        mimeType: guessMimeType(f),
        name: f,
      };
    });

  return {
    ok: true,
    predictionOmm,
    artifacts: await Promise.all(artifacts),
    diagnostics: [],
  };
}

/** Invokes the Python CV extraction pipeline and collects outputs. */
async function runExtractionPipeline(
  config: AppConfig,
  payload: WorkerJobPayload,
): Promise<WorkerOutput> {
  const execFileAsync = await createExecFileAsync();
  await mkdir(payload.outputDir, { recursive: true });
  await extractLayers(config, payload, execFileAsync);
  await extractBranches(config, payload, execFileAsync);
  return collectWorkerOutput(payload.outputDir);
}

/** Guesses the artifact kind from a filename. */
function guessKind(filename: string): ArtifactKind {
  if (filename.includes("branch") && filename.endsWith(".svg"))
    return "debug_overlay";
  if (filename.includes("mask")) return "mask";
  if (filename.includes("overlay") || filename.includes("debug"))
    return "debug_overlay";
  if (filename.endsWith(".omm") || filename.endsWith(".json"))
    return "prediction_omm";
  return "debug_overlay";
}

function guessMimeType(filename: string): string {
  if (filename.endsWith(".png")) return "image/png";
  if (filename.endsWith(".svg")) return "image/svg+xml";
  if (filename.endsWith(".json") || filename.endsWith(".omm")) {
    return "application/json";
  }
  return "application/octet-stream";
}
