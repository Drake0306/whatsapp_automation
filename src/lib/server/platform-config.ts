import { db } from "$lib/server/db/index.js";
import { platformConfig } from "$lib/server/db/schema.js";
import { eq } from "drizzle-orm";
import {
  models,
  defaultSkillRouting,
  setSkillRoutingOverrides,
  type SkillRoute,
} from "$lib/config/models.js";

const ROUTING_KEY = "skill_routing";

let loaded = false;

export async function loadSkillRouting(): Promise<void> {
  if (loaded) return;
  try {
    const [row] = await db
      .select()
      .from(platformConfig)
      .where(eq(platformConfig.key, ROUTING_KEY))
      .limit(1);

    if (row?.value && typeof row.value === "object") {
      const overrides = row.value as Record<string, string>;
      const valid: Partial<Record<SkillRoute, string>> = {};
      for (const [skill, modelId] of Object.entries(overrides)) {
        if (skill in defaultSkillRouting && modelId in models) {
          valid[skill as SkillRoute] = modelId;
        }
      }
      setSkillRoutingOverrides(valid);
    }
    loaded = true;
  } catch {
    // table may not exist yet before migration — use defaults
  }
}

export async function saveSkillRouting(
  overrides: Partial<Record<SkillRoute, string>>,
): Promise<void> {
  const valid: Partial<Record<SkillRoute, string>> = {};
  for (const [skill, modelId] of Object.entries(overrides)) {
    if (skill in defaultSkillRouting && modelId in models) {
      valid[skill as SkillRoute] = modelId;
    }
  }

  const [existing] = await db
    .select()
    .from(platformConfig)
    .where(eq(platformConfig.key, ROUTING_KEY))
    .limit(1);

  if (existing) {
    await db
      .update(platformConfig)
      .set({ value: valid, updatedAt: new Date() })
      .where(eq(platformConfig.key, ROUTING_KEY));
  } else {
    await db.insert(platformConfig).values({
      key: ROUTING_KEY,
      value: valid,
    });
  }

  setSkillRoutingOverrides(valid);
  loaded = true;
}

export function reloadOnNextRequest(): void {
  loaded = false;
}
