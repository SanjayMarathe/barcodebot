import os

import uvicorn
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.utils import new_agent_text_message
from dotenv import load_dotenv

from common import build_agent_card, build_app, gemini_generate

load_dotenv()

HOST = os.getenv("HOST", "0.0.0.0")
RESEARCH_PORT = int(os.getenv("RESEARCH_PORT", "10001"))
RESEARCH_URL = os.getenv("RESEARCH_AGENT_URL", f"http://localhost:{RESEARCH_PORT}")

SYSTEM_PROMPT = """
You are the Research Agent in a multi-agent research team.

Your job:
- produce factual research notes on the user's topic
- return concise, structured notes
- do not write the final polished answer

Output format:
1. Topic
2. Key facts
3. Important context
4. Open questions or uncertainties
"""


class ResearchAgentExecutor(AgentExecutor):
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        user_text = context.get_user_input().strip()
        print(f"[research_agent] incoming message: {user_text!r}")
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
    name="Research Agent",
    description="Generates research notes on a topic using Gemini.",
    url=RESEARCH_URL,
    skill_id="research_topic",
    skill_name="Research Topic",
    skill_description="Collects concise research notes about a topic.",
    examples=["Research EV adoption in India", "Research AI regulation in Europe"],
    tags=["research", "gemini", "notes", "a2a"],
)

app = build_app(agent_card, ResearchAgentExecutor())


if __name__ == "__main__":
    print(f"[research_agent] listening on {RESEARCH_URL}")
    uvicorn.run(app, host=HOST, port=RESEARCH_PORT)
