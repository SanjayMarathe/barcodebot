"""
Wraps the AG2 GroupChat workflow as an A2A AgentExecutor
for use with SingleA2AAdapter (Pattern B).
"""

from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.types import Part, TextPart
from a2a.utils import new_agent_text_message
from autogen import LLMConfig
from typing_extensions import override

from research_workflow import run_research


class AG2ResearchExecutor(AgentExecutor):
    """A2A-compatible executor wrapping the AG2 GroupChat workflow."""

    def __init__(self, llm_config: LLMConfig, mcp_url: str | None = None):
        self.llm_config = llm_config
        self.mcp_url = mcp_url

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
            result = await run_research(message_content, self.llm_config, self.mcp_url)
            await event_queue.enqueue_event(new_agent_text_message(result))
        except Exception as e:
            await event_queue.enqueue_event(
                new_agent_text_message(f"Research failed: {e}")
            )

    @override
    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        raise Exception("Cancel not supported for this agent executor.")
