import { SvelteKitAuth } from "@auth/sveltekit";
import Google from "@auth/core/providers/google";
import Nodemailer from "@auth/core/providers/nodemailer";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb } from "$lib/server/db/index.js";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "$lib/server/db/schema.js";
import { env } from "$env/dynamic/private";
import type { Handle } from "@sveltejs/kit";

let _handle: Handle | null = null;

function initAuth(): Handle {
  if (!_handle) {
    const auth = SvelteKitAuth({
      adapter: DrizzleAdapter(getDb(), {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
      }),
      providers: [
        Google,
        Nodemailer({
          server: {
            host: env.EMAIL_SERVER_HOST,
            port: Number(env.EMAIL_SERVER_PORT || 587),
            auth: {
              user: env.EMAIL_SERVER_USER,
              pass: env.EMAIL_SERVER_PASSWORD,
            },
          },
          from: env.EMAIL_FROM || "noreply@whatsappflow.app",
        }),
      ],
      pages: {
        signIn: "/auth",
      },
      callbacks: {
        session({ session, user }) {
          if (session.user) {
            session.user.id = user.id;
          }
          return session;
        },
      },
      trustHost: true,
    });
    _handle = auth.handle;
  }
  return _handle;
}

export const handle: Handle = (input) => initAuth()(input);
