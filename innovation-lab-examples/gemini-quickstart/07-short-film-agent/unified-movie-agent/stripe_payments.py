"""
Stripe embedded Checkout helpers for the Unified Movie Agent.

Reads Stripe keys from environment:
  STRIPE_SECRET_KEY       — sk_test_... or sk_live_...
  STRIPE_PUBLISHABLE_KEY  — pk_test_... or pk_live_...

Optional overrides:
  STRIPE_AMOUNT_CENTS     — default 500 ($5.00)
  STRIPE_CURRENCY         — default "usd"
  STRIPE_PRODUCT_NAME     — default "AI Film Generation"
  STRIPE_SUCCESS_URL      — default Agentverse payment-success page
"""

import os
import time


# ── Config (from env) ──────────────────────────────────────────

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY")
if not (STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY):
    raise RuntimeError(
        "Missing STRIPE_SECRET_KEY and/or STRIPE_PUBLISHABLE_KEY. "
        "Set them in your .env file (use Stripe test keys: sk_test_... / pk_test_...)."
    )

STRIPE_AMOUNT_CENTS = int(os.getenv("STRIPE_AMOUNT_CENTS", "500"))  # $5.00
STRIPE_CURRENCY = (os.getenv("STRIPE_CURRENCY", "usd") or "usd").strip().lower()
STRIPE_PRODUCT_NAME = (
    os.getenv("STRIPE_PRODUCT_NAME", "AI Film Generation") or "AI Film Generation"
).strip()
STRIPE_SUCCESS_URL = (
    os.getenv("STRIPE_SUCCESS_URL", "https://agentverse.ai/payment-success") or ""
).strip()


def _get_stripe_sdk():
    import stripe  # type: ignore

    stripe.api_key = STRIPE_SECRET_KEY
    return stripe


def _stripe_expires_at() -> int:
    """Stripe requires expires_at ~30 mins in future; clamp to [30m, 24h]."""
    expires_in_s = int(os.getenv("STRIPE_CHECKOUT_EXPIRES_SECONDS", "1800"))
    expires_in_s = max(1800, min(24 * 60 * 60, expires_in_s))
    return int(time.time()) + expires_in_s


def create_embedded_checkout_session(
    *, user_address: str, chat_session_id: str, description: str
) -> dict:
    """Create an embedded Stripe Checkout session. Returns metadata dict for RequestPayment."""
    stripe = _get_stripe_sdk()

    return_url = (
        f"{STRIPE_SUCCESS_URL}"
        f"?session_id={{CHECKOUT_SESSION_ID}}"
        f"&chat_session_id={chat_session_id}"
        f"&user={user_address}"
    )

    session = stripe.checkout.Session.create(
        ui_mode="embedded",
        redirect_on_completion="if_required",
        payment_method_types=["card"],
        mode="payment",
        return_url=return_url,
        expires_at=_stripe_expires_at(),
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
            "service": "ai_film_generation",
        },
    )

    return {
        "client_secret": session.client_secret,
        "id": session.id,
        "checkout_session_id": session.id,
        "publishable_key": STRIPE_PUBLISHABLE_KEY,
        "currency": STRIPE_CURRENCY,
        "amount_cents": STRIPE_AMOUNT_CENTS,
        "ui_mode": "embedded",
    }


def verify_checkout_session_paid(checkout_session_id: str) -> bool:
    """Check if a Stripe Checkout session has been paid."""
    stripe = _get_stripe_sdk()
    session = stripe.checkout.Session.retrieve(checkout_session_id)
    return getattr(session, "payment_status", None) == "paid"
