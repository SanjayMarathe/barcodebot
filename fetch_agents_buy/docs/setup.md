# Setup Guide — DiamondHacks 2026

## Prerequisites

- Python 3.11+
- Node.js 18+
- Git
- tmux (optional, for multi-pane dev)

---

## Step 1: Clone and configure

```bash
git clone <repo-url> diamond_hacks
cd diamond_hacks
cp .env.example .env
```

Edit `.env` and fill in:
- `BROWSER_USE_API_KEY` — from https://cloud.browser-use.com
- `AGENTVERSE_API_KEY` — from https://agentverse.ai (for mailbox/Agentverse)
- Agent seed phrases — you can keep the defaults for dev/testing
- `STRIPE_SECRET_KEY` — only if testing the Stripe treasury mode

---

## Step 2: Install Python dependencies

**FastAPI backend:**
```bash
pip install -r requirements-api.txt
```

**Agents:**
```bash
pip install -r agents/requirements.txt
playwright install chromium
```

---

## Step 3: Install Node dependencies

```bash
cd apps/web
npm install
cd ../..
```

---

## Step 4: Start the services

**Option A: Using Make + tmux (recommended)**
```bash
make run
```
This opens a tmux session with 3 panes: API, Agents, Web.

**Option B: Three separate terminals**

Terminal 1 — FastAPI:
```bash
source .env  # or: export $(cat .env | grep -v '^#' | xargs)
python -m uvicorn apps.api.main:app --host 0.0.0.0 --port 8000 --reload
```

Terminal 2 — Agents (after API is up):
```bash
python agents/run_all.py
```

Terminal 3 — Next.js:
```bash
cd apps/web && npm run dev
```

---

## Step 5: Verify health

```bash
make health
# or
curl http://localhost:8000/health | python3 -m json.tool
```

Expected:
```json
{
  "status": "ok",
  "db": "ok",
  "agents_reachable": true,
  "version": "0.1.0"
}
```

Also check: http://localhost:3000/debug

---

## Step 6: Run your first demo

1. Open http://localhost:3000
2. Type a shopping instruction:
   ```
   Buy AA batteries under $18 quantity 2, USB-C charger 65W under $30 quantity 1
   ```
3. Click **Start Run**
4. Watch the agents work in real-time on the run detail page
5. Check screenshots on the Screenshots tab
6. Check live browser sessions on the Browsers tab

Or via curl:
```bash
make submit-demo
```

---

## Troubleshooting

**Agent Bureau fails to start:**
- Check that all Python deps are installed: `pip install -r agents/requirements.txt`
- Check that `uagents` and `uagents-core` are installed: `pip show uagents`

**Browser Use session creation fails:**
- Verify `BROWSER_USE_API_KEY` in `.env`
- For dev/testing without Browser Use: set `BROWSER_MODE=local` in `.env`

**SSE not streaming:**
- Check that `sse-starlette` is installed: `pip show sse-starlette`
- Check browser console for CORS errors

**Agentverse mailbox not working:**
- Verify `AGENTVERSE_API_KEY` is set
- The agent needs internet access to reach Agentverse endpoints
- Check orchestrator logs for mailbox connection messages

**SQLite locked errors:**
- Make sure only one instance of the API is running
- WAL mode is enabled automatically but can be overridden

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BROWSER_USE_API_KEY` | Yes | — | Browser Use API key |
| `AGENTVERSE_API_KEY` | Yes (for Agentverse) | — | Agentverse API key |
| `ORCHESTRATOR_SEED` | No | dev default | Orchestrator seed phrase |
| `TREASURY_MODE` | No | `mock` | `mock` or `stripe` |
| `BROWSER_MODE` | No | `browser_use` | `browser_use` or `local` |
| `CHECKOUT_MODE` | No | `add_to_cart` | `add_to_cart` or `checkout_ready` |
| `TOTAL_BUDGET` | No | `200.0` | Default run budget |
| `STRIPE_SECRET_KEY` | No | — | Stripe test key (optional) |
