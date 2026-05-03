import type { Skill, SkillContext, IncomingMessage, SkillResult } from "./types.js";

export const prescriptionReminderSkill: Skill = {
  id: "prescription_reminder",

  match() {
    // Cron-triggered only, not matched from customer messages
    return 0;
  },

  async handle(_msg: IncomingMessage, ctx: SkillContext): Promise<SkillResult> {
    return {
      reply: `Hi! This is a reminder from *${ctx.businessName}* — please pick up your prescription if you haven't already. If you have any questions, just reply here!`,
      confidence: 0.95,
      skillId: "prescription_reminder",
    };
  },
};
