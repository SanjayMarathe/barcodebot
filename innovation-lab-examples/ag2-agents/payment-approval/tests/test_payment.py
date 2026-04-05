"""Unit tests for payment-approval — no LLM calls, no network, no uAgents runtime."""

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from autogen import LLMConfig

os.environ.setdefault("OPENAI_API_KEY", "test-key")

TEST_LLM = LLMConfig(
    {"model": "gpt-4o-mini", "api_key": "test", "base_url": "https://api.openai.com/v1"}
)


# ── Agent tests ──────────────────────────────────────────────────────


def test_agents_instantiate():
    from payment_agents import build_agents

    researcher, executor = build_agents(TEST_LLM)
    assert researcher.name == "researcher"
    assert executor.name == "payment_executor"


def test_executor_terminates_on_keyword():
    from payment_agents import build_agents

    _, executor = build_agents(TEST_LLM)
    assert (
        executor._is_termination_msg({"content": "PAYMENT APPROVED. TERMINATE"}) is True
    )
    assert (
        executor._is_termination_msg({"content": "PAYMENT REJECTED. TERMINATE"}) is True
    )
    assert executor._is_termination_msg({"content": "Still investigating."}) is False


def test_executor_human_input_mode_is_never():
    """In uAgent mode, human_input_mode is NEVER — payment protocol handles approval."""
    from payment_agents import build_agents

    _, executor = build_agents(TEST_LLM)
    assert executor.human_input_mode == "NEVER"


def test_researcher_no_custom_termination():
    from payment_agents import build_agents

    researcher, _ = build_agents(TEST_LLM)
    assert researcher._is_termination_msg({"content": "ASSESSMENT COMPLETE"}) is False


# ── Parser tests ─────────────────────────────────────────────────────


def test_parse_payment_request_full():
    from payment_executor import _parse_payment_request

    recipient, amount, reason, currency = _parse_payment_request(
        "Pay 50.5 USDC to alice.fetch — reason: 'research report delivery'"
    )
    assert recipient == "alice.fetch"
    assert amount == 50.5
    assert reason == "research report delivery"
    assert currency == "USDC"


def test_parse_payment_request_no_reason():
    from payment_executor import _parse_payment_request

    recipient, amount, reason, currency = _parse_payment_request(
        "Send 100 FET to bob.fetch"
    )
    assert recipient == "bob.fetch"
    assert amount == 100.0
    assert currency == "FET"


def test_parse_payment_request_fallback():
    from payment_executor import _parse_payment_request

    recipient, amount, reason, currency = _parse_payment_request(
        "Please investigate this payment"
    )
    assert recipient == "unknown"
    assert amount == 0.0
    assert reason == "Please investigate this payment"


# ── Executor tests ───────────────────────────────────────────────────


def _make_context(text: str):
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
async def test_execute_calls_run_payment_assessment():
    from payment_executor import PaymentApprovalExecutor

    exec_ = PaymentApprovalExecutor(llm_config=TEST_LLM)
    ctx, part_cls, text_part_cls = _make_context(
        "Pay 50 USDC to alice.fetch — reason: 'report'"
    )
    event_queue = AsyncMock()

    with (
        patch("payment_executor.Part", part_cls),
        patch("payment_executor.TextPart", text_part_cls),
        patch(
            "payment_executor.run_payment_assessment",
            new_callable=AsyncMock,
            return_value="APPROVED",
        ) as mock_run,
        patch(
            "payment_executor.new_agent_text_message", return_value="event"
        ) as mock_msg,
    ):
        await exec_.execute(ctx, event_queue)

    mock_run.assert_called_once_with(
        recipient="alice.fetch",
        amount=50.0,
        reason="report",
        llm_config=TEST_LLM,
        currency="USDC",
    )
    mock_msg.assert_called_once_with("APPROVED")
    event_queue.enqueue_event.assert_called_once_with("event")


@pytest.mark.asyncio
async def test_execute_empty_message():
    from payment_executor import PaymentApprovalExecutor

    exec_ = PaymentApprovalExecutor(llm_config=TEST_LLM)
    message = MagicMock()
    message.parts = []
    ctx = MagicMock()
    ctx.message = message
    event_queue = AsyncMock()

    with (
        patch("payment_executor.Part", MagicMock),
        patch("payment_executor.TextPart", MagicMock),
        patch(
            "payment_executor.new_agent_text_message", return_value="err"
        ) as mock_msg,
    ):
        await exec_.execute(ctx, event_queue)

    mock_msg.assert_called_once_with("Error: No message content received.")


@pytest.mark.asyncio
async def test_execute_handles_error():
    from payment_executor import PaymentApprovalExecutor

    exec_ = PaymentApprovalExecutor(llm_config=TEST_LLM)
    ctx, part_cls, text_part_cls = _make_context("Pay 10 USDC to fail.fetch")
    event_queue = AsyncMock()

    with (
        patch("payment_executor.Part", part_cls),
        patch("payment_executor.TextPart", text_part_cls),
        patch(
            "payment_executor.run_payment_assessment",
            new_callable=AsyncMock,
            side_effect=RuntimeError("LLM timeout"),
        ),
        patch(
            "payment_executor.new_agent_text_message", return_value="err"
        ) as mock_msg,
    ):
        await exec_.execute(ctx, event_queue)

    mock_msg.assert_called_once_with("Payment assessment failed: LLM timeout")


def test_executor_inherits_agent_executor():
    from payment_executor import PaymentApprovalExecutor
    from a2a.server.agent_execution import AgentExecutor

    assert issubclass(PaymentApprovalExecutor, AgentExecutor)


# ── Smoke tests ──────────────────────────────────────────────────────


def test_workflow_is_async_callable():
    """run_payment_assessment must be an async function."""
    import inspect
    from payment_workflow import run_payment_assessment

    assert callable(run_payment_assessment)
    assert inspect.iscoroutinefunction(run_payment_assessment)


@pytest.mark.asyncio
async def test_executor_cancel_raises():
    """cancel() is not supported and must raise."""
    from payment_executor import PaymentApprovalExecutor

    exec_ = PaymentApprovalExecutor(llm_config=TEST_LLM)
    with pytest.raises(Exception, match="Cancel not supported"):
        await exec_.cancel(MagicMock(), AsyncMock())


def test_main_module_creates_adapter():
    """main.py must load and expose an adapter instance."""
    import payment_main as main

    assert hasattr(main, "adapter")
    assert main.adapter.name == "AG2 Payment Approval Agent"


def test_adapter_construction():
    """SingleA2AAdapter accepts the params used in main.py."""
    from uagents_adapter import SingleA2AAdapter

    adapter = SingleA2AAdapter(
        agent_executor=MagicMock(),
        name="test",
        description="test",
        port=8009,
        a2a_port=9998,
        mailbox=True,
        seed="test-seed",
    )
    assert adapter.name == "test"
