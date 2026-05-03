import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { verifyWebhookSignature, parseIncomingMessage } from "$lib/server/whatsapp.js";

describe("verifyWebhookSignature", () => {
  const secret = "test-app-secret";
  const payload = '{"entry":[]}';

  function sign(body: string, key: string): string {
    return "sha256=" + crypto.createHmac("sha256", key).update(body).digest("hex");
  }

  it("returns true for valid signature", () => {
    const sig = sign(payload, secret);
    expect(verifyWebhookSignature(payload, sig, secret)).toBe(true);
  });

  it("returns false for null signature", () => {
    expect(verifyWebhookSignature(payload, null, secret)).toBe(false);
  });

  it("returns false for wrong signature", () => {
    const sig = sign(payload, "wrong-secret");
    expect(verifyWebhookSignature(payload, sig, secret)).toBe(false);
  });

  it("returns false for tampered body", () => {
    const sig = sign(payload, secret);
    expect(verifyWebhookSignature('{"entry":[1]}', sig, secret)).toBe(false);
  });
});

describe("parseIncomingMessage", () => {
  it("parses a valid WhatsApp webhook payload", () => {
    const body = {
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "12345" },
                messages: [
                  {
                    from: "919876543210",
                    id: "msg-001",
                    timestamp: "1700000000",
                    type: "text",
                    text: { body: "Hello" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const result = parseIncomingMessage(body);
    expect(result).not.toBeNull();
    expect(result!.from).toBe("919876543210");
    expect(result!.phoneNumberId).toBe("12345");
    expect(result!.text?.body).toBe("Hello");
    expect(result!.type).toBe("text");
  });

  it("returns null for empty messages array", () => {
    const body = {
      entry: [{ changes: [{ value: { metadata: {}, messages: [] } }] }],
    };
    expect(parseIncomingMessage(body)).toBeNull();
  });

  it("returns null for missing messages", () => {
    const body = { entry: [{ changes: [{ value: { metadata: {} } }] }] };
    expect(parseIncomingMessage(body)).toBeNull();
  });

  it("returns null for garbage input", () => {
    expect(parseIncomingMessage({})).toBeNull();
    expect(parseIncomingMessage({ entry: null } as any)).toBeNull();
  });
});
