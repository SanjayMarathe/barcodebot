"""
Canonical Pydantic data models shared between the FastAPI backend and Python agents.
Import these from both apps/api and agents/ to ensure type consistency.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field
import uuid


# ---------------------------------------------------------------------------
# Shopping domain models
# ---------------------------------------------------------------------------

class ShoppingItem(BaseModel):
    """A single parsed item from a shopping instruction."""
    name: str
    max_price: float
    quantity: int
    search_query: str  # refined query to search Amazon


class SearchCandidate(BaseModel):
    """A candidate product returned by the search agent."""
    title: str
    price: float
    rating: Optional[float] = None
    review_count: Optional[int] = None
    url: str
    asin: Optional[str] = None
    thumbnail: Optional[str] = None


class RankingDecision(BaseModel):
    """Ranker agent output: selected product for one shopping item."""
    item_name: str
    chosen: SearchCandidate
    reason: str
    rank_score: float = 0.0


class BudgetApproval(BaseModel):
    """Treasury agent approval record for a single line item."""
    item_name: str
    approved: bool
    amount: float
    reference_id: str
    mode: Literal["mock", "stripe"] = "mock"
    denial_reason: Optional[str] = None


class BuyResult(BaseModel):
    """Result from a buyer agent after attempting add-to-cart."""
    item_name: str
    status: Literal["success", "failed", "skipped"] = "failed"
    final_price: Optional[float] = None
    quantity: int = 1
    screenshot_url: Optional[str] = None   # relative URL served by FastAPI
    screenshot_path: Optional[str] = None  # absolute local path
    live_view_url: Optional[str] = None    # Browser Use live URL
    session_id: Optional[str] = None       # Browser Use session ID
    agent_name: Optional[str] = None
    error: Optional[str] = None
    completed_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Run / event models
# ---------------------------------------------------------------------------

class AgentEvent(BaseModel):
    """A status event emitted by any agent, stored in DB and streamed via SSE."""
    run_id: str
    agent_name: str
    event_type: str  # e.g. "parsing_done", "search_done", "buy_done", "run_complete"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    payload: Dict[str, Any] = Field(default_factory=dict)


class RunStatus(BaseModel):
    """Full run status object returned by GET /runs/{id}."""
    run_id: str
    instruction: str
    status: Literal["pending", "in_progress", "completed", "failed"] = "pending"
    items: List[ShoppingItem] = Field(default_factory=list)
    events: List[AgentEvent] = Field(default_factory=list)
    results: List[BuyResult] = Field(default_factory=list)
    total_budget: float = 200.0
    total_spent: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class CreateRunRequest(BaseModel):
    """Frontend → FastAPI: submit a new shopping run."""
    instruction: str
    total_budget: float = 200.0
    stripe_session_id: Optional[str] = None


class CreateRunResponse(BaseModel):
    """FastAPI → Frontend: run created, here is your ID."""
    run_id: str
    status: str = "pending"


# ---------------------------------------------------------------------------
# Session / screenshot metadata
# ---------------------------------------------------------------------------

class BrowserSessionMeta(BaseModel):
    """Metadata about a Browser Use session surfaced to the frontend."""
    session_id: str
    run_id: str
    agent_name: str
    live_view_url: Optional[str] = None
    debugger_url: Optional[str] = None
    status: str = "running"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ScreenshotMeta(BaseModel):
    """Screenshot record returned to the frontend."""
    id: int
    run_id: str
    item_name: str
    file_url: str   # served by FastAPI static files
    timestamp: datetime


# ---------------------------------------------------------------------------
# Mode / config
# ---------------------------------------------------------------------------

class ModeConfig(BaseModel):
    """Current runtime mode flags."""
    treasury_mode: Literal["mock", "stripe"] = "mock"
    browser_mode: Literal["browser_use", "local"] = "browser_use"
    checkout_mode: Literal["add_to_cart", "checkout_ready"] = "add_to_cart"


class UpdateModesRequest(BaseModel):
    treasury_mode: Optional[Literal["mock", "stripe"]] = None
    browser_mode: Optional[Literal["browser_use", "local"]] = None
    checkout_mode: Optional[Literal["add_to_cart", "checkout_ready"]] = None


# ---------------------------------------------------------------------------
# Agent registry
# ---------------------------------------------------------------------------

class AgentInfo(BaseModel):
    name: str
    address: str
    port: int
    role: str
    status: str = "unknown"


class AgentRegistry(BaseModel):
    agents: List[AgentInfo]
    fastapi_url: str
    updated_at: datetime = Field(default_factory=datetime.utcnow)
