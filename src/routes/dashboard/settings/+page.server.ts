import { redirect, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types.js";
import { db } from "$lib/server/db/index.js";
import {
  businesses,
  businessToneConfig,
  businessSkills,
  businessHours,
} from "$lib/server/db/schema.js";
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

  const [[tone], skills, hours] = await Promise.all([
    db
      .select()
      .from(businessToneConfig)
      .where(eq(businessToneConfig.businessId, business.id))
      .limit(1),
    db
      .select()
      .from(businessSkills)
      .where(eq(businessSkills.businessId, business.id)),
    db
      .select()
      .from(businessHours)
      .where(eq(businessHours.businessId, business.id))
      .orderBy(businessHours.dayOfWeek),
  ]);

  return { session, business, tone: tone ?? null, skills, hours };
};

export const actions: Actions = {
  "update-business": async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401);

    const form = await request.formData();
    const name = form.get("name") as string;
    const language = form.get("language") as string;
    const timezone = form.get("timezone") as string;
    const whatsappPhoneNumberId = form.get("whatsappPhoneNumberId") as string;

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(400);

    await db
      .update(businesses)
      .set({
        name: name || business.name,
        language: language || business.language,
        timezone: timezone || business.timezone,
        whatsappPhoneNumberId: whatsappPhoneNumberId || business.whatsappPhoneNumberId,
      })
      .where(eq(businesses.id, business.id));

    return { success: true, section: "business" };
  },

  "update-tone": async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401);

    const form = await request.formData();
    const greetingStyle = form.get("greetingStyle") as string;
    const formalityLevel = form.get("formalityLevel") as string;
    const customInstructions = form.get("customInstructions") as string;

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(400);

    const [existing] = await db
      .select()
      .from(businessToneConfig)
      .where(eq(businessToneConfig.businessId, business.id))
      .limit(1);

    const values = {
      greetingStyle: greetingStyle || null,
      formalityLevel: formalityLevel || "friendly",
      customInstructions: customInstructions || null,
      updatedAt: new Date(),
    };

    if (existing) {
      await db
        .update(businessToneConfig)
        .set(values)
        .where(eq(businessToneConfig.businessId, business.id));
    } else {
      await db.insert(businessToneConfig).values({
        businessId: business.id,
        ...values,
      });
    }

    return { success: true, section: "tone" };
  },

  "toggle-skill": async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401);

    const form = await request.formData();
    const skillId = form.get("skillId") as string;
    const enabled = form.get("enabled") === "true";

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(400);

    await db
      .update(businessSkills)
      .set({ enabled })
      .where(
        and(
          eq(businessSkills.businessId, business.id),
          eq(businessSkills.skillId, skillId),
        ),
      );

    return { success: true };
  },

  "update-hours": async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401);

    const form = await request.formData();

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(400);

    const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

    for (let day = 0; day < 7; day++) {
      const openTime = (form.get(`open_${day}`) as string) || "09:00";
      const closeTime = (form.get(`close_${day}`) as string) || "20:00";
      const isClosed = form.get(`closed_${day}`) === "true";

      const [existing] = await db
        .select()
        .from(businessHours)
        .where(
          and(
            eq(businessHours.businessId, business.id),
            eq(businessHours.dayOfWeek, day),
          ),
        )
        .limit(1);

      if (existing) {
        await db
          .update(businessHours)
          .set({ openTime, closeTime, isClosed })
          .where(
            and(
              eq(businessHours.businessId, business.id),
              eq(businessHours.dayOfWeek, day),
            ),
          );
      } else {
        await db.insert(businessHours).values({
          businessId: business.id,
          dayOfWeek: day,
          openTime,
          closeTime,
          isClosed,
        });
      }
    }

    return { success: true, section: "hours" };
  },
};
