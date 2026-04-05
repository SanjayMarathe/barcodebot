from config import agent, chat_proto, payment_proto, QDRANT_URL
from handlers import *  # noqa: F401,F403 — registers protocol handlers
from stripe_payments import format_price

from uagents import Context

agent.include(chat_proto, publish_manifest=True)
agent.include(payment_proto, publish_manifest=True)


@agent.on_event("startup")
async def startup(ctx: Context):
    ctx.logger.info(f"Fetch RAG Agent started — address: {agent.address}")
    ctx.logger.info(f"Qdrant: {QDRANT_URL}")
    ctx.logger.info(f"Fee: {format_price()} per document (Stripe)")


if __name__ == "__main__":
    agent.run()
