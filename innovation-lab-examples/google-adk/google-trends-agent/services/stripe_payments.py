"""
Stripe payment helpers.

Creates an embedded Stripe Checkout session and verifies payment status.
The embedded checkout flow means no server-side redirect is needed — the
client (Agentverse UI) renders the checkout widget inline.
"""

import time
import asyncio
from core.config import (
    STRIPE_AMOUNT_CENTS,
    STRIPE_CURRENCY,
    STRIPE_PRODUCT_NAME,
    STRIPE_PUBLISHABLE_KEY,
    STRIPE_SECRET_KEY,
    STRIPE_SUCCESS_URL,
    STRIPE_CHECKOUT_EXPIRES_SECONDS,
)


def _stripe():
    import stripe

    stripe.api_key = STRIPE_SECRET_KEY
    return stripe


def _expires_at() -> int:
    seconds = max(1800, min(86400, STRIPE_CHECKOUT_EXPIRES_SECONDS))
    return int(time.time()) + seconds


def _create_session(*, user_address: str, chat_session_id: str, query: str) -> dict:
    stripe = _stripe()
    description = f"Google Trends query: {query[:80]}"
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        mode="payment",
        ui_mode="embedded",
        redirect_on_completion="if_required",
        return_url=f"{STRIPE_SUCCESS_URL}?session_id={{CHECKOUT_SESSION_ID}}",
        expires_at=_expires_at(),
        line_items=[
            {
                "price_data": {
                    "currency": STRIPE_CURRENCY,
                    "product_data": {
                        "name": STRIPE_PRODUCT_NAME,
                        "description": description,
                    },
                    "unit_amount": STRIPE_AMOUNT_CENTS,
                },
                "quantity": 1,
            }
        ],
        metadata={
            "user_address": user_address,
            "session_id": chat_session_id,
            "service": "google_trends",
        },
    )
    return {
        "client_secret": session.client_secret,
        "checkout_session_id": session.id,
        "publishable_key": STRIPE_PUBLISHABLE_KEY,
        "currency": STRIPE_CURRENCY,
        "amount_cents": str(STRIPE_AMOUNT_CENTS),
        "ui_mode": "embedded",
    }


async def create_checkout_session(
    *, user_address: str, chat_session_id: str, query: str
) -> dict:
    """Async wrapper around Stripe session creation (runs in thread pool)."""
    return await asyncio.to_thread(
        _create_session,
        user_address=user_address,
        chat_session_id=chat_session_id,
        query=query,
    )


def _verify_paid(transaction_id: str) -> bool:
    stripe = _stripe()
    if transaction_id.startswith("pi_"):
        intent = stripe.PaymentIntent.retrieve(transaction_id)
        return getattr(intent, "status", None) == "succeeded"
    # Default: checkout session
    session = stripe.checkout.Session.retrieve(transaction_id)
    return getattr(session, "payment_status", None) == "paid"


async def verify_paid(transaction_id: str) -> bool:
    """Async wrapper with retry logic to handle Stripe processing delays."""
    for delay in (0, 2, 4, 6):
        if delay:
            await asyncio.sleep(delay)
        try:
            paid = await asyncio.to_thread(_verify_paid, transaction_id)
            if paid:
                return True
        except Exception:
            if delay == 6:
                raise
    return False
