# AG2 Research Synthesis Team

![ag2](https://img.shields.io/badge/ag2-00ADD8) ![uagents](https://img.shields.io/badge/uagents-4A90E2) ![a2a](https://img.shields.io/badge/a2a-000000) ![innovationlab](https://img.shields.io/badge/innovationlab-3D8BD3)

A multi-agent research pipeline using [AG2](https://github.com/ag2ai/ag2) (formerly AutoGen)
integrated with the Fetch.ai uAgents ecosystem via the A2A protocol.

## Architecture

Four specialists collaborate under GroupChat with LLM-driven speaker selection, wrapped as
an A2A executor and exposed as a discoverable agent on Agentverse.

```
User / ASI:One / other uAgent
         ↓
SingleA2AAdapter (port 8008) → Agentverse
         ↓
AG2ResearchExecutor (A2A AgentExecutor)
         ↓
GroupChat (AG2)
├── web_researcher   — DuckDuckGo search, gathers sources
├── financial_analyst — market data, metrics, trends
├── tech_analyst     — technical feasibility, risks
└── synthesizer      — final structured report
```

## Prerequisites

- **Python 3.10–3.13** (uagents depends on Pydantic v1, which is incompatible with Python 3.14+)

## Quick Start

```bash
pip install -r requirements.txt
cp .env.example .env  # add OPENAI_API_KEY
python research_main.py
```

No additional API keys needed for search — DuckDuckGo is used by default.

To use a Fetch.ai MCP gateway instead, set `MCP_SERVER_URL` in `.env`.

## AG2 Features Demonstrated

- **`GroupChat` with `speaker_selection_method="auto"`** — LLM-driven dynamic speaker selection
- **`DuckDuckGoSearchTool`** — built-in web search, no API key required
- **Native MCP client** — optional override via `MCP_SERVER_URL` for richer tool access
- **`A2A AgentExecutor`** — same integration pattern used by other examples in this repo
