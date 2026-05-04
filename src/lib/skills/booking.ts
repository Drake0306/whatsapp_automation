import type { Skill, SkillContext, IncomingMessage, SkillResult } from "./types.js";
import { callLlm } from "$lib/server/llm.js";
import { skillRouting } from "$lib/config/models.js";
import { buildSystemPrompt } from "$lib/server/prompt-templates.js";
import { db } from "$lib/server/db/index.js";
import { businessHours } from "$lib/server/db/schema.js";
import { eq } from "drizzle-orm";
import {
  getActiveServices,
  getAvailableSlots,
  bookSlot,
  suggestAlternatives,
  localTimeToUtc,
  type TimeSlot,
} from "$lib/server/slot-engine.js";

function formatSlot(slot: TimeSlot, timezone: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };
  return new Intl.DateTimeFormat("en-IN", opts).format(slot.startAt);
}

function formatSlotsList(slots: TimeSlot[], timezone: string): string {
  return slots.map((s, i) => `${i + 1}. ${formatSlot(s, timezone)}`).join("\n");
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

function slotsToInteractiveList(slots: TimeSlot[], serviceName: string, serviceId: string, timezone: string) {
  const grouped: Record<string, TimeSlot[]> = {};
  for (const slot of slots) {
    const dayLabel = new Intl.DateTimeFormat("en-IN", { timeZone: timezone, weekday: "long", day: "numeric", month: "short" }).format(slot.startAt);
    if (!grouped[dayLabel]) grouped[dayLabel] = [];
    grouped[dayLabel].push(slot);
  }

  const sections = Object.entries(grouped).map(([dayLabel, daySlots]) => ({
    title: truncate(dayLabel, 24),
    rows: daySlots.map((s) => {
      const timeStr = new Intl.DateTimeFormat("en-IN", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: true }).format(s.startAt);
      const isoDate = s.startAt.toISOString();
      return {
        id: `book_${serviceId}_${isoDate}`.slice(0, 200),
        title: truncate(timeStr, 24),
        description: truncate(serviceName, 72),
      };
    }),
  }));

  return sections.slice(0, 10);
}

export const bookingSkill: Skill = {
  id: "booking",

  match(intent) {
    if (intent === "booking") return 0.95;
    return 0;
  },

  async handle(msg: IncomingMessage, ctx: SkillContext): Promise<SkillResult> {
    if (msg.interactiveId?.startsWith("book_")) {
      const interactiveId = msg.interactiveId;
      const parts = interactiveId.split("_");
      const serviceId = parts[1];
      const isoDate = parts.slice(2).join("_");
      const slotAt = new Date(isoDate);

      const allServices = await getActiveServices(ctx.businessId);
      const service = allServices.find((s) => s.id === serviceId) ?? allServices[0];
      if (!service) {
        return { reply: "Sorry, that service is no longer available.", confidence: 0.85, skillId: "booking" };
      }

      const result = await bookSlot({
        businessId: ctx.businessId,
        serviceId: service.id,
        slotAt,
        customerPhone: ctx.customerPhone,
        conversationId: ctx.conversationId,
        timezone: ctx.timezone,
      });

      if (result.success) {
        const slotDisplay = new Intl.DateTimeFormat("en-IN", {
          timeZone: ctx.timezone,
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).format(slotAt);

        if (result.status === "pending") {
          return {
            reply: `Your *${service.name}* booking for *${slotDisplay}* has been queued. We'll notify you once it's confirmed!`,
            confidence: 0.95,
            sideEffects: [{ type: "booking_pending", payload: { appointmentId: result.appointmentId } }],
            skillId: "booking",
          };
        }
        return {
          reply: `Your *${service.name}* is confirmed for *${slotDisplay}*! We look forward to seeing you.`,
          confidence: 0.95,
          sideEffects: [{ type: "booking_confirmed", payload: { appointmentId: result.appointmentId } }],
          skillId: "booking",
        };
      }

      return {
        reply: `Sorry, that slot was just taken. Would you like to try another time?`,
        confidence: 0.85,
        skillId: "booking",
      };
    }

    const services = await getActiveServices(ctx.businessId);

    const hoursRows = await db
      .select()
      .from(businessHours)
      .where(eq(businessHours.businessId, ctx.businessId))
      .orderBy(businessHours.dayOfWeek);

    const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let hoursText = "Business hours: 9 AM to 8 PM, all days.";
    if (hoursRows.length > 0) {
      hoursText = "Business hours:\n" + hoursRows.map((h) => {
        if (h.isClosed) return `${DAYS[h.dayOfWeek]}: Closed`;
        return `${DAYS[h.dayOfWeek]}: ${h.openTime} – ${h.closeTime}`;
      }).join("\n");
    }

    const now = new Date();
    const servicesList = services.length > 0
      ? services.map((s) => `- "${s.name}" (${s.durationMin}min, ID: ${s.id})`).join("\n")
      : "- No specific services configured. Use service name: \"Appointment\"";

    const skillContext = `The customer wants to book. Extract the service and time.

Available services:
${servicesList}

${hoursText}
Timezone: ${ctx.timezone}
Today: ${now.toLocaleDateString("en-IN", { timeZone: ctx.timezone, weekday: "long", day: "numeric", month: "long", year: "numeric" })}

RULES:
- If the customer hasn't specified a service, ask which one they want.
- If the customer hasn't specified a time, say you'll check availability and respond with:
  SLOTS_REQUEST: {"serviceId": "<id>"}
- If both service and time are clear, respond with:
  BOOKING_REQUEST: {"serviceId": "<id>", "serviceName": "<name>", "date": "YYYY-MM-DD", "time": "HH:MM"}
  followed by a brief "Let me check that for you..." message.
- Do NOT confirm the booking yourself. The system will handle availability and confirm.
- Be conversational and helpful. Use the customer's language when possible.`;

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
      chatMessages.push({
        role: h.role === "customer" ? "user" : "assistant",
        content: h.text,
      });
    }
    chatMessages.push({ role: "user", content: msg.text });

    const response = await callLlm(skillRouting["booking"], chatMessages);

    const slotsMatch = response.text.match(/SLOTS_REQUEST:\s*(\{[^}]+\})/);
    if (slotsMatch) {
      try {
        const req = JSON.parse(slotsMatch[1]);
        const service = services.find((s) => s.id === req.serviceId) ?? services[0];
        if (service) {
          const upcoming = await getUpcomingSlotsForDisplay(ctx.businessId, service.id, ctx.timezone, 10);
          if (upcoming.length > 0) {
            const sections = slotsToInteractiveList(upcoming, service.name, service.id, ctx.timezone);
            return {
              reply: `Here are the available slots for *${service.name}*:\n\n${formatSlotsList(upcoming, ctx.timezone)}\n\nTap below to pick a slot, or tell me a different time.`,
              interactive: {
                type: "list",
                bodyText: `Available slots for ${service.name}`,
                buttonText: "View Slots",
                sections,
                headerText: truncate(`Book ${service.name}`, 60),
                footerText: "Tap a slot to book instantly",
              },
              confidence: 0.9,
              skillId: "booking",
            };
          }
          return {
            reply: `Sorry, there are no available slots for ${service.name} in the next few days. Would you like to try a different service or time?`,
            confidence: 0.9,
            skillId: "booking",
          };
        }
      } catch (err) {
        console.error("[booking] Failed to parse SLOTS_REQUEST:", err);
      }
    }

    const bookingMatch = response.text.match(/BOOKING_REQUEST:\s*(\{[^}]+\})/);
    if (bookingMatch) {
      try {
        const req = JSON.parse(bookingMatch[1]);
        const service = services.find((s) => s.id === req.serviceId) ?? services[0];
        if (!service) {
          return {
            reply: "I couldn't find that service. Could you let me know which service you'd like to book?",
            confidence: 0.85,
            skillId: "booking",
          };
        }

        const [year, month, day] = req.date.split("-").map(Number);
        const slotAt = localTimeToUtc({ year, month, day }, req.time, ctx.timezone);

        const result = await bookSlot({
          businessId: ctx.businessId,
          serviceId: service.id,
          slotAt,
          customerPhone: ctx.customerPhone,
          conversationId: ctx.conversationId,
          timezone: ctx.timezone,
        });

        if (result.success) {
          const slotDisplay = new Intl.DateTimeFormat("en-IN", {
            timeZone: ctx.timezone,
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }).format(slotAt);

          if (result.status === "pending") {
            return {
              reply: `Your *${service.name}* booking for *${slotDisplay}* has been queued. We'll notify you once it's confirmed!`,
              confidence: 0.95,
              sideEffects: [{ type: "booking_pending", payload: { appointmentId: result.appointmentId } }],
              skillId: "booking",
            };
          }
          return {
            reply: `Your *${service.name}* is confirmed for *${slotDisplay}*! We look forward to seeing you.`,
            confidence: 0.95,
            sideEffects: [{ type: "booking_confirmed", payload: { appointmentId: result.appointmentId } }],
            skillId: "booking",
          };
        }

        const alternatives = await suggestAlternatives({
          businessId: ctx.businessId,
          serviceId: service.id,
          preferredDate: slotAt,
          timezone: ctx.timezone,
        });

        if (alternatives.length > 0) {
          const sections = slotsToInteractiveList(alternatives, service.name, service.id, ctx.timezone);
          return {
            reply: `Sorry, that time slot isn't available for *${service.name}*. Here are some alternatives:\n\n${formatSlotsList(alternatives, ctx.timezone)}\n\nTap below to pick one, or suggest a different time.`,
            interactive: {
              type: "list",
              bodyText: `That slot isn't available. Here are alternatives for ${service.name}:`,
              buttonText: "View Alternatives",
              sections,
              headerText: truncate(`${service.name} — Alternatives`, 60),
            },
            confidence: 0.9,
            skillId: "booking",
          };
        }

        return {
          reply: `Sorry, that time isn't available for ${service.name} and I couldn't find nearby alternatives. Could you try a different day?`,
          confidence: 0.85,
          skillId: "booking",
        };
      } catch (err) {
        console.error("[booking] Failed to parse BOOKING_REQUEST:", err);
      }
    }

    const replyText = response.text
      .replace(/BOOKING_REQUEST:\s*\{[^}]+\}\s*/g, "")
      .replace(/SLOTS_REQUEST:\s*\{[^}]+\}\s*/g, "")
      .trim();

    return {
      reply: replyText,
      confidence: 0.88,
      skillId: "booking",
    };
  },
};

async function getUpcomingSlotsForDisplay(
  businessId: string,
  serviceId: string,
  timezone: string,
  count: number,
): Promise<TimeSlot[]> {
  const all: TimeSlot[] = [];
  for (let dayOffset = 0; dayOffset <= 7 && all.length < count; dayOffset++) {
    const date = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
    const daySlots = await getAvailableSlots({ businessId, serviceId, date, timezone });
    const spread = pickSpread(daySlots, Math.min(3, count - all.length));
    all.push(...spread);
  }
  return all.slice(0, count);
}

function pickSpread(slots: TimeSlot[], count: number): TimeSlot[] {
  if (slots.length <= count) return slots;
  const step = Math.floor(slots.length / count);
  return Array.from({ length: count }, (_, i) => slots[Math.min(i * step, slots.length - 1)]);
}
