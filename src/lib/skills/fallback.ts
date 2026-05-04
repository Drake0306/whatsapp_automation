import type { Skill, SkillContext, IncomingMessage, SkillResult } from "./types.js";
import { callLlm } from "$lib/server/llm.js";
import { skillRouting } from "$lib/config/models.js";
import { buildSystemPrompt } from "$lib/server/prompt-templates.js";
import { db } from "$lib/server/db/index.js";
import { businessDocs } from "$lib/server/db/schema.js";
import { eq } from "drizzle-orm";
import { getActiveServices } from "$lib/server/slot-engine.js";

export const fallbackSkill: Skill = {
  id: "fallback",

  match(intent) {
    if (intent === "greeting") return 0.8;
    if (intent === "other") return 0.5;
    return 0.1;
  },

  async handle(msg: IncomingMessage, ctx: SkillContext): Promise<SkillResult> {
    const [docs, services] = await Promise.all([
      db.select({ chunkText: businessDocs.chunkText })
        .from(businessDocs)
        .where(eq(businessDocs.businessId, ctx.businessId)),
      getActiveServices(ctx.businessId),
    ]);

    const knowledgeBase = docs.length > 0
      ? `\n\nKnowledge base:\n${docs.slice(0, 3).map((d) => d.chunkText).join("\n---\n")}`
      : "";

    const servicesList = services.length > 0
      ? `\n\nServices offered:\n${services.map((s) => `- ${s.name}${s.price ? ` (Rs ${s.price})` : ""} — ${s.durationMin} min`).join("\n")}`
      : "";

    const skillContext = `Greet the customer warmly on behalf of ${ctx.businessName}. Tell them what you can help with:
- Answer questions about the business
- Book appointments${services.length > 0 ? ` (services: ${services.map((s) => s.name).join(", ")})` : ""}
- Reschedule or cancel bookings
Keep it short (2-3 sentences). End with "How can I help you today?"${knowledgeBase}${servicesList}`;

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

    const response = await callLlm(skillRouting["faq"], chatMessages);

    const isGreeting = ctx.history.length <= 2;
    if (isGreeting) {
      const buttons: { id: string; title: string }[] = [];
      if (services.length > 0) buttons.push({ id: "action_book", title: "Book Appointment" });
      buttons.push({ id: "action_menu", title: "View Services" });
      buttons.push({ id: "action_question", title: "Ask a Question" });

      const bodyText = response.text.length > 1024 ? response.text.slice(0, 1021) + "..." : response.text;

      return {
        reply: response.text,
        interactive: {
          type: "buttons",
          bodyText,
          buttons: buttons.slice(0, 3),
        },
        confidence: 0.7,
        skillId: "fallback",
      };
    }

    return {
      reply: response.text,
      confidence: 0.6,
      skillId: "fallback",
    };
  },
};
