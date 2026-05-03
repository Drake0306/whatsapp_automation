import { redirect, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types.js";
import { db } from "$lib/server/db/index.js";
import {
  businesses,
  contacts,
  contactTags,
  conversations,
  appointments,
} from "$lib/server/db/schema.js";
import { eq, and, sql, desc } from "drizzle-orm";

export const load: PageServerLoad = async (event) => {
  const session = await event.locals.auth();
  if (!session?.user?.id) throw redirect(303, "/auth");

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerUserId, session.user.id))
    .limit(1);

  if (!business) throw redirect(303, "/onboarding");

  const contactList = await db
    .select()
    .from(contacts)
    .where(eq(contacts.businessId, business.id))
    .orderBy(desc(contacts.updatedAt))
    .limit(200);

  const enriched = [];
  for (const contact of contactList) {
    const tags = await db
      .select({ tag: contactTags.tag })
      .from(contactTags)
      .where(eq(contactTags.contactId, contact.id));

    const [apptCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(
        and(
          eq(appointments.businessId, business.id),
          eq(appointments.customerPhone, contact.phone),
        ),
      );

    const [convo] = await db
      .select({ lastMessageAt: conversations.lastMessageAt })
      .from(conversations)
      .where(
        and(
          eq(conversations.businessId, business.id),
          eq(conversations.customerPhone, contact.phone),
        ),
      )
      .limit(1);

    enriched.push({
      ...contact,
      tags: tags.map((t) => t.tag),
      appointmentCount: Number(apptCount?.count ?? 0),
      lastInteraction: convo?.lastMessageAt ?? null,
    });
  }

  const selectedId = event.url.searchParams.get("id");

  return { session, business, contacts: enriched, selectedId };
};

export const actions: Actions = {
  "add-contact": async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401);

    const form = await request.formData();
    const phone = (form.get("phone") as string)?.trim();
    const name = (form.get("name") as string)?.trim() || null;
    const email = (form.get("email") as string)?.trim() || null;

    if (!phone) return fail(400, { error: "Phone number is required" });

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(400);

    const [existing] = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.businessId, business.id),
          eq(contacts.phone, phone),
        ),
      )
      .limit(1);

    if (existing) return fail(400, { error: "Contact with this phone already exists" });

    await db.insert(contacts).values({
      businessId: business.id,
      phone,
      name,
      email,
      source: "manual",
    });

    return { success: true };
  },

  "update-notes": async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401);

    const form = await request.formData();
    const contactId = form.get("contactId") as string;
    const notes = form.get("notes") as string;

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(400);

    await db
      .update(contacts)
      .set({ notes, updatedAt: new Date() })
      .where(
        and(
          eq(contacts.id, contactId),
          eq(contacts.businessId, business.id),
        ),
      );

    return { success: true };
  },

  "add-tag": async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401);

    const form = await request.formData();
    const contactId = form.get("contactId") as string;
    const tag = (form.get("tag") as string)?.trim().toLowerCase();

    if (!tag) return fail(400, { error: "Tag is required" });

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(400);

    const [contact] = await db
      .select()
      .from(contacts)
      .where(
        and(eq(contacts.id, contactId), eq(contacts.businessId, business.id)),
      )
      .limit(1);

    if (!contact) return fail(404);

    try {
      await db.insert(contactTags).values({ contactId, tag });
    } catch {
      // duplicate tag — ignore
    }

    return { success: true };
  },

  "remove-tag": async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401);

    const form = await request.formData();
    const contactId = form.get("contactId") as string;
    const tag = form.get("tag") as string;

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(400);

    const [contact] = await db
      .select()
      .from(contacts)
      .where(
        and(eq(contacts.id, contactId), eq(contacts.businessId, business.id)),
      )
      .limit(1);

    if (!contact) return fail(404);

    await db
      .delete(contactTags)
      .where(
        and(eq(contactTags.contactId, contactId), eq(contactTags.tag, tag)),
      );

    return { success: true };
  },
};
