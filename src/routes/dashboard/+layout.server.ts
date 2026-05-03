import { redirect } from "@sveltejs/kit";
import type { ServerLoadEvent } from "@sveltejs/kit";
import { db } from "$lib/server/db/index.js";
import { businesses } from "$lib/server/db/schema.js";
import { eq } from "drizzle-orm";

export const load = async (event: ServerLoadEvent) => {
  const session = await event.locals.auth();
  if (!session?.user?.id) throw redirect(303, "/auth");

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerUserId, session.user.id))
    .limit(1);

  if (!business) throw redirect(303, "/onboarding");

  return { session, business };
};
