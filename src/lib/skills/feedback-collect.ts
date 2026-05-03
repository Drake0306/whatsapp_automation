import type { Skill, SkillContext, IncomingMessage, SkillResult } from "./types.js";
import { db } from "$lib/server/db/index.js";
import { feedback } from "$lib/server/db/schema.js";
import { eq, and, isNull, isNotNull } from "drizzle-orm";

export const feedbackCollectSkill: Skill = {
  id: "feedback_collect",

  match() {
    return 0;
  },

  async handle(msg: IncomingMessage, ctx: SkillContext): Promise<SkillResult> {
    const ratingMatch = msg.text.match(/^(\d)$/);
    if (!ratingMatch) {
      return {
        reply: "Please rate your experience from 1 to 5 (just send a number).",
        confidence: 0.9,
        skillId: "feedback_collect",
      };
    }

    const rating = parseInt(ratingMatch[1], 10);
    if (rating < 1 || rating > 5) {
      return {
        reply: "Please send a number between 1 and 5.",
        confidence: 0.9,
        skillId: "feedback_collect",
      };
    }

    const [pending] = await db
      .select()
      .from(feedback)
      .where(
        and(
          eq(feedback.businessId, ctx.businessId),
          eq(feedback.customerPhone, ctx.customerPhone),
          isNotNull(feedback.feedbackSentAt),
          isNull(feedback.respondedAt),
        ),
      )
      .limit(1);

    if (pending) {
      await db
        .update(feedback)
        .set({
          rating,
          respondedAt: new Date(),
        })
        .where(eq(feedback.id, pending.id));
    }

    let reply: string;
    if (rating >= 4) {
      reply = `Thank you for the ${rating}-star rating! We're thrilled you had a great experience at *${ctx.businessName}*! If you have a moment, we'd really appreciate a Google review — it helps other customers find us.`;
    } else if (rating === 3) {
      reply = `Thank you for your feedback! We appreciate your honesty and will work to improve. Is there anything specific we can do better?`;
    } else {
      reply = `We're sorry your experience wasn't great. Thank you for letting us know — we'll work on improving. Would you like to share more details so we can make it right?`;
    }

    return {
      reply,
      confidence: 0.95,
      skillId: "feedback_collect",
    };
  },
};
