"""
Shared configuration loaded from environment variables.
All agents import from here to ensure consistent settings.
"""
import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env", override=True)
except ImportError:
    pass

# -----------------------------------------------------------------------
# Paths
# -----------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parents[2]
SCREENSHOTS_DIR = Path(os.getenv("SCREENSHOTS_DIR", str(REPO_ROOT / "screenshots")))
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{REPO_ROOT}/diamond_hacks.db")
DATABASE_PATH = str(REPO_ROOT / "diamond_hacks.db")

# -----------------------------------------------------------------------
# FastAPI callback
# -----------------------------------------------------------------------
FASTAPI_CALLBACK_URL = os.getenv("FASTAPI_CALLBACK_URL", "http://localhost:8099/internal/agent-event")
FASTAPI_BASE_URL = os.getenv("FASTAPI_BASE_URL", "http://localhost:8099")

# -----------------------------------------------------------------------
# Agent seeds (deterministic addresses)
# -----------------------------------------------------------------------
ORCHESTRATOR_SEED = os.getenv("ORCHESTRATOR_SEED", "orchestrator-shopping-agent-seed-phrase-2026")
SEARCH_SEED = os.getenv("SEARCH_AGENT_SEED", "search-agent-seed-phrase-diamond-hacks-2026")
RANKER_SEED = os.getenv("RANKER_AGENT_SEED", "ranker-agent-seed-phrase-diamond-hacks-2026")
TREASURY_SEED = os.getenv("TREASURY_AGENT_SEED", "treasury-agent-seed-phrase-diamond-hacks-2026")
BUYER_A_SEED = os.getenv("BUYER_A_SEED", "buyer-agent-a-seed-phrase-diamond-hacks-2026")
BUYER_B_SEED = os.getenv("BUYER_B_SEED", "buyer-agent-b-seed-phrase-diamond-hacks-2026")
BUYER_C_SEED = os.getenv("BUYER_C_SEED", "buyer-agent-c-seed-phrase-diamond-hacks-2026")
BUYER_D_SEED = os.getenv("BUYER_D_SEED", "buyer-agent-d-seed-phrase-diamond-hacks-2026")
BUYER_E_SEED = os.getenv("BUYER_E_SEED", "buyer-agent-e-seed-phrase-diamond-hacks-2026")
CART_AGENT_SEED = os.getenv("CART_AGENT_SEED", "cart-agent-seed-phrase-diamond-hacks-2026")

# -----------------------------------------------------------------------
# Agent ports
# -----------------------------------------------------------------------
ORCHESTRATOR_PORT = int(os.getenv("ORCHESTRATOR_PORT", "8001"))
SEARCH_PORT = int(os.getenv("SEARCH_PORT", "8002"))
RANKER_PORT = int(os.getenv("RANKER_PORT", "8003"))
TREASURY_PORT = int(os.getenv("TREASURY_PORT", "8004"))
BUYER_A_PORT = int(os.getenv("BUYER_A_PORT", "8005"))
BUYER_B_PORT = int(os.getenv("BUYER_B_PORT", "8006"))
BUYER_C_PORT = int(os.getenv("BUYER_C_PORT", "8007"))
BUYER_D_PORT = int(os.getenv("BUYER_D_PORT", "8008"))
BUYER_E_PORT = int(os.getenv("BUYER_E_PORT", "8009"))
CART_AGENT_PORT = int(os.getenv("CART_AGENT_PORT", "8010"))

# -----------------------------------------------------------------------
# Agentverse
# -----------------------------------------------------------------------
AGENTVERSE_API_KEY = os.getenv("AGENTVERSE_API_KEY", "")

# -----------------------------------------------------------------------
# Browser Use Cloud
# -----------------------------------------------------------------------
BROWSER_USE_API_KEY = os.getenv("BROWSER_USE_API_KEY", "")

# -----------------------------------------------------------------------
# Mode flags
# -----------------------------------------------------------------------
TREASURY_MODE = os.getenv("TREASURY_MODE", "mock")          # mock | stripe
BROWSER_MODE = os.getenv("BROWSER_MODE", "browser_use")     # browser_use | local
CHECKOUT_MODE = os.getenv("CHECKOUT_MODE", "add_to_cart")   # add_to_cart | checkout_ready
TOTAL_BUDGET = float(os.getenv("TOTAL_BUDGET", "200.0"))

# -----------------------------------------------------------------------
# Stripe (optional)
# -----------------------------------------------------------------------
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
