import type { Skill, SkillContext, IncomingMessage, SkillResult } from "./types.js";

export const escalateSkill: Skill = {
  id: "escalate",

  match(intent) {
    if (intent === "talk_to_owner") return 1.0;
    return 0;
  },

  async handle(_msg: IncomingMessage, ctx: SkillContext): Promise<SkillResult> {
    return {
      reply: `Sure! I'll connect you with the owner of ${ctx.businessName}. They'll get back to you shortly.`,
      confidence: 1.0,
      needsReview: true,
      skillId: "escalate",
    };
  },
};
