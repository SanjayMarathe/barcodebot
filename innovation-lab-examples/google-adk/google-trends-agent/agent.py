"""
Google Trends Agent — uAgent entry point.

Wraps the Google ADK-style Google Trends pipeline (SQL generation via ASI:One
+ BigQuery execution) inside a Fetch.ai uAgent with:
  - ASI:One chat protocol  → discoverable on Agentverse / ASI1 marketplace
  - Stripe payment protocol → $1 per trends query via embedded Stripe checkout

Usage:
    python agent.py

Environment variables: see .env.example
"""

from dotenv import load_dotenv

load_dotenv()

# Config must be imported after dotenv so env vars are available
from core.config import AGENT_PORT, AGENT_SEED  # noqa: E402

from uagents import Agent  # noqa: E402

from protocols.chat_proto import build_chat_proto  # noqa: E402
from core.handlers import on_chat, on_commit, on_reject  # noqa: E402
from protocols.payment_proto import build_payment_proto  # noqa: E402

agent = Agent(
    name="google-trends-agent",
    seed=AGENT_SEED,
    port=AGENT_PORT,
    mailbox=True,  # connect to Agentverse mailroom
    publish_agent_details=True,  # appear in ASI:One marketplace search
)

# Include both protocols so the agent is reachable via ASI:One chat UI
# and handles Stripe payment messages
agent.include(build_chat_proto(on_chat), publish_manifest=True)
agent.include(build_payment_proto(on_commit, on_reject), publish_manifest=True)

if __name__ == "__main__":
    agent.run()
