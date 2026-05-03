# 02 — Architecture

## Tech stack (v1)

| Layer | Choice | Why |
|---|---|---|
| Web framework | **SvelteKit** | Same as Uni Chat; lets us reuse a lot of patterns |
| Auth | **Supabase Auth** (email or Google) | Same as Uni Chat; multi-tenant via RLS |
| Database | **Supabase Postgres** with `pgvector` for RAG | RLS gives multi-tenant isolation cheaply |
| Object storage | **Supabase Storage** | SMB document uploads (price lists, menus) |
| Cron / scheduler | **Supabase pg_cron** + Edge Functions | Reminders + rebook nudges. Pro plan ($25/mo) unlocks pg_cron. |
| LLM routing | **Custom multi-provider** (port from Uni Chat) | Cost-route: Gemini Flash for FAQ, Sarvam/Krutrim for vernacular, Sonnet only on hard cases |
| Vector store | **pgvector** in same Postgres | One DB, no extra ops |
| WhatsApp integration | **BSP (AiSensy or Gupshup) for v0**, then **direct Meta Cloud API** when volume justifies | BSP avoids 1–2 wk Meta verification on day 1 |
| Payments (SMB billing) | **Razorpay** with UPI | Indian SMBs need UPI |
| Hosting | **Vercel** for SvelteKit + Supabase Edge | Same shape as Uni Chat |
| Embeddings | **Gemini text-embedding-004** (free tier) | Cheap, decent quality for Indian-language docs |

## High-level system diagram

```
┌────────────────────┐
│  Customer's        │
│  WhatsApp app      │
└──────┬─────────────┘
       │ message
       ▼
┌────────────────────────┐         ┌─────────────────────┐
│  Meta WhatsApp Cloud   │ ──────► │   BSP (AiSensy /    │
│  API / BSP gateway     │         │    Gupshup)         │
└────────────────────────┘         └──────────┬──────────┘
                                              │ webhook
                                              ▼
                            ┌──────────────────────────────────┐
                            │  POST /api/whatsapp/webhook       │
                            │  (SvelteKit Edge function)        │
                            └─────────────┬────────────────────┘
                                          │
                                          ▼
                            ┌──────────────────────────────────┐
                            │  Tenant resolver                  │
                            │  (which business owns this WABA?) │
                            └─────────────┬────────────────────┘
                                          │
                                          ▼
                            ┌──────────────────────────────────┐
                            │  Skill router (intent classifier) │
                            │  cheap LLM call                   │
                            └─────────────┬────────────────────┘
                                          │
            ┌─────────────────┬───────────┼───────────────┬──────────────┐
            ▼                 ▼           ▼               ▼              ▼
      ┌─────────┐       ┌─────────┐  ┌─────────┐    ┌───────────┐  ┌─────────┐
      │ Booking │       │  FAQ    │  │ Reminder│    │  Rebook   │  │Fallback │
      │ skill   │       │ (RAG)   │  │ (cron)  │    │ (cron)    │  │ chat    │
      └────┬────┘       └────┬────┘  └────┬────┘    └─────┬─────┘  └────┬────┘
           │                 │            │               │             │
           └──────────┬──────┴────────────┴───────────────┴─────────────┘
                      │
                      ▼
            ┌──────────────────────────┐
            │  Multi-provider router    │ ◄── (port of Uni Chat's pattern)
            │  Gemini Flash / Sarvam /  │
            │  Groq / Sonnet            │
            └──────────────┬───────────┘
                           │ reply text
                           ▼
            ┌──────────────────────────┐
            │  WhatsApp send (BSP)      │
            └──────────────────────────┘

Cron-driven reminders + rebook nudges run on a parallel path:
  pg_cron → Edge Function → reads `appointments` → sends via WhatsApp
```

## Data model (v1)

Postgres schema with RLS, idiomatic Supabase patterns. SQL sketch:

```sql
-- Tenants (one row per SMB customer)
create table businesses (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  slug          text unique not null,
  vertical      text not null,                          -- 'salon' | 'clinic' | ...
  language      text not null default 'en',             -- primary reply language
  fallback_languages text[] not null default '{}',
  timezone      text not null default 'Asia/Kolkata',
  whatsapp_phone_number_id text unique,                 -- WABA identifier
  status        text not null default 'onboarding',     -- onboarding|active|suspended
  created_at    timestamptz not null default now()
);

-- Each business picks a set of skills (a "pack")
create table business_skills (
  business_id uuid not null references businesses(id) on delete cascade,
  skill_id    text not null,                            -- 'booking' | 'faq' | 'reminder' | ...
  config      jsonb not null default '{}'::jsonb,       -- per-skill knobs
  enabled     boolean not null default true,
  primary key (business_id, skill_id)
);

-- Knowledge corpus (RAG over uploaded docs)
create table business_docs (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  source      text not null,                            -- filename or 'manual'
  chunk_text  text not null,
  embedding   vector(768) not null,                     -- gemini-embedding-004 dim
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index on business_docs using ivfflat (embedding vector_cosine_ops);

-- Conversations indexed by customer phone number
create table conversations (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  customer_phone  text not null,                        -- E.164
  customer_name   text,                                 -- learned from WA profile or flow
  language        text,                                 -- detected
  state           jsonb not null default '{}'::jsonb,   -- in-flight skill state
  last_message_at timestamptz,
  unique (business_id, customer_phone)
);

-- Per-message log
create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  direction       text not null check (direction in ('in','out')),
  role            text not null check (role in ('customer','bot','owner')),
  text            text,                                 -- normalized text content
  raw             jsonb,                                -- full WA payload for debugging
  skill_id        text,                                 -- which skill produced this (if outgoing)
  needs_review    boolean not null default false,       -- low-confidence escalation
  created_at      timestamptz not null default now()
);

-- Bookings (vertical-aware; v1 = generic shape)
create table appointments (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  conversation_id uuid references conversations(id),
  customer_phone  text not null,
  service         text,                                 -- "Hair colour", "Haircut", ...
  slot_at         timestamptz not null,
  duration_min    int  not null default 60,
  status          text not null default 'confirmed',    -- confirmed|cancelled|completed|no_show
  reminder_24h_sent_at timestamptz,
  reminder_2h_sent_at  timestamptz,
  rebook_nudge_sent_at timestamptz,
  notes           text,
  created_at      timestamptz not null default now()
);

-- Owner-side escalation queue (low-confidence replies held for review)
create table escalations (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  message_id      uuid not null references messages(id) on delete cascade,
  proposed_reply  text not null,
  confidence      real,
  status          text not null default 'pending',      -- pending|approved|rewritten|sent|skipped
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);
```

Every table gets RLS:

```sql
alter table businesses enable row level security;
create policy "owner reads/writes own business"
  on businesses for all using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- Subordinate tables RLS via business_id
alter table conversations enable row level security;
create policy "owner reads/writes own conversations"
  on conversations for all using (
    business_id in (select id from businesses where owner_user_id = auth.uid())
  );
-- repeat shape for other tables
```

## Skill schema

A **skill** is a unit of conversational capability. Each skill is a small
TS module declaring:

```ts
interface Skill {
  id: string;                              // 'booking', 'faq', 'reminder', ...
  match: (intent: Intent, ctx: Ctx) => number;  // confidence 0-1 this skill applies
  handle: (msg: IncomingMessage, ctx: Ctx) => Promise<SkillResult>;
}

interface SkillResult {
  reply?: string;                          // text to send (if any)
  state?: Record<string, unknown>;         // updated conversation state
  sideEffects?: SideEffect[];              // booking_create, schedule_reminder, etc.
  confidence: number;                      // 0-1
  needsReview?: boolean;                   // force human review even if high-conf
}
```

The **router** does:

1. Receive incoming message
2. Call cheap intent-classifier LLM (Gemini Flash) → returns `Intent`
3. Each enabled skill scores itself via `match()`
4. Highest scorer's `handle()` runs
5. If confidence < threshold → goes to escalation queue, owner reviews,
   then sent
6. Otherwise → reply sent immediately via WhatsApp BSP

### v1 skill catalog (Salon pack)

| Skill | Trigger | What it does |
|---|---|---|
| `faq` | Any open question | RAG-answers from uploaded docs (price list, services) |
| `booking` | Customer asks for an appointment | Calendar lookup, slot offer, confirmation, write to `appointments` |
| `reschedule` | Customer requests a change | Find existing booking, offer slots, update |
| `cancel` | Customer cancels | Update `appointments.status`, ack |
| `reminder` (cron-driven) | 24h + 2h before each booking | Send WhatsApp reminder |
| `rebook_nudge` (cron-driven) | 30 days post-completion | Personalised rebook prompt |
| `cold_lead_nudge` (cron-driven) | 3, 7, 14 days after a customer messages without booking | Soft re-engagement |
| `fallback` | Nothing else matches with confidence | Generic LLM reply with business persona, mark for review |
| `escalate` | Confidence below threshold OR explicit "talk to owner" | Hold for owner review in dashboard |

## Provider routing strategy

Reuse Uni Chat's multi-provider pattern, but with very different cost
optimisation. WhatsAppFlow is ALL inference, no human watching the
stream — every paisa matters.

| Skill | Provider | Why |
|---|---|---|
| Intent classifier | Gemini Flash 2.5 (free tier) | Cheap + fast, classification doesn't need depth |
| FAQ / RAG answer | Gemini Flash + RAG context | Free tier, decent quality, 1M context for big docs |
| Booking dialogue | Gemini Flash | Mostly templated; structured output |
| Vernacular replies (Hindi/Hinglish) | Gemini Flash | Handles Hindi+Hinglish well |
| Vernacular replies (Tamil/Bengali/Marathi/etc.) | **Sarvam M** ($2/M tokens) | Stronger on Indic languages |
| Hard escalation drafts | Claude Sonnet 4.5 | Worth the cost for confidence-low cases the owner reviews |
| Embeddings | Gemini `text-embedding-004` | Free tier |

Critical: **agents don't go through user-facing rate limits** — billing
is per-tenant (the SMB), and we charge them a flat fee that absorbs
inference cost. Capacity planning is per-tenant message volume × average
tokens.

## Multi-tenancy / security

- Every table has `business_id` and RLS policy "owner = auth.uid()"
- Service role used only for webhook handler (must bypass RLS to receive
  messages on behalf of any tenant). Webhook handler resolves tenant from
  the WABA `phone_number_id` in the payload, then uses parameterised
  queries scoped to that tenant.
- WhatsApp Cloud API webhook verification: HMAC-SHA256 with `app_secret`
  (env var), reject any payload whose signature header doesn't match
- Owner dashboard runs as the owner's JWT, RLS does the isolation work
- Customer phone numbers are stored as E.164; **don't log them in
  application logs** (PII). Hashed phone for log correlation.

## WhatsApp Business API integration approach

**v0–v1: use a BSP (AiSensy or Gupshup)** to skip Meta verification
delays. Pros: setup in 1–2 days. Cons: 10–30% per-message markup, vendor
lock for messaging only.

**v2 (when ≥10 paying tenants): direct Meta Cloud API.** Saves the BSP
markup. Adds 1–2 weeks of Meta business-verification paperwork per
deployment. Hosted version handles this once for all tenants.

Webhook handler is identical for both — both deliver POSTed JSON in the
same shape. Only the send-message client differs (BSP REST endpoint vs
`graph.facebook.com/v20.0/...`).

## Reminder + nudge cron architecture

Supabase pg_cron schedules an Edge Function to run every 15 min:

```sql
select cron.schedule(
  'whatsappflow-reminders',
  '*/15 * * * *',
  $$ select net.http_post(url := '/edge/run-reminders', headers := ...) $$
);
```

The function:
1. Finds appointments due for reminder in the next 15 min that haven't
   been reminded yet
2. For each: builds personalised message, sends via BSP, sets
   `reminder_24h_sent_at` / `reminder_2h_sent_at`
3. Same path for rebook nudges (queries completed appointments where
   `now() - completed_at >= 30 days` and no nudge sent yet)

Idempotent: marker columns prevent double-sends if the function runs
concurrently or restarts mid-batch.

## What we explicitly DON'T build in v1

To avoid bloat:
- Voice WhatsApp messages (defer; transcription quality + cost too high
  for v1)
- Multi-location / chain support (different product shape)
- Inventory management for kirana (defer; vertical pack 3+)
- Custom AI training (LoRA fine-tuning) — RAG over uploaded docs is
  enough for v1
- Marketplace where users share skills (year-2 feature)
- Voice synthesis for outbound calls (separate product)
- E-commerce / order fulfilment (v2 if validated)
