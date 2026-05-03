import type { Skill, SkillContext, IncomingMessage, SkillResult } from "./types.js";

export const examCountdownSkill: Skill = {
  id: "exam_countdown",

  match() {
    // Cron-triggered only
    return 0;
  },

  async handle(_msg: IncomingMessage, ctx: SkillContext): Promise<SkillResult> {
    return {
      reply: `Exam time is approaching! Stay focused and keep revising. If you have doubts, just message us here and we'll set up a doubt-clearing session at *${ctx.businessName}*. You've got this! 💪`,
      confidence: 0.95,
      skillId: "exam_countdown",
    };
  },
};
