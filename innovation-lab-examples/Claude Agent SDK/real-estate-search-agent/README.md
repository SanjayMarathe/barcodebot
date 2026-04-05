# Real Estate Search Agent

A uAgents-based real estate search assistant powered by the **Claude SDK** that accepts natural-language queries, fetches live listings using [HomeHarvest](https://github.com/Bunsly/HomeHarvest) (Zillow, Realtor.com, Redfin), and delivers results as a formatted Google Sheet — with optional Stripe payment gating.

Deployable to [Agentverse](https://agentverse.ai) and compatible with **ASI:One** chat.

## Features

- **Natural-language search** — Claude (Haiku) parses queries like *"3 bed house for sale in Austin TX under $400k"*
- **Live listings** — HomeHarvest scrapes Zillow, Realtor.com and Redfin simultaneously (no API key required)
- **Google Sheets output** — formatted, shareable spreadsheet created in the user's Google Drive via per-user OAuth device flow
- **Stripe payment gate** (optional) — search runs first; payment is required before the sheet is delivered
- **Chat protocol** — works directly from ASI:One and any chat-protocol compatible client
- **Mailbox-ready** — runs on Agentverse without a public URL

## Architecture

```
agent.py           — uAgents entry point: chat, SearchRequest, payment protocol handlers
workflow.py        — Claude agentic tool-use loop (parse intent → search → sheet → summary)
scraper.py         — HomeHarvest listing fetch and filtering
sheets.py          — Google OAuth device flow + Google Sheets creation
stripe_payments.py — Stripe Checkout session creation and payment verification
scripts/
  register_mailbox.py — one-time Agentverse mailbox registration (run before first deploy)
```

### Request flow

```
User query
  └─▶ workflow.py: parse_search_intent() [Claude Haiku]
        └─▶ run_agent_loop() [Claude Sonnet, tool-use]
              ├─▶ search_listings tool → HomeHarvest fetch
              └─▶ create_sheet tool (free mode) OR hold df (Stripe mode)
                    └─▶ Stripe: RequestPayment → CommitPayment → create sheet → deliver URL
```

## Prerequisites

- Python 3.11+
- [Claude SDK API key](https://console.anthropic.com/) — for query parsing and the agent loop
- [Agentverse API key](https://agentverse.ai/) — for mailbox deployment
- Google OAuth client JSON — Desktop/Web app credentials from [Google Cloud Console](https://console.cloud.google.com/)
- Stripe account (optional) — for payment-gated sheet delivery

## Setup

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in your keys
```

### 3. Register the mailbox (one-time)

Before deploying to Agentverse for the first time, register the agent's mailbox:

```bash
python scripts/register_mailbox.py
```

> This is required because the Agentverse Inspector UI is blocked by Chrome's Private Network Access policy. Run this once; re-run if you change `AGENT_SEED`.

### 4. Run locally

```bash
python agent.py
```

### 5. Run with Docker

```bash
docker compose up --build
```

> After changing `.env`, do a full recreate:
> `docker compose down && docker compose up -d --build`

## Environment Variables

### Required

| Variable | Description |
|---|---|
| `AGENT_SEED` | Private seed phrase for agent identity (keep secret) |
| `ANTHROPIC_API_KEY` | Claude SDK API key |
| `AGENTVERSE_API_KEY` | Agentverse API key for mailbox auth |
| `GOOGLE_OAUTH_CLIENT_JSON` | Google OAuth client JSON (inline, as one line) |

> Alternatively, set `GOOGLE_OAUTH_CLIENT_FILE` pointing to the JSON file.

### Optional

| Variable | Default | Description |
|---|---|---|
| `AGENT_NAME` | `real_estate_agent` | Display name in Agentverse |
| `AGENT_NETWORK` | `testnet` | `testnet` or `mainnet` |
| `AGENT_MAILBOX` | `true` | Enable Agentverse mailbox |
| `AGENT_PORT` | `8000` | Local HTTP port |
| `GOOGLE_SHEET_SHARE_EMAIL` | — | Extra email to add as sheet editor |
| `STRIPE_SECRET_KEY` | — | Enables payment gate when set |
| `STRIPE_PUBLISHABLE_KEY` | — | Stripe publishable key |
| `STRIPE_AMOUNT_CENTS` | `199` | Price in cents ($1.99) |
| `STRIPE_CURRENCY` | `usd` | Payment currency |
| `STRIPE_RETURN_URL` | `https://agentverse.ai/` | Post-payment redirect |

## Usage

### Chat (ASI:One / chat protocol)

Send a natural-language query directly:

```
3 bed house for sale in Austin TX under $400k
```

```
rent 2 bed apartment NYC
```

### Agent-to-agent (SearchRequest)

Send a `SearchRequest` model message with `query` and optional `user_id`.

### Google OAuth

The first time a user requests a sheet, they must connect their Google account:

1. Send the query `/google-auth`
2. Agent replies with a verification URL and code
3. User opens the URL, enters the code, and approves access
4. Resend the original search query — the sheet is created in their Drive

If already connected, `/google-auth` returns a confirmation message.

### Payment flow (when Stripe is configured)

1. User sends search query
2. Agent searches listings and returns a summary
3. Agent sends `RequestPayment` with Stripe checkout metadata
4. User completes payment in their wallet
5. Agent receives `CommitPayment`, verifies with Stripe, creates the sheet, and delivers the URL

Without Stripe configured, the sheet is delivered for free immediately after search.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Google authorization required` | Run `/google-auth` for that user, approve access, then retry |
| Mailbox 404 / not found | Run `python scripts/register_mailbox.py`, then restart |
| Mailbox 401 auth error | Ensure `AGENTVERSE_API_KEY` is set in `.env` |
| No listings returned | Broaden location/price filters or increase `past_days` |
| Zillow 403 errors | HomeHarvest falls back to Realtor.com and Redfin automatically |

## Claude SDK Usage

This agent uses the **[Claude SDK](https://github.com/anthropics/anthropic-sdk-python)** (`anthropic` Python package) directly.

```python
import anthropic

client = anthropic.Anthropic()

# Single-turn: parse natural language into structured search criteria
message = client.messages.create(
    model="claude-haiku-4-5-20251001",
    max_tokens=400,
    messages=[{"role": "user", "content": prompt}],
)

# Multi-turn agentic loop: search listings and create Google Sheet
response = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=2048,
    system=SYSTEM_PROMPT,
    tools=TOOLS,
    messages=messages,
)
```

**Models used:**
- `claude-haiku-4-5-20251001` — fast, cheap query parsing
- `claude-sonnet-4-5-20250929` — multi-turn agentic tool-use loop

**Tools:**
- `search_listings` — triggers HomeHarvest fetch with structured parameters
- `create_sheet` — writes results to Google Sheets and returns the URL
