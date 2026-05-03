import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types.js";
import { db } from "$lib/server/db/index.js";
import { businesses, feedback } from "$lib/server/db/schema.js";
import { eq, and, sql, isNotNull, desc } from "drizzle-orm";

export const load: PageServerLoad = async (event) => {
  const session = await event.locals.auth();
  if (!session?.user?.id) throw redirect(303, "/auth");

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerUserId, session.user.id))
    .limit(1);

  if (!business) throw redirect(303, "/onboarding");

  const responses = await db
    .select()
    .from(feedback)
    .where(
      and(
        eq(feedback.businessId, business.id),
        isNotNull(feedback.rating),
      ),
    )
    .orderBy(desc(feedback.respondedAt))
    .limit(100);

  const [avgRating] = await db
    .select({ avg: sql<number>`AVG(${feedback.rating})` })
    .from(feedback)
    .where(
      and(
        eq(feedback.businessId, business.id),
        isNotNull(feedback.rating),
      ),
    );

  const [totalSent] = await db
    .select({ count: sql<number>`count(*)` })
    .from(feedback)
    .where(
      and(
        eq(feedback.businessId, business.id),
        isNotNull(feedback.feedbackSentAt),
      ),
    );

  const [totalResponded] = await db
    .select({ count: sql<number>`count(*)` })
    .from(feedback)
    .where(
      and(
        eq(feedback.businessId, business.id),
        isNotNull(feedback.respondedAt),
      ),
    );

  const ratingDistribution = await db
    .select({
      rating: feedback.rating,
      count: sql<number>`count(*)`,
    })
    .from(feedback)
    .where(
      and(
        eq(feedback.businessId, business.id),
        isNotNull(feedback.rating),
      ),
    )
    .groupBy(feedback.rating);

  return {
    session,
    business,
    responses,
    stats: {
      averageRating: avgRating?.avg ? Math.round(Number(avgRating.avg) * 10) / 10 : null,
      totalSent: Number(totalSent?.count ?? 0),
      totalResponded: Number(totalResponded?.count ?? 0),
      responseRate:
        Number(totalSent?.count ?? 0) > 0
          ? Math.round(
              (Number(totalResponded?.count ?? 0) / Number(totalSent?.count ?? 0)) * 100,
            )
          : 0,
      ratingDistribution: ratingDistribution.map((r) => ({
        rating: r.rating,
        count: Number(r.count),
      })),
    },
  };
};
