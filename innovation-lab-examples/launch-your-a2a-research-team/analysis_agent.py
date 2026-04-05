import os

import uvicorn
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.utils import new_agent_text_message
from dotenv import load_dotenv

from common import build_agent_card, build_app, gemini_generate

load_dotenv()

HOST = os.getenv("HOST", "0.0.0.0")
ANALYSIS_PORT = int(os.getenv("ANALYSIS_PORT", "10002"))
ANALYSIS_URL = os.getenv("ANALYSIS_AGENT_URL", f"http://localhost:{ANALYSIS_PORT}")

SYSTEM_PROMPT = """
You are the Analysis Agent in a multi-agent research team.

You receive research notes and transform them into clear analysis.

Output format:
1. Core themes
2. Opportunities
3. Risks or challenges
4. Most important takeaways

Be analytical and concise.
"""


class AnalysisAgentExecutor(AgentExecutor):
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        user_text = context.get_user_input().strip()
        print(f"[analysis_agent] incoming message: {user_text!r}")
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
    name="Analysis Agent",
    description="Analyzes research notes and extracts insights using Gemini.",
    url=ANALYSIS_URL,
    skill_id="analyze_notes",
    skill_name="Analyze Notes",
    skill_description="Turns research notes into insights, risks, and opportunities.",
    examples=["Analyze these research notes about EV adoption"],
    tags=["analysis", "gemini", "insights", "a2a"],
)

app = build_app(agent_card, AnalysisAgentExecutor())


if __name__ == "__main__":
    print(f"[analysis_agent] listening on {ANALYSIS_URL}")
    uvicorn.run(app, host=HOST, port=ANALYSIS_PORT)
