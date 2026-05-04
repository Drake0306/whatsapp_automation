import { json, text } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import {
  verifyWebhookSignature,
  parseIncomingMessage,
  sendWhatsAppMessage,
  sendWhatsAppInteractiveList,
  sendWhatsAppReplyButtons,
} from "$lib/server/whatsapp.js";
import { db } from "$lib/server/db/index.js";
import { businesses, conversations, messages, escalations, businessToneConfig, contacts } from "$lib/server/db/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { routeMessage } from "$lib/skills/router.js";
import type { SkillContext } from "$lib/skills/types.js";
import { env } from "$env/dynamic/private";

export const GET: RequestHandler = async ({ url }) => {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN) {
    return text(challenge ?? "", { status: 200 });
  }

  return json({ error: "Forbidden" }, { status: 403 });
};

export const POST: RequestHandler = async ({ request }) => {
  const rawBody = await request.text();
  console.log("[webhook] POST received, body:", rawBody.substring(0, 500));

  const signature = request.headers.get("x-hub-signature-256");
  const appSecret = env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.warn("[webhook] WHATSAPP_APP_SECRET not set — signature verification disabled");
  } else if (!verifyWebhookSignature(rawBody, signature, appSecret)) {
    console.error("[webhook] Invalid signature — rejecting");
    return json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }
  const incoming = parseIncomingMessage(body);

  if (!incoming) {
    console.log("[webhook] No message in payload (status update or other event)");
    return json({ status: "no_message" }, { status: 200 });
  }

  console.log(`[webhook] Message from ${incoming.from}: "${incoming.text?.body ?? "(non-text)"}" | phoneNumberId: ${incoming.phoneNumberId}`);

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.whatsappPhoneNumberId, incoming.phoneNumberId))
    .limit(1);

  if (!business) {
    console.warn(
      `[webhook] No business found for phone_number_id: ${incoming.phoneNumberId}`,
    );
    return json({ status: "unknown_business" }, { status: 200 });
  }

  console.log(`[webhook] Matched business: ${business.name} (${business.id})`);

  let [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.businessId, business.id),
        eq(conversations.customerPhone, incoming.from),
      ),
    )
    .limit(1);

  if (!conversation) {
    await db.insert(conversations).values({
      businessId: business.id,
      customerPhone: incoming.from,
      lastMessageAt: new Date(),
    });

    [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.businessId, business.id),
          eq(conversations.customerPhone, incoming.from),
        ),
      )
      .limit(1);

    const [existingContact] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(
        and(
          eq(contacts.businessId, business.id),
          eq(contacts.phone, incoming.from),
        ),
      )
      .limit(1);

    if (!existingContact) {
      await db.insert(contacts).values({
        businessId: business.id,
        phone: incoming.from,
        source: "whatsapp",
      });
    }
  }

  await db.insert(messages).values({
    conversationId: conversation.id,
    direction: "in",
    role: "customer",
    text: incoming.text?.body ?? null,
    raw: body,
  });

  const [customerMsg] = await db
    .select({ id: messages.id })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversation.id),
        eq(messages.direction, "in"),
      ),
    )
    .orderBy(sql`${messages.createdAt} desc`)
    .limit(1);

  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, conversation.id));

  const messageText = incoming.text?.body ?? "";
  const interactiveId = incoming.interactive?.id;

  const [tone] = await db
    .select()
    .from(businessToneConfig)
    .where(eq(businessToneConfig.businessId, business.id))
    .limit(1);

  const recentMessages = await db
    .select({ role: messages.role, text: messages.text })
    .from(messages)
    .where(eq(messages.conversationId, conversation.id))
    .orderBy(sql`${messages.createdAt} desc`)
    .limit(10);

  const history = recentMessages
    .reverse()
    .filter((m) => m.text)
    .map((m) => ({
      role: m.role as "customer" | "bot",
      text: m.text!,
    }));

  const ctx: SkillContext = {
    businessId: business.id,
    businessName: business.name,
    vertical: business.vertical,
    language: business.language,
    timezone: business.timezone,
    customerPhone: incoming.from,
    conversationId: conversation.id,
    conversationState: (conversation.state as Record<string, unknown>) ?? {},
    history,
    tone: tone ?? null,
  };

  let result;
  try {
    console.log(`[webhook] Routing message to skill router...`);
    result = await routeMessage({ text: messageText, raw: body, interactiveId }, ctx);
    console.log(`[webhook] Skill result: skill=${result.skillId}, confidence=${result.confidence}, hasReply=${!!result.reply}`);
  } catch (err) {
    console.error("[webhook] routeMessage failed:", err);
    return json({ status: "ok" }, { status: 200 });
  }

  if (result.reply || result.interactive) {
    let sent = false;
    const replyText = result.reply ?? result.interactive?.bodyText ?? "";

    if (result.interactive?.type === "list") {
      console.log(`[webhook] Sending interactive list to ${incoming.from}`);
      sent = await sendWhatsAppInteractiveList(
        incoming.phoneNumberId,
        incoming.from,
        result.interactive.bodyText,
        result.interactive.buttonText,
        result.interactive.sections,
        result.interactive.headerText,
        result.interactive.footerText,
      );
      if (!sent) {
        sent = await sendWhatsAppMessage(incoming.phoneNumberId, incoming.from, replyText);
      }
    } else if (result.interactive?.type === "buttons") {
      console.log(`[webhook] Sending reply buttons to ${incoming.from}`);
      sent = await sendWhatsAppReplyButtons(
        incoming.phoneNumberId,
        incoming.from,
        result.interactive.bodyText,
        result.interactive.buttons,
        result.interactive.headerText,
        result.interactive.footerText,
      );
      if (!sent) {
        sent = await sendWhatsAppMessage(incoming.phoneNumberId, incoming.from, replyText);
      }
    } else if (result.reply) {
      console.log(`[webhook] Sending reply (${result.reply.length} chars) to ${incoming.from}`);
      sent = await sendWhatsAppMessage(incoming.phoneNumberId, incoming.from, result.reply);
    }
    console.log(`[webhook] send result: ${sent ? "SUCCESS" : "FAILED"}`);

    await db.insert(messages).values({
      conversationId: conversation.id,
      direction: "out",
      role: "bot",
      text: replyText,
      skillId: result.skillId,
      needsReview: result.needsReview ?? false,
    });

    if (result.needsReview && customerMsg) {
      await db.insert(escalations).values({
        businessId: business.id,
        messageId: customerMsg.id,
        proposedReply: replyText,
        confidence: result.confidence,
      });
    }
  }

  return json({ status: "ok" }, { status: 200 });
};
