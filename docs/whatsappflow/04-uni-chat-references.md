# 04 — Uni Chat code references

## Source repo

The Uni Chat codebase is the reference implementation for several
patterns WhatsAppFlow will reuse. Repo location:

```
~/Developer/Github/chatCD/
```

(GitHub: the chat-cd / Uni Chat repo. All paths below are relative to
the repo root.)

This doc lists the patterns worth copying or adapting, with file paths
and notes. **Do not blindly copy whole files** — chat-cd has chat-
specific concerns (streaming, thinking models, image attachments,
tier-rate-limited free chat) that aren't relevant to WhatsAppFlow.

## Direct ports (copy + light adaptation)

### Multi-provider routing

| chat-cd path | What's there | Adapt how |
|---|---|---|
| `src/lib/config/models.ts` | Single source of truth for all LLM models with provider, capabilities, route, apiModelId. ~400 lines, lots of editorial fields | **Trim aggressively.** WhatsAppFlow only needs ~5 models: Gemini Flash, Gemini Flash-Lite, Sarvam M, Groq Llama 3.3, Claude Sonnet 4.5. Drop UI fields (descriptions, badges, isNew). Keep `provider`, `route`, `apiModelId`, `contextWindow`, `pricing` |
| `src/routes/api/chat/+server.ts` | Top-level chat router that authenticates, rate-limits, forwards to per-provider routes | **Adapt for non-streaming.** WhatsAppFlow doesn't stream to the customer (WhatsApp is request/response). Replace `tee()` + SSE with a single `await response.text()`. Drop the `messageId` / `chatId` payload (different shape). Keep the auth + provider-resolution structure |
| `src/routes/api/providers/gemini/+server.ts` | Gemini SSE → OpenAI SSE transformer; image_url → inline_data | **Simplify.** Skip the streaming transform — call Gemini's non-streaming endpoint. Keep the system-instruction extraction (line ~99-101) and the `image_url` → base64 fetch helper if WhatsAppFlow ever sends images (not in v1) |
| `src/routes/api/providers/openrouter/+server.ts` `groq/+server.ts` `mistral/+server.ts` | Passthrough OpenAI-shape proxies | **Copy verbatim, drop streaming.** Replace SSE pass-through with single response read |

### Auth + multi-tenant patterns

| chat-cd path | What's there | Adapt how |
|---|---|---|
| `src/lib/supabase.ts` | Browser Supabase client (`createBrowserClient` from `@supabase/ssr`) with `cache: 'no-store'` | **Copy verbatim.** Same browser client pattern works for SMB owner dashboard |
| `src/lib/server/supabase.ts` | Server-side `getAuthUser(request)` validation + service-role client singleton | **Copy verbatim.** WhatsAppFlow webhook handler will use the service-role client to bypass RLS when receiving WhatsApp messages on behalf of any tenant |
| `src/lib/stores/auth.svelte.ts` | Reactive auth store. Important pattern: `onAuthStateChange` callback must NOT be async or await Supabase calls (deadlocks `_initialize()`) | **Copy the pattern, adapt the fetched fields.** Replace tier/profile fetch with the SMB's `business_id` lookup. Keep the no-await rule — it's a real Supabase footgun |
| `supabase/migrations/20260426120000_profiles.sql` | Profile row auto-create trigger on `auth.users` insert | **Use the trigger pattern**, but instead of profiles, create an empty `businesses` row in onboarding state |

### Settings / dashboard UI shell

| chat-cd path | What's there | Adapt how |
|---|---|---|
| `src/routes/settings/+layout.svelte` | Auth-gated layout with profile card, tab strip with mobile horizontal scroll + chevron affordances, theme toggle | **Reuse the entire shell.** Replace tabs with WhatsAppFlow ones (Dashboard, Conversations, Appointments, Skills, Knowledge Base, Billing) |
| `src/routes/settings/+page.svelte` | Account / customisation tab content with form-save state machine (idle/saving/saved/error), tier-aware caps | **The save-state pattern is gold.** Reuse for the SMB onboarding wizard's per-step save. Drop tier caps (different model — billing is per-message volume not per-field length) |
| `src/lib/stores/customization.svelte.ts` | Localstorage cache + Supabase canonical store + `syncFromDb` pattern | **Copy the pattern verbatim.** Becomes `business-config.svelte.ts` — same shape, different fields |
| `src/lib/components/app-sidebar.svelte` | Sidebar with header + content + footer slots, mobile-collapsible, sidebar provider integration | **Reuse structure.** Replace chat-history list with conversations list; replace user footer with business-switcher (if multi-business support added later) |
| `src/lib/components/legal-page-shell.svelte` | Standalone shell for /privacy and /terms with back-button, theme toggle, prose body | **Copy verbatim.** Useful for Privacy Policy, Terms, Cookie Notice in the new product |

### Document upload + extraction

| chat-cd path | What's there | Adapt how |
|---|---|---|
| `src/lib/file-extract.ts` | Client-side PDF.js + File.text() extraction with per-file size + cumulative size limits, fence-collision-safe markdown emit | **Reuse the extraction core.** SMBs upload price lists / menus / service docs the same way users upload files in Uni Chat. Drop the markdown-fence helpers (not needed); add a chunker + Gemini embedding step that writes to `business_docs` |
| `supabase/migrations/20260429160000_message_attachments.sql` `20260429180000_chat_attachments_storage.sql` | JSONB attachments column + Storage bucket with RLS by `auth.uid()` folder | **Mostly skip.** WhatsAppFlow doesn't need user-message attachments. But the **Storage bucket RLS pattern** — `(storage.foldername(name))[1] = auth.uid()` — is exactly what we want for SMB-uploaded knowledge files |

## Reference-only (read for inspiration, don't copy)

These are educational but the WhatsAppFlow shape is different enough that
copying would create more problems than it solves.

| chat-cd path | Why it's worth reading | Why NOT to copy |
|---|---|---|
| `src/lib/components/chat-view.svelte` (~1500 lines) | Full chat UI implementation: message list, composer, file attachments, streaming SSE parser, attachment rendering, model selector integration | Massive, chat-specific, has dozens of edge cases that don't apply (thinking blocks, image lightbox, temporary chat mode, copy buttons, code-block collapse). WhatsAppFlow's "conversations" view is much simpler — read-only log + compose-as-owner |
| `src/lib/server/stream-persist.ts` | Server-side SSE parser + tee + DB write of streaming responses | WhatsAppFlow doesn't stream to clients. Skip entirely |
| `src/lib/server/rate-limit.ts` | Per-user / per-IP rolling-window rate limiter with tier policies | Different model. WhatsAppFlow rate limits are per-tenant per-month conversation count, not per-window. Roll your own simpler counter on `conversations.last_message_at` |
| `src/lib/think-tag-stripper.ts` | Streaming-safe `<think>...</think>` extractor | Irrelevant — WhatsApp users don't see reasoning tokens |
| `src/lib/markdown.ts` | Lazy-loaded unified+remark+rehype+shiki pipeline for Markdown rendering | WhatsApp formatting is text-with-very-limited-markup (`*bold*`, `_italic_`, `~strike~`, ``` ``` ```code blocks). Don't bring the full Markdown stack; write a tiny formatter |
| `src/lib/stores/chats.svelte.ts` | Dual-backend (Supabase + localStorage) chat persistence with optimistic updates | Wrong shape. WhatsAppFlow persistence is server-side authoritative; no localStorage fallback. Read for the optimistic UI patterns, write a simpler store |

## Patterns NOT to bring over

These exist in chat-cd because of specific Uni Chat decisions that don't
make sense in WhatsAppFlow. **Resist the temptation to copy.**

- **Tier-based per-window rate limits.** WhatsAppFlow billing is
  subscription + per-message-pass-through, not "5 messages per 4 hours".
- **Guest mode with localStorage chats.** WhatsAppFlow has no guests.
  Auth or nothing.
- **Multi-provider model selector UI.** SMB owner shouldn't see
  individual models; the system picks Gemini / Sarvam / Sonnet
  based on intent. Hide all model choice from the SMB.
- **Thinking blocks / reasoning display.** Customers should never see
  reasoning tokens; owners might want them in escalation review, but
  that's a different surface.
- **Streaming SSE plumbing (`tee()`, `parseSSE`, `ThinkTagStripper`).**
  WhatsApp is request/response. All this complexity is dead weight.
- **Free / Pro / Max tier labelling.** Different SaaS shape — call
  WhatsAppFlow tiers Starter / Pro / Multi-vertical or whatever the
  pricing copy lands on, not the chat-app names.
- **Image attachment + signed URL machinery.** Don't bring it over for
  v1 — WhatsApp media has its own URL lifecycle (Meta-hosted, expires
  after 30 days, downloadable via separate API call). When/if v1.5 adds
  image-handling, build it from scratch against Meta's media API.
- **`+layout.ts` with `ssr = false`.** WhatsAppFlow CAN do SSR for the
  owner dashboard (no need for chat-style CSR-only constraint). Default
  to SSR; opt out per-route only when needed.
- **Custom-colors store + boring theme toggle.** Out of scope for v1.

## Library / framework choices to copy verbatim

These were chosen carefully in chat-cd and the same reasoning applies:

- **SvelteKit + TypeScript** as base
- **shadcn-svelte** for UI primitives
- **TailwindCSS v4**
- **`@lucide/svelte`** for icons
- **`@supabase/ssr` + `@supabase/supabase-js`** for auth + DB
- **`unified` + `remark-gfm`** if any rich text needed (probably skip)
- **`pdfjs-dist`** for PDF extraction (already used in `file-extract.ts`)

New for WhatsAppFlow:
- **`@supabase/supabase-js`** with `pgvector` Postgres function for
  similarity search
- **WhatsApp Business API SDK** of choice (or hand-rolled HTTP — the API
  is small)
- **Razorpay Node SDK** for payments

## Migration ordering when porting

If you're starting the new repo from scratch, recommended sequence:

1. SvelteKit init + Tailwind + shadcn-svelte (mirror chat-cd setup)
2. Supabase init + first migration creating `businesses` and the auto-
   create trigger (port from chat-cd `profiles` migration)
3. Auth store (port `auth.svelte.ts`, simplify)
4. Settings layout shell (port `settings/+layout.svelte` skeleton)
5. WhatsApp webhook handler (new code)
6. Models config (port + trim `models.ts`)
7. Provider routes (port + de-stream)
8. Skill router + first skills (FAQ, booking) — new code
9. pg_cron + reminder Edge Function — new code
10. Onboarding wizard (port the form-save state pattern from chat-cd
    `settings/+page.svelte`)
11. Razorpay subscription — new code
12. Polish, deploy

Estimated calendar time per `03-implementation-plan.md`: ~6 weeks
solo to v1.
