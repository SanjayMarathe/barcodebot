# Architecture — DiamondHacks 2026

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        User Interfaces                               │
│                                                                      │
│   ASI:One Chat ──────────────┐    Next.js Dashboard (port 3000)     │
│   (via Agentverse mailbox)   │    ┌──────────────────────────────┐  │
│                              │    │ ChatInput → creates run       │  │
│                              │    │ AgentCards → SSE updates      │  │
│                              │    │ BrowserFrame → live iframes   │  │
│                              │    │ EventLog → real-time events   │  │
│                              │    │ ResultSummary → final output  │  │
│                              │    └──────────────┬───────────────┘  │
└──────────────────────────────│───────────────────│──────────────────┘
                               │                   │ HTTP / SSE
                               │    ┌──────────────▼───────────────┐
                               │    │   FastAPI (port 8000)         │
                               │    │                               │
                               │    │  POST /tasks                  │
                               │    │  GET  /runs/{id}              │
                               │    │  GET  /runs/{id}/events (SSE) │
                               │    │  POST /internal/agent-event   │
                               │    │  GET  /health, /registry      │
                               │    │  PUT  /modes                  │
                               │    │  POST /webhooks/stripe        │
                               │    └──────────────┬───────────────┘
                               │                   │ SQLite WAL
                               │    ┌──────────────▼───────────────┐
                               │    │        SQLite DB              │
                               │    │  runs, run_events,            │
                               │    │  browser_sessions,            │
                               │    │  screenshots, config          │
                               │    └──────────────┬───────────────┘
                               │                   │ polls every 2s
                               ▼                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     uAgents Bureau (port 8001-8009)                  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ orchestrator_agent (port 8001)                               │   │
│  │  ┌────────────────────────────┐                              │   │
│  │  │ ASI:One ChatMessage handler│  ← from Agentverse mailbox   │   │
│  │  └────────────────────────────┘                              │   │
│  │  ┌────────────────────────────┐                              │   │
│  │  │ SQLite poll (every 2s)     │  ← web-triggered runs        │   │
│  │  └────────────────────────────┘                              │   │
│  │  → parses instruction → coordinates pipeline                 │   │
│  └──────────────────────┬───────────────────────────────────────┘   │
│          ↓ SearchRequest │                                           │
│  ┌───────────────────┐   │                                           │
│  │ search_agent :8002│   │ ↓ RankRequest (per item)                 │
│  │ Amazon search     │   │ ┌─────────────────────┐                  │
│  │ via Browser Use   │   │ │ ranker_agent :8003   │                  │
│  └───────────────────┘   │ │ scores candidates   │                  │
│          ↑ SearchResults  │ └─────────────────────┘                  │
│                           │                                           │
│                           │ ↓ BudgetRequest                          │
│                           │ ┌─────────────────────┐                  │
│                           │ │ treasury_agent :8004 │                  │
│                           │ │ mock or Stripe auth  │                  │
│                           │ └─────────────────────┘                  │
│                           │                                           │
│                           │ ↓ BuyRequest (parallel, one per item)    │
│  ┌──────────┐ ┌──────────┐│┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │buyer_a   │ │buyer_b   │││buyer_c   │ │buyer_d   │ │buyer_e   │  │
│  │:8005     │ │:8006     │││:8007     │ │:8008     │ │:8009     │  │
│  │Browser Use sessions   ││                                      │  │
│  │open URL → verify →    ││                                      │  │
│  │set qty → add to cart  ││                                      │  │
│  │→ screenshot           ││                                      │  │
│  └──────────┘ └──────────┘└┘──────────┘ └──────────┘ └──────────┘  │
│                │ BuyResultMsg (all agents → orchestrator)            │
│                └───────────────────────────────────────────────────┐ │
│                           POST /internal/agent-event ←─────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Browser Use Cloud   │
                    │  - Session per agent │
                    │  - Live view URLs    │
                    │  - Session replay    │
                    │  - Screenshots       │
                    └─────────────────────┘
```

## Data Flow Summary

1. **Web trigger**: User → ChatInput → `POST /tasks` → SQLite (status=pending)
2. **ASI:One trigger**: ASI:One → mailbox → orchestrator ChatMessage handler
3. **Orchestrator picks up run** (polls SQLite every 2s)
4. **Parse**: instruction → List[ShoppingItem]
5. **Search**: SearchRequest → search_agent → Browser Use → Amazon DOM → SearchResults
6. **Rank**: RankRequest (per item) → ranker_agent → scoring → RankResult
7. **Budget**: BudgetRequest → treasury_agent → mock/Stripe auth → BudgetResponse
8. **Buy**: BuyRequest (per item, parallel) → buyer_[a-e] → Browser Use → add-to-cart → screenshot → BuyResultMsg
9. **Aggregate**: orchestrator collects all BuyResultMsgs → marks run complete in SQLite
10. **Stream**: all agents POST events to `/internal/agent-event` → FastAPI fans out via SSE → frontend updates

## Key Design Decisions

### SQLite polling bridge
Agents and FastAPI are separate processes. Rather than complex agent-to-API messaging, we use SQLite as a shared bus:
- FastAPI writes `pending` runs
- Orchestrator polls every 2s
- Both read/write using WAL mode for concurrency safety

### Deterministic agent addresses
Agent addresses are derived from seed phrases. This means:
- No service discovery needed
- Addresses are hardcoded across all agents
- Same seed = same address always

### Event fan-out
All agent events flow to `/internal/agent-event` → persisted to SQLite → published to in-memory SSE queues. This means:
- Frontend always gets live updates
- Events are persistent (survives reconnect)
- Agents don't need to know about SSE

### Browser Use per-agent sessions
Each buyer agent creates its own Browser Use session with its own viewport. This:
- Provides true parallel execution
- Gives observable per-agent live views
- Enables session replay and debugging

## File Structure

```
apps/api/           FastAPI control plane
apps/web/           Next.js frontend
agents/             uAgents (9 total)
  shared/           Shared utilities (browser service, messages, config)
  orchestrator/     ASI:One interface + coordinator
  search/           Amazon search
  ranker/           Product ranking
  treasury/         Budget approval
  buyer_[a-e]/      Cart automation
packages/
  shared_py/        Canonical Pydantic schemas
  shared_ts/        Canonical TypeScript types
```
