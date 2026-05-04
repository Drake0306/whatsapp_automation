import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types.js";
import { verifyAdminToken } from "$lib/server/admin.js";

export const load: LayoutServerLoad = async ({ cookies, url }) => {
  const token = cookies.get("admin_session");
  const email = token ? verifyAdminToken(token) : null;

  const publicPaths = ["/admin/login", "/admin/logout"];
  if (!email && !publicPaths.includes(url.pathname)) {
    throw redirect(303, "/admin/login");
  }

  return { adminEmail: email };
};
