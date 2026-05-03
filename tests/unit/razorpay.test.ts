import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { verifyWebhookSignature, PLANS } from "$lib/server/razorpay.js";

describe("Razorpay verifyWebhookSignature", () => {
  const secret = "rzp-webhook-secret";
  const body = '{"event":"subscription.activated"}';

  function sign(b: string, s: string): string {
    return crypto.createHmac("sha256", s).update(b).digest("hex");
  }

  it("returns true for valid signature", () => {
    const sig = sign(body, secret);
    expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
  });

  it("returns false for null signature", () => {
    expect(verifyWebhookSignature(body, null, secret)).toBe(false);
  });

  it("returns false for wrong secret", () => {
    const sig = sign(body, "wrong");
    expect(verifyWebhookSignature(body, sig, secret)).toBe(false);
  });
});

describe("PLANS", () => {
  it("has all three plans", () => {
    expect(Object.keys(PLANS)).toEqual(["starter", "pro", "multi"]);
  });

  it("starter is ₹999", () => {
    expect(PLANS.starter.amount).toBe(99900);
  });

  it("pro is ₹2499", () => {
    expect(PLANS.pro.amount).toBe(249900);
  });

  it("multi is ₹3999", () => {
    expect(PLANS.multi.amount).toBe(399900);
  });
});
