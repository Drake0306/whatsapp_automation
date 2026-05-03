import { json, text } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import {
  verifyWebhookSignature,
  parseIncomingMessage,
  sendWhatsAppMessage,
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

  const signature = request.headers.get("x-hub-signature-256");
  const appSecret = env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.warn("[webhook] WHATSAPP_APP_SECRET not set — signature verification disabled");
  } else if (!verifyWebhookSignature(rawBody, signature, appSecret)) {
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
    return json({ status: "no_message" }, { status: 200 });
  }

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

  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, conversation.id));

  const messageText = incoming.text?.body ?? "";

  const [tone] = await db
    .select()
    .from(businessToneConfig)
    .where(eq(businessToneConfig.businessId, business.id))
    .limit(1);

  const ctx: SkillContext = {
    businessId: business.id,
    businessName: business.name,
    vertical: business.vertical,
    language: business.language,
    customerPhone: incoming.from,
    conversationId: conversation.id,
    conversationState: (conversation.state as Record<string, unknown>) ?? {},
    tone: tone ?? null,
  };

  const result = await routeMessage({ text: messageText, raw: body }, ctx);

  if (result.reply) {
    await sendWhatsAppMessage(
      incoming.phoneNumberId,
      incoming.from,
      result.reply,
    );

    await db.insert(messages).values({
      conversationId: conversation.id,
      direction: "out",
      role: "bot",
      text: result.reply,
      skillId: result.skillId,
      needsReview: result.needsReview ?? false,
    });

    if (result.needsReview) {
      const [lastMsg] = await db
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(sql`${messages.createdAt} desc`)
        .limit(1);

      if (lastMsg) {
        await db.insert(escalations).values({
          businessId: business.id,
          messageId: lastMsg.id,
          proposedReply: result.reply,
          confidence: result.confidence,
        });
      }
    }
  }

  return json({ status: "ok" }, { status: 200 });
};
