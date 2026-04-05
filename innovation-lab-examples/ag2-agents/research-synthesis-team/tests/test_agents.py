"""Unit tests — no LLM calls, no network, no uAgents runtime."""

import inspect
import os
from unittest.mock import AsyncMock, MagicMock

import pytest
from autogen import LLMConfig

os.environ.setdefault("OPENAI_API_KEY", "test-key")

TEST_LLM_CONFIG = LLMConfig(
    {"model": "gpt-4o-mini", "api_key": "test", "base_url": "https://api.openai.com/v1"}
)


def test_agents_instantiate():
    from research_agents import build_agents

    agents = build_agents(TEST_LLM_CONFIG)
    assert len(agents) == 4
    names = [a.name for a in agents]
    assert "web_researcher" in names
    assert "financial_analyst" in names
    assert "tech_analyst" in names
    assert "synthesizer" in names


def test_synthesizer_termination():
    from research_agents import build_agents

    agents = build_agents(TEST_LLM_CONFIG)
    synthesizer = next(a for a in agents if a.name == "synthesizer")
    assert (
        synthesizer._is_termination_msg({"content": "Report done. TERMINATE"}) is True
    )
    assert synthesizer._is_termination_msg({"content": "Still analysing..."}) is False


def test_executor_instantiates():
    from autogen import UserProxyAgent

    executor = UserProxyAgent(
        name="executor",
        human_input_mode="NEVER",
        code_execution_config=False,
        is_termination_msg=lambda m: "TERMINATE" in (m.get("content") or ""),
    )
    assert executor.name == "executor"


def test_llmconfig_positional_dict_construction():
    """Validate the positional-dict LLMConfig used in main.py works with AG2 0.11+."""
    cfg = LLMConfig(
        {
            "model": "gpt-4o-mini",
            "api_key": "test-key",
            "base_url": "https://api.openai.com/v1",
        },
        temperature=0.3,
        cache_seed=None,
    )
    from autogen import AssistantAgent

    agent = AssistantAgent(
        name="llm_config_test",
        system_message="test",
        llm_config=cfg,
    )
    assert agent.name == "llm_config_test"


def test_executor_inherits_agent_executor():
    """AG2ResearchExecutor must subclass AgentExecutor."""
    from research_executor import AG2ResearchExecutor
    from a2a.server.agent_execution import AgentExecutor

    assert issubclass(AG2ResearchExecutor, AgentExecutor)


def test_executor_stores_config():
    """AG2ResearchExecutor.__init__ must store llm_config and mcp_url."""
    from research_executor import AG2ResearchExecutor

    exec_ = AG2ResearchExecutor(
        llm_config=TEST_LLM_CONFIG, mcp_url="http://example.com"
    )
    assert exec_.llm_config is TEST_LLM_CONFIG
    assert exec_.mcp_url == "http://example.com"


@pytest.mark.asyncio
async def test_executor_cancel_raises():
    """cancel() is not supported and must raise."""
    from research_executor import AG2ResearchExecutor

    exec_ = AG2ResearchExecutor(llm_config=TEST_LLM_CONFIG)
    with pytest.raises(Exception, match="Cancel not supported"):
        await exec_.cancel(MagicMock(), AsyncMock())


def test_workflow_is_async_callable():
    """run_research must be an async function."""
    from research_workflow import run_research

    assert callable(run_research)
    assert inspect.iscoroutinefunction(run_research)


def test_main_module_creates_adapter():
    """main.py must load and expose an adapter instance."""
    import research_main as main

    assert hasattr(main, "adapter")
    assert main.adapter.name == "AG2 Research Synthesis Team"


def test_duckduckgo_search_tool_instantiates():
    """DuckDuckGoSearchTool must be constructable with no arguments."""
    from autogen.tools.experimental import DuckDuckGoSearchTool

    tool = DuckDuckGoSearchTool()
    assert hasattr(tool, "register_for_llm")
    assert hasattr(tool, "register_for_execution")


def test_adapter_construction():
    """SingleA2AAdapter accepts the params used in main.py."""
    from unittest.mock import MagicMock
    from uagents_adapter import SingleA2AAdapter

    adapter = SingleA2AAdapter(
        agent_executor=MagicMock(),
        name="test",
        description="test",
        port=8008,
        a2a_port=9999,
        mailbox=True,
        seed="test-seed",
    )
    assert adapter.name == "test"
