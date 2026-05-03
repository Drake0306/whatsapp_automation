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
import { eq, and, sql, desc, inArray } from "drizzle-orm";

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

  if (contactList.length === 0) {
    return { session, business, contacts: [], selectedId: event.url.searchParams.get("id") };
  }

  const contactIds = contactList.map(c => c.id);
  const contactPhones = contactList.map(c => c.phone);

  const [allTags, allApptCounts, allConvos] = await Promise.all([
    db
      .select({ contactId: contactTags.contactId, tag: contactTags.tag })
      .from(contactTags)
      .where(inArray(contactTags.contactId, contactIds)),
    db
      .select({
        customerPhone: appointments.customerPhone,
        count: sql<number>`count(*)`,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.businessId, business.id),
          inArray(appointments.customerPhone, contactPhones),
        ),
      )
      .groupBy(appointments.customerPhone),
    db
      .select({
        customerPhone: conversations.customerPhone,
        lastMessageAt: conversations.lastMessageAt,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.businessId, business.id),
          inArray(conversations.customerPhone, contactPhones),
        ),
      ),
  ]);

  const tagsByContact = new Map<string, string[]>();
  for (const t of allTags) {
    const arr = tagsByContact.get(t.contactId) || [];
    arr.push(t.tag);
    tagsByContact.set(t.contactId, arr);
  }

  const apptCountByPhone = new Map<string, number>();
  for (const a of allApptCounts) {
    apptCountByPhone.set(a.customerPhone, Number(a.count));
  }

  const convoByPhone = new Map<string, Date | null>();
  for (const c of allConvos) {
    convoByPhone.set(c.customerPhone, c.lastMessageAt);
  }

  const enriched = contactList.map(contact => ({
    ...contact,
    tags: tagsByContact.get(contact.id) || [],
    appointmentCount: apptCountByPhone.get(contact.phone) || 0,
    lastInteraction: convoByPhone.get(contact.phone) ?? null,
  }));

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
