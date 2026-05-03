import { redirect, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types.js";
import { db } from "$lib/server/db/index.js";
import {
  businesses,
  broadcasts,
  broadcastRecipients,
  contacts,
  contactTags,
} from "$lib/server/db/schema.js";
import { eq, and, sql, inArray, desc } from "drizzle-orm";
import { sendWhatsAppMessage, sendWhatsAppTemplate } from "$lib/server/whatsapp.js";

export const load: PageServerLoad = async (event) => {
  const session = await event.locals.auth();
  if (!session?.user?.id) throw redirect(303, "/auth");

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerUserId, session.user.id))
    .limit(1);

  if (!business) throw redirect(303, "/onboarding");

  const [campaigns, allTags, [contactCount]] = await Promise.all([
    db
      .select()
      .from(broadcasts)
      .where(eq(broadcasts.businessId, business.id))
      .orderBy(desc(broadcasts.createdAt))
      .limit(50),
    db
      .select({ tag: contactTags.tag })
      .from(contactTags)
      .innerJoin(contacts, eq(contactTags.contactId, contacts.id))
      .where(eq(contacts.businessId, business.id))
      .groupBy(contactTags.tag),
    db
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(eq(contacts.businessId, business.id)),
  ]);

  return {
    session,
    business,
    campaigns,
    availableTags: allTags.map((t) => t.tag),
    totalContacts: Number(contactCount?.count ?? 0),
  };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401);

    const form = await request.formData();
    const name = (form.get("name") as string)?.trim();
    const messageText = (form.get("messageText") as string)?.trim();
    const templateName = (form.get("templateName") as string)?.trim() || null;
    const tagsRaw = (form.get("tags") as string)?.trim();

    if (!name) return fail(400, { error: "Campaign name is required" });
    if (!messageText && !templateName)
      return fail(400, { error: "Message text or template name is required" });

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(400);

    const filterTags = tagsRaw
      ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    let targetContacts;
    if (filterTags.length > 0) {
      const taggedContactIds = await db
        .select({ contactId: contactTags.contactId })
        .from(contactTags)
        .where(inArray(contactTags.tag, filterTags))
        .groupBy(contactTags.contactId);

      const ids = taggedContactIds.map((r) => r.contactId);
      if (ids.length === 0) {
        return fail(400, { error: "No contacts match the selected tags" });
      }

      targetContacts = await db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.businessId, business.id),
            inArray(contacts.id, ids),
          ),
        );
    } else {
      targetContacts = await db
        .select()
        .from(contacts)
        .where(eq(contacts.businessId, business.id));
    }

    if (targetContacts.length === 0) {
      return fail(400, { error: "No contacts to send to" });
    }

    await db.insert(broadcasts).values({
      businessId: business.id,
      name,
      messageText,
      templateName,
      audienceFilter: { tags: filterTags },
      status: "draft",
      totalRecipients: targetContacts.length,
    });

    const [campaign] = await db
      .select()
      .from(broadcasts)
      .where(eq(broadcasts.businessId, business.id))
      .orderBy(desc(broadcasts.createdAt))
      .limit(1);

    for (const contact of targetContacts) {
      await db.insert(broadcastRecipients).values({
        broadcastId: campaign.id,
        contactPhone: contact.phone,
      });
    }

    return { success: true, campaignId: campaign.id };
  },

  send: async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401);

    const form = await request.formData();
    const broadcastId = form.get("broadcastId") as string;

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(400);

    const [campaign] = await db
      .select()
      .from(broadcasts)
      .where(
        and(
          eq(broadcasts.id, broadcastId),
          eq(broadcasts.businessId, business.id),
        ),
      )
      .limit(1);

    if (!campaign) return fail(404);
    if (campaign.status === "sent") return fail(400, { error: "Already sent" });

    if (!business.whatsappPhoneNumberId) {
      return fail(400, { error: "WhatsApp not connected" });
    }

    const recipients = await db
      .select()
      .from(broadcastRecipients)
      .where(
        and(
          eq(broadcastRecipients.broadcastId, broadcastId),
          eq(broadcastRecipients.status, "pending"),
        ),
      );

    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      let ok = false;

      if (campaign.templateName) {
        ok = await sendWhatsAppTemplate(
          business.whatsappPhoneNumberId,
          recipient.contactPhone,
          campaign.templateName,
          business.language === "hi" ? "hi" : "en",
        );
      } else if (campaign.messageText) {
        ok = await sendWhatsAppMessage(
          business.whatsappPhoneNumberId,
          recipient.contactPhone,
          campaign.messageText,
        );
      }

      if (ok) {
        sentCount++;
        await db
          .update(broadcastRecipients)
          .set({ status: "sent", sentAt: new Date() })
          .where(eq(broadcastRecipients.id, recipient.id));
      } else {
        failedCount++;
        await db
          .update(broadcastRecipients)
          .set({ status: "failed", error: "Send failed" })
          .where(eq(broadcastRecipients.id, recipient.id));
      }
    }

    await db
      .update(broadcasts)
      .set({
        status: "sent",
        sentCount,
        failedCount,
        sentAt: new Date(),
      })
      .where(eq(broadcasts.id, broadcastId));

    return { success: true, sentCount, failedCount };
  },
};
