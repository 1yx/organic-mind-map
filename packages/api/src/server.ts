/**
 * Development server entrypoint.
 *
 * Starts the Hono app using the Node.js HTTP adapter.
 * Production deployments may use a different adapter.
 */
import { serve } from "@hono/node-server";
import app from "./app";
import { loadConfig } from "./config/index";

const config = loadConfig();

serve(
  {
    fetch: app.fetch,
    port: config.server.port,
    hostname: config.server.host,
  },
  (info) => {
    console.log(
      `OMM API server running at http://${info.address}:${info.port}`,
    );
  },
);
