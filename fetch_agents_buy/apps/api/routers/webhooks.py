"""
POST /webhooks/stripe — Stripe webhook handler (optional, test-mode only).

This endpoint receives Stripe events for internal treasury proof.
Stripe is NOT used to pay Amazon — it's used as an internal authorization
record in the treasury layer only.
"""
import logging

from fastapi import APIRouter, Header, HTTPException, Request

from apps.api.config import STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
from apps.api.schemas import StripeWebhookResponse

logger = logging.getLogger(__name__)
router = APIRouter(tags=["webhooks"])


@router.post("/webhooks/stripe", response_model=StripeWebhookResponse)
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature"),
):
    """
    Handle Stripe webhook events for internal treasury proof.
    Only active when STRIPE_SECRET_KEY is set.
    """
    if not STRIPE_SECRET_KEY:
        logger.warning("Stripe webhook received but STRIPE_SECRET_KEY is not set")
        return StripeWebhookResponse(received=True, event_type=None)

    try:
        import stripe  # type: ignore
        stripe.api_key = STRIPE_SECRET_KEY
    except ImportError:
        raise HTTPException(status_code=501, detail="stripe package not installed")

    payload = await request.body()

    if STRIPE_WEBHOOK_SECRET and stripe_signature:
        try:
            event = stripe.Webhook.construct_event(
                payload, stripe_signature, STRIPE_WEBHOOK_SECRET
            )
        except stripe.error.SignatureVerificationError as e:
            raise HTTPException(status_code=400, detail=f"Webhook signature invalid: {e}")
    else:
        # In dev, accept without signature verification
        import json
        event = json.loads(payload)

    event_type = event.get("type", "unknown")
    logger.info(f"Stripe webhook: {event_type}")

    # Handle relevant event types
    if event_type == "payment_intent.created":
        pi = event["data"]["object"]
        logger.info(f"Treasury PI created: {pi['id']} for ${pi['amount'] / 100:.2f}")
    elif event_type == "payment_intent.authorized":
        pi = event["data"]["object"]
        logger.info(f"Treasury PI authorized: {pi['id']}")

    return StripeWebhookResponse(received=True, event_type=event_type)
