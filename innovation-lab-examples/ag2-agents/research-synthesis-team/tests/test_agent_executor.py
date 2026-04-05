"""Unit tests for AG2ResearchExecutor — no LLM calls, no network."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from autogen import LLMConfig

from research_executor import AG2ResearchExecutor

TEST_LLM = LLMConfig(
    {"model": "gpt-4o-mini", "api_key": "test", "base_url": "https://api.openai.com/v1"}
)


def _make_context(text: str):
    """Build a minimal RequestContext-like object with a text message."""
    text_part = MagicMock()
    text_part.root = MagicMock()
    text_part.root.text = text

    part_cls = type(text_part)
    text_part_cls = type(text_part.root)

    message = MagicMock()
    message.parts = [text_part]
    ctx = MagicMock()
    ctx.message = message
    return ctx, part_cls, text_part_cls


@pytest.mark.asyncio
async def test_execute_calls_run_research():
    executor = AG2ResearchExecutor(llm_config=TEST_LLM)
    ctx, part_cls, text_part_cls = _make_context("quantum computing")
    event_queue = AsyncMock()

    with (
        patch("research_executor.Part", part_cls),
        patch("research_executor.TextPart", text_part_cls),
        patch(
            "research_executor.run_research",
            new_callable=AsyncMock,
            return_value="Mock report",
        ) as mock_run,
        patch(
            "research_executor.new_agent_text_message", return_value="event"
        ) as mock_msg,
    ):
        await executor.execute(ctx, event_queue)

    mock_run.assert_called_once_with("quantum computing", TEST_LLM, None)
    mock_msg.assert_called_once_with("Mock report")
    event_queue.enqueue_event.assert_called_once_with("event")


@pytest.mark.asyncio
async def test_execute_empty_message():
    executor = AG2ResearchExecutor(llm_config=TEST_LLM)
    message = MagicMock()
    message.parts = []
    ctx = MagicMock()
    ctx.message = message
    event_queue = AsyncMock()

    with (
        patch("research_executor.Part", MagicMock),
        patch("research_executor.TextPart", MagicMock),
        patch(
            "research_executor.new_agent_text_message", return_value="err_event"
        ) as mock_msg,
    ):
        await executor.execute(ctx, event_queue)

    mock_msg.assert_called_once_with("Error: No message content received.")
    event_queue.enqueue_event.assert_called_once_with("err_event")


@pytest.mark.asyncio
async def test_execute_handles_research_error():
    executor = AG2ResearchExecutor(llm_config=TEST_LLM)
    ctx, part_cls, text_part_cls = _make_context("bad topic")
    event_queue = AsyncMock()

    failing_research = AsyncMock(side_effect=RuntimeError("LLM timeout"))
    with (
        patch("research_executor.Part", part_cls),
        patch("research_executor.TextPart", text_part_cls),
        patch("research_executor.run_research", failing_research),
        patch(
            "research_executor.new_agent_text_message", return_value="err"
        ) as mock_msg,
    ):
        await executor.execute(ctx, event_queue)

    mock_msg.assert_called_once_with("Research failed: LLM timeout")
    event_queue.enqueue_event.assert_called_once_with("err")


def test_executor_inherits_agent_executor():
    """AG2ResearchExecutor must inherit from the A2A AgentExecutor base class."""
    from a2a.server.agent_execution import AgentExecutor

    assert issubclass(AG2ResearchExecutor, AgentExecutor)
