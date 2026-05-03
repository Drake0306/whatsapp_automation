import type { Skill, SkillContext, IncomingMessage, SkillResult } from "./types.js";
import { db } from "$lib/server/db/index.js";
import { appointments } from "$lib/server/db/schema.js";
import { eq, and, gte } from "drizzle-orm";

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
          eq(appointments.status, "confirmed"),
          gte(appointments.slotAt, new Date()),
        ),
      )
      .limit(1);

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

    const d = new Date(appt.slotAt);
    const dateStr = d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const timeStr = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      reply: `Your ${appt.service ?? "appointment"} on *${dateStr}* at *${timeStr}* has been cancelled. Would you like to book a different time?`,
      confidence: 0.95,
      sideEffects: [{ type: "booking_cancel", payload: { appointmentId: appt.id } }],
      skillId: "cancel",
    };
  },
};
