/**
 * Payment checkout and webhook routes.
 */
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
  app.post("/api/billing/webhooks/stripe", (c) => {
    return c.json({ received: true });
  });
}
