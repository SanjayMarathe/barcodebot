import os

import uvicorn
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.utils import new_agent_text_message
from dotenv import load_dotenv

from common import build_agent_card, build_app, gemini_generate

load_dotenv()

HOST = os.getenv("HOST", "0.0.0.0")
SUMMARY_PORT = int(os.getenv("SUMMARY_PORT", "10003"))
SUMMARY_URL = os.getenv("SUMMARY_AGENT_URL", f"http://localhost:{SUMMARY_PORT}")

SYSTEM_PROMPT = """
You are the Summary Agent in a multi-agent research team.

You receive research findings and analysis, and produce the final response for the user.

Output requirements:
- start with a 2-3 sentence executive summary
- then provide 3-5 bullets
- keep the answer crisp and easy to read
- do not mention internal agents
"""


class SummaryAgentExecutor(AgentExecutor):
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        user_text = context.get_user_input().strip()
        print(f"[summary_agent] incoming message: {user_text!r}")
        result = gemini_generate(SYSTEM_PROMPT, user_text)
        await event_queue.enqueue_event(
            new_agent_text_message(
                result,
                context_id=context.context_id,
                task_id=context.task_id,
            )
        )

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        raise NotImplementedError("cancel not supported")


agent_card = build_agent_card(
    name="Summary Agent",
    description="Produces a polished final summary using Gemini.",
    url=SUMMARY_URL,
    skill_id="summarize_brief",
    skill_name="Summarize Brief",
    skill_description="Converts research and analysis into a final answer.",
    examples=["Summarize this market research brief"],
    tags=["summary", "gemini", "brief", "a2a"],
)

app = build_app(agent_card, SummaryAgentExecutor())


if __name__ == "__main__":
    print(f"[summary_agent] listening on {SUMMARY_URL}")
    uvicorn.run(app, host=HOST, port=SUMMARY_PORT)
