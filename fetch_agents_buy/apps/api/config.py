"""FastAPI application configuration from environment variables."""
import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{REPO_ROOT}/diamond_hacks.db")
SCREENSHOTS_DIR = Path(os.getenv("SCREENSHOTS_DIR", str(REPO_ROOT / "screenshots")))

FASTAPI_CALLBACK_URL = os.getenv("FASTAPI_CALLBACK_URL", "http://localhost:8000/internal/agent-event")
FASTAPI_BASE_URL = os.getenv("FASTAPI_BASE_URL", "http://localhost:8000")

TOTAL_BUDGET = float(os.getenv("TOTAL_BUDGET", "200.0"))
TREASURY_MODE = os.getenv("TREASURY_MODE", "mock")
BROWSER_MODE = os.getenv("BROWSER_MODE", "browser_use")
CHECKOUT_MODE = os.getenv("CHECKOUT_MODE", "add_to_cart")

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")

BROWSER_USE_API_KEY = os.getenv("BROWSER_USE_API_KEY", "")

# Agent seeds for address derivation (must match agents/shared/config.py)
ORCHESTRATOR_SEED = os.getenv("ORCHESTRATOR_SEED", "orchestrator-shopping-agent-seed-phrase-2026")
SEARCH_SEED = os.getenv("SEARCH_AGENT_SEED", "search-agent-seed-phrase-diamond-hacks-2026")
RANKER_SEED = os.getenv("RANKER_AGENT_SEED", "ranker-agent-seed-phrase-diamond-hacks-2026")
TREASURY_SEED = os.getenv("TREASURY_AGENT_SEED", "treasury-agent-seed-phrase-diamond-hacks-2026")
BUYER_A_SEED = os.getenv("BUYER_A_SEED", "buyer-agent-a-seed-phrase-diamond-hacks-2026")
BUYER_B_SEED = os.getenv("BUYER_B_SEED", "buyer-agent-b-seed-phrase-diamond-hacks-2026")
BUYER_C_SEED = os.getenv("BUYER_C_SEED", "buyer-agent-c-seed-phrase-diamond-hacks-2026")
BUYER_D_SEED = os.getenv("BUYER_D_SEED", "buyer-agent-d-seed-phrase-diamond-hacks-2026")
BUYER_E_SEED = os.getenv("BUYER_E_SEED", "buyer-agent-e-seed-phrase-diamond-hacks-2026")

CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001",
).split(",")
