/**
 * Session and authentication routes.
 */
import type { AppHono } from "../types";
import { ok } from "../envelope/index";

/** Registers session and auth routes on the app. */
export function registerSessionRoutes(app: AppHono) {
  /** Returns the current session state. */
  app.get("/api/session", (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json(
        ok({ authenticated: false, user: null }, c.get("requestId")),
      );
    }
    return c.json(
      ok(
        {
          authenticated: true,
          user: { id: user.id, email: user.email, name: user.name },
        },
        c.get("requestId"),
      ),
    );
  });

  /** Logs the current user out. */
  app.post("/api/auth/logout", (c) => {
    return c.json(ok({ loggedOut: true }, c.get("requestId")));
  });
}
