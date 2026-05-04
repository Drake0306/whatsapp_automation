import { env } from "$env/dynamic/private";
import nodemailer from "nodemailer";

let _transport: nodemailer.Transporter | null = null;

function getTransport() {
  if (!_transport) {
    const port = Number(env.EMAIL_SERVER_PORT || 587);
    _transport = nodemailer.createTransport({
      host: env.EMAIL_SERVER_HOST,
      port,
      secure: port === 465,
      auth: env.EMAIL_SERVER_USER
        ? { user: env.EMAIL_SERVER_USER, pass: env.EMAIL_SERVER_PASSWORD }
        : undefined,
      tls: { rejectUnauthorized: env.NODE_ENV === "production" },
    } as nodemailer.TransportOptions);
  }
  return _transport;
}

export async function sendInviteEmail(opts: {
  to: string;
  businessName: string;
  inviterEmail: string;
}) {
  const appUrl = env.AUTH_URL || env.ORIGIN || "http://localhost:5173";
  const loginUrl = `${appUrl}/auth`;

  await getTransport().sendMail({
    from: env.EMAIL_FROM || "noreply@whatsappflow.app",
    to: opts.to,
    subject: `You've been invited to WhatsAppFlow`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Welcome to WhatsAppFlow</h2>
        <p>You've been invited by <strong>${opts.inviterEmail}</strong> to manage <strong>${opts.businessName}</strong> on WhatsAppFlow.</p>
        <p>Your account has been pre-configured. Click below to sign in and complete onboarding:</p>
        <p style="margin: 24px 0;">
          <a href="${loginUrl}" style="background: #18181b; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
            Sign in to WhatsAppFlow
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">Use this email address (${opts.to}) to sign in with the magic link option.</p>
      </div>
    `,
  });
}
