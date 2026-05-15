export type AuthConfig = {
  sessionSecret: string;
  sessionMaxAgeMs: number;
  ssoProvider: "stripe" | "clerk" | "custom" | "none";
  ssoEndpoint?: string;
};

export type StorageConfig = {
  kind: "local" | "s3";
  localDir?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3Prefix?: string;
};

export type DatabaseConfig = {
  url: string;
  poolMin: number;
  poolMax: number;
};

export type QueueConfig = {
  kind: "local" | "sqs" | "gcp-pubsub";
  localWorkerPath?: string;
  sqsUrl?: string;
  gcpProjectId?: string;
  gcpTopicName?: string;
};

export type ModelProviderConfig = {
  provider: "replicate";
  apiToken: string;
  llmModel: string;
  imageModel: string;
};

export type PaymentConfig = {
  provider: "stripe" | "none";
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
};

export type WorkerConfig = {
  phase2SecondPath: string;
  phase2ThirdPath: string;
  extractionProfile: string;
  maxConcurrentJobs: number;
  jobTimeoutMs: number;
};

export type ServerConfig = {
  port: number;
  host: string;
  corsOrigin: string;
};

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

function env(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value !== undefined && value !== "") return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required env var: ${name}`);
}

function envOpt(name: string): string | undefined {
  const value = process.env[name];
  if (value !== undefined && value !== "") return value;
  return undefined;
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) throw new Error(`Invalid int for ${name}: ${raw}`);
  return parsed;
}

function resolveEnv(raw: string): AppConfig["env"] {
  if (raw === "production") return "production";
  if (raw === "staging") return "staging";
  return "development";
}

function loadServerConfig(): ServerConfig {
  return {
    port: envInt("PORT", 3210),
    host: env("HOST", "0.0.0.0"),
    corsOrigin: env("CORS_ORIGIN", "http://localhost:4173"),
  };
}

function loadAuthConfig(): AuthConfig {
  return {
    sessionSecret: env("SESSION_SECRET", "dev-secret-change-me"),
    sessionMaxAgeMs: envInt("SESSION_MAX_AGE_MS", 86400000),
    ssoProvider: env("SSO_PROVIDER", "none") as AuthConfig["ssoProvider"],
    ssoEndpoint: envOpt("SSO_ENDPOINT"),
  };
}

function loadStorageConfig(): StorageConfig {
  return {
    kind: env("STORAGE_KIND", "local") as StorageConfig["kind"],
    localDir: env("STORAGE_LOCAL_DIR", ".omm-storage"),
    s3Bucket: envOpt("S3_BUCKET"),
    s3Region: envOpt("S3_REGION"),
    s3Prefix: envOpt("S3_PREFIX"),
  };
}

function loadQueueConfig(): QueueConfig {
  return {
    kind: env("QUEUE_KIND", "local") as QueueConfig["kind"],
    localWorkerPath: envOpt("CV_PIPELINE_COMMAND"),
    sqsUrl: envOpt("SQS_URL"),
    gcpProjectId: envOpt("GCP_PROJECT_ID"),
    gcpTopicName: envOpt("GCP_TOPIC_NAME"),
  };
}

function loadDatabaseConfig(): DatabaseConfig {
  return {
    url: env("DATABASE_URL", "postgresql://omm:omm@localhost:5432/omm_dev"),
    poolMin: envInt("DB_POOL_MIN", 1),
    poolMax: envInt("DB_POOL_MAX", 10),
  };
}

function loadModelsConfig(): ModelProviderConfig {
  return {
    provider: "replicate",
    apiToken: env("REPLICATE_API_TOKEN", "r8-placeholder"),
    llmModel: env("REPLICATE_LLM_MODEL", "meta/llama-4-maverick"),
    imageModel: env("REPLICATE_IMAGE_MODEL", "black-forest-labs/flux-1.1-pro"),
  };
}

function loadPaymentConfig(): PaymentConfig {
  return {
    provider: env("PAYMENT_PROVIDER", "none") as PaymentConfig["provider"],
    stripeSecretKey: envOpt("STRIPE_SECRET_KEY"),
    stripeWebhookSecret: envOpt("STRIPE_WEBHOOK_SECRET"),
  };
}

function loadWorkerConfig(): WorkerConfig {
  return {
    phase2SecondPath: env("PHASE2_SECOND_PATH", "PHASE_2_2nd_attempts"),
    phase2ThirdPath: env("PHASE2_THIRD_PATH", "PHASE_2_3rd_attampts"),
    extractionProfile: env("EXTRACTION_PROFILE", "phase2-default"),
    maxConcurrentJobs: envInt("WORKER_MAX_CONCURRENT", 2),
    jobTimeoutMs: envInt("WORKER_JOB_TIMEOUT_MS", 300000),
  };
}

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
