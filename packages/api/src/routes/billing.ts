/**
 * Payment checkout and webhook routes.
 */
/* eslint-disable complexity, max-lines-per-function */
import type { AppHono } from "../types";
import { ok } from "../envelope/index";
import { AppError } from "../errors/index";

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
    const body: Record<string, unknown> = await c.req.json();
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
