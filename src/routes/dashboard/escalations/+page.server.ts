import { redirect, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types.js";
import { db } from "$lib/server/db/index.js";
import {
  businesses,
  escalations,
  messages,
  conversations,
} from "$lib/server/db/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { sendWhatsAppMessage } from "$lib/server/whatsapp.js";

export const load: PageServerLoad = async (event) => {
  const session = await event.locals.auth();
  if (!session?.user?.id) throw redirect(303, "/auth");

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerUserId, session.user.id))
    .limit(1);

  if (!business) throw redirect(303, "/onboarding");

  const pending = await db
    .select({
      id: escalations.id,
      proposedReply: escalations.proposedReply,
      confidence: escalations.confidence,
      status: escalations.status,
      createdAt: escalations.createdAt,
      messageId: escalations.messageId,
    })
    .from(escalations)
    .where(
      and(
        eq(escalations.businessId, business.id),
        eq(escalations.status, "pending"),
      ),
    )
    .orderBy(sql`${escalations.createdAt} desc`)
    .limit(50);

  const enriched = [];
  for (const esc of pending) {
    const [msg] = await db
      .select({
        text: messages.text,
        conversationId: messages.conversationId,
      })
      .from(messages)
      .where(eq(messages.id, esc.messageId))
      .limit(1);

    let customerPhone = "";
    if (msg) {
      const [convo] = await db
        .select({ customerPhone: conversations.customerPhone })
        .from(conversations)
        .where(eq(conversations.id, msg.conversationId))
        .limit(1);
      customerPhone = convo?.customerPhone ?? "";
    }

    enriched.push({
      ...esc,
      customerMessage: msg?.text ?? "",
      customerPhone,
      conversationId: msg?.conversationId ?? "",
    });
  }

  return { session, business, escalations: enriched };
};

export const actions: Actions = {
  approve: async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401);

    const form = await request.formData();
    const escalationId = form.get("escalationId") as string;

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(403);

    const [esc] = await db
      .select()
      .from(escalations)
      .where(
        and(
          eq(escalations.id, escalationId),
          eq(escalations.businessId, business.id),
        ),
      )
      .limit(1);

    if (!esc) return fail(404);

    if (!business?.whatsappPhoneNumberId) {
      return fail(400, { error: "WhatsApp not connected" });
    }

    const [msg] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, esc.messageId))
      .limit(1);

    if (msg) {
      const [convo] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, msg.conversationId))
        .limit(1);

      if (convo) {
        await sendWhatsAppMessage(
          business.whatsappPhoneNumberId,
          convo.customerPhone,
          esc.proposedReply,
        );
      }
    }

    await db
      .update(escalations)
      .set({ status: "approved", reviewedAt: new Date() })
      .where(eq(escalations.id, escalationId));

    return { success: true };
  },

  rewrite: async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401);

    const form = await request.formData();
    const escalationId = form.get("escalationId") as string;
    const newReply = form.get("newReply") as string;

    if (!newReply) return fail(400, { error: "Reply text required" });

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(403);

    const [esc] = await db
      .select()
      .from(escalations)
      .where(
        and(
          eq(escalations.id, escalationId),
          eq(escalations.businessId, business.id),
        ),
      )
      .limit(1);

    if (!esc) return fail(404);

    if (!business?.whatsappPhoneNumberId) {
      return fail(400, { error: "WhatsApp not connected" });
    }

    const [msg] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, esc.messageId))
      .limit(1);

    if (msg) {
      const [convo] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, msg.conversationId))
        .limit(1);

      if (convo) {
        await sendWhatsAppMessage(
          business.whatsappPhoneNumberId,
          convo.customerPhone,
          newReply,
        );
      }
    }

    await db
      .update(escalations)
      .set({ status: "rewritten", proposedReply: newReply, reviewedAt: new Date() })
      .where(eq(escalations.id, escalationId));

    return { success: true };
  },

  skip: async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401);

    const form = await request.formData();
    const escalationId = form.get("escalationId") as string;

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(403);

    await db
      .update(escalations)
      .set({ status: "skipped", reviewedAt: new Date() })
      .where(
        and(
          eq(escalations.id, escalationId),
          eq(escalations.businessId, business.id),
        ),
      );

    return { success: true };
  },
};
