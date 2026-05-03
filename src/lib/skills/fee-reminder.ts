import type { Skill, SkillContext, IncomingMessage, SkillResult } from "./types.js";

export const feeReminderSkill: Skill = {
  id: "fee_reminder",

  match() {
    // Cron-triggered only
    return 0;
  },

  async handle(_msg: IncomingMessage, ctx: SkillContext): Promise<SkillResult> {
    return {
      reply: `Hi! This is a friendly reminder from *${ctx.businessName}* — your monthly fee is due. Please complete the payment at your earliest convenience. Reply here if you have any questions!`,
      confidence: 0.95,
      skillId: "fee_reminder",
    };
  },
};
