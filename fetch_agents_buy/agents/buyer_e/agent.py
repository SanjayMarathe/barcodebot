"""Buyer Agent E — handles cart automation for assigned items."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from agents.buyer_base import make_buyer_agent
from agents.shared.config import BUYER_E_PORT, BUYER_E_SEED

buyer_e, _ = make_buyer_agent(name="buyer_e", seed=BUYER_E_SEED, port=BUYER_E_PORT)

if __name__ == "__main__":
    buyer_e.run()
