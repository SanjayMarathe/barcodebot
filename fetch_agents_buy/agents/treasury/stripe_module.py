"""
Optional Stripe test-mode treasury module.

This module provides INTERNAL budget authorization only.
Stripe is NOT used to pay Amazon — it creates a manual-capture PaymentIntent
as an authorization proof record. The PI is never captured.

Two modes:
  - TREASURY_MODE=mock (default): returns instant approvals without Stripe
  - TREASURY_MODE=stripe: creates real Stripe test-mode PaymentIntents

Future work: Replace with Fetch Agent Payment Protocol when available.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from typing import List

from agents.shared.config import STRIPE_SECRET_KEY, TREASURY_MODE

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------

class ApprovalRecord:
    def __init__(self, item_name: str, approved: bool, amount: float, reference_id: str, mode: str, denial_reason: str = ""):
        self.item_name = item_name
        self.approved = approved
        self.amount = amount
        self.reference_id = reference_id
        self.mode = mode
        self.denial_reason = denial_reason

    def to_dict(self) -> dict:
        return {
            "item_name": self.item_name,
            "approved": self.approved,
            "amount": self.amount,
            "reference_id": self.reference_id,
            "mode": self.mode,
            "denial_reason": self.denial_reason,
        }


# ---------------------------------------------------------------------------
# Treasury state
# ---------------------------------------------------------------------------

class TreasuryState:
    """Tracks remaining budget across all approvals in a run."""

    def __init__(self, total_budget: float):
        self.total_budget = total_budget
        self.committed = 0.0
        self.approvals: List[ApprovalRecord] = []

    def can_approve(self, amount: float) -> bool:
        return (self.committed + amount) <= self.total_budget

    def commit(self, amount: float):
        self.committed += amount

    @property
    def remaining(self) -> float:
        return self.total_budget - self.committed


# ---------------------------------------------------------------------------
# Mock authorization (default)
# ---------------------------------------------------------------------------

def mock_authorize(item_name: str, amount: float, state: TreasuryState) -> ApprovalRecord:
    """Instant mock approval. No external calls."""
    if not state.can_approve(amount):
        return ApprovalRecord(
            item_name=item_name,
            approved=False,
            amount=amount,
            reference_id=f"mock-denied-{uuid.uuid4().hex[:8]}",
            mode="mock",
            denial_reason=f"Budget exceeded: remaining ${state.remaining:.2f}, requested ${amount:.2f}",
        )

    state.commit(amount)
    ref_id = f"mock-approved-{uuid.uuid4().hex[:8]}"
    logger.info(f"[Mock Treasury] Approved ${amount:.2f} for '{item_name}' → {ref_id}")
    return ApprovalRecord(
        item_name=item_name,
        approved=True,
        amount=amount,
        reference_id=ref_id,
        mode="mock",
    )


# ---------------------------------------------------------------------------
# Stripe authorization (optional)
# ---------------------------------------------------------------------------

async def stripe_authorize(item_name: str, amount: float, state: TreasuryState) -> ApprovalRecord:
    """
    Create a Stripe test-mode PaymentIntent with capture_method=manual.
    This represents an internal budget authorization — it is NEVER captured.
    """
    if not STRIPE_SECRET_KEY:
        logger.error("STRIPE_SECRET_KEY not set, falling back to mock")
        return mock_authorize(item_name, amount, state)

    if not state.can_approve(amount):
        return ApprovalRecord(
            item_name=item_name,
            approved=False,
            amount=amount,
            reference_id=f"stripe-denied-{uuid.uuid4().hex[:8]}",
            mode="stripe",
            denial_reason=f"Budget exceeded: remaining ${state.remaining:.2f}",
        )

    try:
        import stripe  # type: ignore
        stripe.api_key = STRIPE_SECRET_KEY

        # Run in executor to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        intent = await loop.run_in_executor(
            None,
            lambda: stripe.PaymentIntent.create(
                amount=int(amount * 100),  # Stripe uses cents
                currency="usd",
                capture_method="manual",   # authorize only, never capture
                payment_method_types=["card"],
                metadata={
                    "item": item_name,
                    "mode": "treasury-proof-only",
                    "note": "Internal authorization record. Stripe is NOT paying Amazon.",
                },
            )
        )

        state.commit(amount)
        logger.info(f"[Stripe Treasury] Authorized ${amount:.2f} for '{item_name}' → {intent.id}")
        return ApprovalRecord(
            item_name=item_name,
            approved=True,
            amount=amount,
            reference_id=intent.id,
            mode="stripe",
        )

    except Exception as e:
        logger.error(f"Stripe authorization failed for '{item_name}': {e}")
        # Fallback to mock on Stripe error
        return mock_authorize(item_name, amount, state)


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

async def authorize_item(item_name: str, amount: float, state: TreasuryState) -> ApprovalRecord:
    """Authorize a single item. Routes to mock or Stripe based on TREASURY_MODE."""
    mode = TREASURY_MODE
    if mode == "stripe":
        return await stripe_authorize(item_name, amount, state)
    else:
        return mock_authorize(item_name, amount, state)


def verify_funded_session(session_id: str) -> bool:
    """
    Verify that a Stripe Checkout session has been paid.
    Returns True if payment_status == 'paid'.
    Falls back to True if no STRIPE_SECRET_KEY (mock mode).
    """
    if not session_id:
        return False
    if not STRIPE_SECRET_KEY:
        logger.warning("[Treasury] STRIPE_SECRET_KEY not set — treating session as verified (mock)")
        return True
    try:
        import stripe  # type: ignore
        stripe.api_key = STRIPE_SECRET_KEY
        session = stripe.checkout.Session.retrieve(session_id)
        paid = session.payment_status == "paid"
        logger.info(f"[Treasury] Session {session_id[:16]}… payment_status={session.payment_status} → {'verified' if paid else 'NOT paid'}")
        return paid
    except Exception as e:
        logger.error(f"[Treasury] Failed to verify session {session_id}: {e}")
        return False


# ---------------------------------------------------------------------------
# Future work placeholder
# ---------------------------------------------------------------------------
# TODO: Integrate with Fetch Agent Payment Protocol
# When the Fetch.ai payment protocol is available, replace stripe_authorize
# with a uAgents-native payment flow that uses FET tokens or approved
# micropayment channels between agents.
