import type { Skill, SkillContext, IncomingMessage, SkillResult } from "./types.js";
import { db } from "$lib/server/db/index.js";
import { appointments } from "$lib/server/db/schema.js";
import { eq, and, gte, inArray } from "drizzle-orm";

export const cancelSkill: Skill = {
  id: "cancel",

  match(intent) {
    if (intent === "cancel") return 0.95;
    return 0;
  },

  async handle(_msg: IncomingMessage, ctx: SkillContext): Promise<SkillResult> {
    const upcoming = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.businessId, ctx.businessId),
          eq(appointments.customerPhone, ctx.customerPhone),
          inArray(appointments.status, ["confirmed", "pending"]),
          gte(appointments.slotAt, new Date()),
        ),
      )
      .orderBy(appointments.slotAt);

    if (upcoming.length === 0) {
      return {
        reply: "I don't see any upcoming appointments for you. Nothing to cancel!",
        confidence: 0.95,
        skillId: "cancel",
      };
    }

    const appt = upcoming[0];
    await db
      .update(appointments)
      .set({ status: "cancelled" })
      .where(eq(appointments.id, appt.id));

    const formatAppt = (a: typeof appt) => {
      const d = new Date(a.slotAt);
      const dateStr = d.toLocaleDateString("en-IN", {
        timeZone: ctx.timezone,
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      const timeStr = d.toLocaleTimeString("en-IN", {
        timeZone: ctx.timezone,
        hour: "2-digit",
        minute: "2-digit",
      });
      return { dateStr, timeStr };
    };

    const { dateStr, timeStr } = formatAppt(appt);
    let reply = `Your ${appt.service ?? "appointment"} on *${dateStr}* at *${timeStr}* has been cancelled.`;

    if (upcoming.length > 1) {
      const remaining = upcoming.slice(1);
      const list = remaining.map((a) => {
        const f = formatAppt(a);
        return `- ${a.service ?? "Appointment"} on ${f.dateStr} at ${f.timeStr}`;
      }).join("\n");
      reply += `\n\nYou still have ${remaining.length} more upcoming appointment${remaining.length > 1 ? "s" : ""}:\n${list}\n\nWould you like to cancel any of these, or book a different time?`;
    } else {
      reply += " Would you like to book a different time?";
    }

    return {
      reply,
      confidence: 0.95,
      sideEffects: [{ type: "booking_cancel", payload: { appointmentId: appt.id } }],
      skillId: "cancel",
    };
  },
};
