# Launch Your A2A Research Team

This example shows how to build and run a multi-agent A2A system where:

- three worker agents do specialized work
- one orchestrator coordinates them
- only the orchestrator is exposed publicly and registered on Agentverse

The workers are Gemini-powered:

- `research_agent.py`
- `analysis_agent.py`
- `summary_agent.py`

The public entrypoint is:

- `orchestrator_agent.py`

## What this example demonstrates

- how to implement a multi-agent A2A pattern
- how worker agents can stay local on `localhost`
- how an orchestrator can call worker agents over A2A
- how to expose only the orchestrator to Agentverse
- how to test locally first, then test through Agentverse / ASI.One

## Architecture

```text
User / ASI.One / Agentverse
            |
            v
    Orchestrator Agent (public)
            |
    -----------------------------
    |             |             |
    v             v             v
Research Agent  Analysis Agent  Summary Agent
 (local)          (local)         (local)
```

Request flow:

1. The user sends a request to the orchestrator.
2. The orchestrator asks the research agent for raw research notes.
3. The orchestrator asks the analysis agent to extract insights.
4. The orchestrator asks the summary agent to write the final response.
5. The orchestrator returns the final answer.

## Files

- `common.py`: shared helpers for Gemini and A2A client calls
- `research_agent.py`: Gemini-powered research worker
- `analysis_agent.py`: Gemini-powered analysis worker
- `summary_agent.py`: Gemini-powered summary worker
- `orchestrator_agent.py`: public A2A entrypoint and coordinator
- `.env.example`: environment variable template
- `requirements.txt`: dependencies

## Prerequisites

- Python 3.10+
- a Gemini API key
- `cloudflared` if you want to test the orchestrator on Agentverse

Install `cloudflared` if needed:

```bash
brew install cloudflared
```

## 1. Local setup

From this folder:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

## 2. Configure `.env`

For local-only testing:

```env
HOST=0.0.0.0

GEMINI_API_KEY=your_real_key_here
GEMINI_MODEL=gemini-2.5-flash

RESEARCH_PORT=10001
ANALYSIS_PORT=10002
SUMMARY_PORT=10003
ORCHESTRATOR_PORT=9999

RESEARCH_AGENT_URL=http://localhost:10001
ANALYSIS_AGENT_URL=http://localhost:10002
SUMMARY_AGENT_URL=http://localhost:10003

PUBLIC_BASE_URL=http://localhost:9999
AGENT_NAME=A2A Research Team Orchestrator
AGENTVERSE_AGENT_URI=
```

Important:

- for local testing, `PUBLIC_BASE_URL=http://localhost:9999` is fine
- for Agentverse testing, replace `PUBLIC_BASE_URL` with the Cloudflare URL
- only set `AGENTVERSE_AGENT_URI` when you are ready to register the orchestrator on Agentverse

## 3. Start the agents

Open 4 terminals in this folder and activate the same virtual environment in each one.

### Terminal 1: research worker

```bash
source .venv/bin/activate
python3 research_agent.py
```

### Terminal 2: analysis worker

```bash
source .venv/bin/activate
python3 analysis_agent.py
```

### Terminal 3: summary worker

```bash
source .venv/bin/activate
python3 summary_agent.py
```

### Terminal 4: orchestrator

```bash
source .venv/bin/activate
python3 orchestrator_agent.py
```

## 4. Local verification

### Check the orchestrator agent card

```bash
curl http://localhost:9999/.well-known/agent-card.json
```

### Send a local A2A request to the orchestrator

```bash
curl -X POST http://localhost:9999/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "message/send",
    "params": {
      "message": {
        "role": "user",
        "messageId": "msg-1",
        "parts": [
          { "kind": "text", "text": "Give me a quick research brief on electric vehicle adoption in India" }
        ]
      }
    }
  }'
```

You should get back a final summary from the orchestrator.

## 5. Expected logs

### Worker terminals

```text
[research_agent] incoming message: ...
[analysis_agent] incoming message: ...
[summary_agent] incoming message: ...
```

### Orchestrator terminal

```text
[orchestrator_agent] incoming user request: ...
[orchestrator_agent] research step complete
[orchestrator_agent] analysis step complete
[orchestrator_agent] summary step complete
```

## 6. Register only the orchestrator on Agentverse

You do not need public tunnels for all agents.

Only the orchestrator must be public.

The worker agents can stay local:

- `http://localhost:10001`
- `http://localhost:10002`
- `http://localhost:10003`

### Step-by-step

1. Create a new A2A agent in Agentverse.
2. Copy the generated launch URI from the final launch screen.
3. Start a tunnel to the orchestrator only:

```bash
cloudflared tunnel --url http://localhost:9999
```

4. Copy the generated `https://...trycloudflare.com` URL.
5. Update `.env`:

```env
PUBLIC_BASE_URL=https://your-trycloudflare-url.trycloudflare.com
AGENTVERSE_AGENT_URI=https://your-handle:your-secret@agentverse.ai/your-agent-name
```

6. Restart only `orchestrator_agent.py`.
7. Confirm the startup logs show:

```text
[orchestrator_agent] public base URL: https://your-trycloudflare-url.trycloudflare.com
[orchestrator_agent] Agentverse bridge enabled: yes
```

8. Evaluate the agent on Agentverse.
9. Test it from ASI.One or "Chat with Agent".

## Why only the orchestrator is public

This pattern keeps the public interface simple:

- the user talks to one public orchestrator
- the orchestrator talks to internal worker agents
- the worker agents remain private and local

This is usually the cleanest way to deploy multi-agent A2A systems.

## How to adapt this example

You can reuse the same structure for many workflows:

- research team
- customer support router
- policy review pipeline
- due diligence pipeline
- content generation workflow

Implementation pattern:

1. Keep the public-facing registration logic simple in the orchestrator.
2. Put the domain-specific logic into worker agents.
3. Have the orchestrator call worker agents over A2A.
4. Return the final answer from the orchestrator.

Practical recommendation:

- use the same direct bootstrap pattern as the working orchestrator and single-agent examples
- keep helper abstractions minimal on the public-facing agent
- test locally first with `curl`
- only then expose the orchestrator via Cloudflare and Agentverse

## Suggested demo prompts

- `Give me a quick research brief on EV adoption in India`
- `Research AI regulation in Europe and summarize the main risks and opportunities`
- `Create a short market brief on remote work trends in 2025`
- `Analyze renewable energy adoption trends in Southeast Asia`
- `Give me a concise briefing on enterprise adoption of open-source LLMs`

## Troubleshooting

If local A2A works but Agentverse does not:

- make sure the workers are still running
- make sure the tunnel is running
- make sure `PUBLIC_BASE_URL` matches the current Cloudflare URL
- make sure `AGENTVERSE_AGENT_URI` is the exact latest value from the current launch page
- restart the orchestrator after updating `.env`

If the public agent card works but Agentverse does not:

- verify you are testing the orchestrator, not a worker agent
- verify only the orchestrator uses `AGENTVERSE_AGENT_URI`
- verify the orchestrator startup log says `Agentverse bridge enabled: yes`

## Summary

This example is a good reference for how to implement A2A in a realistic multi-agent pattern:

- local worker agents
- one public orchestrator
- local validation first
- Agentverse registration second
