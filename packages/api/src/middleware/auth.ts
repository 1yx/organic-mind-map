/**
 * Session/auth middleware.
 *
 * Phase 2 production SSO is still provider-specific; this middleware resolves
 * the authenticated user from a backend session cookie or equivalent internal
 * header and leaves route-level guards to require authentication.
 */
import type { Context, Next } from "hono";
import type { Bindings } from "../types";

/** Cookie/header names accepted by the API auth boundary. */
export const SESSION_USER_ID_COOKIE = "omm_user_id";
export const SESSION_USER_ID_HEADER = "x-omm-user-id";

/** Parses a Cookie header into a small key/value map. */
function parseCookieHeader(header: string | null): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        if (separator === -1) return [part, ""];
        return [
          decodeURIComponent(part.slice(0, separator)),
          decodeURIComponent(part.slice(separator + 1)),
        ];
      }),
  );
}

/** Resolves the current authenticated user into Hono context. */
export async function authMiddleware(c: Context<Bindings>, next: Next) {
  const storage = c.get("storage");
  const headerUserId = c.req.header(SESSION_USER_ID_HEADER);
  const cookies = parseCookieHeader(c.req.header("cookie") ?? null);
  const userId = headerUserId ?? cookies[SESSION_USER_ID_COOKIE];

  if (!userId) {
    c.set("user", null);
    await next();
    return;
  }

  c.set("user", await storage.getUser(userId));
  await next();
}
