import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types.js";
import { db } from "$lib/server/db/index.js";
import { businesses, subscriptions } from "$lib/server/db/schema.js";
import { eq } from "drizzle-orm";
import { PLANS } from "$lib/server/razorpay.js";

export const load: PageServerLoad = async (event) => {
  const session = await event.locals.auth();
  if (!session?.user?.id) throw redirect(303, "/auth");

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerUserId, session.user.id))
    .limit(1);

  if (!business) throw redirect(303, "/onboarding");

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.businessId, business.id))
    .limit(1);

  return {
    session,
    business,
    subscription: sub ?? null,
    plans: Object.values(PLANS),
  };
};
