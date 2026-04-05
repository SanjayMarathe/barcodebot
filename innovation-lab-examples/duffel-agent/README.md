# Duffel Flight Booking Agent

A uAgents-based assistant that searches and books flights via the **Duffel API**, with an **OpenAI**-powered conversation layer, **Fetch (FET)** payment verification, and optional **Skyfire** and **SMTP** integrations.

**Category:** Web3, Payments, Travel

**Tech stack:** Python, uAgents, Duffel API, OpenAI

**Difficulty:** Advanced

## Prerequisites

- Python 3.11+
- [Duffel](https://duffel.com/) API access token
- [OpenAI](https://platform.openai.com/) API key
- (Optional) Agentverse mailbox key, FreeCurrency API key, Skyfire seller credentials, SMTP for outbound email

## Installation

```bash
cd duffel-agent
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your secrets
```

## Environment variables

Copy `.env.example` to `.env` and set at least:

| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENAI_API_KEY` | Yes | LLM calls |
| `DUFFEL_TOKEN` | Yes | Flight search and booking |
| `AGENT_MAILBOX_KEY` | If using Agentverse (see Compose) | Passed in Docker setup |
| `FREECURRENCYAPI_KEY` | Recommended | Currency conversion |
| `FET_USD_PRICE` | Optional | Manual FET/USD when API unavailable |

See `.env.example` for every variable read in code, plus commented entries for values only used by `docker-compose.yml` (for example `AGENT_MAILBOX_KEY`, `CHECKPOINT_DB`, `OPENAI_PROJECT`).

## How to run

```bash
# From repo root or duffel-agent/, with .env present
python agent.py
```

The process listens on `AGENT_PORT` (default `8030` locally; Docker uses `8044`). Startup logs include the agent name and wallet address.

## Expected output

*(Placeholder.)* After a successful start you should see log lines confirming the agent is up, the wallet address, and optional Skyfire service ID if configured. When you send chat messages through the uAgents chat protocol, responses should reflect flight search and booking flows without exposing raw internal IDs.

## Demo

*(Placeholder.)* Add a short screen recording or Agentverse deep link here once you have a stable demo environment.

## Docker

Build and run with Compose (expects `.env` next to `docker-compose.yml`):

```bash
cd duffel-agent
cp .env.example .env
# Fill in secrets, then:
docker compose up --build
```

The image exposes port **8044** and mounts `./state` for SQLite session/checkpoint data. `docker-compose.yml` passes through API keys, Duffel token, optional Skyfire and SMTP settings, and sets `AGENT_PORT=8044` to match the Dockerfile health check.

To build the image only:

```bash
docker build -t duffel-flights-agent .
docker run --env-file .env -p 8044:8044 -v "$(pwd)/state:/app/state" duffel-flights-agent
```
