import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types.js";
import {
  models,
  defaultSkillRouting,
  getSkillRoutingOverrides,
  type SkillRoute,
} from "$lib/config/models.js";
import { saveSkillRouting } from "$lib/server/platform-config.js";

const SKILL_LABELS: Record<SkillRoute, string> = {
  "intent-classifier": "Intent Classifier",
  faq: "FAQ / Questions",
  booking: "Booking",
  vernacular: "Vernacular (Regional Language)",
  "escalation-draft": "Escalation Draft",
};

export const load: PageServerLoad = async () => {
  const overrides = getSkillRoutingOverrides();

  const skills = (Object.keys(defaultSkillRouting) as SkillRoute[]).map((skill) => ({
    id: skill,
    label: SKILL_LABELS[skill] ?? skill,
    defaultModel: defaultSkillRouting[skill],
    currentModel: overrides[skill] ?? defaultSkillRouting[skill],
    isOverridden: skill in overrides,
  }));

  const availableModels = Object.values(models).map((m) => ({
    id: m.id,
    provider: m.provider,
    apiModelId: m.apiModelId,
    contextWindow: m.contextWindow,
    costPer1kInput: m.costPer1kInput,
    costPer1kOutput: m.costPer1kOutput,
    description: m.description ?? null,
  }));

  return { skills, availableModels };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const form = await request.formData();

    const overrides: Partial<Record<SkillRoute, string>> = {};
    for (const skill of Object.keys(defaultSkillRouting) as SkillRoute[]) {
      const selected = form.get(skill) as string;
      if (selected && selected !== defaultSkillRouting[skill]) {
        if (!(selected in models)) {
          return fail(400, { error: `Invalid model "${selected}" for ${skill}` });
        }
        overrides[skill] = selected;
      }
    }

    const result = await saveSkillRouting(overrides);

    if (result.error) {
      return { success: true, warning: result.error };
    }

    return { success: true };
  },
};
