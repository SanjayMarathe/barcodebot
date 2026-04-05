# Deploy Agent on Agentverse

**Description:** Guide for deploying uAgents on Agentverse via Render.

| | |
|---|---|
| **Category** | Getting Started, Deployment |
| **Tech stack** | Python, uAgents, Render |
| **Difficulty** | Beginner |

## Detailed guide

Step-by-step instructions (Render Background Worker, env vars, troubleshooting): **[docs.md](./docs.md)**.

## What this example includes

The [`example/`](./example/) folder is a mailbox-enabled chat agent that uses the ASI1 API and registers on Agentverse (`agent.py`, `requirements.txt`).

## Quick setup

1. `cd example`
2. `python -m venv .venv && source .venv/bin/activate` (Windows: `.venv\Scripts\activate`)
3. `pip install -r requirements.txt`
4. Copy [`.env.example`](./.env.example) to `example/.env` and set your keys.

## Run locally

From `example/`:

```bash
python agent.py
```

Use the Agent Inspector link in the logs to connect the mailbox. In Agentverse, find the agent under Local Agents and chat.

## Deploy (Render)

1. Push this repo (or your fork) to GitHub/GitLab/Bitbucket.
2. In [Render](https://render.com/), create a **Background Worker** (Python).
3. Set **Root Directory** to `deploy-agent-on-av/example` (or the path to `example` in your repo).
4. **Build:** `pip install -r requirements.txt`
5. **Start:** `python agent.py`
6. **Environment variables:** same as in `.env.example` (`ASI_API_KEY`, `ILABS_AGENTVERSE_API_KEY`, optional `AGENT_SEED_PHRASE`).

Monitor logs for build errors and the Agent Inspector link after deploy.
