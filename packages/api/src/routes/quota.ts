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
    const remaining = user.generationQuotaRemaining ?? 10;
    const reserved = user.generationQuotaReserved ?? 0;
    return c.json(
      ok(
        {
          plan: user.plan,
          generation: { remaining, reserved, resetAt: null },
          exports: {
            png: true,
            svg: user.plan === "paid",
            debugBundle: user.role === "admin",
          },
          upgradeRequired: user.plan !== "paid" && remaining <= 0,
        },
        c.get("requestId"),
      ),
    );
  });
}
