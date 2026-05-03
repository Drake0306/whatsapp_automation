import crypto from "node:crypto";

export type WhatsAppMode = "bsp" | "direct";

interface WhatsAppConfig {
  mode: WhatsAppMode;
  apiToken: string;
  apiUrl: string;
}

function getConfig(): WhatsAppConfig {
  const mode = (process.env.WHATSAPP_MODE || "bsp") as WhatsAppMode;
  const apiToken = process.env.WHATSAPP_API_TOKEN || "";

  const apiUrl =
    mode === "direct"
      ? process.env.WHATSAPP_API_URL || "https://graph.facebook.com/v21.0"
      : process.env.WHATSAPP_BSP_API_URL || process.env.WHATSAPP_API_URL || "https://graph.facebook.com/v20.0";

  return { mode, apiToken, apiUrl };
}

export function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  appSecret: string,
): boolean {
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(payload)
    .digest("hex");

  const provided = signature.replace("sha256=", "");
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(provided, "hex"),
  );
}

export interface WhatsAppIncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  phoneNumberId: string;
}

export function parseIncomingMessage(
  body: Record<string, unknown>,
): WhatsAppIncomingMessage | null {
  try {
    const entry = (body.entry as Array<Record<string, unknown>>)?.[0];
    const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
    const value = changes?.value as Record<string, unknown>;
    const metadata = value?.metadata as Record<string, string>;
    const messageList = value?.messages as Array<Record<string, unknown>>;

    if (!messageList || messageList.length === 0) return null;

    const msg = messageList[0];
    return {
      from: msg.from as string,
      id: msg.id as string,
      timestamp: msg.timestamp as string,
      type: msg.type as string,
      text: msg.text as { body: string } | undefined,
      phoneNumberId: metadata?.phone_number_id ?? "",
    };
  } catch {
    return null;
  }
}

export async function sendWhatsAppMessage(
  phoneNumberId: string,
  to: string,
  text: string,
): Promise<boolean> {
  const config = getConfig();

  if (!config.apiToken) {
    console.error("[whatsapp] API token not configured");
    return false;
  }

  const url = `${config.apiUrl}/${phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!response.ok) {
    console.error(
      "[whatsapp] send failed:",
      response.status,
      await response.text(),
    );
    return false;
  }

  return true;
}

export async function sendWhatsAppTemplate(
  phoneNumberId: string,
  to: string,
  templateName: string,
  languageCode: string,
  components?: unknown[],
): Promise<boolean> {
  const config = getConfig();

  if (!config.apiToken) {
    console.error("[whatsapp] API token not configured");
    return false;
  }

  const url = `${config.apiUrl}/${phoneNumberId}/messages`;
  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
    },
  };

  if (components) {
    (body.template as Record<string, unknown>).components = components;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    console.error(
      "[whatsapp] template send failed:",
      response.status,
      await response.text(),
    );
    return false;
  }

  return true;
}

export async function markMessageRead(
  phoneNumberId: string,
  messageId: string,
): Promise<void> {
  const config = getConfig();
  if (!config.apiToken) return;

  const url = `${config.apiUrl}/${phoneNumberId}/messages`;
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  }).catch(() => {});
}
