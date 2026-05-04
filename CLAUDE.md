# CLAUDE.md

Project-level instructions for Claude Code when working on this codebase.

## Project

WhatsAppFlow — SvelteKit 2 SaaS platform. AI WhatsApp automation for Indian small businesses.

## Commands

- `npm run dev` — local dev server (port 5173)
- `npm run check` — svelte-kit sync + svelte-check (must pass before commit)
- `npm test` — vitest (44 tests, must pass before commit)
- `npm run build` — production build (needs `DATABASE_URL` env var, can be fake for CI)
- `npm run db:generate` — generate Drizzle migrations from schema
- `npm run db:migrate` — apply migrations to DATABASE_URL
- `npm run db:seed` — seed test data (change `TEST_USER_EMAIL` in `scripts/seed.ts` first)
- `npm run db:reset` — wipe all tables
- `docker compose up -d` — start Mailpit (local email on port 1025, UI on 8025)

## Key Design Patterns

### Lazy Initialization (Proxy + Singleton)
- `src/lib/server/db/index.ts` — DB connection uses a Proxy wrapper for build-time safety. `getDb()` returns the real Drizzle instance at runtime. Auth.js must use `getDb()` directly, not the Proxy (adapter does type checking).
- `src/auth.ts` — `SvelteKitAuth()` is called lazily on first request via `initAuth()`, not at module scope. This avoids build-time crashes when `DATABASE_URL` is unavailable.
- `src/lib/server/razorpay.ts`, `src/lib/server/storage.ts` — singleton pattern with cached instances.

### Environment Variables
- All server code uses `$env/dynamic/private` (SvelteKit module), NOT `process.env`. Vite 8 does not populate `process.env` from `.env` in SSR dev mode.
- `scripts/` directory uses `dotenv` directly since scripts run outside SvelteKit.

### Skill Routing (Strategy Pattern)
- `src/lib/config/models.ts` — maps skills to LLM models via `skillRouting` config
- `src/lib/skills/router.ts` — intent classifier (Gemini Flash) determines skill, routes to handler
- Each skill is a standalone handler in `src/lib/skills/`

### DB Query Optimization
- N+1 patterns eliminated with `inArray()` batch queries + `Promise.all()` parallelization
- Contacts page: 600+ queries reduced to 4 (batch tags, appointments, conversations via Maps)
- Escalations page: 100+ queries reduced to 1 (JOIN across escalations → messages → conversations)
- Dashboard, analytics, feedback, broadcasts, settings: all independent queries parallelized
- Schema has indexes on every filtered/joined column (see third parameter of `mysqlTable` calls)

### MySQL Pool Config
- `src/lib/server/db/index.ts` — `connectionLimit: 10`, `idleTimeout: 30000`, `enableKeepAlive: true`
- Remote Railway DB has ~50-200ms latency per query — parallelization matters

## UI Patterns

### Skeleton Loading (SvelteKit $navigating)
- `src/routes/dashboard/+layout.svelte` — intercepts `$navigating`, maps target URL to skeleton variant
- `src/lib/components/PageSkeleton.svelte` — 8 variants: dashboard, list, chat, table, analytics, escalations, form, cards
- `src/lib/components/Skeleton.svelte` — base primitive (animated pulse bar via Tailwind `animate-pulse`)

### Dashboard Subpage Layout (MUST follow for all new pages)
- Every dashboard subpage uses the same wrapper structure:
  ```svelte
  <div class="min-h-screen">
    <header class="border-b">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <h1 class="text-xl font-bold">Page Title</h1>
        <a href="/dashboard" class="text-sm text-muted-foreground hover:text-foreground">
          Back to Dashboard
        </a>
      </div>
    </header>
    <main class="mx-auto max-w-5xl px-4 py-8">
      <!-- page content -->
    </main>
  </div>
  ```
- Reference pages: `appointments`, `contacts`, `knowledge`, `broadcasts`
- New pages MUST also be added to the skeleton map in `src/routes/dashboard/+layout.svelte`
- New pages MUST also be added to the nav in `src/routes/dashboard/+page.svelte`

### Form Loading States (SvelteKit enhance)
- Every form uses `use:enhance` with `submitting` state → disabled buttons + loading text
- Pattern: set state true in enhance callback, reset in `async ({ update })` return

### Global Navigation Bar
- `src/routes/+layout.svelte` — animated loading bar at top using `$navigating` store

### Styling & Component Library
- Tailwind CSS 4 with `@tailwindcss/vite` plugin
- Custom CSS variables for theming (`--primary`, `--muted`, `--accent`, etc.) in `app.css`
- **shadcn-svelte** (https://www.shadcn-svelte.com/docs/components) for UI components
  - Config: `components.json` (base color: zinc, style: default)
  - Installed components: `badge`, `select`, `tabs`, `separator`
  - Component path: `src/lib/components/ui/`
  - Utility: `src/lib/utils.ts` — `cn()` helper, `WithElementRef`, `WithoutChild` types
  - Dependencies: `bits-ui`, `clsx`, `tailwind-merge`, `tailwind-variants`, `@lucide/svelte`
  - Add new components via: `npx shadcn-svelte@latest add <component> --yes`
  - Browse available components: https://www.shadcn-svelte.com/docs/components
- Plain Tailwind utility classes for custom layouts; shadcn components for interactive elements (badges, selects, tabs, etc.)

## Auth
- Auth.js (`@auth/sveltekit`) with Google OAuth + Nodemailer (magic link)
- `src/auth.ts` — Nodemailer config: `auth: false` when no SMTP credentials (for Mailpit), `secure` is dynamic based on port (465 = true, else false)
- DrizzleAdapter receives `getDb()` (real instance), not the Proxy `db`

## Schema
- 19 tables defined in `src/lib/server/db/schema.ts`
- Auth tables: users, accounts, sessions, verification_tokens
- Business tables: businesses, conversations, messages, appointments, escalations
- CRM: contacts, contact_tags
- Campaigns: broadcasts, broadcast_recipients
- Platform: platform_config (key-value store for super admin settings like model routing)
- Other: feedback, quick_replies, business_hours, business_docs, business_tone_config, business_skills, subscriptions

## WhatsApp Integration

### Architecture (BSP Model)
- Single platform-owned WhatsApp API token in `WHATSAPP_API_TOKEN` env var — serves all tenants
- Each tenant provides only their **Meta Phone Number ID** (not a phone number, not a token)
- Phone Number ID is a 15-16 digit numeric ID from Meta Dashboard → WhatsApp → API Setup
- Webhook at `/api/whatsapp/webhook` routes incoming messages by matching `phone_number_id` to `businesses.whatsappPhoneNumberId`

### Message Flow
1. Customer sends WhatsApp message → Meta forwards to webhook (POST)
2. Webhook parses payload, matches business by `phoneNumberId`
3. Intent classifier (Gemini Flash) categorizes: question, booking, reschedule, cancel, greeting, talk_to_owner, other
4. Matched skill generates reply using knowledge base docs from `business_docs` table
5. Reply sent back via `POST https://graph.facebook.com/v22.0/{phoneNumberId}/messages`

### WhatsApp Env Vars
```
WHATSAPP_MODE="bsp"                              # "bsp" or "direct"
WHATSAPP_VERIFY_TOKEN="<any-secret-you-invent>"  # must match Meta webhook config
WHATSAPP_APP_SECRET="<from Meta App Settings>"   # for signature verification (optional but recommended)
WHATSAPP_API_TOKEN="<system-user-token>"         # permanent token from Meta System User
WHATSAPP_API_URL="https://graph.facebook.com/v22.0"
WHATSAPP_BSP_API_URL=""                          # leave blank unless using a BSP
```

### Meta Dashboard Setup
1. Register webhook URL: `https://<domain>/api/whatsapp/webhook`
2. Set verify token to match `WHATSAPP_VERIFY_TOKEN`
3. Subscribe to **"messages"** webhook field
4. Add test recipient numbers with country code (e.g. `+917903826151`) and verify via OTP

### Phone Number Normalization
- `src/lib/server/phone.ts` — `normalizePhone()` auto-prepends `91` for 10-digit Indian numbers
- Applied on contacts form input; incoming webhook messages already have country code from Meta

### Testing WhatsApp (with Meta Test Number)
- Meta provides a free test number; find its **Phone Number ID** in API Setup
- App does NOT need to be in "Live" mode for testing — Development mode works
- Recipient numbers must be added to the allowed list with OTP verification
- Use **System User token** (permanent) — temporary tokens from API Setup expire in 24 hours
- To get a permanent token: Meta Business Suite → Settings → System Users → assign app → generate token with `whatsapp_business_management` + `whatsapp_business_messaging` permissions

### Troubleshooting WhatsApp
- **No webhook received**: Check "messages" field is subscribed in Meta webhook config
- **"unknown_business" in logs**: Phone Number ID in database doesn't match what Meta sends — update via Settings page
- **"Recipient phone number not in allowed list"**: Add number with `+91` prefix in Meta API Setup and complete OTP
- **"Object with ID does not exist"**: Wrong Phone Number ID stored (entered phone number instead of Meta's numeric ID)
- **Gemini 404 error**: Model ID expired — check `src/lib/config/models.ts` uses a valid model (list via Gemini API)
- **Token expired**: Replace with System User token; temporary tokens die after 24 hours
- **Railway logs**: All webhook steps logged with `[webhook]` prefix — check Railway dashboard → Logs

### Knowledge Base
- Upload via `/dashboard/knowledge` — supports file upload (PDF, TXT, CSV) or direct text entry
- Text is chunked (800 words, 100 overlap) and stored in `business_docs` table
- FAQ skill retrieves relevant chunks via keyword matching when answering questions
- No R2 required — works with DB-only storage when R2 credentials are not configured
- Sample template available via "Download Template" button on the page

## Slot Engine & Booking

### Architecture
- `src/lib/server/slot-engine.ts` — core availability and booking engine
- Timezone-aware using `Intl.DateTimeFormat` for all local time conversions
- 15-minute slot intervals, capacity-aware (supports both single-chair salons and multi-table restaurants)

### Two Booking Modes
- **Instant** (salons, gyms): auto-confirmed on booking, customer gets immediate confirmation
- **Queue** (restaurants): booking set to "pending", business owner confirms/rejects via dashboard

### Key Functions
- `getActiveServices(businessId)` — returns all active services for a business
- `getAvailableSlots({businessId, serviceId, date, timezone})` — returns open time slots for a given day
- `checkSlotAvailable({businessId, serviceId, slotAt, timezone})` — checks if a specific slot is bookable
- `bookSlot({businessId, serviceId, slotAt, customerPhone, conversationId, timezone})` — books a slot with optimistic insert + recheck for race conditions
- `suggestAlternatives({businessId, serviceId, preferredDate, timezone})` — finds nearby available slots

### Slot Blocks
- Business owners can block time ranges via Services dashboard (`/dashboard/services`)
- Blocks apply to all services or a specific service
- Stored in `slot_blocks` table, respected by slot engine queries

### Vertical Defaults
- Each vertical in `src/lib/config/verticals.ts` defines `appointmentTypes` with `defaultDuration`, `defaultCapacity`, `defaultBookingMode`
- Seeded during onboarding and admin invite into `business_services` table

## Deployment
- **Railway** with Railpack builder — auto-detects Node, runs `npm run build`, starts with `node build`
- **Production URL**: `https://whatsappautomation-production-1928.up.railway.app`
- **GitHub Actions CI** (`.github/workflows/ci.yml`) — type check → test → build on every push/PR to main
- Build uses fake `DATABASE_URL` since DB init is lazy
- SMTP in production: Resend (`smtp.resend.com`, port 465)
- SMTP in local dev: Mailpit via Docker Compose (port 1025, no auth)
- **Important**: env vars must be set in Railway Variables tab (not just local `.env`)

## Testing
- Vitest with SvelteKit vite config (`vitest.config.ts`)
- 44 tests in `tests/unit/`: verticals, models, whatsapp parsing, razorpay signatures, PDF extraction, prompt templates
- Tests do NOT hit the database — pure unit tests on config and utility modules
- CI blocks merge if any test fails

## File References
- Schema: `src/lib/server/db/schema.ts`
- DB connection: `src/lib/server/db/index.ts`
- Auth config: `src/auth.ts`
- WhatsApp webhook: `src/routes/api/whatsapp/webhook/+server.ts`
- WhatsApp client: `src/lib/server/whatsapp.ts`
- Phone normalization: `src/lib/server/phone.ts`
- Knowledge base upload: `src/routes/api/upload/+server.ts`
- Knowledge base page: `src/routes/dashboard/knowledge/+page.svelte`
- Cron reminders: `src/routes/api/cron/reminders/+server.ts`
- Slot engine: `src/lib/server/slot-engine.ts`
- Skill router: `src/lib/skills/router.ts`
- Intent classifier: `src/lib/skills/classifier.ts`
- Booking skill: `src/lib/skills/booking.ts`
- Cancel skill: `src/lib/skills/cancel.ts`
- Reschedule skill: `src/lib/skills/reschedule.ts`
- Services management: `src/routes/dashboard/services/+page.svelte`
- LLM clients: `src/lib/server/llm.ts`
- Model config: `src/lib/config/models.ts`
- Platform config (runtime model overrides): `src/lib/server/platform-config.ts`
- Super admin guard: `src/lib/server/admin.ts`
- Super admin dashboard: `src/routes/admin/+page.svelte`
- Admin model routing: `src/routes/admin/models/+page.svelte`
- Admin invite flow: `src/routes/admin/invite/+page.svelte`
- Admin login: `src/routes/admin/login/+page.svelte`
- Email utility: `src/lib/server/email.ts`
- shadcn components: `src/lib/components/ui/`
- Seed script: `scripts/seed.ts`
- CI workflow: `.github/workflows/ci.yml`
- Env example: `.env.example`
- Setup guide: `STARTER.md`
