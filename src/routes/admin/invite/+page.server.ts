import type { Actions, PageServerLoad } from "./$types.js";
import { fail } from "@sveltejs/kit";
import { db } from "$lib/server/db/index.js";
import { users, businesses } from "$lib/server/db/schema.js";
import { eq } from "drizzle-orm";
import { sendInviteEmail } from "$lib/server/email.js";
import { verifyAdminToken } from "$lib/server/admin.js";

export const load: PageServerLoad = async () => {
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const token = cookies.get("admin_session");
    const adminEmail = token ? verifyAdminToken(token) : null;
    const form = await request.formData();

    const email = (form.get("email") as string)?.trim().toLowerCase();
    const businessName = (form.get("businessName") as string)?.trim();
    const vertical = (form.get("vertical") as string)?.trim();
    const phoneNumberId = (form.get("phoneNumberId") as string)?.trim() || null;

    if (!email || !businessName || !vertical) {
      return fail(400, { error: "Email, business name, and vertical are required." });
    }

    let [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!existingUser) {
      await db.insert(users).values({
        email,
        emailVerified: new Date(),
      });
      [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
    }

    const [existingBusiness] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, existingUser.id))
      .limit(1);

    if (existingBusiness) {
      return fail(400, { error: "This user already has a business registered." });
    }

    const slug = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    await db.insert(businesses).values({
      ownerUserId: existingUser.id,
      name: businessName,
      slug: slug + "-" + Date.now().toString(36),
      vertical,
      whatsappPhoneNumberId: phoneNumberId || undefined,
      status: phoneNumberId ? "active" : "onboarding",
    });

    try {
      await sendInviteEmail({
        to: email,
        businessName,
        inviterEmail: adminEmail ?? "admin",
      });
    } catch (err) {
      console.error("[admin/invite] Failed to send invite email:", err);
      return { success: true, warning: "Tenant created but invite email failed to send." };
    }

    return { success: true };
  },
};
