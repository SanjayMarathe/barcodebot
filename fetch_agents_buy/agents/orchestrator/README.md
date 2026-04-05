# Amazon Shopping Orchestrator

**DiamondHacks 2026 — Fetch.ai Best Use Award**

## What this agent does

This agent converts a plain-English Amazon shopping list into real browser actions using a team of specialized AI agents.

When you send a shopping instruction, the orchestrator:
1. Parses the instruction into structured items
2. Searches Amazon for candidate products (via Search Agent)
3. Selects the best matching listing for each item (via Ranker Agent)
4. Approves the budget for each line item (via Treasury Agent)
5. Adds items to cart using real browser automation (via Buyer Agents A–E)
6. Returns a structured summary with screenshots and cart confirmation

## Sample prompts

```
Buy these on Amazon:
1. AA batteries, under $18, quantity 2
2. USB-C charger 65W, under $30, quantity 1
3. Notebooks, under $8 each, quantity 3
```

```
Get AA batteries under $15 quantity 2 and a phone stand under $20
```

```
Buy: HDMI cable under $12, bluetooth mouse under $35 quantity 1, sticky notes under $5 quantity 3
```

## Capabilities

- ✅ Parses multi-item shopping instructions
- ✅ Real Amazon search via browser automation (Browser Use)
- ✅ Smart product ranking (price, keywords, rating, reviews)
- ✅ Internal budget approval with optional Stripe test-mode proof
- ✅ Parallel cart automation across up to 5 concurrent buyer agents
- ✅ Live browser session monitoring via Browser Use
- ✅ Screenshot of each cart action
- ✅ Structured JSON results with status per item

## Constraints

- **Defaults to add-to-cart only** (not full autonomous checkout)
- Requires clear, specific shopping instructions (no vague requests)
- Amazon.com (US) only
- Budget limit: configurable (default $200 total)
- Full checkout mode is behind a feature flag (`CHECKOUT_MODE=checkout_ready`)

## Architecture

This agent orchestrates 8 worker agents:

```
[ASI:One / User]
      ↓ ChatMessage
[orchestrator_agent]  ←— polls SQLite for web-triggered runs
      ↓                ↓                ↓
[search_agent]   [ranker_agent]   [treasury_agent]
      ↓
[buyer_a] [buyer_b] [buyer_c] [buyer_d] [buyer_e]
      ↓
[Amazon via Browser Use]
```

## Agentverse setup

1. Set `AGENTVERSE_API_KEY` in your environment
2. Run with `mailbox=True` and `publish_agent_details=True` (already configured)
3. This README is automatically published as the agent's Agentverse listing

## Environment variables required

```
ORCHESTRATOR_SEED=<your-seed-phrase>
AGENTVERSE_API_KEY=<your-agentverse-key>
BROWSER_USE_API_KEY=<your-browser-use-key>
```

## Contact

Built for DiamondHacks 2026 by Team [your-team-name].
Orchestrator address is deterministic from `ORCHESTRATOR_SEED`.
