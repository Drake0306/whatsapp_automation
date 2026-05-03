import type { Skill, SkillContext, IncomingMessage, SkillResult } from "./types.js";
import { callLlm } from "$lib/server/llm.js";
import { skillRouting } from "$lib/config/models.js";
import { buildSystemPrompt } from "$lib/server/prompt-templates.js";
import { db } from "$lib/server/db/index.js";
import { appointments } from "$lib/server/db/schema.js";
import { eq, and, gte, lte } from "drizzle-orm";

export const bookingSkill: Skill = {
  id: "booking",

  match(intent) {
    if (intent === "booking") return 0.95;
    return 0;
  },

  async handle(msg: IncomingMessage, ctx: SkillContext): Promise<SkillResult> {
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const existingBookings = await db
      .select({ slotAt: appointments.slotAt, durationMin: appointments.durationMin })
      .from(appointments)
      .where(
        and(
          eq(appointments.businessId, ctx.businessId),
          gte(appointments.slotAt, now),
          lte(appointments.slotAt, weekEnd),
          eq(appointments.status, "confirmed"),
        ),
      );

    const bookedSlots = existingBookings.map((b) => {
      const start = new Date(b.slotAt);
      return `${start.toLocaleDateString("en-IN")} ${start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} (${b.durationMin}min)`;
    });

    const skillContext = `The customer wants to book an appointment. Extract:
1. What service they want
2. When they want it (date + time)

Currently booked slots (unavailable):
${bookedSlots.length > 0 ? bookedSlots.join("\n") : "No bookings yet"}

Business hours: 9 AM to 8 PM, all days.
Today is: ${now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}

If the customer hasn't specified a time, suggest 2-3 available slots.
If they've confirmed a time, respond with:
BOOKING_CONFIRM: {"service": "...", "date": "YYYY-MM-DD", "time": "HH:MM", "duration": 60}
followed by a friendly confirmation message.`;

    const systemPrompt = buildSystemPrompt(
      ctx.businessName,
      ctx.vertical,
      ctx.language,
      ctx.tone ?? null,
      skillContext,
    );

    const modelId = skillRouting["booking"];
    const response = await callLlm(modelId, [
      { role: "system", content: systemPrompt },
      { role: "user", content: msg.text },
    ]);

    const confirmMatch = response.text.match(
      /BOOKING_CONFIRM:\s*(\{[^}]+\})/,
    );

    const sideEffects = [];
    let replyText = response.text;

    if (confirmMatch) {
      try {
        const booking = JSON.parse(confirmMatch[1]);
        const slotAt = new Date(`${booking.date}T${booking.time}:00`);

        await db.insert(appointments).values({
          businessId: ctx.businessId,
          conversationId: ctx.conversationId,
          customerPhone: ctx.customerPhone,
          service: booking.service,
          slotAt,
          durationMin: booking.duration || 60,
          status: "confirmed",
        });

        sideEffects.push({
          type: "booking_create",
          payload: booking,
        });

        replyText = response.text.replace(/BOOKING_CONFIRM:\s*\{[^}]+\}\s*/, "");
      } catch {
        // JSON parse failed — let the text reply through as-is
      }
    }

    return {
      reply: replyText,
      confidence: 0.88,
      sideEffects,
      skillId: "booking",
    };
  },
};
