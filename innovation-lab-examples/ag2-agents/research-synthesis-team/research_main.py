"""
AG2 multi-agent research team, exposed via A2A protocol.

On each request, four AG2 AssistantAgents are created in research_agents.py and
orchestrated under GroupChat (research_workflow.py) with LLM-driven speaker selection
to produce structured research reports. The result is served through
SingleA2AAdapter, making the AG2 workflow discoverable on Agentverse and
callable from ASI:One or other agents in the ecosystem.

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

from research_executor import AG2ResearchExecutor

load_dotenv()

llm_config = LLMConfig(
    {
        "model": os.getenv("LLM_MODEL", "gpt-4o-mini"),
        "api_key": os.getenv("OPENAI_API_KEY", ""),
        "base_url": os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
    },
    temperature=0.3,
    cache_seed=None,
)

executor = AG2ResearchExecutor(
    llm_config=llm_config,
    mcp_url=os.getenv("MCP_SERVER_URL"),  # optional: Fetch.ai MCP gateway
)

adapter = SingleA2AAdapter(
    agent_executor=executor,
    name="AG2 Research Synthesis Team",
    description=(
        "Multi-agent research team using AG2 (formerly AutoGen). "
        "Four specialists (web researcher, financial analyst, tech analyst, synthesizer) "
        "collaborate to produce comprehensive research reports on any topic."
    ),
    port=int(os.getenv("AGENT_PORT", "8008")),
    a2a_port=int(os.getenv("A2A_PORT", "9999")),
    mailbox=True,
    seed=os.getenv("AGENT_SEED"),
)

if __name__ == "__main__":
    adapter.run()
