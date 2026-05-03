import { classifyIntent } from "./classifier.js";
import type { Skill, SkillContext, IncomingMessage, SkillResult } from "./types.js";
import { faqSkill } from "./faq.js";
import { bookingSkill } from "./booking.js";
import { rescheduleSkill } from "./reschedule.js";
import { cancelSkill } from "./cancel.js";
import { fallbackSkill } from "./fallback.js";
import { escalateSkill } from "./escalate.js";
import { prescriptionReminderSkill } from "./prescription-reminder.js";
import { feeReminderSkill } from "./fee-reminder.js";
import { examCountdownSkill } from "./exam-countdown.js";
import { db } from "$lib/server/db/index.js";
import { businessSkills } from "$lib/server/db/schema.js";
import { eq, and } from "drizzle-orm";

const CONFIDENCE_THRESHOLD = 0.85;

const SKILL_REGISTRY: Record<string, Skill> = {
  faq: faqSkill,
  booking: bookingSkill,
  reschedule: rescheduleSkill,
  cancel: cancelSkill,
  fallback: fallbackSkill,
  escalate: escalateSkill,
  prescription_reminder: prescriptionReminderSkill,
  fee_reminder: feeReminderSkill,
  exam_countdown: examCountdownSkill,
};

async function getEnabledSkills(businessId: string): Promise<Skill[]> {
  const rows = await db
    .select()
    .from(businessSkills)
    .where(
      and(
        eq(businessSkills.businessId, businessId),
        eq(businessSkills.enabled, true),
      ),
    );

  const enabledIds = new Set(rows.map((r) => r.skillId));

  // Always include fallback and escalate
  enabledIds.add("fallback");
  enabledIds.add("escalate");

  return Array.from(enabledIds)
    .map((id) => SKILL_REGISTRY[id])
    .filter(Boolean);
}

export async function routeMessage(
  msg: IncomingMessage,
  ctx: SkillContext,
): Promise<SkillResult> {
  const intent = await classifyIntent(msg.text);
  const skills = await getEnabledSkills(ctx.businessId);

  const scored = skills
    .map((skill) => ({ skill, score: skill.match(intent, ctx) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = scored[0] ?? { skill: fallbackSkill, score: 0.1 };
  const result = await best.skill.handle(msg, ctx);

  if (result.confidence < CONFIDENCE_THRESHOLD && !result.needsReview) {
    result.needsReview = true;
  }

  return result;
}
