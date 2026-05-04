import type { Skill, SkillContext, IncomingMessage, SkillResult } from "./types.js";
import { callLlm } from "$lib/server/llm.js";
import { skillRouting } from "$lib/config/models.js";
import { buildSystemPrompt } from "$lib/server/prompt-templates.js";
import { db } from "$lib/server/db/index.js";
import { businessDocs } from "$lib/server/db/schema.js";
import { eq } from "drizzle-orm";

export const fallbackSkill: Skill = {
  id: "fallback",

  match(intent) {
    if (intent === "greeting") return 0.8;
    if (intent === "other") return 0.5;
    return 0.1;
  },

  async handle(msg: IncomingMessage, ctx: SkillContext): Promise<SkillResult> {
    const docs = await db
      .select({ chunkText: businessDocs.chunkText })
      .from(businessDocs)
      .where(eq(businessDocs.businessId, ctx.businessId));

    const knowledgeBase = docs.length > 0
      ? `\n\nKnowledge base:\n${docs.slice(0, 3).map((d) => d.chunkText).join("\n---\n")}`
      : "";

    const skillContext = `Greet the customer warmly and briefly mention the key services or specialties of the business. Make them feel welcome and let them know you can help with bookings, pricing, or any questions.${knowledgeBase}`;
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

    return {
      reply: response.text,
      confidence: 0.6,
      skillId: "fallback",
    };
  },
};
