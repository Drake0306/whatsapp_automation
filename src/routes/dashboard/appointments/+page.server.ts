import { redirect, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types.js";
import { db } from "$lib/server/db/index.js";
import { businesses, appointments } from "$lib/server/db/schema.js";
import { eq, and, gte, sql } from "drizzle-orm";

export const load: PageServerLoad = async (event) => {
  const session = await event.locals.auth();
  if (!session?.user?.id) throw redirect(303, "/auth");

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerUserId, session.user.id))
    .limit(1);

  if (!business) throw redirect(303, "/onboarding");

  const filter = event.url.searchParams.get("filter") ?? "upcoming";

  let appts;
  if (filter === "all") {
    appts = await db
      .select()
      .from(appointments)
      .where(eq(appointments.businessId, business.id))
      .orderBy(sql`${appointments.slotAt} desc`)
      .limit(100);
  } else {
    appts = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.businessId, business.id),
          gte(appointments.slotAt, new Date()),
        ),
      )
      .orderBy(appointments.slotAt)
      .limit(100);
  }

  return { session, business, appointments: appts, filter };
};

export const actions: Actions = {
  "update-status": async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401);

    const form = await request.formData();
    const appointmentId = form.get("appointmentId") as string;
    const status = form.get("status") as string;

    if (!appointmentId || !status) return fail(400);

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(400);

    await db
      .update(appointments)
      .set({ status })
      .where(
        and(
          eq(appointments.id, appointmentId),
          eq(appointments.businessId, business.id),
        ),
      );

    return { success: true };
  },
};
