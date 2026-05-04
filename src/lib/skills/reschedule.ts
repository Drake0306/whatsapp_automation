import type { Skill, SkillContext, IncomingMessage, SkillResult } from "./types.js";
import { callLlm } from "$lib/server/llm.js";
import { skillRouting } from "$lib/config/models.js";
import { buildSystemPrompt } from "$lib/server/prompt-templates.js";
import { db } from "$lib/server/db/index.js";
import { appointments } from "$lib/server/db/schema.js";
import { eq, and, gte, inArray } from "drizzle-orm";
import { checkSlotAvailable, suggestAlternatives } from "$lib/server/slot-engine.js";

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
          inArray(appointments.status, ["confirmed", "pending"]),
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
      return `${i + 1}. ${b.service ?? "Appointment"} (ID: ${b.id}) — ${d.toLocaleDateString("en-IN", { timeZone: ctx.timezone, weekday: "short", day: "numeric", month: "short" })} at ${d.toLocaleTimeString("en-IN", { timeZone: ctx.timezone, hour: "2-digit", minute: "2-digit" })}`;
    });

    const skillContext = `The customer wants to reschedule. Their upcoming appointments:
${bookingList.join("\n")}

Help them pick which appointment to move and ask for a new time.
If they confirm, respond with:
RESCHEDULE_CONFIRM: {"appointmentId": "<id>", "newDate": "YYYY-MM-DD", "newTime": "HH:MM"}
followed by a brief "checking availability..." message.`;

    const systemPrompt = buildSystemPrompt(
      ctx.businessName,
      ctx.vertical,
      ctx.language,
      ctx.tone ?? null,
      skillContext,
    );

    const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];
    for (const h of ctx.history.slice(0, -1)) {
      chatMessages.push({ role: h.role === "customer" ? "user" : "assistant", content: h.text });
    }
    chatMessages.push({ role: "user", content: msg.text });

    const response = await callLlm(skillRouting["booking"], chatMessages);

    const confirmMatch = response.text.match(/RESCHEDULE_CONFIRM:\s*(\{[^}]+\})/);

    if (confirmMatch) {
      try {
        const data = JSON.parse(confirmMatch[1]);
        const appt = upcoming.find((a) => a.id === data.appointmentId) ?? upcoming[0];
        if (!appt) {
          return {
            reply: "I couldn't find that appointment. Could you try again?",
            confidence: 0.85,
            skillId: "reschedule",
          };
        }

        const newSlot = new Date(`${data.newDate}T${data.newTime}:00`);

        if (appt.serviceId) {
          const check = await checkSlotAvailable({
            businessId: ctx.businessId,
            serviceId: appt.serviceId,
            slotAt: newSlot,
            timezone: ctx.timezone,
          });

          if (!check.available) {
            const alternatives = await suggestAlternatives({
              businessId: ctx.businessId,
              serviceId: appt.serviceId,
              preferredDate: newSlot,
              timezone: ctx.timezone,
            });
            const altText = alternatives.length > 0
              ? alternatives.map((s, i) => {
                  const d = new Intl.DateTimeFormat("en-IN", {
                    timeZone: ctx.timezone,
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  }).format(s.startAt);
                  return `${i + 1}. ${d}`;
                }).join("\n")
              : "";

            const reply = altText
              ? `Sorry, that time isn't available. Here are some alternatives:\n\n${altText}\n\nWould any of these work?`
              : "Sorry, that time isn't available and I couldn't find nearby alternatives. Could you try a different day?";

            return { reply, confidence: 0.9, skillId: "reschedule" };
          }
        }

        await db
          .update(appointments)
          .set({ slotAt: newSlot })
          .where(eq(appointments.id, appt.id));

        const slotDisplay = new Intl.DateTimeFormat("en-IN", {
          timeZone: ctx.timezone,
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).format(newSlot);

        return {
          reply: `Done! Your *${appt.service ?? "appointment"}* has been rescheduled to *${slotDisplay}*.`,
          confidence: 0.95,
          skillId: "reschedule",
        };
      } catch { /* fall through */ }
    }

    const replyText = response.text.replace(/RESCHEDULE_CONFIRM:\s*\{[^}]+\}\s*/g, "").trim();
    return { reply: replyText, confidence: 0.85, skillId: "reschedule" };
  },
};
