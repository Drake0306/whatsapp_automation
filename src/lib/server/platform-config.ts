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
): Promise<{ saved: boolean; error?: string }> {
  const valid: Partial<Record<SkillRoute, string>> = {};
  for (const [skill, modelId] of Object.entries(overrides)) {
    if (skill in defaultSkillRouting && modelId in models) {
      valid[skill as SkillRoute] = modelId;
    }
  }

  try {
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("doesn't exist") || msg.includes("no such table")) {
      setSkillRoutingOverrides(valid);
      loaded = true;
      return { saved: false, error: "platform_config table not found — run npm run db:migrate. Overrides applied in-memory only (will reset on restart)." };
    }
    throw err;
  }

  setSkillRoutingOverrides(valid);
  loaded = true;
  return { saved: true };
}

export function reloadOnNextRequest(): void {
  loaded = false;
}
