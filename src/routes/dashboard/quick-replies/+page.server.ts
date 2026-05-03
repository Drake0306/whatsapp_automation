import { redirect, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types.js";
import { db } from "$lib/server/db/index.js";
import { businesses, quickReplies } from "$lib/server/db/schema.js";
import { eq, and } from "drizzle-orm";

export const load: PageServerLoad = async (event) => {
  const session = await event.locals.auth();
  if (!session?.user?.id) throw redirect(303, "/auth");

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerUserId, session.user.id))
    .limit(1);

  if (!business) throw redirect(303, "/onboarding");

  const replies = await db
    .select()
    .from(quickReplies)
    .where(eq(quickReplies.businessId, business.id))
    .orderBy(quickReplies.createdAt);

  return { session, business, quickReplies: replies };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401);

    const form = await request.formData();
    const title = (form.get("title") as string)?.trim();
    const shortcut = (form.get("shortcut") as string)?.trim() || null;
    const body = (form.get("body") as string)?.trim();

    if (!title || !body)
      return fail(400, { error: "Title and message body are required" });

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(400);

    await db.insert(quickReplies).values({
      businessId: business.id,
      title,
      shortcut,
      body,
    });

    return { success: true };
  },

  update: async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401);

    const form = await request.formData();
    const replyId = form.get("replyId") as string;
    const title = (form.get("title") as string)?.trim();
    const shortcut = (form.get("shortcut") as string)?.trim() || null;
    const body = (form.get("body") as string)?.trim();

    if (!title || !body)
      return fail(400, { error: "Title and message body are required" });

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(400);

    await db
      .update(quickReplies)
      .set({ title, shortcut, body })
      .where(
        and(
          eq(quickReplies.id, replyId),
          eq(quickReplies.businessId, business.id),
        ),
      );

    return { success: true };
  },

  delete: async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401);

    const form = await request.formData();
    const replyId = form.get("replyId") as string;

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(400);

    await db
      .delete(quickReplies)
      .where(
        and(
          eq(quickReplies.id, replyId),
          eq(quickReplies.businessId, business.id),
        ),
      );

    return { success: true };
  },
};
