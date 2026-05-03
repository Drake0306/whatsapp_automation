import type { Skill, SkillContext, IncomingMessage, SkillResult } from "./types.js";
import { callLlm } from "$lib/server/llm.js";
import { skillRouting } from "$lib/config/models.js";
import { buildSystemPrompt } from "$lib/server/prompt-templates.js";
import { db } from "$lib/server/db/index.js";
import { appointments } from "$lib/server/db/schema.js";
import { eq, and, gte } from "drizzle-orm";

export const rescheduleSkill: Skill = {
  id: "reschedule",

  match(intent) {
    if (intent === "reschedule") return 0.95;
    return 0;
  },

  async handle(msg: IncomingMessage, ctx: SkillContext): Promise<SkillResult> {
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
      .limit(5);

    if (upcoming.length === 0) {
      return {
        reply: "I don't see any upcoming appointments for you. Would you like to book a new one?",
        confidence: 0.9,
        skillId: "reschedule",
      };
    }

    const bookingList = upcoming.map((b, i) => {
      const d = new Date(b.slotAt);
      return `${i + 1}. ${b.service ?? "Appointment"} — ${d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} at ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
    });

    const skillContext = `The customer wants to reschedule. Their upcoming appointments:
${bookingList.join("\n")}

Help them pick which appointment to move and suggest new times.
If they confirm a new time, respond with:
RESCHEDULE_CONFIRM: {"appointmentId": "...", "newDate": "YYYY-MM-DD", "newTime": "HH:MM"}
followed by a friendly confirmation.`;

    const systemPrompt = buildSystemPrompt(
      ctx.businessName,
      ctx.vertical,
      ctx.language,
      ctx.tone ?? null,
      skillContext,
    );

    const response = await callLlm(skillRouting["booking"], [
      { role: "system", content: systemPrompt },
      { role: "user", content: msg.text },
    ]);

    const confirmMatch = response.text.match(
      /RESCHEDULE_CONFIRM:\s*(\{[^}]+\})/,
    );

    let replyText = response.text;

    if (confirmMatch) {
      try {
        const data = JSON.parse(confirmMatch[1]);
        const appt = upcoming.find((a) => a.id === data.appointmentId) ?? upcoming[0];
        if (appt) {
          const newSlot = new Date(`${data.newDate}T${data.newTime}:00`);
          await db
            .update(appointments)
            .set({ slotAt: newSlot })
            .where(eq(appointments.id, appt.id));
        }
        replyText = response.text.replace(/RESCHEDULE_CONFIRM:\s*\{[^}]+\}\s*/, "");
      } catch {
        // parse failed
      }
    }

    return {
      reply: replyText,
      confidence: 0.85,
      skillId: "reschedule",
    };
  },
};
