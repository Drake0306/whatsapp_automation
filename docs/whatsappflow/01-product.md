# 01 — Product spec

## Problem

Indian small businesses (salons, clinics, coaching centres, kirana shops,
boutique retail) live on WhatsApp. The owner or a junior staffer manually
juggles dozens of incoming chats per day, most of which repeat the same
three questions. Manual handling has measurable, recurring costs:

- 60% of staff time goes to the same 3 questions (price, hours, stock/
  availability) — Turbodev SMB report 2026
- 32% baseline no-show rate in salons; reminders rarely get sent — Invoay
  2026
- Leads going cold overnight because replies don't happen out of hours —
  Turbodev 2026
- Customer relationships locked to the receptionist's personal WhatsApp;
  when they leave, the contacts walk out with them
- WhatsApp Business app does basic templating but doesn't reason, doesn't
  book, doesn't remind, doesn't nudge

Owners want this fixed but the products that solve it today are either
generic-and-expensive (Lindy at $50/mo with poor reviews and Western
defaults), enterprise-tier (Sarvam, Gnani target large businesses), or
template-only (BotPenguin, AiSensy do flow-builders, not reasoning).

## Solution in one line

A WhatsApp Business AI agent specialised per vertical, vernacular by
default, ₹999–2999/mo, that the owner can set up in 30 minutes and
forget about.

## Target customer for v1

**Single-location Indian salon owner**, 1–8 chairs, ₹3–15L monthly
revenue, currently manages WhatsApp on phone or via one receptionist.
Indore, Pune, Jaipur, Bangalore, Hyderabad, Coimbatore — Tier-1 + Tier-2
cities where WhatsApp Business is already in habitual use.

Why salon as the wedge:
- Best-documented case studies with hard numbers (Invoay, Bird/Aimy,
  GreatWorks Bangalore)
- Booking + reminder + rebook-nudge is a high-ROI loop with clear maths
- Failure modes are self-contained (a wrong reply isn't a clinical issue)
- Dense WhatsApp usage already exists; we're not creating habit
- Lower regulatory complexity than clinic / pharmacy / financial verticals

Adjacent verticals to expand into post-v1: dental clinics, physiotherapy,
salons-with-spa, fitness studios, coaching centres, dermatology.

Verticals to defer: healthcare with prescriptions, anything financial,
multi-location chains (different shape of product).

## Value proposition (what the owner experiences)

The owner connects their WhatsApp Business number, picks "Salon Pack",
uploads their service+price list (PDF or photo), connects Google Calendar
or uses the built-in scheduler, and writes 2–3 lines of "tone" preferences.
Done in 30 minutes.

From that moment on, every customer message gets a reply within seconds,
in the language the customer wrote in. The bot:

- Answers price/hours/services questions from the uploaded knowledge base
- Books appointments by checking the calendar, confirming the slot, and
  sending a Google Maps link
- Sends reminders 24h and 2h before each appointment
- Sends rebook nudges 30 days after a haircut, 6 weeks after colour, etc.
- Recovers cold leads with day-3 / day-7 / day-14 follow-ups
- Hands off to the owner when confidence is low (escalation queue in the
  dashboard)

The dashboard shows: today's bookings, conversation logs, escalations
needing review, weekly revenue + no-show stats.

## Pricing

| Tier | ₹/mo | Includes | Limits |
|---|---|---|---|
| **Starter** (Salon Pack) | **₹999** | 1 WhatsApp number, 1 vertical pack, 500 customer convos/mo | + WhatsApp BSP message charges passed through |
| **Pro** (Salon Pack) | **₹2,499** | unlimited convos, calendar sync, escalation queue, analytics | + WhatsApp BSP message charges (better rates) |
| **Multi-vertical** | **₹3,999** | 2 packs (e.g., salon + spa) | as above |
| **White-label** (Phase 3) | **custom** | resell as own brand to your local network | — |

Indian payment friction is real: support **UPI via Razorpay** from day 1.
Credit cards are optional, not required.

## ROI walkthrough — the pitch

Priya runs an 8-chair salon in Indore. Current state: ₹8L/mo revenue,
1 full-time receptionist (Komal), ~30 leads/day on WhatsApp.

| Line | Today (manual) | With WhatsAppFlow |
|---|---|---|
| Lead response time | 2–6 hours, 30% leads cold by morning | <10 seconds, 24/7 |
| No-show rate (industry: 32%) | 32% | 9% with 24h+2h reminders |
| Repeat booking nudge | Doesn't happen consistently | 30-day auto-nudge to every prior client |
| Receptionist time on FAQ | ~3 hours/day | ~30 min/day on escalations only |
| Monthly revenue | ₹8.0L | ₹10.0–11.2L (+25–40% per Invoay case) |
| Recovered no-show revenue | — | +₹40K/mo |
| Operating cost | Komal's ₹20K salary | ₹3K (WhatsAppFlow + BSP) — Komal redeployed to treatments |

Numbers cited: Invoay (25–40% revenue lift in 6 months for Indian salons),
Bird/Aimy (30% repeat-booking lift), GreatWorks Bangalore (80% bookings
automated, 2.5× monthly appointments). All on WhatsAppFlow's actual
target customer profile.

**Payback for the owner: less than a week.**

## GTM motion

This is **not** a product that wins by SEO + organic signups. SMB owners
don't search "WhatsApp AI agent for my salon". The motion is:

1. **Phase 0 — design partners (3 weeks).** Cold-DM + visit 5 salons in a
   single Indian city you can drive to. Offer free for 6 months in exchange
   for installs, weekly feedback calls, and right to use case-study numbers.
   Goal: 3 paying-by-month-3 design partners. The numbers from these
   partners become every future sales asset.
2. **Phase 1 — outbound + word of mouth (months 3–6).** Each design
   partner refers 2–3 peers. Local Facebook/Instagram salon-owner groups
   are referral channels. Cold WhatsApp outreach to 100 salons/week with
   a 5-min explainer video.
3. **Phase 2 — Indian SMB partner channel (months 6–12).** Partner with
   one of the BSPs (AiSensy, Gupshup, MSG91) to bundle WhatsAppFlow as the
   AI layer on top of their messaging. They have field salesforces;
   we have the AI product.
4. **Phase 3 — vertical packs + content (year 2).** Once Salon is humming,
   add Clinic, Coaching, Kirana. SEO-friendly content per vertical.
   Open-source repo gathers stars and contributors.

## Open-source vs hosted boundary

| Component | Open source (MIT) | Closed |
|---|---|---|
| Core webhook handler, skill router, multi-provider routing | ✅ | |
| Reference Salon Pack | ✅ — first one open as proof | |
| Premium vertical packs (Clinic, Coaching, etc.) | | ✅ |
| Hosted/managed service (Razorpay billing, BSP relationship, reliability, analytics, escalation UI) | | ✅ |
| WhatsApp BSP credentials | | ✅ — only the hosted version has them |

Same play as Cal.com (open scheduling, hosted at cal.com), Plausible
(open analytics, hosted at plausible.io), Supabase (open-core, managed
Postgres+ services). Proven model for "infra utility" products — the
code is public, the operations are the product.
