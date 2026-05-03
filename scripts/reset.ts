/**
 * Reset script — drops all data from every table. Does NOT drop tables themselves.
 *
 * Usage:  npm run db:reset
 */

import "dotenv/config";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set.");
  process.exit(1);
}

const TABLES = [
  "broadcast_recipients",
  "broadcasts",
  "contact_tags",
  "feedback",
  "quick_replies",
  "business_hours",
  "escalations",
  "business_docs",
  "business_skills",
  "business_tone_config",
  "appointments",
  "messages",
  "conversations",
  "contacts",
  "subscriptions",
  "businesses",
  "sessions",
  "accounts",
  "verification_tokens",
  "users",
];

async function reset() {
  const conn = await mysql.createConnection({ uri: url! });

  console.log("Resetting all tables...\n");
  await conn.query("SET FOREIGN_KEY_CHECKS = 0");

  for (const table of TABLES) {
    try {
      await conn.query(`DELETE FROM \`${table}\``);
      console.log(`  cleared: ${table}`);
    } catch {
      // table may not exist yet
    }
  }

  await conn.query("SET FOREIGN_KEY_CHECKS = 1");
  console.log("\n--- All tables cleared ---\n");

  await conn.end();
  process.exit(0);
}

reset().catch((e) => { console.error("Reset failed:", e); process.exit(1); });
