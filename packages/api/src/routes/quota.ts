/**
 * Quota read routes.
 */
import type { AppHono } from "../types";
import { ok } from "../envelope/index";
import { AppError } from "../errors/index";

/** Registers quota routes on the app. */
export function registerQuotaRoutes(app: AppHono) {
  /** Returns the current user's quota balance. */
  app.get("/api/quota", (c) => {
    const user = c.get("user");
    if (!user) throw new AppError("unauthorized", "Authentication required.");
    return c.json(
      ok(
        {
          plan: user.plan,
          generation: { remaining: 10, reserved: 0, resetAt: null },
          exports: { png: true, svg: false, debugBundle: false },
          upgradeRequired: false,
        },
        c.get("requestId"),
      ),
    );
  });
}
