"""
FastAPI request/response schemas.
Re-exports canonical models from packages/shared_py/schemas.py and adds
any API-specific schemas.
"""
import sys
from pathlib import Path

# Make packages/shared_py importable from apps/api
_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from packages.shared_py.schemas import (  # noqa: F401 — re-export
    AgentEvent,
    AgentInfo,
    AgentRegistry,
    BrowserSessionMeta,
    BudgetApproval,
    BuyResult,
    CreateRunRequest,
    CreateRunResponse,
    ModeConfig,
    RankingDecision,
    RunStatus,
    SearchCandidate,
    ScreenshotMeta,
    ShoppingItem,
    UpdateModesRequest,
)

from pydantic import BaseModel
from typing import Any, Dict, List, Optional


class HealthResponse(BaseModel):
    status: str
    db: str
    agents_reachable: bool
    version: str = "0.1.0"
    mode: ModeConfig


class PaginatedRuns(BaseModel):
    runs: List[RunStatus]
    total: int
    page: int
    per_page: int


class StripeWebhookResponse(BaseModel):
    received: bool
    event_type: Optional[str] = None
