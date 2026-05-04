import { env } from "$env/dynamic/private";
import { createHmac } from "crypto";

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = (env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

export function validateAdminCredentials(email: string, password: string): boolean {
  const adminEmail = env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = env.SUPER_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return false;
  return email.toLowerCase() === adminEmail && password === adminPassword;
}

export function createAdminToken(email: string): string {
  const secret = env.AUTH_SECRET || "fallback-dev-secret";
  const timestamp = Date.now().toString();
  const data = `${email.toLowerCase()}|${timestamp}`;
  const sig = createHmac("sha256", secret).update(data).digest("hex");
  return Buffer.from(`${data}|${sig}`).toString("base64");
}

export function verifyAdminToken(token: string): string | null {
  try {
    const secret = env.AUTH_SECRET || "fallback-dev-secret";
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const lastPipe = decoded.lastIndexOf("|");
    if (lastPipe === -1) return null;

    const sig = decoded.slice(lastPipe + 1);
    const data = decoded.slice(0, lastPipe);

    const expected = createHmac("sha256", secret).update(data).digest("hex");
    if (sig !== expected) return null;

    const secondLastPipe = data.lastIndexOf("|");
    if (secondLastPipe === -1) return null;

    const email = data.slice(0, secondLastPipe);
    const timestamp = data.slice(secondLastPipe + 1);

    const age = Date.now() - Number(timestamp);
    if (age > 24 * 60 * 60 * 1000) return null;

    return email;
  } catch {
    return null;
  }
}
