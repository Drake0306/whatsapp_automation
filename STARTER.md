# WhatsAppFlow — Starter Guide

## Prerequisites

- Node.js 18+
- MySQL database (Railway recommended)
- WhatsApp Business API access (BSP or direct Meta Cloud API)

## Setup

```bash
git clone git@github.com:Drake0306/whatsapp_automation.git
cd whatsapp_automation
npm install
cp .env.example .env
```

## Fill `.env` Before Starting

### MUST HAVE (app won't run without these)

```
DATABASE_URL="mysql://root:<password>@<host>:<port>/railway"
AUTH_SECRET="<run: npx auth secret>"
```

### Auth (need at least one)

**Google OAuth** — create at https://console.cloud.google.com/apis/credentials
```
AUTH_GOOGLE_ID="<client-id>.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="<client-secret>"
```

**Email Magic Link** — any SMTP (Gmail app password, Resend, SendGrid)
```
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="you@gmail.com"
EMAIL_SERVER_PASSWORD="<app-password>"
EMAIL_FROM="noreply@yourdomain.com"
```

### WhatsApp (needed for bot to work)

```
WHATSAPP_MODE="bsp"                  # "bsp" or "direct"
WHATSAPP_VERIFY_TOKEN="<any-string-you-choose>"
WHATSAPP_APP_SECRET="<from-meta-app-dashboard>"
WHATSAPP_API_TOKEN="<permanent-token-from-meta>"
WHATSAPP_API_URL="https://graph.facebook.com/v21.0"
```

### LLM (need at least Gemini — it powers intent classification + most skills)

```
GEMINI_API_KEY="<from-aistudio.google.com>"
```

Optional LLM providers (used by specific skills if configured):
```
GROQ_API_KEY=""        # Groq Llama — fast fallback
SARVAM_API_KEY=""      # Sarvam — vernacular Indian languages
ANTHROPIC_API_KEY=""   # Claude — escalation drafts
```

### CAN ADD LATER (app runs without these, features degrade gracefully)

```
R2_ACCOUNT_ID=""              # Cloudflare R2 — file storage for knowledge base
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME="whatsappflow-uploads"

RAZORPAY_KEY_ID=""            # Billing — subscriptions
RAZORPAY_KEY_SECRET=""
RAZORPAY_WEBHOOK_SECRET=""

CRON_SECRET=""                # Protects /api/cron/reminders endpoint
```

## Database Setup

```bash
npm run db:generate            # generates migration SQL from schema
npm run db:migrate             # runs migrations against DATABASE_URL
```

## Run

```bash
npm run dev                    # http://localhost:5173
```

## Deploy (Railway)

1. Push to GitHub
2. Connect repo in Railway dashboard
3. Set all env vars in Railway service settings
4. Railway auto-detects Node, runs `npm run build` then `node build`
5. Set the webhook URL in Meta/BSP dashboard:
   `https://<your-railway-url>/api/whatsapp/webhook`

## WhatsApp Webhook Setup

In Meta App Dashboard (or your BSP panel):
- **Callback URL**: `https://<your-domain>/api/whatsapp/webhook`
- **Verify Token**: same value as `WHATSAPP_VERIFY_TOKEN` in your `.env`
- **Subscribe to**: `messages`

## After First Login

1. Sign in at `/auth` (Google or email)
2. Complete onboarding wizard — set business name, vertical, language, WhatsApp Phone Number ID
3. Upload FAQ docs in Knowledge Base
4. Configure tone & business hours in Settings
5. Bot is live — test by messaging your WhatsApp number

## Key URLs

| Path | Purpose |
|------|---------|
| `/auth` | Login page |
| `/onboarding` | First-time setup wizard |
| `/dashboard` | Main dashboard |
| `/dashboard/contacts` | Customer CRM |
| `/dashboard/broadcasts` | Bulk campaigns |
| `/dashboard/feedback` | Customer ratings |
| `/dashboard/quick-replies` | Saved response templates |
| `/dashboard/settings` | Business info, tone, hours, skills |
| `/api/whatsapp/webhook` | WhatsApp webhook (GET=verify, POST=messages) |
| `/api/cron/reminders` | Cron endpoint (call with Bearer CRON_SECRET) |

## Cron Setup (Railway)

Create a Railway cron service that hits your reminder endpoint every 15 minutes:
```
curl -X POST https://<your-url>/api/cron/reminders \
  -H "Authorization: Bearer <CRON_SECRET>"
```

This handles: 24h reminders, 2h reminders, rebook nudges, cold lead follow-ups, feedback requests, and Google Review nudges.
