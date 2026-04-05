"""Buyer Agent C — handles cart automation for assigned items."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from agents.buyer_base import make_buyer_agent
from agents.shared.config import BUYER_C_PORT, BUYER_C_SEED

buyer_c, _ = make_buyer_agent(name="buyer_c", seed=BUYER_C_SEED, port=BUYER_C_PORT)

if __name__ == "__main__":
    buyer_c.run()
