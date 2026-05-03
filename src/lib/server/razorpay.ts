import Razorpay from "razorpay";
import crypto from "node:crypto";
import { env } from "$env/dynamic/private";

let _instance: InstanceType<typeof Razorpay> | null = null;

export function getRazorpay() {
  if (!_instance) {
    const keyId = env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
    }
    _instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return _instance;
}

export const PLANS = {
  starter: {
    id: "starter",
    name: "Starter",
    amount: 99900, // ₹999 in paise
    description: "1 WhatsApp number, 500 convos/mo",
  },
  pro: {
    id: "pro",
    name: "Pro",
    amount: 249900, // ₹2,499 in paise
    description: "Unlimited convos, calendar sync, analytics",
  },
  multi: {
    id: "multi",
    name: "Multi-Vertical",
    amount: 399900, // ₹3,999 in paise
    description: "2 vertical packs",
  },
} as const;

export type PlanId = keyof typeof PLANS;

export async function createSubscription(
  planRazorpayId: string,
  customerEmail: string,
  customerName: string,
) {
  const rz = getRazorpay();

  const customer = await rz.customers.create({
    name: customerName,
    email: customerEmail,
  });

  const subscription = await rz.subscriptions.create({
    plan_id: planRazorpayId,
    total_count: 12,
    customer_notify: 1,
  } as Parameters<typeof rz.subscriptions.create>[0]);

  return { subscription, customer };
}

export function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(signature, "hex"),
  );
}
