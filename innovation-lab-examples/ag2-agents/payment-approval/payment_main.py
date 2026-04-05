"""
AG2 two-agent payment approval workflow, exposed via A2A protocol.

On each request, two AG2 ConversableAgents (researcher → payment_executor)
are created in payment_agents.py and orchestrated by payment_workflow.py to produce a risk
assessment. The result is served through SingleA2AAdapter, making the AG2
workflow discoverable on Agentverse and callable from ASI:One or other
agents in the ecosystem.

Requires Python ≤3.13 (uagents depends on Pydantic v1, incompatible with 3.14+).
"""

import sys

if sys.version_info >= (3, 14):
    raise RuntimeError(
        "uagents requires Python ≤3.13 (Pydantic v1 is incompatible with 3.14+). "
        "Please use Python 3.10–3.13."
    )

import os
from dotenv import load_dotenv
from uagents_adapter import SingleA2AAdapter
from autogen import LLMConfig

from payment_executor import PaymentApprovalExecutor

load_dotenv()

llm_config = LLMConfig(
    {
        "model": os.getenv("LLM_MODEL", "gpt-4o-mini"),
        "api_key": os.getenv("OPENAI_API_KEY", ""),
        "base_url": os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
    },
    temperature=0.2,
    cache_seed=None,
)

executor = PaymentApprovalExecutor(llm_config=llm_config)

adapter = SingleA2AAdapter(
    agent_executor=executor,
    name="AG2 Payment Approval Agent",
    description=(
        "Two-agent payment approval workflow using AG2 (formerly AutoGen). "
        "A researcher investigates the recipient and a payment executor "
        "produces a risk assessment with an APPROVED/REJECTED verdict. "
        "Supports Fetch.ai payment protocol for commit/reject flows."
    ),
    port=int(os.getenv("AGENT_PORT", "8009")),
    a2a_port=int(os.getenv("A2A_PORT", "9998")),
    mailbox=True,
    seed=os.getenv("AGENT_SEED"),
)

if __name__ == "__main__":
    adapter.run()
