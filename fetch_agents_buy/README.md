# DiamondHacks 2026 — Multi-Agent Amazon Shopping

**Fetch.ai Best Use Track**

> Give a shopping list. Nine Fetch.ai uAgents search Amazon, rank the best products, approve your budget, and add everything to cart — in parallel — while you watch a live browser feed.

---

## Architecture

```
ASI:One Chat ──► [orchestrator_agent] ◄── SQLite poll (web runs)
                        │
              ┌─────────┼─────────────┐
              ▼         ▼             ▼
        [search]    [ranker]    [treasury]
           │                        │
           └──────────┬─────────────┘
                      ▼
     [buyer_a] [buyer_b] [buyer_c] [buyer_d] [buyer_e]
           │           │
           ▼           ▼
     [Browser Use]  [Browser Use]
     Amazon search  Amazon cart
           │
           ▼
     POST /internal/agent-event
           │
     [FastAPI] ──SSE──► [Next.js Dashboard]
```

**9 Python uAgents** | **FastAPI control plane** | **Next.js dashboard** | **Browser Use browser automation**

---

## Quick Start

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env: add BROWSER_USE_API_KEY, AGENTVERSE_API_KEY

# 2. Install
pip install -r requirements-api.txt
pip install -r agents/requirements.txt
playwright install chromium
cd apps/web && npm install && cd ../..

# 3. Run (requires tmux)
make run

# 4. Open dashboard
open http://localhost:3000
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BROWSER_USE_API_KEY` | **Yes** | Browser Use cloud API key |
| `AGENTVERSE_API_KEY` | For Agentverse | Enables mailbox + discoverability |
| `ORCHESTRATOR_SEED` | No | Agent seed phrase (deterministic address) |
| `TREASURY_MODE` | No | `mock` (default) or `stripe` |
| `BROWSER_MODE` | No | `browser_use` (default) or `local` |
| `CHECKOUT_MODE` | No | `add_to_cart` (default) or `checkout_ready` |
| `TOTAL_BUDGET` | No | Default budget per run (default: $200) |
| `STRIPE_SECRET_KEY` | No | Stripe test key (optional treasury proof) |

---

## How to Run

**FastAPI backend:**
```bash
python -m uvicorn apps.api.main:app --host 0.0.0.0 --port 8000 --reload
```

**All 9 agents (Bureau):**
```bash
python agents/run_all.py
```

**Next.js frontend:**
```bash
cd apps/web && npm run dev
```

---

## Demo Flow

1. Open http://localhost:3000
2. Enter shopping instruction:
   ```
   Buy AA batteries under $18 quantity 2, USB-C charger 65W under $30 quantity 1
   ```
3. Click **Start Run**
4. Watch agents work live:
   - Agents tab: status cards with live indicators
   - Events tab: real-time event stream
   - Browsers tab: embedded Browser Use live views
5. View results: screenshots, session IDs, prices

---

## ASI:One Integration

The orchestrator agent is mailbox-enabled and ASI:One-compatible:

1. Set `AGENTVERSE_API_KEY` in `.env`
2. Run agents
3. Find orchestrator address via `curl http://localhost:8000/registry`
4. Open ASI:One → search for orchestrator → send shopping instruction

See `docs/agentverse.md` for full setup guide.

---

## Browser Use Setup

1. Sign up at https://cloud.browser-use.com
2. Copy `API Key` to `.env`
3. Browser sessions are created automatically per agent

For dev/testing without Browser Use credentials, set `BROWSER_MODE=local` in `.env`.

---

## Optional Stripe Setup

Stripe is used for **internal treasury proof only** — it does NOT pay Amazon.

```bash
# .env
STRIPE_SECRET_KEY="sk_test_..."
TREASURY_MODE="stripe"
```

This creates a test-mode PaymentIntent with `capture_method=manual` (never captured).

---

## Repo Structure

```
apps/api/          FastAPI backend + SSE + SQLite
apps/web/          Next.js dashboard
agents/
  orchestrator/    ASI:One chat interface + coordinator
  search/          Amazon search via Browser Use
  ranker/          Product scoring
  treasury/        Budget approval (mock + Stripe)
  buyer_[a-e]/     Cart automation via Browser Use
  shared/          Browser service, messages, config
packages/
  shared_py/       Canonical Pydantic schemas
  shared_ts/       Canonical TypeScript types
docs/              setup.md, demo.md, architecture.md, agentverse.md
```

---

## Known Limitations

- Amazon's DOM changes frequently — Amazon selectors may need updates
- Browser Use sessions cost credits — use `BROWSER_MODE=local` for heavy testing
- Orchestrator-to-ASI:One reply is async — response arrives after full pipeline (~1-3 min)
- Checkout mode (`CHECKOUT_MODE=checkout_ready`) is scaffolded but not fully implemented

---

## Future Work

- Fetch Agent Payment Protocol integration (replace Stripe treasury)
- Support for more retailers (Walmart, Target)
- Price history tracking and smart deal alerts
- Full autonomous checkout mode
- uAgents payment channel integration for agent-to-agent micropayments

---

Built for **DiamondHacks 2026** — Fetch.ai Best Use Track
