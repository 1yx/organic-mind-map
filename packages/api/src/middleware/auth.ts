/**
 * Session/auth middleware.
 *
 * Phase 2 production SSO is still provider-specific; this middleware resolves
 * the authenticated user from a backend session cookie or equivalent internal
 * header and leaves route-level guards to require authentication.
 */
import type { Context, Next } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Bindings } from "../types";

/** Cookie/header names accepted by the API auth boundary. */
export const SESSION_USER_ID_COOKIE = "omm_user_id";

/** Signs a session user ID for the backend-owned auth cookie. */
export function signSessionUserId(userId: string, secret: string): string {
  return createHmac("sha256", secret).update(userId).digest("base64url");
}

/** Builds a signed session cookie value. */
export function createSessionCookieValue(userId: string, secret: string) {
  return `${encodeURIComponent(userId)}.${signSessionUserId(userId, secret)}`;
}

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

function verifySessionCookie(value: string, secret: string): string | null {
  const separator = value.lastIndexOf(".");
  if (separator === -1) return null;

  const encodedUserId = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const userId = decodeURIComponent(encodedUserId);
  const expected = signSessionUserId(userId, secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.byteLength !== expectedBuffer.byteLength) return null;
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  return userId;
}

/** Resolves the current authenticated user into Hono context. */
export async function authMiddleware(c: Context<Bindings>, next: Next) {
  const storage = c.get("storage");
  const cookies = parseCookieHeader(c.req.header("cookie") ?? null);
  const sessionCookie = cookies[SESSION_USER_ID_COOKIE];
  const userId = sessionCookie
    ? verifySessionCookie(sessionCookie, c.get("config").auth.sessionSecret)
    : null;

  if (!userId) {
    c.set("user", null);
    await next();
    return;
  }

  c.set("user", await storage.getUser(userId));
  await next();
}
