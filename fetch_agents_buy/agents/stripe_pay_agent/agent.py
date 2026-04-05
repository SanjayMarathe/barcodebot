import sys
from pathlib import Path

# Allow importing from agents/stripe_pay_agent directly
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from config import AGENT_SEED, AGENT_PORT  # noqa: E402
from chat_proto import build_chat_proto  # noqa: E402
from payment_proto import build_payment_proto  # noqa: E402
from handlers import on_chat, on_commit, on_reject  # noqa: E402

from uagents import Agent

agent = Agent(
    name="stripe-pay-agent",
    seed=AGENT_SEED,
    port=AGENT_PORT,
    mailbox=True,
    publish_agent_details=True,
)

agent.include(build_chat_proto(on_chat), publish_manifest=True)
agent.include(build_payment_proto(on_commit, on_reject), publish_manifest=True)

if __name__ == "__main__":
    agent.run()
