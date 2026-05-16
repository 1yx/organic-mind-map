/**
 * Payment checkout and webhook routes.
 */
/* eslint-disable complexity, max-lines-per-function */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { AppHono } from "../types";
import { ok } from "../envelope/index";
import { AppError } from "../errors/index";

function extractStripeSignature(header: string | undefined): {
  timestamp: string;
  signature: string;
} | null {
  if (!header) return null;
  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    }),
  );
  if (!parts.t || !parts.v1) return null;
  return { timestamp: parts.t, signature: parts.v1 };
}

function verifyStripeSignature(params: {
  payload: string;
  header: string | undefined;
  secret: string | undefined;
}): void {
  if (!params.secret) {
    throw new AppError("provider_failed", "STRIPE_WEBHOOK_SECRET is required.");
  }
  const parsed = extractStripeSignature(params.header);
  if (!parsed) {
    throw new AppError("unauthorized", "Invalid Stripe webhook signature.");
  }
  const signedPayload = `${parsed.timestamp}.${params.payload}`;
  const expected = createHmac("sha256", params.secret)
    .update(signedPayload)
    .digest("hex");
  const actualBuffer = Buffer.from(parsed.signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.byteLength !== expectedBuffer.byteLength ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new AppError("unauthorized", "Invalid Stripe webhook signature.");
  }
}

/** Registers billing routes on the app. */
export function registerBillingRoutes(app: AppHono) {
  /** Creates a Stripe checkout session stub. */
  app.post("/api/billing/checkout-session", async (c) => {
    const user = c.get("user");
    if (!user) throw new AppError("unauthorized", "Authentication required.");

    const body: Record<string, unknown> = await c.req.json();
    if (!body?.priceId) {
      throw new AppError("validation_failed", "priceId is required.");
    }

    return c.json(
      ok(
        { checkoutUrl: "https://checkout.stripe.com/stub-session" },
        c.get("requestId"),
      ),
    );
  });

  /** Receives Stripe webhook events. */
  app.post("/api/billing/webhooks/stripe", async (c) => {
    const rawBody = await c.req.text();
    verifyStripeSignature({
      payload: rawBody,
      header: c.req.header("stripe-signature"),
      secret: c.get("config").payment.stripeWebhookSecret,
    });
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const eventId =
      typeof body.id === "string"
        ? body.id
        : typeof body.eventId === "string"
          ? body.eventId
          : undefined;
    const userId = typeof body.userId === "string" ? body.userId : undefined;
    const eventType = typeof body.type === "string" ? body.type : undefined;

    if (!eventId || !userId || !eventType) {
      throw new AppError(
        "validation_failed",
        "id, userId, and type are required.",
      );
    }

    const storage = c.get("storage");
    const user = await storage.getUser(userId);
    if (!user) throw new AppError("not_found", "User not found.");
    const processed = user.processedPaymentEventIds ?? [];
    if (processed.includes(eventId)) {
      return c.json(
        ok({ received: true, duplicate: true }, c.get("requestId")),
      );
    }

    if (eventType === "checkout.session.completed") {
      await storage.updateUser(userId, {
        plan: "paid",
        generationQuotaRemaining: Math.max(
          user.generationQuotaRemaining ?? 0,
          100,
        ),
        processedPaymentEventIds: [...processed, eventId],
      });
    } else {
      await storage.updateUser(userId, {
        processedPaymentEventIds: [...processed, eventId],
      });
    }

    return c.json(ok({ received: true, duplicate: false }, c.get("requestId")));
  });
}
