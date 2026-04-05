# Demo Script — DiamondHacks 2026

## Judge Demo Checklist

Use this script for the demo session.

---

## Setup (before judges arrive)

```bash
# Make sure all services are running
make run

# Verify health
curl http://localhost:8000/health

# Open the dashboard
open http://localhost:3000
```

---

## Demo Flow (recommended 5-minute script)

### 1. Show the architecture (30s)
- Open http://localhost:3000/debug
- Point out the 9 agent addresses
- Show the mode toggles (treasury: mock, browser: browser_use)

### 2. Submit a shopping run (1 min)
- Go to http://localhost:3000
- Paste this instruction:
  ```
  Buy AA batteries under $18 quantity 2, USB-C charger 65W under $30 quantity 1
  ```
- Set budget to $100
- Click **Start Run**

### 3. Watch the pipeline live (2 min)
On the run detail page:
- **Agents tab**: show status cards updating in real-time
  - Orchestrator → running
  - Search → searching (Browser Use session opens)
  - Ranker → done (best product selected)
  - Treasury → approved (mock budget OK'd)
  - Buyer A, B → adding to cart
- **Events tab**: show the live event stream
- **Browsers tab**: show the embedded live Browser Use iframes

### 4. Show results (1 min)
- **Results tab**: structured summary with per-item status and prices
- **Screenshots tab**: gallery of add-to-cart screenshots
- Point out the session IDs and live view links

### 5. ASI:One demo (30s)
- If registered on Agentverse, open ASI:One
- Send: `Buy a USB-C hub under $25 quantity 1`
- Show the orchestrator picking it up and responding

---

## Talking points for judges

**"Why Fetch.ai?"**
- Real uAgents with deterministic addresses on the Fetch.ai network
- Orchestrator is ASI:One compatible — any ASI:One user can shop via chat
- Mailbox-enabled: works even when the agent is briefly offline
- Demonstrates the agent-of-agents pattern native to Fetch.ai

**"How are agents coordinating?"**
- Pure uAgents message passing: no central queue, no Redis
- Each agent has a specific role and typed messages
- Orchestrator coordinates via state machine (search → rank → approve → buy)
- 5 buyer agents run in parallel for maximum throughput

**"What's Browser Use doing?"**
- Each buyer agent gets its own cloud browser session
- Sessions are observable: live view URL, session replay, HAR files
- We surface the live view URLs in the dashboard as embedded iframes

**"Is Stripe actually paying Amazon?"**
- No — Stripe is used as an INTERNAL budget authorization proof
- Treasury creates a manual-capture PaymentIntent (never captured)
- This demonstrates a payment-aware multi-agent system design
- Default mode is mock (no Stripe calls needed for the demo)

---

## Fallback scenarios

**Browser Use unavailable:**
```bash
# Switch to local Playwright in the debug page
# Or: echo "BROWSER_MODE=local" >> .env && restart agents
```

**Amazon blocks search:**
- Browser Use has anti-detection built in (blockAds, solveCaptchas)
- If blocked, the search agent returns no candidates and the run fails gracefully

**Agent not responding:**
- Check `agents/run_all.py` logs
- Restart agents: `python agents/run_all.py`

---

## Key metrics to highlight

- ≥ 5 real uAgents running (9 total)
- ASI:One chat protocol implemented on orchestrator
- Real browser automation with live session observability
- Parallel execution across up to 5 buyer agents
- Full event stream from start to completion
