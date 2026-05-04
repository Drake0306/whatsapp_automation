import { redirect, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types.js";
import { db } from "$lib/server/db/index.js";
import { businesses, businessServices, slotBlocks } from "$lib/server/db/schema.js";
import { eq, and, gte } from "drizzle-orm";

export const load: PageServerLoad = async (event) => {
  const session = await event.locals.auth();
  if (!session?.user?.id) throw redirect(303, "/auth");

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerUserId, session.user.id))
    .limit(1);

  if (!business) throw redirect(303, "/onboarding");

  const [services, blocks] = await Promise.all([
    db
      .select()
      .from(businessServices)
      .where(eq(businessServices.businessId, business.id))
      .orderBy(businessServices.sortOrder),
    db
      .select()
      .from(slotBlocks)
      .where(
        and(
          eq(slotBlocks.businessId, business.id),
          gte(slotBlocks.endAt, new Date()),
        ),
      )
      .orderBy(slotBlocks.startAt),
  ]);

  return { session, business, services, blocks };
};

export const actions: Actions = {
  "add-service": async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401, { error: "Not authenticated" });

    const form = await request.formData();
    const name = (form.get("name") as string)?.trim();
    const durationMin = parseInt(form.get("durationMin") as string) || 60;
    const capacity = parseInt(form.get("capacity") as string) || 1;
    const bookingMode = (form.get("bookingMode") as string) || "instant";
    const priceStr = form.get("price") as string;
    const price = priceStr ? parseInt(priceStr) : null;

    if (!name) return fail(400, { error: "Service name is required" });

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(400, { error: "No business found" });

    const existing = await db
      .select()
      .from(businessServices)
      .where(eq(businessServices.businessId, business.id));

    try {
      await db.insert(businessServices).values({
        businessId: business.id,
        name,
        durationMin,
        capacity,
        bookingMode,
        price,
        sortOrder: existing.length,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Duplicate")) {
        return fail(400, { error: "A service with this name already exists" });
      }
      return fail(500, { error: "Failed to add service" });
    }

    return { success: true };
  },

  "update-service": async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401, { error: "Not authenticated" });

    const form = await request.formData();
    const serviceId = form.get("serviceId") as string;
    const name = (form.get("name") as string)?.trim();
    const durationMin = parseInt(form.get("durationMin") as string) || 60;
    const capacity = parseInt(form.get("capacity") as string) || 1;
    const bookingMode = (form.get("bookingMode") as string) || "instant";
    const priceStr = form.get("price") as string;
    const price = priceStr ? parseInt(priceStr) : null;

    if (!serviceId || !name) return fail(400, { error: "Service ID and name are required" });

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(400, { error: "No business found" });

    try {
      await db
        .update(businessServices)
        .set({ name, durationMin, capacity, bookingMode, price })
        .where(
          and(
            eq(businessServices.id, serviceId),
            eq(businessServices.businessId, business.id),
          ),
        );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Duplicate")) {
        return fail(400, { error: "A service with this name already exists" });
      }
      return fail(500, { error: "Failed to update service" });
    }

    return { success: true };
  },

  "toggle-service": async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401, { error: "Not authenticated" });

    const form = await request.formData();
    const serviceId = form.get("serviceId") as string;
    const isActive = form.get("isActive") === "true";

    if (!serviceId) return fail(400, { error: "Service ID is required" });

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(400, { error: "No business found" });

    await db
      .update(businessServices)
      .set({ isActive })
      .where(
        and(
          eq(businessServices.id, serviceId),
          eq(businessServices.businessId, business.id),
        ),
      );

    return { success: true };
  },

  "add-block": async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401, { error: "Not authenticated" });

    const form = await request.formData();
    const serviceId = (form.get("serviceId") as string) || null;
    const startAt = form.get("startAt") as string;
    const endAt = form.get("endAt") as string;
    const reason = (form.get("reason") as string)?.trim() || null;

    if (!startAt || !endAt) return fail(400, { error: "Start and end times are required" });

    const start = new Date(startAt);
    const end = new Date(endAt);
    if (end <= start) return fail(400, { error: "End time must be after start time" });

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(400, { error: "No business found" });

    await db.insert(slotBlocks).values({
      businessId: business.id,
      serviceId,
      startAt: start,
      endAt: end,
      reason,
    });

    return { success: true };
  },

  "remove-block": async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) return fail(401, { error: "Not authenticated" });

    const form = await request.formData();
    const blockId = form.get("blockId") as string;

    if (!blockId) return fail(400, { error: "Block ID is required" });

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, session.user.id))
      .limit(1);

    if (!business) return fail(400, { error: "No business found" });

    await db
      .delete(slotBlocks)
      .where(
        and(
          eq(slotBlocks.id, blockId),
          eq(slotBlocks.businessId, business.id),
        ),
      );

    return { success: true };
  },
};
