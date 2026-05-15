/**
 * Test helpers for creating isolated Hono app instances.
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Bindings } from "../types";
import type { UserRecord } from "../models/index";
import { loadConfig } from "../config/index";
import { createStorage } from "../services/storage";
import { createReplicateProvider } from "../services/replicate-provider";
import { createWorkerQueue } from "../services/worker-queue";
import { requestIdMiddleware } from "../middleware/request-id";
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

/** Admin test user for admin-only route tests. */
export const adminUser: UserRecord = {
  id: "user_admin_001",
  email: "admin@example.com",
  name: "Admin User",
  role: "admin",
  plan: "paid",
  createdAt: "2026-01-01T00:00:00Z",
};

/**
 * Creates a test Hono app with an optional pre-set user.
 *
 * @param user - User to inject, or null for unauthenticated, or omitted for testUser.
 */
export function createTestApp(user?: UserRecord | null): Hono<Bindings> {
  const config = loadConfig();
  const storage = createStorage(config);
  const replicate = createReplicateProvider(config.models);
  const workerQueue = createWorkerQueue(config);

  const app = new Hono<Bindings>();

  app.use("*", cors());
  app.use("*", async (c, next) => {
    c.set("user", user === undefined ? testUser : user);
    c.set("config", config);
    c.set("storage", storage);
    c.set("replicate", replicate);
    c.set("workerQueue", workerQueue);
    await next();
  });
  app.use("*", requestIdMiddleware);

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

  return app;
}
