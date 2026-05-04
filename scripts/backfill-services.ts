/**
 * Backfill script — adds businessServices and businessSkills for existing
 * businesses that were created before the vertical-aware seeding was added.
 *
 * Safe to run multiple times: skips businesses that already have records.
 *
 * Usage:  npm run db:backfill
 */

import "dotenv/config";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/server/db/schema.js";
import { getVertical } from "../src/lib/config/verticals.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set. Add it to .env");
  process.exit(1);
}

const pool = mysql.createPool({ uri: url });
const db = drizzle(pool, { schema, mode: "default" });

async function backfill() {
  console.log("Starting backfill...\n");

  const allBusinesses = await db.select().from(schema.businesses);
  console.log(`Found ${allBusinesses.length} business(es)\n`);

  let servicesAdded = 0;
  let skillsAdded = 0;
  let skippedServices = 0;
  let skippedSkills = 0;

  for (const biz of allBusinesses) {
    const verticalConfig = getVertical(biz.vertical);

    // --- Backfill businessSkills ---
    const existingSkills = await db
      .select()
      .from(schema.businessSkills)
      .where(eq(schema.businessSkills.businessId, biz.id));

    if (existingSkills.length > 0) {
      console.log(`  [${biz.name}] Already has ${existingSkills.length} skills — skipping skills`);
      skippedSkills++;
    } else {
      for (const skillId of verticalConfig.defaultSkills) {
        await db.insert(schema.businessSkills).values({ businessId: biz.id, skillId });
      }
      console.log(`  [${biz.name}] Added ${verticalConfig.defaultSkills.length} skills (${biz.vertical})`);
      skillsAdded++;
    }

    // --- Backfill businessServices ---
    const existingServices = await db
      .select()
      .from(schema.businessServices)
      .where(eq(schema.businessServices.businessId, biz.id));

    if (existingServices.length > 0) {
      console.log(`  [${biz.name}] Already has ${existingServices.length} services — skipping services`);
      skippedServices++;
    } else if (verticalConfig.appointmentTypes.length === 0) {
      console.log(`  [${biz.name}] Vertical "${biz.vertical}" has no appointment types — skipping`);
      skippedServices++;
    } else {
      for (let i = 0; i < verticalConfig.appointmentTypes.length; i++) {
        const apt = verticalConfig.appointmentTypes[i];
        await db.insert(schema.businessServices).values({
          businessId: biz.id,
          name: apt.label,
          durationMin: apt.defaultDuration,
          capacity: apt.defaultCapacity ?? 1,
          bookingMode: apt.defaultBookingMode ?? "instant",
          sortOrder: i,
        });
      }
      console.log(`  [${biz.name}] Added ${verticalConfig.appointmentTypes.length} services (${biz.vertical})`);
      servicesAdded++;
    }

    console.log();
  }

  console.log("Done!");
  console.log(`  Skills:   ${skillsAdded} backfilled, ${skippedSkills} already had data`);
  console.log(`  Services: ${servicesAdded} backfilled, ${skippedServices} already had data`);

  await pool.end();
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
