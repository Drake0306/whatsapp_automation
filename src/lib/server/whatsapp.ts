import crypto from "node:crypto";
import { env } from "$env/dynamic/private";

export type WhatsAppMode = "bsp" | "direct";

interface WhatsAppConfig {
  mode: WhatsAppMode;
  apiToken: string;
  apiUrl: string;
}

function getConfig(): WhatsAppConfig {
  const mode = (env.WHATSAPP_MODE || "bsp") as WhatsAppMode;
  const apiToken = env.WHATSAPP_API_TOKEN || "";

  const apiUrl =
    mode === "direct"
      ? env.WHATSAPP_API_URL || "https://graph.facebook.com/v22.0"
      : env.WHATSAPP_BSP_API_URL || env.WHATSAPP_API_URL || "https://graph.facebook.com/v22.0";

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

export interface InteractiveReply {
  type: "list_reply" | "button_reply";
  id: string;
  title: string;
  description?: string;
}

export interface WhatsAppIncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  interactive?: InteractiveReply;
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
    const msgType = msg.type as string;

    let textBody = msg.text as { body: string } | undefined;
    let interactiveReply: InteractiveReply | undefined;

    if (msgType === "interactive") {
      const ir = msg.interactive as Record<string, Record<string, string>> | undefined;
      if (ir?.list_reply) {
        interactiveReply = { type: "list_reply", id: ir.list_reply.id, title: ir.list_reply.title, description: ir.list_reply.description };
        textBody = { body: ir.list_reply.title };
      } else if (ir?.button_reply) {
        interactiveReply = { type: "button_reply", id: ir.button_reply.id, title: ir.button_reply.title };
        textBody = { body: ir.button_reply.title };
      }
    }

    return {
      from: msg.from as string,
      id: msg.id as string,
      timestamp: msg.timestamp as string,
      type: msgType,
      text: textBody,
      interactive: interactiveReply,
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

export interface InteractiveListRow {
  id: string;
  title: string;
  description?: string;
}

export interface InteractiveListSection {
  title: string;
  rows: InteractiveListRow[];
}

export async function sendWhatsAppInteractiveList(
  phoneNumberId: string,
  to: string,
  bodyText: string,
  buttonText: string,
  sections: InteractiveListSection[],
  headerText?: string,
  footerText?: string,
): Promise<boolean> {
  const config = getConfig();
  if (!config.apiToken) {
    console.error("[whatsapp] API token not configured");
    return false;
  }

  const interactive: Record<string, unknown> = {
    type: "list",
    body: { text: bodyText },
    action: { button: buttonText, sections },
  };
  if (headerText) interactive.header = { type: "text", text: headerText };
  if (footerText) interactive.footer = { text: footerText };

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
      type: "interactive",
      interactive,
    }),
  });

  if (!response.ok) {
    console.error("[whatsapp] interactive list send failed:", response.status, await response.text());
    return false;
  }
  return true;
}

export interface ReplyButton {
  id: string;
  title: string;
}

export async function sendWhatsAppReplyButtons(
  phoneNumberId: string,
  to: string,
  bodyText: string,
  buttons: ReplyButton[],
  headerText?: string,
  footerText?: string,
): Promise<boolean> {
  const config = getConfig();
  if (!config.apiToken) {
    console.error("[whatsapp] API token not configured");
    return false;
  }

  const interactive: Record<string, unknown> = {
    type: "button",
    body: { text: bodyText },
    action: {
      buttons: buttons.slice(0, 3).map((b) => ({
        type: "reply",
        reply: { id: b.id, title: b.title.slice(0, 20) },
      })),
    },
  };
  if (headerText) interactive.header = { type: "text", text: headerText };
  if (footerText) interactive.footer = { text: footerText };

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
      type: "interactive",
      interactive,
    }),
  });

  if (!response.ok) {
    console.error("[whatsapp] reply buttons send failed:", response.status, await response.text());
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
