# CLAUDE.md

Project-level instructions for Claude Code when working on this codebase.

## Project

WhatsAppFlow — SvelteKit 2 SaaS platform. AI WhatsApp automation for Indian small businesses.

## Commands

- `npm run dev` — local dev server (port 5173)
- `npm run check` — svelte-kit sync + svelte-check (must pass before commit)
- `npm test` — vitest (42 tests, must pass before commit)
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

### Form Loading States (SvelteKit enhance)
- Every form uses `use:enhance` with `submitting` state → disabled buttons + loading text
- Pattern: set state true in enhance callback, reset in `async ({ update })` return

### Global Navigation Bar
- `src/routes/+layout.svelte` — animated loading bar at top using `$navigating` store

### Styling
- Tailwind CSS 4 with `@tailwindcss/vite` plugin
- Custom CSS variables for theming (`--primary`, `--muted`, `--accent`, etc.) in `app.css`
- No component library — all UI is plain Tailwind utility classes

## Auth
- Auth.js (`@auth/sveltekit`) with Google OAuth + Nodemailer (magic link)
- `src/auth.ts` — Nodemailer config: `auth: false` when no SMTP credentials (for Mailpit), `secure` is dynamic based on port (465 = true, else false)
- DrizzleAdapter receives `getDb()` (real instance), not the Proxy `db`

## Schema
- 18 tables defined in `src/lib/server/db/schema.ts`
- Auth tables: users, accounts, sessions, verification_tokens
- Business tables: businesses, conversations, messages, appointments, escalations
- CRM: contacts, contact_tags
- Campaigns: broadcasts, broadcast_recipients
- Other: feedback, quick_replies, business_hours, business_docs, business_tone_config, business_skills, subscriptions

## Deployment
- **Railway** with Railpack builder — auto-detects Node, runs `npm run build`, starts with `node build`
- **GitHub Actions CI** (`.github/workflows/ci.yml`) — type check → test → build on every push/PR to main
- Build uses fake `DATABASE_URL` since DB init is lazy
- SMTP in production: Resend (`smtp.resend.com`, port 465)
- SMTP in local dev: Mailpit via Docker Compose (port 1025, no auth)

## Testing
- Vitest with SvelteKit vite config (`vitest.config.ts`)
- 42 tests in `tests/unit/`: verticals, models, whatsapp parsing, razorpay signatures, PDF extraction, prompt templates
- Tests do NOT hit the database — pure unit tests on config and utility modules
- CI blocks merge if any test fails

## File References
- Schema: `src/lib/server/db/schema.ts`
- DB connection: `src/lib/server/db/index.ts`
- Auth config: `src/auth.ts`
- WhatsApp webhook: `src/routes/api/whatsapp/webhook/+server.ts`
- Cron reminders: `src/routes/api/cron/reminders/+server.ts`
- Skill router: `src/lib/skills/router.ts`
- LLM clients: `src/lib/server/llm.ts`
- Seed script: `scripts/seed.ts`
- CI workflow: `.github/workflows/ci.yml`
- Env example: `.env.example`
- Setup guide: `STARTER.md`
