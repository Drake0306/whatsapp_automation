import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types.js";
import { db } from "$lib/server/db/index.js";
import {
  businesses,
  appointments,
  conversations,
  messages,
} from "$lib/server/db/schema.js";
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

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Bookings per day (last 30 days)
  const bookingsPerDay = await db
    .select({
      date: sql<string>`DATE(${appointments.slotAt})`,
      count: sql<number>`count(*)`,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.businessId, business.id),
        gte(appointments.slotAt, thirtyDaysAgo),
      ),
    )
    .groupBy(sql`DATE(${appointments.slotAt})`)
    .orderBy(sql`DATE(${appointments.slotAt})`);

  // No-show rate
  const [totalCompleted] = await db
    .select({ count: sql<number>`count(*)` })
    .from(appointments)
    .where(
      and(
        eq(appointments.businessId, business.id),
        gte(appointments.slotAt, thirtyDaysAgo),
      ),
    );

  const [noShows] = await db
    .select({ count: sql<number>`count(*)` })
    .from(appointments)
    .where(
      and(
        eq(appointments.businessId, business.id),
        eq(appointments.status, "no_show"),
        gte(appointments.slotAt, thirtyDaysAgo),
      ),
    );

  const totalAppts = Number(totalCompleted?.count ?? 0);
  const noShowCount = Number(noShows?.count ?? 0);
  const noShowRate = totalAppts > 0 ? Math.round((noShowCount / totalAppts) * 100) : 0;

  // Conversations per day (last 30 days)
  const convosPerDay = await db
    .select({
      date: sql<string>`DATE(${conversations.lastMessageAt})`,
      count: sql<number>`count(*)`,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.businessId, business.id),
        gte(conversations.lastMessageAt, thirtyDaysAgo),
      ),
    )
    .groupBy(sql`DATE(${conversations.lastMessageAt})`)
    .orderBy(sql`DATE(${conversations.lastMessageAt})`);

  // Messages by skill
  const messagesBySkill = await db
    .select({
      skillId: messages.skillId,
      count: sql<number>`count(*)`,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(
      and(
        eq(conversations.businessId, business.id),
        eq(messages.direction, "out"),
        gte(messages.createdAt, thirtyDaysAgo),
      ),
    )
    .groupBy(messages.skillId);

  // Status breakdown
  const statusBreakdown = await db
    .select({
      status: appointments.status,
      count: sql<number>`count(*)`,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.businessId, business.id),
        gte(appointments.slotAt, thirtyDaysAgo),
      ),
    )
    .groupBy(appointments.status);

  return {
    session,
    business,
    analytics: {
      bookingsPerDay,
      convosPerDay,
      messagesBySkill,
      statusBreakdown,
      noShowRate,
      totalBookings: totalAppts,
      noShowCount,
    },
  };
};
