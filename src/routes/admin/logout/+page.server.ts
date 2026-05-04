import { redirect } from "@sveltejs/kit";
import type { Actions } from "./$types.js";

export const actions: Actions = {
  default: async ({ cookies }) => {
    cookies.delete("admin_session", { path: "/admin" });
    throw redirect(303, "/admin/login");
  },
};
