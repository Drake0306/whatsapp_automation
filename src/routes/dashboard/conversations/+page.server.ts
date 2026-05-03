import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types.js";
import { db } from "$lib/server/db/index.js";
import { businesses, conversations, messages } from "$lib/server/db/schema.js";
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

  const convos = await db
    .select()
    .from(conversations)
    .where(eq(conversations.businessId, business.id))
    .orderBy(sql`${conversations.lastMessageAt} desc`)
    .limit(50);

  const selected = event.url.searchParams.get("id");

  let thread: {
    id: string;
    direction: string;
    role: string;
    text: string | null;
    skillId: string | null;
    needsReview: boolean;
    createdAt: Date;
  }[] = [];

  if (selected) {
    const [selectedConvo] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, selected),
          eq(conversations.businessId, business.id),
        ),
      )
      .limit(1);

    if (selectedConvo) {
      thread = await db
        .select({
          id: messages.id,
          direction: messages.direction,
          role: messages.role,
          text: messages.text,
          skillId: messages.skillId,
          needsReview: messages.needsReview,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(eq(messages.conversationId, selected))
        .orderBy(messages.createdAt);
    }
  }

  return { session, business, conversations: convos, selectedId: selected, thread };
};
