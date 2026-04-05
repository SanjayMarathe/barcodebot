# Google Trends Agent

An AI agent deployed on Fetch.ai's **Agentverse** platform that surfaces real-time Google Trends data through natural language, with per-query Stripe payments collected inline in the chat UI.

---

## Use Case

This agent is built for **content creators, marketers, and analysts** who need to stay ahead of the curve on what people are searching for.

A marketer can use it as part of their workflow to identify trending topics in a specific region or city and design campaigns around what's already capturing their audience's attention. A content creator can quickly find out what's rising in their target market before writing or publishing. An analyst can pull trend data across multiple cities and time windows without touching SQL or BigQuery directly — just ask in plain English, pay $1, and get a formatted breakdown.

**Example queries:**
- "Top trending searches in New York NY this week"
- "Rising searches in Los Angeles CA last month"
- "Top terms in Chicago IL over the last 4 weeks"
- "Compare rising terms between Dallas and Chicago last month"

---

## How It Works

Users chat with the agent through the **ASI:One** wallet (Fetch.ai's AI assistant interface). The agent runs a sequential pipeline inspired by Google's Agent Development Kit (ADK):

1. **SQL generation** — an ASI:One LLM call converts the user's question into a BigQuery SQL query
2. **BigQuery execution** — the query runs against Google's public Trends dataset and returns raw results
3. **Result interpretation** — a second ASI:One LLM call turns the raw data into a readable markdown summary

Each query costs **$1.00**, collected via an embedded Stripe checkout that appears inline in the chat before results are delivered.

---

## Architecture

```
User (ASI:One wallet)
       │  ChatMessage
       ▼
 ┌─────────────────────────────────────┐
 │  Google Trends Agent (uAgent)       │
 │  Hosted via Agentverse mailbox      │
 └──────┬──────────────────────────────┘
        │
   ┌────▼──────────────────────────────────────┐
   │  handlers.py  (business logic)            │
   │  1. Parse user query                      │
   │  2. Create Stripe embedded checkout       │
   │  3. Send RequestPayment → wallet renders  │
   │     inline payment card                   │
   │  4. On payment: verify with Stripe        │
   │  5. Run trends pipeline, reply            │
   └────┬────────────────────┬─────────────────┘
        │                    │
   ┌────▼────┐         ┌─────▼──────────────────────────────────────┐
   │ Stripe  │         │  google_trends.py  (ADK-style pipeline)    │
   │  API    │         │                                            │
   └─────────┘         │  Step 1 — SQL Generator                   │
                       │    ASI:One LLM converts the natural-       │
                       │    language question into BigQuery SQL      │
                       │                                            │
                       │  Step 2 — BigQuery Execution               │
                       │    google-cloud-bigquery runs the SQL      │
                       │    against bigquery-public-data.google_    │
                       │    trends.top_terms / top_rising_terms     │
                       │                                            │
                       │  Step 3 — Result Interpreter               │
                       │    ASI:One LLM turns raw JSON rows into    │
                       │    a readable markdown summary             │
                       └────────────────────────────────────────────┘
```

The sequential generator → executor pipeline is an ADK pattern: one agent specialises in producing the query, another in running it and presenting results. This is adapted here for Fetch.ai's uAgents framework with Stripe payment gating added on top. The original ADK reference implementation can be found at [google/adk-samples](https://github.com/google/adk-samples/tree/main/python/agents/google-trends-agent).

### File Structure

```
google-trends-agent/
├── agent.py                        # Entry point — builds the uAgent, registers protocols
├── requirements.txt
├── docker-compose.yml
│
├── core/                           # Business logic and configuration
│   ├── config.py                   # Environment variable loading with startup validation
│   ├── handlers.py                 # Chat flow, payment request, verification, fallback
│   └── state.py                    # Per-user persistent state (TTL-based expiry)
│
├── protocols/                      # Fetch.ai uAgent protocol definitions
│   ├── chat_proto.py               # AgentChatProtocol with registered handlers
│   └── payment_proto.py            # AgentPaymentProtocol (seller role)
│
├── services/                       # External service integrations
│   ├── google_trends.py            # ADK-style pipeline: SQL generation → BigQuery → interpretation
│   └── stripe_payments.py          # Stripe embedded checkout creation and payment verification
│
└── docker/                         # Container configuration
    ├── Dockerfile
    └── .dockerignore
```

---

## Payment Flow

```
User sends query
      │
      ▼
Agent creates Stripe embedded checkout session
(client_secret + publishable_key sent in RequestPayment.metadata)
      │
      ▼
ASI:One wallet renders inline Stripe payment card
      │
      ▼
User pays with card
      │
      ├─── CommitPayment arrives ──► verify with Stripe ──► run pipeline ──► reply
      │
      └─── Fallback (if Agentverse payment-success redirect errors):
           User re-messages ──► agent checks Stripe directly for stored session
           If session paid (age > 60s) ──► run pipeline ──► reply
```

> **Note:** The fallback path works around a limitation where Agentverse's `/payment-success` redirect page cannot verify Stripe sessions created with external API keys. When `CommitPayment` isn't delivered, re-sending any message triggers direct Stripe verification.

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Agent framework | [Fetch.ai uAgents](https://github.com/fetchai/uAgents) v0.22.8 |
| Agent hosting | Agentverse mailbox |
| Chat interface | ASI:One wallet — `AgentChatProtocol` |
| Payment protocol | `AgentPaymentProtocol` (seller role), Stripe embedded checkout |
| SQL generation | ASI:One LLM (`asi1` model, OpenAI-compatible API) |
| Data source | `bigquery-public-data.google_trends.top_terms` + `top_rising_terms` |
| Query engine | Google Cloud BigQuery (`google-cloud-bigquery` + service account auth) |
| Result interpretation | ASI:One LLM (second-pass over raw JSON results) |

---

## BigQuery Dataset

The agent queries two tables from Google's public Trends dataset — US-only, broken down by **Designated Market Area (DMA)**:

```
bigquery-public-data.google_trends.top_terms
  columns: rank, refresh_date, dma_name, dma_id, term, week, score

bigquery-public-data.google_trends.top_rising_terms
  columns: dma_id, term, week, score, rank, percent_gain, refresh_date, dma_name
```

Data lags approximately 5–7 days. Queries for "this week" use a 14-day lookback window to ensure results. Supported city names follow the DMA format: `'New York NY'`, `'Los Angeles CA'`, `'Chicago IL'`, `'Dallas-Ft. Worth TX'`.

---

## Setup

### Prerequisites

| Requirement | Notes |
|-------------|-------|
| Python 3.11+ | |
| GCP project | BigQuery API enabled |
| Service account JSON | Roles: `BigQuery Data Viewer` + `BigQuery Job User` |
| ASI:One API key | From [asi1.ai/developer](https://asi1.ai/developer) |
| Stripe account | Test keys (`sk_test_...` / `pk_test_...`) work fine |
| Agentverse account | From [agentverse.ai](https://agentverse.ai) — needed for mailbox |

### Install

```bash
git clone <repo>
cd google-trends-agent

python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
```

### Configure

Create a `.env` file:

```env
# ASI:One LLM
ASI1_API_KEY=sk_...

# Google Cloud / BigQuery
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_AMOUNT_CENTS=100           # $1.00

# Agent
AGENT_SEED=your-random-seed-phrase
AGENT_PORT=8015
```

### Run

```bash
python agent.py
```

The agent connects to Agentverse via mailbox and is immediately reachable by its address in the ASI:One chat UI.

---

## Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `STRIPE_AMOUNT_CENTS` | `100` | Price per query in cents |
| `STRIPE_CURRENCY` | `usd` | Stripe currency code |
| `STRIPE_PRODUCT_NAME` | `Google Trends Analysis` | Shown on Stripe checkout |
| `STRIPE_CHECKOUT_EXPIRES_SECONDS` | `1800` | Session validity (30 min) |
| `AGENT_SEED` | — | Deterministic seed for agent address |
| `AGENT_PORT` | `8015` | Local HTTP port |

---

## Example Interaction

**User:** Top terms in Chicago IL over the last 4 weeks

**[SQL Generator]** produces:
```sql
SELECT term, rank, week
FROM `bigquery-public-data.google_trends.top_terms`
WHERE refresh_date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
  AND dma_name = 'Chicago IL'
  AND week >= DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY)
ORDER BY week DESC, rank
LIMIT 100
```

**[Result Interpreter]** returns a markdown summary of the top trending terms grouped by week.

---

## Customisation

- **Change pricing**: Set `STRIPE_AMOUNT_CENTS` in `.env`
- **Extend data sources**: Modify `services/google_trends.py` to also query `international_top_terms` for non-US regions
- **Add more analysis**: Insert additional LLM steps (sentiment, forecasting) into the pipeline in `services/google_trends.py`
- **Deploy to cloud**: Wrap in Docker and deploy to Railway/Fly.io for always-on availability instead of local mailbox polling

---

## Limitations

- **US-only data** — the public BigQuery dataset only covers US DMAs; you can't query international regions or search for trends on a specific topic unless it already appears as a top-ranked term
- **Data lag** — trends data is 5–7 days behind real-time

