import type { Skill, SkillContext, IncomingMessage, SkillResult } from "./types.js";
import { callLlm } from "$lib/server/llm.js";
import { skillRouting } from "$lib/config/models.js";
import { buildSystemPrompt } from "$lib/server/prompt-templates.js";

export const fallbackSkill: Skill = {
  id: "fallback",

  match(intent) {
    if (intent === "greeting") return 0.8;
    if (intent === "other") return 0.5;
    return 0.1;
  },

  async handle(msg: IncomingMessage, ctx: SkillContext): Promise<SkillResult> {
    const skillContext = "If the customer greeted you, greet them warmly and ask how you can help. If you're unsure what they want, ask a clarifying question.";
    const systemPrompt = buildSystemPrompt(
      ctx.businessName,
      ctx.vertical,
      ctx.language,
      ctx.tone ?? null,
      skillContext,
    );

    const response = await callLlm(skillRouting["faq"], [
      { role: "system", content: systemPrompt },
      { role: "user", content: msg.text },
    ]);

    return {
      reply: response.text,
      confidence: 0.5,
      needsReview: true,
      skillId: "fallback",
    };
  },
};
