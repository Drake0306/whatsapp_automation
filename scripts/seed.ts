/**
 * Seed script — populates the DB with test data for local development.
 *
 * Usage:  npm run db:seed
 *
 * Login:  Sign in with the email below (Google OAuth or Magic Link).
 *         Change TEST_USER_EMAIL to your actual email before running.
 */

import "dotenv/config";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../src/lib/server/db/schema.js";

// ┌──────────────────────────────────────────┐
// │  CHANGE THIS TO YOUR EMAIL BEFORE RUNNING │
// └──────────────────────────────────────────┘
const TEST_USER_EMAIL = "test@whatsappflow.dev";
const SECOND_USER_EMAIL = "owner2@whatsappflow.dev";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set. Add it to .env");
  process.exit(1);
}

const pool = mysql.createPool({ uri: url });
const db = drizzle(pool, { schema, mode: "default" });

const id = () => crypto.randomUUID();
const ago = (days: number) => new Date(Date.now() - days * 86400000);
const future = (days: number) => new Date(Date.now() + days * 86400000);

async function seed() {
  console.log("Seeding...\n");

  // ── Users ──
  const uid1 = id();
  const uid2 = id();
  await db.insert(schema.users).values([
    { id: uid1, name: "Test Owner", email: TEST_USER_EMAIL, emailVerified: new Date() },
    { id: uid2, name: "Second Owner", email: SECOND_USER_EMAIL, emailVerified: new Date() },
  ]);
  console.log("+ 2 users");

  // ── Business ──
  const biz = id();
  await db.insert(schema.businesses).values({
    id: biz,
    ownerUserId: uid1,
    name: "Priya's Salon",
    slug: "priyas-salon",
    vertical: "salon",
    language: "hinglish",
    timezone: "Asia/Kolkata",
    whatsappPhoneNumberId: "100000000000001",
    status: "active",
  });
  console.log("+ business: Priya's Salon");

  // ── Business Hours ──
  for (const [day, open, close, closed] of [
    [0, "10:00", "18:00", false],
    [1, "09:00", "20:00", false],
    [2, "09:00", "20:00", false],
    [3, "09:00", "20:00", false],
    [4, "09:00", "20:00", false],
    [5, "09:00", "20:00", false],
    [6, "09:00", "21:00", false],
  ] as [number, string, string, boolean][]) {
    await db.insert(schema.businessHours).values({
      businessId: biz, dayOfWeek: day, openTime: open, closeTime: close, isClosed: closed,
    });
  }
  console.log("+ business hours (7 days)");

  // ── Tone ──
  await db.insert(schema.businessToneConfig).values({
    businessId: biz,
    greetingStyle: "Namaste! Welcome to Priya's Salon",
    formalityLevel: "friendly",
    customInstructions: "Always mention our 10% discount for first-time visitors.",
  });
  console.log("+ tone config");

  // ── Skills ──
  const skills = ["faq", "booking", "reschedule", "cancel", "fallback", "escalate", "feedback_collect"];
  for (const s of skills) {
    await db.insert(schema.businessSkills).values({ businessId: biz, skillId: s, enabled: true });
  }
  console.log(`+ ${skills.length} skills enabled`);

  // ── Knowledge Base ──
  await db.insert(schema.businessDocs).values([
    {
      businessId: biz,
      source: "services.txt",
      chunkText: "Priya's Salon Services & Pricing:\n- Haircut: ₹500 (30 min)\n- Hair Spa: ₹1,200 (60 min)\n- Facial (Gold): ₹800 (45 min)\n- Facial (Diamond): ₹1,500 (60 min)\n- Manicure: ₹400 (30 min)\n- Pedicure: ₹500 (30 min)\n- Bridal Makeup: ₹15,000-25,000 (3 hrs)\n- Hair Color: ₹2,000-4,000 (90 min)\n\nFirst-time visitors get 10% off.",
      chunkIndex: 0,
      metadata: { originalSize: 400, mimeType: "text/plain" },
    },
    {
      businessId: biz,
      source: "services.txt",
      chunkText: "Location: Shop 14, Green Park Market, New Delhi 110016\nParking: Free street parking\nPayment: Cash, UPI, Cards\n\nPackages:\n- Bridal (Makeup + Hair + Draping): ₹20,000\n- Party Ready (Hair + Facial + Nails): ₹2,500\n- Men's Grooming (Haircut + Beard): ₹700",
      chunkIndex: 1,
      metadata: { originalSize: 280, mimeType: "text/plain" },
    },
  ]);
  console.log("+ 2 knowledge base chunks");

  // ── Contacts ──
  const people = [
    { phone: "919876543210", name: "Ananya Sharma", email: "ananya@gmail.com", tags: ["vip", "regular"] },
    { phone: "919876543211", name: "Rahul Verma", email: null, tags: ["regular"] },
    { phone: "919876543212", name: "Meera Patel", email: "meera.p@gmail.com", tags: ["vip"] },
    { phone: "919876543213", name: "Vikram Singh", email: null, tags: ["new"] },
    { phone: "919876543214", name: "Sneha Reddy", email: "sneha.r@outlook.com", tags: ["regular", "referred"] },
    { phone: "919876543215", name: "Arjun Nair", email: null, tags: ["new"] },
  ];

  const contactIds: string[] = [];
  for (const p of people) {
    const cid = id();
    contactIds.push(cid);
    await db.insert(schema.contacts).values({
      id: cid, businessId: biz, phone: p.phone, name: p.name, email: p.email, source: "whatsapp",
    });
    for (const tag of p.tags) {
      await db.insert(schema.contactTags).values({ contactId: cid, tag });
    }
  }
  console.log(`+ ${people.length} contacts with tags`);

  // ── Conversations + Messages ──
  const inboundTexts = [
    "Hi, I want to book a haircut for tomorrow",
    "Kya Saturday ko slot available hai?",
    "Cancel karna hai mera appointment",
    "What services do you offer?",
    "Hello, pricing batao please",
    "Namaste, kuch inquiry thi",
  ];
  const botReplies = [
    "Namaste Ananya! Tomorrow we have slots at 10 AM, 2 PM, and 4:30 PM. Which works?",
    "Haan Rahul! Saturday ko 11 AM, 1 PM, aur 3 PM available hai. Kaunsa time?",
    "Sure Meera, your Facial on Friday at 3 PM — should I cancel it?",
    "Hi Vikram! We offer Haircut, Hair Spa, Facial, Manicure, Pedicure, Bridal Makeup. Want to book?",
    "Hello Sneha! Haircut ₹500, Hair Spa ₹1200, Facial ₹800, Manicure ₹400. First-timers get 10% off!",
    "Namaste! Priya's Salon mein aapka swagat hai. Kaise help karoon?",
  ];
  const botSkills = ["booking", "booking", "cancel", "faq", "faq", "fallback"];

  const convoIds: string[] = [];
  for (let i = 0; i < people.length; i++) {
    const cid = id();
    convoIds.push(cid);

    await db.insert(schema.conversations).values({
      id: cid,
      businessId: biz,
      customerPhone: people[i].phone,
      customerName: people[i].name,
      language: "hinglish",
      lastMessageAt: ago(i),
    });

    await db.insert(schema.messages).values({
      conversationId: cid, direction: "in", role: "customer",
      text: inboundTexts[i], createdAt: ago(i),
    });

    await db.insert(schema.messages).values({
      conversationId: cid, direction: "out", role: "bot",
      text: botReplies[i], skillId: botSkills[i], needsReview: i >= 4, createdAt: ago(i),
    });
  }
  console.log(`+ ${people.length} conversations with messages`);

  // ── Appointments ──
  const appts = [
    { ph: 0, svc: "Haircut", slot: future(1), st: "confirmed", dur: 30 },
    { ph: 1, svc: "Hair Spa", slot: future(2), st: "confirmed", dur: 60 },
    { ph: 2, svc: "Facial", slot: ago(1), st: "completed", dur: 45 },
    { ph: 0, svc: "Manicure", slot: ago(7), st: "completed", dur: 30 },
    { ph: 4, svc: "Bridal Makeup", slot: future(5), st: "confirmed", dur: 180 },
    { ph: 3, svc: "Pedicure", slot: ago(3), st: "no_show", dur: 30 },
  ];

  for (const a of appts) {
    await db.insert(schema.appointments).values({
      businessId: biz,
      conversationId: convoIds[a.ph],
      customerPhone: people[a.ph].phone,
      service: a.svc,
      slotAt: a.slot,
      durationMin: a.dur,
      status: a.st,
    });
  }
  console.log(`+ ${appts.length} appointments`);

  // ── Escalations ──
  const escMsgs = [
    { convo: 4, text: "Sneha, bridal makeup ka trial book karna chahogi? Packages start at ₹15,000.", skill: "faq", conf: 0.72 },
    { convo: 5, text: "Aapki inquiry ke liye dhanyavaad! Appointment book karna chahenge?", skill: "fallback", conf: 0.45 },
    { convo: 3, text: "Vikram, men's grooming package — Haircut + Beard ₹700. Interested?", skill: "faq", conf: 0.68 },
  ];

  for (const e of escMsgs) {
    const mid = id();
    await db.insert(schema.messages).values({
      id: mid,
      conversationId: convoIds[e.convo],
      direction: "out", role: "bot",
      text: e.text, skillId: e.skill, needsReview: true,
    });
    await db.insert(schema.escalations).values({
      businessId: biz, messageId: mid,
      proposedReply: e.text, confidence: e.conf, status: "pending",
    });
  }
  console.log("+ 3 escalations (pending)");

  // ── Feedback ──
  await db.insert(schema.feedback).values([
    {
      businessId: biz, customerPhone: "919876543212",
      rating: 5, comment: "Amazing facial! Loved the service.",
      feedbackSentAt: ago(1), respondedAt: ago(1), googleReviewNudgeSent: true,
    },
    {
      businessId: biz, customerPhone: "919876543210",
      rating: 4, comment: "Good haircut, but waited 10 minutes.",
      feedbackSentAt: ago(7), respondedAt: ago(7), googleReviewNudgeSent: false,
    },
  ]);
  console.log("+ 2 feedback entries");

  // ── Broadcast ──
  const bcId = id();
  await db.insert(schema.broadcasts).values({
    id: bcId,
    businessId: biz,
    name: "Diwali Special Offers",
    messageText: "Namaste! This Diwali, get 20% off all services at Priya's Salon. Book now!",
    audienceFilter: { tags: ["regular", "vip"] },
    status: "sent", totalRecipients: 3, sentCount: 3, failedCount: 0, sentAt: ago(5),
  });
  for (const ph of ["919876543210", "919876543211", "919876543214"]) {
    await db.insert(schema.broadcastRecipients).values({
      broadcastId: bcId, contactPhone: ph, status: "sent", sentAt: ago(5),
    });
  }
  console.log("+ 1 broadcast (sent)");

  // ── Quick Replies ──
  await db.insert(schema.quickReplies).values([
    { businessId: biz, title: "Welcome", shortcut: "/welcome", body: "Namaste! Welcome to *Priya's Salon*. How can I help you today?" },
    { businessId: biz, title: "Booking Confirmed", shortcut: "/confirm", body: "Your appointment is *confirmed*! We'll send a reminder 24h before. See you!" },
    { businessId: biz, title: "Closed Today", shortcut: "/closed", body: "Sorry, we're closed today. Back tomorrow at 9 AM. You can still book for upcoming days!" },
  ]);
  console.log("+ 3 quick replies");

  console.log("\n--- Done ---");
  console.log(`\nLogin email: ${TEST_USER_EMAIL}`);
  console.log("Sign in via Google (if same email) or Email Magic Link.\n");

  await pool.end();
  process.exit(0);
}

seed().catch((e) => { console.error("Seed failed:", e); process.exit(1); });
