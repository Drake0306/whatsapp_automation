import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { db } from "$lib/server/db/index.js";
import { appointments, businesses, conversations } from "$lib/server/db/schema.js";
import { eq, and, isNull, lte, gte, sql } from "drizzle-orm";
import { sendWhatsAppMessage } from "$lib/server/whatsapp.js";

const CRON_SECRET = process.env.CRON_SECRET;

export const POST: RequestHandler = async ({ request }) => {
  const auth = request.headers.get("authorization");
  if (!CRON_SECRET) {
    console.warn("[cron] CRON_SECRET not set — endpoint is unprotected");
  } else if (auth !== `Bearer ${CRON_SECRET}`) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let sent = 0;

  // ── 24h reminders ──
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const due24h = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.status, "confirmed"),
        lte(appointments.slotAt, in24h),
        gte(appointments.slotAt, now),
        isNull(appointments.reminder24hSentAt),
      ),
    );

  for (const appt of due24h) {
    const [biz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, appt.businessId))
      .limit(1);

    if (!biz?.whatsappPhoneNumberId) continue;

    const d = new Date(appt.slotAt);
    const dateStr = d.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "short",
    });
    const timeStr = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const msg = `Reminder: You have a *${appt.service ?? "appointment"}* at *${biz.name}* tomorrow, *${dateStr}* at *${timeStr}*. See you then!`;

    const ok = await sendWhatsAppMessage(
      biz.whatsappPhoneNumberId,
      appt.customerPhone,
      msg,
    );

    if (ok) {
      await db
        .update(appointments)
        .set({ reminder24hSentAt: now })
        .where(eq(appointments.id, appt.id));
      sent++;
    }
  }

  // ── 2h reminders ──
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const due2h = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.status, "confirmed"),
        lte(appointments.slotAt, in2h),
        gte(appointments.slotAt, now),
        isNull(appointments.reminder2hSentAt),
      ),
    );

  for (const appt of due2h) {
    const [biz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, appt.businessId))
      .limit(1);

    if (!biz?.whatsappPhoneNumberId) continue;

    const timeStr = new Date(appt.slotAt).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const msg = `Quick reminder: Your *${appt.service ?? "appointment"}* at *${biz.name}* is in about 2 hours (${timeStr}). See you soon!`;

    const ok = await sendWhatsAppMessage(
      biz.whatsappPhoneNumberId,
      appt.customerPhone,
      msg,
    );

    if (ok) {
      await db
        .update(appointments)
        .set({ reminder2hSentAt: now })
        .where(eq(appointments.id, appt.id));
      sent++;
    }
  }

  // ── 30-day rebook nudges ──
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const rebookDue = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.status, "completed"),
        lte(appointments.slotAt, thirtyDaysAgo),
        isNull(appointments.rebookNudgeSentAt),
      ),
    );

  for (const appt of rebookDue) {
    const [biz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, appt.businessId))
      .limit(1);

    if (!biz?.whatsappPhoneNumberId) continue;

    const msg = `Hi! It's been a while since your last visit to *${biz.name}*. Ready to book your next ${appt.service ?? "appointment"}? Just reply here and I'll find a time that works for you!`;

    const ok = await sendWhatsAppMessage(
      biz.whatsappPhoneNumberId,
      appt.customerPhone,
      msg,
    );

    if (ok) {
      await db
        .update(appointments)
        .set({ rebookNudgeSentAt: now })
        .where(eq(appointments.id, appt.id));
      sent++;
    }
  }

  // ── Cold lead nudges (3/7/14 days) ──
  for (const days of [3, 7, 14]) {
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const cutoffEnd = new Date(cutoff.getTime() + 15 * 60 * 1000); // 15 min window

    const staleConvos = await db
      .select()
      .from(conversations)
      .where(
        and(
          lte(conversations.lastMessageAt, cutoffEnd),
          gte(conversations.lastMessageAt, cutoff),
        ),
      );

    for (const convo of staleConvos) {
      const hasBooking = await db
        .select({ id: appointments.id })
        .from(appointments)
        .where(eq(appointments.conversationId, convo.id))
        .limit(1);

      if (hasBooking.length > 0) continue;

      const [biz] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, convo.businessId))
        .limit(1);

      if (!biz?.whatsappPhoneNumberId) continue;

      const msgs: Record<number, string> = {
        3: `Hi! We noticed you reached out to *${biz.name}* recently. Still interested? I can help you book an appointment or answer any questions!`,
        7: `Hey! Just checking in from *${biz.name}*. Would you like to schedule a visit? I'm here to help!`,
        14: `We'd love to see you at *${biz.name}*! Reply anytime and I'll help you find a perfect time slot.`,
      };

      await sendWhatsAppMessage(
        biz.whatsappPhoneNumberId,
        convo.customerPhone,
        msgs[days],
      );
      sent++;
    }
  }

  return json({ status: "ok", sent });
};
