import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types.js";
import { db } from "$lib/server/db/index.js";
import {
  businesses,
  conversations,
  messages,
  appointments,
  escalations,
  feedback,
  contacts,
  broadcasts,
} from "$lib/server/db/schema.js";
import { eq, and, sql, gte, isNotNull } from "drizzle-orm";

export const load: PageServerLoad = async (event) => {
  const session = await event.locals.auth();
  if (!session?.user?.id) throw redirect(303, "/auth");

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerUserId, session.user.id))
    .limit(1);

  if (!business) throw redirect(303, "/onboarding");
  if (business.status === "onboarding") throw redirect(303, "/onboarding");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [conversationCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(conversations)
    .where(eq(conversations.businessId, business.id));

  const [todayBookings] = await db
    .select({ count: sql<number>`count(*)` })
    .from(appointments)
    .where(
      and(
        eq(appointments.businessId, business.id),
        gte(appointments.slotAt, todayStart),
      ),
    );

  const [pendingEscalations] = await db
    .select({ count: sql<number>`count(*)` })
    .from(escalations)
    .where(
      and(
        eq(escalations.businessId, business.id),
        eq(escalations.status, "pending"),
      ),
    );

  const recentConversations = await db
    .select()
    .from(conversations)
    .where(eq(conversations.businessId, business.id))
    .orderBy(sql`${conversations.lastMessageAt} desc`)
    .limit(10);

  const [todayMessages] = await db
    .select({ count: sql<number>`count(*)` })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(
      and(
        eq(conversations.businessId, business.id),
        gte(messages.createdAt, todayStart),
      ),
    );

  const [contactCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contacts)
    .where(eq(contacts.businessId, business.id));

  const [avgRating] = await db
    .select({ avg: sql<number>`AVG(${feedback.rating})` })
    .from(feedback)
    .where(
      and(
        eq(feedback.businessId, business.id),
        isNotNull(feedback.rating),
      ),
    );

  const [broadcastCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(broadcasts)
    .where(
      and(
        eq(broadcasts.businessId, business.id),
        eq(broadcasts.status, "sent"),
      ),
    );

  return {
    session,
    business,
    stats: {
      conversations: Number(conversationCount?.count ?? 0),
      todayBookings: Number(todayBookings?.count ?? 0),
      pendingEscalations: Number(pendingEscalations?.count ?? 0),
      todayMessages: Number(todayMessages?.count ?? 0),
      totalContacts: Number(contactCount?.count ?? 0),
      avgRating: avgRating?.avg ? Math.round(Number(avgRating.avg) * 10) / 10 : null,
      broadcastsSent: Number(broadcastCount?.count ?? 0),
    },
    recentConversations,
  };
};
