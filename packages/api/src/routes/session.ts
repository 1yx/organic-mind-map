/**
 * Session and authentication routes.
 */
import type { AppHono } from "../types";
import { ok } from "../envelope/index";
import { SESSION_USER_ID_COOKIE } from "../middleware/auth";

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
    c.header(
      "Set-Cookie",
      `${SESSION_USER_ID_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`,
    );
    return c.json(ok({ loggedOut: true }, c.get("requestId")));
  });
}
