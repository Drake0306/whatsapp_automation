import { sequence } from "@sveltejs/kit/hooks";
import { handle as authHandle } from "./auth.js";
import { loadSkillRouting } from "$lib/server/platform-config.js";
import type { Handle } from "@sveltejs/kit";

const platformConfigHandle: Handle = async ({ event, resolve }) => {
  await loadSkillRouting();
  return resolve(event);
};

export const handle = sequence(platformConfigHandle, authHandle);
