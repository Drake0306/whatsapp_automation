import { redirect, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types.js";
import { db } from "$lib/server/db/index.js";
import { businesses, businessDocs } from "$lib/server/db/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { deleteFile } from "$lib/server/storage.js";

export const load: PageServerLoad = async (event) => {
  const session = await event.locals.auth();
  if (!session?.user?.id) throw redirect(303, "/auth");

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerUserId, session.user.id))
    .limit(1);

  if (!business) throw redirect(303, "/onboarding");

  const docs = await db
    .select({
      source: businessDocs.source,
      chunkCount: sql<number>`count(*)`,
      storageKey: businessDocs.storageKey,
      createdAt: sql<Date>`min(${businessDocs.createdAt})`,
    })
    .from(businessDocs)
    .where(eq(businessDocs.businessId, business.id))
    .groupBy(businessDocs.source, businessDocs.storageKey)
    .orderBy(sql`min(${businessDocs.createdAt}) desc`);

  return { session, business, docs };
};

export const actions: Actions = {
  delete: async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401);

    const form = await request.formData();
    const source = form.get("source") as string;

    if (!source) return fail(400);

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(400);

    const docsToDelete = await db
      .select({ id: businessDocs.id, storageKey: businessDocs.storageKey })
      .from(businessDocs)
      .where(
        and(
          eq(businessDocs.businessId, business.id),
          eq(businessDocs.source, source),
        ),
      );

    for (const doc of docsToDelete) {
      if (doc.storageKey) {
        try {
          await deleteFile(doc.storageKey);
        } catch {
          // R2 not configured
        }
      }
    }

    await db
      .delete(businessDocs)
      .where(
        and(
          eq(businessDocs.businessId, business.id),
          eq(businessDocs.source, source),
        ),
      );

    return { success: true };
  },
};
