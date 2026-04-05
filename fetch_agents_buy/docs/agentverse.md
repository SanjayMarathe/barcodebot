# Agentverse Setup — DiamondHacks 2026

## Overview

The orchestrator agent is designed to be discoverable and reachable via Agentverse and ASI:One.

This document explains how to:
1. Register the orchestrator on Agentverse
2. Enable the mailbox for offline message delivery
3. Populate agent metadata for discoverability
4. Test ASI:One chat reachability

---

## Prerequisites

- Agentverse account at https://agentverse.ai
- `AGENTVERSE_API_KEY` in your `.env`
- Orchestrator agent running with `mailbox=True`

---

## Step 1: Set AGENTVERSE_API_KEY

```bash
# In your .env file:
AGENTVERSE_API_KEY="your-agentverse-api-key"
```

Get your API key from: https://agentverse.ai → Settings → API Keys

---

## Step 2: Run the orchestrator with mailbox enabled

The orchestrator is already configured with `mailbox=True` and `publish_agent_details=True`.

```bash
python agents/run_all.py
```

On startup, you should see in the logs:
```
INFO orchestrator: Connecting to Agentverse mailbox...
INFO orchestrator: Mailbox connected. Address: agent1q...
```

---

## Step 3: Verify Agentverse listing

1. Go to https://agentverse.ai
2. Search for your orchestrator address (shown in startup logs)
3. The agent's README.md will be displayed as the listing description

You can find the orchestrator address at startup or via:
```bash
curl http://localhost:8000/registry | python3 -m json.tool
```

---

## Step 4: Set agent metadata

The orchestrator README (`agents/orchestrator/README.md`) is published automatically
when `publish_agent_details=True` is set. Edit it to customize:

- Agent description
- Sample prompts  
- Capabilities
- Constraints

---

## Step 5: Test ASI:One chat

1. Go to https://asi1.ai
2. Search for your orchestrator by address or name
3. Send a shopping instruction:
   ```
   Buy AA batteries under $18 quantity 2
   ```
4. The orchestrator will:
   - Acknowledge your message immediately
   - Start the shopping pipeline
   - Reply with results when complete (up to ~2 minutes)

---

## Message format (for custom ASI:One integrations)

The orchestrator uses the standard uAgents chat protocol:

```python
from uagents_core.contrib.protocols.chat import ChatMessage, TextContent
from datetime import datetime
from uuid import uuid4

msg = ChatMessage(
    timestamp=datetime.utcnow(),
    msg_id=uuid4(),
    content=[
        TextContent(
            type="text",
            text="Buy USB-C charger 65W under $30 quantity 1"
        )
    ]
)
```

---

## Troubleshooting

**Agent not appearing in Agentverse:**
- Verify `AGENTVERSE_API_KEY` is correct
- Check that `mailbox=True` and `publish_agent_details=True` are set
- Make sure the agent is running with internet access

**ASI:One can't reach the agent:**
- The mailbox stores messages for up to 24h when the agent is offline
- Once the agent starts, it retrieves queued messages
- Test by sending a message and waiting for the orchestrator to start

**ASI:One replies are delayed:**
- The full pipeline (search → rank → buy) takes 1-3 minutes
- The orchestrator sends an immediate acknowledgement, then a final result
- If no response after 5 minutes, check agent logs

---

## Architecture notes

Only the orchestrator is Agentverse/ASI:One exposed:
- `orchestrator`: `mailbox=True`, `publish_agent_details=True`
- All other agents (search, ranker, treasury, buyers): internal workers, no mailbox

This single-entry-point design keeps the external interface clean while
allowing complex internal coordination.
