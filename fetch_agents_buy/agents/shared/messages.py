"""
Inter-agent Pydantic message types for uAgents protocol communication.
All messages extend uagents.Model so they can be sent via ctx.send().
"""
from typing import Any, Dict, List, Optional
from uagents import Model


# ---------------------------------------------------------------------------
# Search agent messages
# ---------------------------------------------------------------------------

class SearchRequest(Model):
    """Orchestrator → Search: search Amazon for these items."""
    run_id: str
    items: List[Dict[str, Any]]  # List of ShoppingItem dicts


class SearchResults(Model):
    """Search → Orchestrator: candidates per item."""
    run_id: str
    # Map of item_name -> list of candidate dicts
    results: Dict[str, List[Dict[str, Any]]]


# ---------------------------------------------------------------------------
# Ranker agent messages
# ---------------------------------------------------------------------------

class RankRequest(Model):
    """Orchestrator → Ranker: pick best from candidates for one item."""
    run_id: str
    item: Dict[str, Any]            # ShoppingItem dict
    candidates: List[Dict[str, Any]]  # List of SearchCandidate dicts


class RankResult(Model):
    """Ranker → Orchestrator: the chosen product."""
    run_id: str
    item_name: str
    chosen: Dict[str, Any]   # SearchCandidate dict
    reason: str
    rank_score: float = 0.0


# ---------------------------------------------------------------------------
# Treasury agent messages
# ---------------------------------------------------------------------------

class BudgetRequest(Model):
    """Orchestrator → Treasury: request budget approval for all items."""
    run_id: str
    # List of {item_name, amount, quantity} dicts
    line_items: List[Dict[str, Any]]
    total_amount: float


class BudgetResponse(Model):
    """Treasury → Orchestrator: approvals for each line item."""
    run_id: str
    # List of BudgetApproval dicts
    approvals: List[Dict[str, Any]]
    approved_total: float
    denied_items: List[str]


# ---------------------------------------------------------------------------
# Buyer agent messages
# ---------------------------------------------------------------------------

class BuyRequest(Model):
    """Orchestrator → Buyer[N]: go add this to cart."""
    run_id: str
    item: Dict[str, Any]           # ShoppingItem dict
    chosen_product: Dict[str, Any]  # SearchCandidate dict (the ranked winner)
    approval_ref: str
    quantity: int
    stripe_session_id: str = ""    # Present when user has paid; triggers payment handshake


class BuyResultMsg(Model):
    """Buyer[N] → Orchestrator: result of the add-to-cart attempt."""
    run_id: str
    item_name: str
    status: str               # success | failed | skipped
    final_price: float = 0.0
    quantity: int = 1
    screenshot_url: str = ""
    screenshot_path: str = ""
    live_view_url: str = ""
    session_id: str = ""
    agent_name: str = ""
    error: str = ""


# ---------------------------------------------------------------------------
# Payment handshake messages — Stripe horoscope pattern
#
# Flow (mirrors Fetch.ai Stripe horoscope agent example):
#   1. Buyer[N] → Orchestrator : PaymentRequest  ("I need payment proof before I work")
#   2. Orchestrator → Buyer[N] : PaymentCommit   ("here is the Stripe session ID")
#   3. Buyer[N] verifies stripe.checkout.Session.retrieve(transaction_id).payment_status == "paid"
#   4a. Verified  → Buyer[N] executes BrowserUse; Buyer[N] → Orchestrator : PaymentComplete
#   4b. Not paid  → Buyer[N] → Orchestrator : PaymentCancel (item skipped)
# ---------------------------------------------------------------------------

class PaymentRequest(Model):
    """Buyer[N] → Orchestrator: request Stripe payment proof before executing buy."""
    run_id: str
    item_name: str
    amount: float
    stripe_session_id: str   # echoed back so orchestrator can look up the run
    reference: str           # "{run_id}:{item_name}"
    deadline_seconds: int = 120


class PaymentCommit(Model):
    """Orchestrator → Buyer[N]: here is the Stripe session ID as payment proof."""
    run_id: str
    item_name: str
    transaction_id: str   # stripe_session_id — buyer calls Session.retrieve() to verify
    reference: str


class PaymentComplete(Model):
    """Buyer[N] → Orchestrator: Stripe verified, buy executed successfully."""
    run_id: str
    item_name: str
    reference: str


class PaymentCancel(Model):
    """Buyer[N] → Orchestrator: Stripe not paid — item skipped."""
    run_id: str
    item_name: str
    reason: str
