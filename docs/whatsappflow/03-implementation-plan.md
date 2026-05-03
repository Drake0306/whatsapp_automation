# 03 — Implementation plan

Phased plan from empty repo to first paying customers. Solo-dev pace.

## Phase 0 — foundation (week 0–1, ~5 working days)

Goal: empty SvelteKit + Supabase project that can receive a WhatsApp
webhook and reply with "hello world."

**Tasks:**

- [ ] Init repo (`whatsappflow`), MIT licence, public on GitHub from day 1
- [ ] Scaffold SvelteKit + TypeScript + Tailwind + shadcn-svelte (port the
      shell from chat-cd; see `04-uni-chat-references.md`)
- [ ] Create Supabase project, install pgvector + pg_cron extensions
- [ ] Create initial migrations: `businesses`, `messages`,
      `conversations` (skip the rest for now)
- [ ] Sign up for AiSensy (or Gupshup) BSP sandbox — get a test WhatsApp
      number
- [ ] Build `/api/whatsapp/webhook` endpoint that:
      - Verifies BSP signature
      - Parses incoming message
      - Replies with hardcoded "Hello, this is WhatsAppFlow!"
- [ ] Send a test message from your phone, confirm round-trip works
- [ ] Set up Vercel deploy + env vars

**Done when:** you can DM your test WhatsApp number and the bot
echoes a fixed reply.

## Phase 1 — Salon Pack v1 (week 2–6, ~25 working days)

Goal: fully functional Salon Pack handling FAQ + booking + reminders for
3 design partners.

### Week 2 — owner dashboard + onboarding

- [ ] Auth flow (Supabase magic link or Google)
- [ ] `businesses` row creation on signup
- [ ] Onboarding wizard:
      - Step 1: business name, vertical = Salon, language, timezone
      - Step 2: connect WhatsApp (paste WABA token / use BSP-provided
        flow)
      - Step 3: upload services + price list (PDF or photo)
      - Step 4: tone preferences (3 short fields)
      - Step 5: confirm
- [ ] Document parser: PDF/image → text → embedding chunks → store in
      `business_docs`
      (port chat-cd's `src/lib/file-extract.ts` for PDF/text path; add
      pgvector embedding via Gemini)

### Week 3 — multi-provider routing + skill router

- [ ] Port chat-cd's `src/lib/config/models.ts` → trim to providers
      relevant for SMB use (Gemini, Sarvam, Groq)
- [ ] Server-side provider router (port from `src/routes/api/chat/+server.ts`,
      adapt for non-streaming request/response)
- [ ] Skill interface + router (`src/lib/skills/router.ts`)
- [ ] Intent classifier (Gemini Flash, ~5 intents: question, booking,
      reschedule, cancel, other)
- [ ] FAQ skill: RAG over `business_docs` → cheap LLM → reply

### Week 4 — booking + appointments

- [ ] `appointments` table + migrations
- [ ] In-app calendar (simple table view by day)
- [ ] Booking skill: detects time/service intent, offers slots from
      calendar, writes confirmed appointment, replies with details
- [ ] Reschedule + cancel skills (look up by phone, update row)
- [ ] Owner dashboard: today's appointments view
- [ ] (Stretch) Google Calendar OAuth + 2-way sync

### Week 5 — reminders + nudges + escalation

- [ ] pg_cron job firing Edge Function every 15 min
- [ ] Reminder skill: finds 24h+2h-due appointments, sends WA message
- [ ] Rebook nudge skill: finds 30-day-old completed appointments,
      sends nudge
- [ ] Cold-lead nudge skill: finds conversations with no booking after
      3/7/14 days
- [ ] Escalation queue: low-confidence replies held in `escalations`,
      owner reviews + approves/rewrites in dashboard
- [ ] Confidence threshold tuning (start strict at 0.85, loosen with
      data)

### Week 6 — polish + design partners onboarding

- [ ] Hindi default tone for replies (system prompt template)
- [ ] Hinglish handling (test with real Indian customer messages)
- [ ] Owner dashboard analytics: bookings/day, no-show rate, revenue
      attribution
- [ ] Razorpay integration (UPI subscription for ₹999/₹2499/mo)
- [ ] Open the repo publicly on GitHub with a strong README + demo GIF
- [ ] Onboard first 3 design partner salons (in person if possible —
      Indore / Pune / Bangalore based on your network)
- [ ] First case-study numbers at week 12 from these partners

## Phase 2 — second + third vertical packs (weeks 7–12)

After Salon is stable with paying users:

- [ ] **Clinic Pack**: similar to Salon but with prescription-pickup
      reminders, multi-doctor calendar, GST-invoice send
- [ ] **Coaching Centre Pack**: batch enrolment, fee reminders, doubt-
      clearing FAQ (RAG over course material), exam-date countdowns
- [ ] Generalise the appointment model so Clinic and Salon share a base
      with vertical-specific extensions
- [ ] Vertical-specific dashboards
- [ ] Move to direct Meta WhatsApp Cloud API once tenant count > 10
      (cuts BSP markup)

## Phase 3 — scale + open-source flywheel (months 4–12)

- [ ] Skill marketplace: third-party skills can be registered against
      a vertical
- [ ] White-label tier: agencies resell as own brand to local SMB
      networks
- [ ] Multi-language audit: Tamil, Bengali, Marathi, Telugu, Kannada
      tested on real users; route to Sarvam M for non-Hindi
- [ ] BSP partner integration (sell-through deal with AiSensy or
      Gupshup)
- [ ] Voice WhatsApp messages — transcription via Sarvam Speech, reply
      as text or TTS
- [ ] Annual plans + discount; corporate / multi-location tier

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| Meta rejects business verification | Use BSP for v0–v1; only direct Cloud API after we're cash-flow positive |
| Bot gives wrong / embarrassing reply on day 1 | Strict confidence threshold; escalation queue; owner reviews everything for first 2 weeks of each new tenant |
| SMB doesn't want to pay for AI yet | The 3 design partners are ENTIRELY free for 6 months in exchange for testimonials. After that, the case studies become the sales asset for cold outbound |
| Razorpay / UPI integration friction | Use Razorpay's hosted subscription pages for v1 (no in-app card form needed) |
| Pricing is too high / too low for the market | Run Phase 0/1 with all 3 design partners on free, observe willingness to pay at month 4. ₹999 is a starting hypothesis, not a fact |
| Vernacular quality varies | Multilingual frontier models (Gemini, Claude) handle Hindi/Tamil; specialised Sarvam fallback if quality drops; never auto-send if the reply was generated below confidence |
| Customer leaks PII / sensitive content | Store messages but NEVER log full message text in application logs; hash phone numbers in logs; document this in privacy policy |
| Single-developer bus factor | Open-source from day 1, write good README, accept contributors before you need them |

## Definition of "done" for v1

A salon owner in Indore who has never used the product before can:
1. Sign up at whatsappflow.app in <30 seconds
2. Connect their WhatsApp Business number
3. Upload their price list (1 PDF)
4. Be live receiving and replying to customer messages within 30 minutes
5. See their first auto-booking within 24 hours
6. See their first reminder fire correctly the next day

If those 6 steps work for 3 different salons without the founder
intervening manually, v1 is done.
