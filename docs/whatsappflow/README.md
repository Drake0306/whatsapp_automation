# WhatsAppFlow — design + implementation docs

These docs describe a **separate product** from Uni Chat (the chat-cd repo
that hosts these docs). The intention is that **these MD files get copied
into a fresh repo** and serve as the design + plan for that new project.
Nothing in here belongs in the Uni Chat codebase itself.

## What WhatsAppFlow is, in one paragraph

A WhatsApp-native AI agent for Indian small businesses (salons, clinics,
coaching centres, kirana shops). The owner connects their WhatsApp Business
number, picks a vertical "skill pack" (e.g. Salon), uploads their price
list / services / FAQ, and the bot handles incoming customer messages 24/7
in Hindi/English/regional language: answering FAQs, booking appointments,
sending reminders, recovering no-shows, and nudging repeat business.
Open-core: the engine is MIT on GitHub; the hosted version is the commercial
product.

## Why now / why this

Indian SMB AI adoption is at 59% with 80% planning chatbot integration by
end of 2026. Real case studies show 25–40% revenue lift, 60% no-show
reduction, ₹40K/mo recovered for a typical salon. Existing players
(Lindy, BotPenguin, AiSensy) are either generic, expensive, or
non-vernacular. A vertical-first, open-source, multi-provider product
has a defensible lane.

Full reasoning lives in `01-product.md`.

## File index

| File | Read this for… |
|---|---|
| [`01-product.md`](./01-product.md) | What it is, who buys it, value prop, ROI math, pricing, GTM motion |
| [`02-architecture.md`](./02-architecture.md) | System design, data model, tech stack, skill schema, security |
| [`03-implementation-plan.md`](./03-implementation-plan.md) | Phased plan (v0 → v1 → v2), week-by-week scope, risks |
| [`04-uni-chat-references.md`](./04-uni-chat-references.md) | What patterns/code to port from chat-cd, with file paths and adaptation notes |

Read in order on first pass. After that, `02` and `04` are the working
documents during implementation.

## How to use these when porting to a new repo

1. Copy this entire folder (`docs/whatsappflow/`) to the new repo's root
   as `docs/` or to whatever doc location the new repo uses
2. Read `01-product.md` first (anchors what you're building)
3. Then `02-architecture.md` and `03-implementation-plan.md`
4. When implementing, keep `04-uni-chat-references.md` open alongside —
   it tells you which Uni Chat files to look at (in the chat-cd repo) for
   patterns to copy or adapt
5. The references in `04` use paths like `chatCD/src/lib/stores/...` — the
   chat-cd repo at `~/Developer/Github/chatCD/` (or wherever it lives) is
   the source of truth for those patterns

## Source

These docs were distilled from a brainstorming conversation on 2026-04-30.
The conversation explored:

- Whether to build agents inside Uni Chat (decided: no, separate product)
- Which agent shape has real demand (research-backed: WhatsApp SMB agents
  for India)
- Concrete economics (case studies, WhatsApp Business API pricing,
  competitor analysis)
- Technical reuse opportunity from Uni Chat's multi-provider plumbing

If you need to reproduce or extend the reasoning, the conversation
transcript is the authoritative source. These docs are the distilled
output, not the full reasoning.
