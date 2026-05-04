import { redirect, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types.js";
import { db } from "$lib/server/db/index.js";
import {
  businesses,
  businessSkills,
  businessServices,
  businessToneConfig,
} from "$lib/server/db/schema.js";
import { eq } from "drizzle-orm";
import { getVertical } from "$lib/config/verticals.js";

export const load: PageServerLoad = async (event) => {
  const session = await event.locals.auth();
  if (!session?.user?.id) throw redirect(303, "/auth");

  const [existing] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerUserId, session.user.id))
    .limit(1);

  if (existing?.status === "active") {
    throw redirect(303, "/dashboard");
  }

  return { session, business: existing ?? null };
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100)
    + "-" + Date.now().toString(36);
}

export const actions: Actions = {
  "save-business-info": async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401, { error: "Not authenticated" });

    const form = await request.formData();
    const name = form.get("name") as string;
    const vertical = form.get("vertical") as string;
    const language = form.get("language") as string;
    const timezone = form.get("timezone") as string;

    if (!name || !vertical) {
      return fail(400, { error: "Business name and vertical are required" });
    }

    const [existing] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (existing) {
      await db
        .update(businesses)
        .set({ name, vertical, language: language || "en", timezone: timezone || "Asia/Kolkata" })
        .where(eq(businesses.id, existing.id));
      return { success: true, businessId: existing.id };
    }

    const id = crypto.randomUUID();
    await db.insert(businesses).values({
      id,
      ownerUserId: session.user.id,
      name,
      slug: slugify(name),
      vertical,
      language: language || "en",
      timezone: timezone || "Asia/Kolkata",
    });

    const verticalConfig = getVertical(vertical);

    for (const skillId of verticalConfig.defaultSkills) {
      await db.insert(businessSkills).values({ businessId: id, skillId });
    }

    for (let i = 0; i < verticalConfig.appointmentTypes.length; i++) {
      const apt = verticalConfig.appointmentTypes[i];
      await db.insert(businessServices).values({
        businessId: id,
        name: apt.label,
        durationMin: apt.defaultDuration,
        capacity: apt.defaultCapacity ?? 1,
        bookingMode: apt.defaultBookingMode ?? "instant",
        sortOrder: i,
      });
    }

    return { success: true, businessId: id };
  },

  "save-whatsapp": async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401, { error: "Not authenticated" });

    const form = await request.formData();
    const phoneNumberId = form.get("phoneNumberId") as string;

    if (!phoneNumberId) {
      return fail(400, { error: "WhatsApp Phone Number ID is required" });
    }

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(400, { error: "No business found" });

    try {
      await db
        .update(businesses)
        .set({ whatsappPhoneNumberId: phoneNumberId })
        .where(eq(businesses.id, business.id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Duplicate")) {
        return fail(400, { error: "This Phone Number ID is already registered to another business" });
      }
      return fail(500, { error: "Failed to save WhatsApp configuration" });
    }

    return { success: true };
  },

  "save-tone": async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401, { error: "Not authenticated" });

    const form = await request.formData();
    const greetingStyle = form.get("greetingStyle") as string;
    const formalityLevel = form.get("formalityLevel") as string;
    const customInstructions = form.get("customInstructions") as string;

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(400, { error: "No business found" });

    const [existing] = await db
      .select()
      .from(businessToneConfig)
      .where(eq(businessToneConfig.businessId, business.id))
      .limit(1);

    if (existing) {
      await db
        .update(businessToneConfig)
        .set({
          greetingStyle: greetingStyle || null,
          formalityLevel: formalityLevel || "friendly",
          customInstructions: customInstructions || null,
          updatedAt: new Date(),
        })
        .where(eq(businessToneConfig.businessId, business.id));
    } else {
      await db.insert(businessToneConfig).values({
        businessId: business.id,
        greetingStyle: greetingStyle || null,
        formalityLevel: formalityLevel || "friendly",
        customInstructions: customInstructions || null,
      });
    }

    return { success: true };
  },

  "activate": async ({ locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401, { error: "Not authenticated" });

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(400, { error: "No business found" });

    await db
      .update(businesses)
      .set({ status: "active" })
      .where(eq(businesses.id, business.id));

    throw redirect(303, "/dashboard");
  },
};
