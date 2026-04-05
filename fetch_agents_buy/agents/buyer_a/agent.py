"""Buyer Agent A — handles cart automation for assigned items."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from agents.buyer_base import make_buyer_agent
from agents.shared.config import BUYER_A_PORT, BUYER_A_SEED

buyer_a, _ = make_buyer_agent(name="buyer_a", seed=BUYER_A_SEED, port=BUYER_A_PORT)

if __name__ == "__main__":
    buyer_a.run()
