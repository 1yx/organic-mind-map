/**
 * Hono application factory.
 *
 * Wires together all middleware, services, and route registrations
 * into a single Hono app instance.
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Bindings } from "./types";
import { loadConfig } from "./config/index";
import { createStorage } from "./services/storage";
import { createReplicateProvider } from "./services/replicate-provider";
import { createWorkerQueue } from "./services/worker-queue";
import { requestIdMiddleware } from "./middleware/request-id";
import { authMiddleware } from "./middleware/auth";
import { errorHandler } from "./middleware/error-handler";
import { registerSessionRoutes } from "./routes/session";
import { registerQuotaRoutes } from "./routes/quota";
import { registerGenerationJobRoutes } from "./routes/generation-jobs";
import { registerArtifactRoutes } from "./routes/artifacts";
import { registerDocumentRoutes } from "./routes/documents";
import { registerAdminRoutes } from "./routes/admin";
import { registerExportRoutes } from "./routes/exports";
import { registerBillingRoutes } from "./routes/billing";

const config = loadConfig();
const storage = createStorage(config);
const replicate = createReplicateProvider(config.models);
const workerQueue = createWorkerQueue(config);

const app = new Hono<Bindings>();

app.use("*", cors());
app.use("*", async (c, next) => {
  c.set("config", config);
  c.set("storage", storage);
  c.set("replicate", replicate);
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

/** Health check endpoint. */
app.get("/api/health", (c) => c.json({ ok: true }));

app.onError(errorHandler);

export default app;
export type { Bindings as AppBindings };
