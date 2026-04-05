"""
GET /registry — agent address registry (addresses derived from seeds).

Agent addresses are deterministic: given the same seed phrase, uAgents always
generates the same bech32 address. We compute them here so the frontend and
debug page can display them without querying the agents directly.
"""
import logging
from datetime import datetime

from fastapi import APIRouter

from apps.api.config import (
    BUYER_A_SEED, BUYER_B_SEED, BUYER_C_SEED, BUYER_D_SEED, BUYER_E_SEED,
    ORCHESTRATOR_SEED, RANKER_SEED, SEARCH_SEED, TREASURY_SEED,
)
from apps.api.schemas import AgentInfo, AgentRegistry

logger = logging.getLogger(__name__)
router = APIRouter(tags=["registry"])


def _derive_address(seed: str) -> str:
    """Derive uAgent address from seed. Returns placeholder if uagents not installed."""
    try:
        from uagents.crypto import Identity  # type: ignore
        identity = Identity.from_seed(seed, 0)
        return identity.address
    except Exception:
        # Graceful fallback if uagents not installed in API process
        return f"agent1q[derived-from-seed:{seed[:12]}...]"


@router.get("/registry", response_model=AgentRegistry)
async def get_registry():
    """Return all agent addresses and metadata."""
    agents = [
        AgentInfo(name="orchestrator", address=_derive_address(ORCHESTRATOR_SEED), port=8001, role="orchestrator/ASI:One interface"),
        AgentInfo(name="search", address=_derive_address(SEARCH_SEED), port=8002, role="amazon search"),
        AgentInfo(name="ranker", address=_derive_address(RANKER_SEED), port=8003, role="product ranking"),
        AgentInfo(name="treasury", address=_derive_address(TREASURY_SEED), port=8004, role="budget approval"),
        AgentInfo(name="buyer_a", address=_derive_address(BUYER_A_SEED), port=8005, role="cart automation"),
        AgentInfo(name="buyer_b", address=_derive_address(BUYER_B_SEED), port=8006, role="cart automation"),
        AgentInfo(name="buyer_c", address=_derive_address(BUYER_C_SEED), port=8007, role="cart automation"),
        AgentInfo(name="buyer_d", address=_derive_address(BUYER_D_SEED), port=8008, role="cart automation"),
        AgentInfo(name="buyer_e", address=_derive_address(BUYER_E_SEED), port=8009, role="cart automation"),
    ]
    return AgentRegistry(
        agents=agents,
        fastapi_url="http://localhost:8000",
        updated_at=datetime.utcnow(),
    )
