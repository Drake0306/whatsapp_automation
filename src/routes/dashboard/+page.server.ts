import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types.js";
import { db } from "$lib/server/db/index.js";
import {
  businesses,
  conversations,
  messages,
  appointments,
  escalations,
} from "$lib/server/db/schema.js";
import { eq, and, sql, gte } from "drizzle-orm";

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

  return {
    session,
    business,
    stats: {
      conversations: Number(conversationCount?.count ?? 0),
      todayBookings: Number(todayBookings?.count ?? 0),
      pendingEscalations: Number(pendingEscalations?.count ?? 0),
    },
    recentConversations,
  };
};
