/**
 * Backend configuration loading from environment variables.
 *
 * All configuration is read from env vars with sensible defaults for
 * local development. Missing required values throw at startup.
 */
import { nowEpochMs } from "../temporal";

/** Auth/session configuration. */
export type AuthConfig = {
  sessionSecret: string;
  sessionMaxAgeMs: number;
  ssoProvider: "stripe" | "clerk" | "custom" | "none";
  ssoEndpoint?: string;
};

/** Artifact storage configuration. */
export type StorageConfig = {
  kind: "local" | "s3";
  localDir?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3Prefix?: string;
};

/** Database connection configuration. */
export type DatabaseConfig = {
  url: string;
  poolMin: number;
  poolMax: number;
};

/** Worker queue configuration. */
export type QueueConfig = {
  kind: "local" | "sqs" | "gcp-pubsub";
  localWorkerPath?: string;
  sqsUrl?: string;
  gcpProjectId?: string;
  gcpTopicName?: string;
};

/** AI model provider configuration. */
export type ModelProviderConfig = {
  provider: "replicate";
  apiToken: string;
  llmModel: string;
  imageModel: string;
};

/** Payment provider configuration. */
export type PaymentConfig = {
  provider: "stripe" | "none";
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
};

/** CV worker pipeline configuration. */
export type WorkerConfig = {
  phase2SecondPath: string;
  phase2ThirdPath: string;
  extractionProfile: string;
  maxConcurrentJobs: number;
  jobTimeoutMs: number;
};

/** HTTP server configuration. */
export type ServerConfig = {
  port: number;
  host: string;
  corsOrigin: string;
};

/** Top-level application configuration. */
export type AppConfig = {
  env: "development" | "staging" | "production";
  server: ServerConfig;
  auth: AuthConfig;
  database: DatabaseConfig;
  storage: StorageConfig;
  queue: QueueConfig;
  models: ModelProviderConfig;
  payment: PaymentConfig;
  worker: WorkerConfig;
};

/** Reads an env var or throws if missing and no fallback provided. */
function env(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value !== undefined && value !== "") return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required env var: ${name}`);
}

/** Reads an optional env var. */
function envOpt(name: string): string | undefined {
  const value = process.env[name];
  if (value !== undefined && value !== "") return value;
  return undefined;
}

/** Reads an env var as an integer with a default. */
function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) throw new Error(`Invalid int for ${name}: ${raw}`);
  return parsed;
}

/** Validates a string against a set of allowed values. */
function oneOf<const T extends string>(
  value: string,
  allowed: readonly T[],
): T {
  for (const candidate of allowed) {
    if (value === candidate) return candidate;
  }
  throw new Error(
    `Invalid value: ${value}. Expected one of: ${allowed.join(", ")}`,
  );
}

/** Resolves the runtime environment string. Treats "test" as development. */
function resolveEnv(raw: string): AppConfig["env"] {
  const normalised = raw === "test" ? "development" : raw;
  return oneOf(normalised, ["development", "staging", "production"]);
}

/** Loads server configuration from env. */
function loadServerConfig(): ServerConfig {
  return {
    port: envInt("PORT", 3210),
    host: env("HOST", "0.0.0.0"),
    corsOrigin: env("CORS_ORIGIN", "http://localhost:4173"),
  };
}

/** Loads auth/session configuration from env. */
function loadAuthConfig(): AuthConfig {
  return {
    sessionSecret: env("SESSION_SECRET", "dev-secret-change-me"),
    sessionMaxAgeMs: envInt("SESSION_MAX_AGE_MS", 86400000),
    ssoProvider: oneOf(env("SSO_PROVIDER", "none"), [
      "stripe",
      "clerk",
      "custom",
      "none",
    ]),
    ssoEndpoint: envOpt("SSO_ENDPOINT"),
  };
}

/** Loads storage configuration from env. */
function loadStorageConfig(): StorageConfig {
  return {
    kind: oneOf(env("STORAGE_KIND", "local"), ["local", "s3"]),
    localDir: env("STORAGE_LOCAL_DIR", ".omm-storage"),
    s3Bucket: envOpt("S3_BUCKET"),
    s3Region: envOpt("S3_REGION"),
    s3Prefix: envOpt("S3_PREFIX"),
  };
}

/** Loads queue configuration from env. */
function loadQueueConfig(): QueueConfig {
  return {
    kind: oneOf(env("QUEUE_KIND", "local"), ["local", "sqs", "gcp-pubsub"]),
    localWorkerPath: envOpt("CV_PIPELINE_COMMAND"),
    sqsUrl: envOpt("SQS_URL"),
    gcpProjectId: envOpt("GCP_PROJECT_ID"),
    gcpTopicName: envOpt("GCP_TOPIC_NAME"),
  };
}

/** Loads database configuration from env. */
function loadDatabaseConfig(): DatabaseConfig {
  return {
    url: env("DATABASE_URL", "postgresql://omm:omm@localhost:5432/omm_dev"),
    poolMin: envInt("DB_POOL_MIN", 1),
    poolMax: envInt("DB_POOL_MAX", 10),
  };
}

/** Loads AI model provider configuration from env. */
function loadModelsConfig(): ModelProviderConfig {
  return {
    provider: "replicate",
    apiToken: env("REPLICATE_API_TOKEN", `r8-placeholder-${nowEpochMs()}`),
    llmModel: env("REPLICATE_LLM_MODEL", "meta/llama-4-maverick"),
    imageModel: env("REPLICATE_IMAGE_MODEL", "black-forest-labs/flux-1.1-pro"),
  };
}

/** Loads payment provider configuration from env. */
function loadPaymentConfig(): PaymentConfig {
  return {
    provider: oneOf(env("PAYMENT_PROVIDER", "none"), ["stripe", "none"]),
    stripeSecretKey: envOpt("STRIPE_SECRET_KEY"),
    stripeWebhookSecret: envOpt("STRIPE_WEBHOOK_SECRET"),
  };
}

/** Loads worker pipeline configuration from env. */
function loadWorkerConfig(): WorkerConfig {
  return {
    phase2SecondPath: env("PHASE2_SECOND_PATH", "PHASE_2_2nd_attempts"),
    phase2ThirdPath: env("PHASE2_THIRD_PATH", "PHASE_2_3rd_attampts"),
    extractionProfile: env("EXTRACTION_PROFILE", "phase2-default"),
    maxConcurrentJobs: envInt("WORKER_MAX_CONCURRENT", 2),
    jobTimeoutMs: envInt("WORKER_JOB_TIMEOUT_MS", 300000),
  };
}

/**
 * Loads the full application configuration from environment variables.
 *
 * Throws at startup if any required value is missing and has no default.
 */
export function loadConfig(): AppConfig {
  const nodeEnv = env("NODE_ENV", "development");
  return {
    env: resolveEnv(nodeEnv),
    server: loadServerConfig(),
    auth: loadAuthConfig(),
    database: loadDatabaseConfig(),
    storage: loadStorageConfig(),
    queue: loadQueueConfig(),
    models: loadModelsConfig(),
    payment: loadPaymentConfig(),
    worker: loadWorkerConfig(),
  };
}
