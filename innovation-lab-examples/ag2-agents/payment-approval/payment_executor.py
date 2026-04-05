"""
Wraps the AG2 payment assessment workflow as an A2A AgentExecutor
for use with SingleA2AAdapter.
"""

import re

from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.types import Part, TextPart
from a2a.utils import new_agent_text_message
from autogen import LLMConfig
from typing_extensions import override

from payment_workflow import run_payment_assessment

# Pattern: "50 USDC to alice.fetch — reason: 'research report delivery'"
_PAYMENT_RE = re.compile(
    r"(?P<amount>[\d.]+)\s+(?P<currency>\w+)\s+to\s+(?P<recipient>\S+)"
    r"(?:\s*[—\-]+\s*reason:\s*['\"]?(?P<reason>[^'\"]+)['\"]?)?",
    re.IGNORECASE,
)


def _parse_payment_request(text: str) -> tuple[str, float, str, str]:
    """Extract (recipient, amount, reason, currency) from free-text message.

    Falls back to passing the entire message as the reason if parsing fails.
    """
    m = _PAYMENT_RE.search(text)
    if m:
        return (
            m.group("recipient"),
            float(m.group("amount")),
            m.group("reason") or "not specified",
            m.group("currency"),
        )
    # Fallback: let the LLM agents figure it out
    return ("unknown", 0.0, text, "USDC")


class PaymentApprovalExecutor(AgentExecutor):
    """A2A-compatible executor wrapping the AG2 payment assessment workflow."""

    def __init__(self, llm_config: LLMConfig):
        self.llm_config = llm_config

    @override
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        if context.message is None:
            await event_queue.enqueue_event(
                new_agent_text_message("Error: No message content received.")
            )
            return

        message_content = ""
        for part in context.message.parts:
            if isinstance(part, Part):
                if isinstance(part.root, TextPart):
                    message_content = part.root.text
                    break

        if not message_content:
            await event_queue.enqueue_event(
                new_agent_text_message("Error: No message content received.")
            )
            return

        try:
            recipient, amount, reason, currency = _parse_payment_request(
                message_content
            )
            result = await run_payment_assessment(
                recipient=recipient,
                amount=amount,
                reason=reason,
                llm_config=self.llm_config,
                currency=currency,
            )
            await event_queue.enqueue_event(new_agent_text_message(result))
        except Exception as e:
            await event_queue.enqueue_event(
                new_agent_text_message(f"Payment assessment failed: {e}")
            )

    @override
    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        raise Exception("Cancel not supported for this agent executor.")
