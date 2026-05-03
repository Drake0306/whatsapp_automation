import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { verifyWebhookSignature } from "$lib/server/razorpay.js";
import { db } from "$lib/server/db/index.js";
import { subscriptions } from "$lib/server/db/schema.js";
import { eq } from "drizzle-orm";
import { env } from "$env/dynamic/private";

export const POST: RequestHandler = async ({ request }) => {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const secret = env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.warn("[razorpay] RAZORPAY_WEBHOOK_SECRET not set — signature verification disabled");
  } else if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }
  const eventType = event.event as string;
  const payload = event.payload as Record<string, Record<string, Record<string, unknown>>> | undefined;
  const subEntity = payload?.subscription?.entity;
  const subId = subEntity?.id as string | undefined;

  if (!subId) {
    return json({ status: "ok" });
  }

  if (eventType === "subscription.activated" || eventType === "subscription.charged") {
    const currentEnd = subEntity?.current_end as number | undefined;
    await db
      .update(subscriptions)
      .set({
        status: "active",
        currentPeriodEnd: currentEnd ? new Date(currentEnd * 1000) : null,
      })
      .where(eq(subscriptions.razorpaySubscriptionId, subId));
  }

  if (eventType === "subscription.cancelled" || eventType === "subscription.expired") {
    await db
      .update(subscriptions)
      .set({ status: "cancelled" })
      .where(eq(subscriptions.razorpaySubscriptionId, subId));
  }

  return json({ status: "ok" });
};
