# WhatsAppFlow

AI-powered WhatsApp automation platform for Indian small businesses. Handles customer conversations 24/7 — answers FAQs, books appointments, sends reminders, collects feedback, and nudges cold leads — all through WhatsApp, in any language.

## Who Is This For

- **Salon & spa owners** who lose bookings because they can't reply fast enough
- **Clinics & doctors** who need automated appointment reminders and prescription follow-ups
- **Coaching institutes** that want fee reminders and exam countdowns on WhatsApp
- **Retail shops** running promotions and broadcast campaigns to their customer base
- **Any Indian SMB** that wants a smart WhatsApp assistant without hiring a support team

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | SvelteKit 2, Svelte 5, Tailwind CSS 4 |
| Backend | SvelteKit server routes, Node.js |
| Database | MySQL (Railway) with Drizzle ORM |
| Auth | Auth.js (Google OAuth + Email Magic Link) |
| AI / LLM | Gemini Flash (primary), Groq Llama, Sarvam (Indian languages), Claude (escalations) |
| WhatsApp | Meta Cloud API / BSP integration |
| Payments | Razorpay subscriptions |
| File Storage | Cloudflare R2 |
| Deployment | Railway (Railpack builder) |
| CI/CD | GitHub Actions |
| Email (local dev) | Mailpit via Docker Compose |

## Features

- **Multi-vertical support** — salon, clinic, coaching, retail, or custom verticals with tailored skill sets
- **AI skill routing** — intent classifier routes messages to the right skill (FAQ, booking, rescheduling, cancellation, reminders, escalation)
- **Contacts CRM** — auto-creates contacts from WhatsApp conversations, manual entry, tagging, notes
- **Appointment management** — booking, confirmation, 24h/2h reminders, no-show tracking, rebook nudges
- **Broadcast campaigns** — bulk messaging with audience filtering by tags, template support
- **Feedback collection** — post-appointment rating requests, Google Review nudges for high ratings
- **Quick replies** — saved response templates with shortcuts
- **Knowledge base** — upload PDFs/docs, chunked for AI retrieval
- **Escalation queue** — low-confidence replies flagged for human review with approve/rewrite/skip actions
- **Analytics dashboard** — bookings per day, conversation trends, skill usage, no-show rates
- **Business hours** — configurable per day, used by the AI to set expectations
- **Tone configuration** — greeting style, formality level, custom instructions for the AI personality
- **Billing** — Razorpay subscription management with webhook processing
- **Skeleton loading screens** — page-specific skeleton layouts matching each page's structure during navigation

## Architecture

```
Customer sends WhatsApp message
        │
        ▼
Meta/BSP Webhook → /api/whatsapp/webhook
        │
        ▼
  Parse message → Find business by phone_number_id
        │
        ▼
  Intent Classifier (Gemini Flash)
        │
        ▼
  Route to Skill (FAQ, Booking, Reminder, etc.)
        │
        ▼
  Generate reply → Send via WhatsApp API
        │
        ▼
  Low confidence? → Queue for human review in Escalations
```

## How This Project Was Built

This project was developed using a structured AI-assisted workflow with Claude Code:

1. **Requirements & Architecture** — Discussed the product vision, target audience, and technical architecture with Claude Code. Defined the vertical-based approach, skill routing system, and multi-LLM strategy.

2. **Story Points & Task Breakdown** — Created detailed story points in Claude Code covering every feature: schema design, API routes, dashboard pages, AI integration, billing, and DevOps.

3. **Implementation** — Claude Code executed each story point: wrote the Drizzle schema, SvelteKit routes, AI skill router, WhatsApp webhook handler, dashboard UI, and all supporting infrastructure.

4. **Code Review & Bug Fixes** — After implementation, Claude Code performed a full code review of the codebase. Identified and fixed: security vulnerabilities, N+1 query patterns (600+ queries reduced to 4 on the contacts page), missing loading states, environment variable handling for Vite 8 compatibility, and Auth.js adapter incompatibilities.

5. **Testing & CI** — Created 42 unit tests covering config validation, WhatsApp message parsing, Razorpay webhook signatures, PDF text extraction, prompt template rendering, and model routing. Set up GitHub Actions CI pipeline that runs type checking, tests, and production build on every push and PR.

6. **Manual Verification** — Final review by the developer to verify all endpoints, dashboard pages, form actions, and edge cases were working correctly. Tested the full flow: sign-in → onboarding → dashboard → WhatsApp bot → escalation review.

7. **Deployment** — Pushed to GitHub, deployed on Railway with automatic builds. Configured environment variables, database migrations, and WhatsApp webhook URL.

## CI/CD Pipeline

Every push to `main` and every pull request triggers the GitHub Actions workflow:

```yaml
Steps:
  1. Install dependencies (npm ci)
  2. Type check (svelte-kit sync + svelte-check)
  3. Run tests (vitest — 42 tests across 6 test suites)
  4. Production build (vite build + adapter-node)
```

All 4 steps must pass before a PR can merge. The production build uses a fake DATABASE_URL since the Drizzle adapter uses lazy initialization — no real database connection is needed at build time.

Railway watches the `main` branch and auto-deploys on every push. The Railpack builder detects Node.js, runs `npm run build`, and starts the app with `node build`.

## Test Coverage

```
Test Suites:
  ✓ verticals.test.ts    — vertical config validation (10 tests)
  ✓ models.test.ts       — LLM model routing and config (5 tests)
  ✓ whatsapp.test.ts     — message parsing and signature verification (8 tests)
  ✓ razorpay.test.ts     — webhook signature verification (6 tests)
  ✓ file-extract.test.ts — PDF text extraction (7 tests)
  ✓ prompt-templates.test.ts — AI prompt template rendering (6 tests)

  6 test files | 42 tests | 0 failures
```

## Getting Started

See [STARTER.md](./STARTER.md) for full setup instructions, environment variables, database setup, seed data, and deployment steps.

Quick start:

```bash
git clone git@github.com:Drake0306/whatsapp_automation.git
cd whatsapp_automation
npm install
cp .env.example .env        # fill in DATABASE_URL and AUTH_SECRET at minimum
npm run db:generate
npm run db:migrate
docker compose up -d         # starts Mailpit for local email testing
npm run dev                  # http://localhost:5173
```

Local email testing UI: http://localhost:8025 (Mailpit catches all magic link emails)

## Project Structure

```
src/
├── auth.ts                      # Auth.js config (lazy-initialized)
├── hooks.server.ts              # SvelteKit server hooks
├── lib/
│   ├── components/              # Skeleton, PageSkeleton
│   ├── config/
│   │   ├── models.ts            # LLM model definitions + skill routing
│   │   └── verticals.ts         # Business vertical configs
│   ├── server/
│   │   ├── db/
│   │   │   ├── index.ts         # Lazy DB connection + Proxy wrapper
│   │   │   └── schema.ts        # Drizzle schema (18 tables, indexed)
│   │   ├── llm.ts               # Multi-provider LLM client
│   │   ├── razorpay.ts          # Razorpay SDK wrapper
│   │   ├── storage.ts           # Cloudflare R2 file operations
│   │   └── whatsapp.ts          # WhatsApp API client
│   ├── skills/                  # AI skill handlers + router
│   └── utils.ts
├── routes/
│   ├── auth/                    # Login page
│   ├── onboarding/              # First-time setup wizard
│   ├── dashboard/
│   │   ├── +layout.svelte       # Navigation skeleton loader
│   │   ├── contacts/            # CRM
│   │   ├── conversations/       # Chat threads
│   │   ├── appointments/        # Booking management
│   │   ├── broadcasts/          # Bulk campaigns
│   │   ├── escalations/         # Human review queue
│   │   ├── feedback/            # Ratings & reviews
│   │   ├── analytics/           # Charts & metrics
│   │   ├── knowledge/           # FAQ document upload
│   │   ├── quick-replies/       # Saved templates
│   │   ├── billing/             # Subscription plans
│   │   └── settings/            # Business config
│   └── api/
│       ├── whatsapp/webhook/    # WhatsApp message handler
│       ├── cron/reminders/      # Scheduled reminder jobs
│       ├── razorpay/webhook/    # Payment event handler
│       └── upload/              # File upload endpoint
├── scripts/
│   ├── seed.ts                  # Test data seeder
│   └── reset.ts                 # Database reset
└── tests/unit/                  # 42 unit tests
```

## License

Source-available. See LICENSE file for terms.
