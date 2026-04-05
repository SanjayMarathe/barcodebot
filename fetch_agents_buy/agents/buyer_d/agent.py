"""Buyer Agent D — handles cart automation for assigned items."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from agents.buyer_base import make_buyer_agent
from agents.shared.config import BUYER_D_PORT, BUYER_D_SEED

buyer_d, _ = make_buyer_agent(name="buyer_d", seed=BUYER_D_SEED, port=BUYER_D_PORT)

if __name__ == "__main__":
    buyer_d.run()
