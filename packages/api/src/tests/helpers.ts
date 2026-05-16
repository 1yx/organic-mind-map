/**
 * Test helpers for creating isolated Hono app instances.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Bindings } from "../types";
import type { UserRecord } from "../models/index";
import { loadConfig } from "../config/index";
import { createStorage, type Storage } from "../services/storage";
import {
  createReplicateProvider,
  type ReplicateProvider,
} from "../services/replicate-provider";
import { createWorkerQueue } from "../services/worker-queue";
import { requestIdMiddleware } from "../middleware/request-id";
import {
  authMiddleware,
  createSessionCookieValue,
  SESSION_USER_ID_COOKIE,
} from "../middleware/auth";
import { errorHandler } from "../middleware/error-handler";
import { registerSessionRoutes } from "../routes/session";
import { registerQuotaRoutes } from "../routes/quota";
import { registerGenerationJobRoutes } from "../routes/generation-jobs";
import { registerArtifactRoutes } from "../routes/artifacts";
import { registerDocumentRoutes } from "../routes/documents";
import { registerAdminRoutes } from "../routes/admin";
import { registerExportRoutes } from "../routes/exports";
import { registerBillingRoutes } from "../routes/billing";

/** Standard test user for non-admin tests. */
export const testUser: UserRecord = {
  id: "user_test_001",
  email: "test@example.com",
  name: "Test User",
  role: "user",
  plan: "trial",
  createdAt: "2026-01-01T00:00:00Z",
};

/** Second test user for ownership denial tests. */
export const otherUser: UserRecord = {
  id: "user_test_002",
  email: "other@example.com",
  name: "Other User",
  role: "user",
  plan: "trial",
  createdAt: "2026-01-01T00:00:00Z",
};

/** Admin test user for admin-only route tests. */
export const adminUser: UserRecord = {
  id: "user_admin_001",
  email: "admin@example.com",
  name: "Admin User",
  role: "admin",
  plan: "paid",
  createdAt: "2026-01-01T00:00:00Z",
};

export type TestHarness = {
  app: Hono<Bindings>;
  storage: Storage;
  authHeaders: HeadersInit;
  otherAuthHeaders: HeadersInit;
  adminHeaders: HeadersInit;
};

export type TestAppOptions = {
  replicate?: ReplicateProvider;
  useExternalModels?: boolean;
};

function authCookieHeader(userId: string, secret: string): HeadersInit {
  return {
    cookie: `${SESSION_USER_ID_COOKIE}=${createSessionCookieValue(userId, secret)}`,
  };
}

/** Creates an isolated test app wired through the real auth middleware. */
export async function createTestApp(
  options: TestAppOptions = {},
): Promise<TestHarness> {
  const config = loadConfig();
  config.storage.localDir = mkdtempSync(join(tmpdir(), "omm-api-test-"));
  config.payment.stripeWebhookSecret = "whsec_test";
  if (options.useExternalModels) {
    config.models.apiToken = "r8-test-token";
  }
  const storage = createStorage(config);
  const replicate = options.replicate ?? createReplicateProvider(config.models);
  const workerQueue = createWorkerQueue(config);

  await storage.saveUser(testUser);
  await storage.saveUser(otherUser);
  await storage.saveUser(adminUser);

  const app = new Hono<Bindings>();

  app.use("*", cors());
  app.use("*", async (c, next) => {
    c.set("config", config);
    c.set("storage", storage);
    c.set("replicate", replicate);
    c.set("zhipu", null);
    c.set("workerQueue", workerQueue);
    await next();
  });
  app.use("*", requestIdMiddleware);
  app.use("*", authMiddleware);

  registerSessionRoutes(app);
  registerQuotaRoutes(app);
  registerGenerationJobRoutes(app);
  registerArtifactRoutes(app);
  registerDocumentRoutes(app);
  registerAdminRoutes(app);
  registerExportRoutes(app);
  registerBillingRoutes(app);

  app.get("/api/health", (c) => c.json({ ok: true }));
  app.onError(errorHandler);

  return {
    app,
    storage,
    authHeaders: authCookieHeader(testUser.id, config.auth.sessionSecret),
    otherAuthHeaders: authCookieHeader(otherUser.id, config.auth.sessionSecret),
    adminHeaders: authCookieHeader(adminUser.id, config.auth.sessionSecret),
  };
}
