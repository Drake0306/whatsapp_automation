import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  int,
  boolean,
  json,
  float,
  primaryKey,
  unique,
} from "drizzle-orm/mysql-core";

// ────────────────────────────────────────────
// Auth.js tables (required by @auth/drizzle-adapter)
// ────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: varchar("email", { length: 255 }).unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
});

export const accounts = mysqlTable(
  "accounts",
  {
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: int("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = mysqlTable("sessions", {
  sessionToken: varchar("session_token", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = mysqlTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ────────────────────────────────────────────
// WhatsAppFlow business tables
// ────────────────────────────────────────────

export const businesses = mysqlTable("businesses", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ownerUserId: varchar("owner_user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  vertical: varchar("vertical", { length: 50 }).notNull(),
  language: varchar("language", { length: 10 }).notNull().default("en"),
  fallbackLanguages: json("fallback_languages").notNull().default([]),
  timezone: varchar("timezone", { length: 50 }).notNull().default("Asia/Kolkata"),
  whatsappPhoneNumberId: varchar("whatsapp_phone_number_id", { length: 255 }).unique(),
  status: varchar("status", { length: 20 }).notNull().default("onboarding"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const conversations = mysqlTable(
  "conversations",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    businessId: varchar("business_id", { length: 36 })
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    customerPhone: varchar("customer_phone", { length: 20 }).notNull(),
    customerName: varchar("customer_name", { length: 255 }),
    language: varchar("language", { length: 10 }),
    state: json("state").notNull().default({}),
    lastMessageAt: timestamp("last_message_at", { mode: "date" }),
  },
  (t) => [unique().on(t.businessId, t.customerPhone)],
);

export const messages = mysqlTable("messages", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  conversationId: varchar("conversation_id", { length: 36 })
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  direction: varchar("direction", { length: 5 }).notNull(),
  role: varchar("role", { length: 10 }).notNull(),
  text: text("text"),
  raw: json("raw"),
  skillId: varchar("skill_id", { length: 50 }),
  needsReview: boolean("needs_review").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ────────────────────────────────────────────
// Phase 1 tables
// ────────────────────────────────────────────

export const businessToneConfig = mysqlTable("business_tone_config", {
  businessId: varchar("business_id", { length: 36 })
    .primaryKey()
    .references(() => businesses.id, { onDelete: "cascade" }),
  greetingStyle: text("greeting_style"),
  formalityLevel: varchar("formality_level", { length: 20 }).notNull().default("friendly"),
  customInstructions: text("custom_instructions"),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const businessSkills = mysqlTable(
  "business_skills",
  {
    businessId: varchar("business_id", { length: 36 })
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    skillId: varchar("skill_id", { length: 50 }).notNull(),
    config: json("config").notNull().default({}),
    enabled: boolean("enabled").notNull().default(true),
  },
  (t) => [primaryKey({ columns: [t.businessId, t.skillId] })],
);

export const businessDocs = mysqlTable("business_docs", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  businessId: varchar("business_id", { length: 36 })
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  source: varchar("source", { length: 255 }).notNull(),
  chunkText: text("chunk_text").notNull(),
  chunkIndex: int("chunk_index").notNull().default(0),
  metadata: json("metadata").notNull().default({}),
  storageKey: varchar("storage_key", { length: 500 }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const appointments = mysqlTable("appointments", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  businessId: varchar("business_id", { length: 36 })
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  conversationId: varchar("conversation_id", { length: 36 }).references(
    () => conversations.id,
  ),
  customerPhone: varchar("customer_phone", { length: 20 }).notNull(),
  service: varchar("service", { length: 255 }),
  slotAt: timestamp("slot_at", { mode: "date" }).notNull(),
  durationMin: int("duration_min").notNull().default(60),
  status: varchar("status", { length: 20 }).notNull().default("confirmed"),
  reminder24hSentAt: timestamp("reminder_24h_sent_at", { mode: "date" }),
  reminder2hSentAt: timestamp("reminder_2h_sent_at", { mode: "date" }),
  rebookNudgeSentAt: timestamp("rebook_nudge_sent_at", { mode: "date" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const escalations = mysqlTable("escalations", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  businessId: varchar("business_id", { length: 36 })
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  messageId: varchar("message_id", { length: 36 })
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  proposedReply: text("proposed_reply").notNull(),
  confidence: float("confidence"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  reviewedAt: timestamp("reviewed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ────────────────────────────────────────────
// Contacts / CRM
// ────────────────────────────────────────────

export const contacts = mysqlTable(
  "contacts",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    businessId: varchar("business_id", { length: 36 })
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    phone: varchar("phone", { length: 20 }).notNull(),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }),
    notes: text("notes"),
    source: varchar("source", { length: 50 }).default("whatsapp"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.businessId, t.phone)],
);

export const contactTags = mysqlTable(
  "contact_tags",
  {
    contactId: varchar("contact_id", { length: 36 })
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    tag: varchar("tag", { length: 100 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.contactId, t.tag] })],
);

// ────────────────────────────────────────────
// Broadcasts / Campaigns
// ────────────────────────────────────────────

export const broadcasts = mysqlTable("broadcasts", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  businessId: varchar("business_id", { length: 36 })
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  templateName: varchar("template_name", { length: 255 }),
  messageText: text("message_text"),
  audienceFilter: json("audience_filter").notNull().default({}),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  totalRecipients: int("total_recipients").notNull().default(0),
  sentCount: int("sent_count").notNull().default(0),
  failedCount: int("failed_count").notNull().default(0),
  scheduledAt: timestamp("scheduled_at", { mode: "date" }),
  sentAt: timestamp("sent_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const broadcastRecipients = mysqlTable("broadcast_recipients", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  broadcastId: varchar("broadcast_id", { length: 36 })
    .notNull()
    .references(() => broadcasts.id, { onDelete: "cascade" }),
  contactPhone: varchar("contact_phone", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  sentAt: timestamp("sent_at", { mode: "date" }),
  error: text("error"),
});

// ────────────────────────────────────────────
// Feedback & Reviews
// ────────────────────────────────────────────

export const feedback = mysqlTable("feedback", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  businessId: varchar("business_id", { length: 36 })
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  appointmentId: varchar("appointment_id", { length: 36 }).references(
    () => appointments.id,
  ),
  customerPhone: varchar("customer_phone", { length: 20 }).notNull(),
  rating: int("rating"),
  comment: text("comment"),
  feedbackSentAt: timestamp("feedback_sent_at", { mode: "date" }),
  respondedAt: timestamp("responded_at", { mode: "date" }),
  googleReviewNudgeSent: boolean("google_review_nudge_sent").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ────────────────────────────────────────────
// Quick Replies
// ────────────────────────────────────────────

export const quickReplies = mysqlTable("quick_replies", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  businessId: varchar("business_id", { length: 36 })
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  shortcut: varchar("shortcut", { length: 50 }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ────────────────────────────────────────────
// Business Hours
// ────────────────────────────────────────────

export const businessHours = mysqlTable(
  "business_hours",
  {
    businessId: varchar("business_id", { length: 36 })
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    dayOfWeek: int("day_of_week").notNull(),
    openTime: varchar("open_time", { length: 5 }).notNull().default("09:00"),
    closeTime: varchar("close_time", { length: 5 }).notNull().default("20:00"),
    isClosed: boolean("is_closed").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.businessId, t.dayOfWeek] })],
);

// ────────────────────────────────────────────
// Billing
// ────────────────────────────────────────────

export const subscriptions = mysqlTable("subscriptions", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  businessId: varchar("business_id", { length: 36 })
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  razorpaySubscriptionId: varchar("razorpay_subscription_id", { length: 255 }).unique(),
  razorpayCustomerId: varchar("razorpay_customer_id", { length: 255 }),
  planId: varchar("plan_id", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("created"),
  currentPeriodEnd: timestamp("current_period_end", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});
