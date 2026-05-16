/**
 * Shared Hono binding types for the API application.
 */
import type { Hono } from "hono";
import type { UserRecord } from "./models/index";
import type { Storage } from "./services/storage";
import type { ReplicateProvider } from "./services/replicate-provider";
import type { ZhipuProvider } from "./services/zhipu-provider";
import type { WorkerQueue } from "./services/worker-queue";
import type { AppConfig } from "./config/index";

/** Hono context variable types available on every request. */
export type Bindings = {
  Variables: {
    requestId: string;
    user: UserRecord | null;
    config: AppConfig;
    storage: Storage;
    replicate: ReplicateProvider;
    zhipu: ZhipuProvider | null;
    workerQueue: WorkerQueue;
  };
};

/** Convenience alias for a Hono app instance with our bindings. */
export type AppHono = Hono<Bindings>;
