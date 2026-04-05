# Launch Your A2A Agent

This example shows how to launch a minimal A2A hello-world agent, register it on Agentverse, expose it with a tunnel, and test it from ASI.One or the Agentverse "Chat with Agent" UI.

## Files

- `launch_your_a2a_agent.py`: the A2A hello-world agent
- `.env.example`: environment variables to fill in
- `requirements.txt`: dependencies for this example

## 1. Create a virtual environment

```bash
cd launch-your-a2a-agent
python3 -m venv .venv
source .venv/bin/activate
```

## 2. Install dependencies

```bash
pip install -r requirements.txt
```

## 3. Create the agent on Agentverse

In Agentverse:

1. Choose `A2A Protocol`.
2. Enter the agent name and keywords.
3. Continue until Agentverse shows the launch snippet.
4. Copy the generated URI from the launch screen.

It will look similar to this:

```text
https://your-handle:your-secret@agentverse.ai/your-agent-name
```

## 4. Create `.env`

```bash
cp .env.example .env
```

Update `.env` with:

```env
HOST=0.0.0.0
PORT=9999
PUBLIC_BASE_URL=https://your-trycloudflare-url.trycloudflare.com
AGENT_NAME=Launch Your A2A Agent
AGENTVERSE_AGENT_URI=https://your-handle:your-secret@agentverse.ai/your-agent-name
```

Important:

- `AGENTVERSE_AGENT_URI` must be the exact URI from the Agentverse launch page.
- `PUBLIC_BASE_URL` must be a public HTTPS URL that forwards to your local machine.

## 5. Create a tunnel

Install `cloudflared` if needed:

```bash
brew install cloudflared
```

Run the tunnel in a separate terminal:

```bash
cloudflared tunnel --url http://localhost:9999
```

Cloudflare will print a URL like:

```text
https://random-name.trycloudflare.com
```

Copy that URL into `PUBLIC_BASE_URL` inside `.env`, then restart the agent.

## 6. Run the agent

```bash
source .venv/bin/activate
python3 launch_your_a2a_agent.py
```

Expected startup logs:

```text
[launch_your_a2a_agent] public base URL: https://random-name.trycloudflare.com
[launch_your_a2a_agent] Agentverse bridge enabled: yes
INFO:     Uvicorn running on http://0.0.0.0:9999
```

## 7. Validate locally

Fetch the agent card:

```bash
curl http://localhost:9999/.well-known/agent-card.json
```

Send a local A2A message:

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
          { "kind": "text", "text": "Abhi" }
        ]
      }
    }
  }'
```

Expected reply:

```text
Hello, Abhi!
```

## 8. Test from ASI.One or Chat with Agent

After the agent is running and the tunnel is active:

1. Open ASI.One or Agentverse.
2. Open the chat for your agent.
3. Send a message like `hello`.
4. Watch the terminal logs.

If it is working, you should see:

```text
[launch_your_a2a_agent] incoming message: '...'
POST /av/chat HTTP/1.1" 200 OK
```

The chat UI should respond with something like:

```text
Hello, hello!
```

## Troubleshooting

If the agent card loads but chat does not work:

- make sure `PUBLIC_BASE_URL` is the Cloudflare URL, not `localhost`
- make sure `cloudflared` is still running
- make sure `AGENTVERSE_AGENT_URI` is set in `.env`
- restart the agent after changing `.env`

If you see:

```text
Agentverse bridge enabled: no
```

then `.env` was not loaded correctly or the URI is missing.
