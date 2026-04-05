"""
Search Agent — stub passthrough.

The buyer agents do the real Amazon search via BrowserUse.
This agent just forwards item names so the ranker can apply
its hardcoded demo catalog and the pipeline flows normally.
"""
import logging
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import httpx
from uagents import Agent, Context, Protocol

from agents.shared.config import (
    FASTAPI_CALLBACK_URL,
    SEARCH_PORT,
    SEARCH_SEED,
)
from agents.shared.messages import SearchRequest, SearchResults

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("search_agent")

search_agent = Agent(
    name="search-agent",
    seed=SEARCH_SEED,
    port=SEARCH_PORT,
    mailbox=True,
)

search_proto = Protocol(name="search-protocol")


async def post_event(run_id: str, event_type: str, payload: dict):
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(FASTAPI_CALLBACK_URL, json={
                "run_id": run_id,
                "agent_name": "search",
                "event_type": event_type,
                "timestamp": datetime.utcnow().isoformat(),
                "payload": payload,
            })
    except Exception as e:
        logger.warning(f"Failed to post event {event_type}: {e}")


@search_proto.on_message(SearchRequest)
async def handle_search_request(ctx: Context, sender: str, msg: SearchRequest):
    logger.info(f"[search] Passthrough for {len(msg.items)} items (run {msg.run_id[:8]})")

    # Return each item name as a single stub candidate.
    # The ranker will match against its demo catalog; the buyer agent does the real Amazon search.
    results: dict = {}
    for item_dict in msg.items:
        item_name = item_dict.get("name", "unknown")
        results[item_name] = [{
            "title": item_name,
            "price": item_dict.get("max_price", 50.0),
            "rating": 4.5,
            "review_count": 1000,
            "url": f"https://www.amazon.com/s?k={item_name.replace(' ', '+')}",
            "thumbnail": "",
        }]
        logger.info(f"[search] Stub result for '{item_name}'")

    await post_event(msg.run_id, "search_complete", {
        "items_searched": len(results),
        "total_candidates": len(results),
    })

    await ctx.send(sender, SearchResults(run_id=msg.run_id, results=results))
    logger.info(f"[search] Sent SearchResults for run {msg.run_id[:8]}")


search_agent.include(search_proto)

if __name__ == "__main__":
    search_agent.run()
