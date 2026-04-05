"""
Run all 10 agents together using uAgents Bureau.

Usage:
    cd diamond_hacks
    python agents/run_all.py

All agents will start on their assigned ports and begin communicating.
The orchestrator will poll SQLite for new runs submitted via FastAPI.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import logging
from uagents import Bureau

# Import all agents
from agents.orchestrator.agent import orchestrator
from agents.search.agent import search_agent
from agents.ranker.agent import ranker_agent
from agents.treasury.agent import treasury_agent
from agents.buyer_a.agent import buyer_a
from agents.buyer_b.agent import buyer_b
from agents.buyer_c.agent import buyer_c
from agents.buyer_d.agent import buyer_d
from agents.buyer_e.agent import buyer_e
from agents.cart_agent.agent import cart_agent

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("bureau")


def main():
    logger.info("Starting DiamondHacks Shopping Agent Bureau...")
    logger.info("Agents:")
    for agent in [orchestrator, search_agent, ranker_agent, treasury_agent,
                  buyer_a, buyer_b, buyer_c, buyer_d, buyer_e, cart_agent]:
        logger.info(f"  {agent.name} → {agent.address} (port {agent._port})")

    bureau = Bureau(port=8011)  # 8011 avoids conflict with FastAPI (8000) and agents (8001-8010)
    bureau.add(orchestrator)
    bureau.add(search_agent)
    bureau.add(ranker_agent)
    bureau.add(treasury_agent)
    bureau.add(buyer_a)
    bureau.add(buyer_b)
    bureau.add(buyer_c)
    bureau.add(buyer_d)
    bureau.add(buyer_e)
    bureau.add(cart_agent)

    logger.info("Bureau started. Waiting for runs...")
    bureau.run()


if __name__ == "__main__":
    main()
