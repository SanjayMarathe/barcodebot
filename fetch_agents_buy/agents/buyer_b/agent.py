"""Buyer Agent B — handles cart automation for assigned items."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from agents.buyer_base import make_buyer_agent
from agents.shared.config import BUYER_B_PORT, BUYER_B_SEED

buyer_b, _ = make_buyer_agent(name="buyer_b", seed=BUYER_B_SEED, port=BUYER_B_PORT)

if __name__ == "__main__":
    buyer_b.run()
