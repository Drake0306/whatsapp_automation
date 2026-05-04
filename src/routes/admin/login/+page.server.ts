import type { Actions, PageServerLoad } from "./$types.js";
import { fail, redirect } from "@sveltejs/kit";
import { validateAdminCredentials, createAdminToken, verifyAdminToken } from "$lib/server/admin.js";
import { env } from "$env/dynamic/private";

export const load: PageServerLoad = async ({ cookies }) => {
  const token = cookies.get("admin_session");
  if (token && verifyAdminToken(token)) {
    throw redirect(303, "/admin");
  }
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const form = await request.formData();
    const email = (form.get("email") as string)?.trim();
    const password = form.get("password") as string;

    if (!email || !password) {
      return fail(400, { error: "Email and password are required." });
    }

    if (!validateAdminCredentials(email, password)) {
      return fail(401, { error: "Invalid credentials." });
    }

    const token = createAdminToken(email);
    const isProduction = env.NODE_ENV === "production";

    cookies.set("admin_session", token, {
      path: "/admin",
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });

    throw redirect(303, "/admin");
  },
};
