"""
Cart Agent — charges the user via ASI:One native Stripe payment button.

Follows the stripe-horoscope-agent pattern exactly:
  1. User tags @cart-agent
  2. Agent fetches items from active run
  3. Creates Stripe embedded checkout
  4. Sends RequestPayment (native ASI:One payment button appears)
  5. CommitPayment → verify → CompletePayment + confirmation
  6. RejectPayment → cancel message
"""
import asyncio
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import httpx
import stripe as stripe_lib
from uagents import Agent, Context, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    EndSessionContent,
    TextContent,
    chat_protocol_spec,
)
from uagents_core.contrib.protocols.payment import (
    CommitPayment,
    CompletePayment,
    Funds,
    RejectPayment,
    RequestPayment,
    payment_protocol_spec,
)

from agents.shared.config import (
    CART_AGENT_PORT,
    CART_AGENT_SEED,
    FASTAPI_BASE_URL,
    STRIPE_SECRET_KEY,
    STRIPE_PUBLISHABLE_KEY,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("cart_agent")

# sender → pending payment state
_pending: dict = {}

cart_agent = Agent(
    name="cart-agent",
    seed=CART_AGENT_SEED,
    port=CART_AGENT_PORT,
    mailbox=True,
    publish_agent_details=True,
)

chat_proto    = Protocol(spec=chat_protocol_spec)
payment_proto = Protocol(spec=payment_protocol_spec, role="seller")


# ── helpers ───────────────────────────────────────────────────────────────────

def _make_chat(text: str, end: bool = False) -> ChatMessage:
    content = [TextContent(type="text", text=text)]
    if end:
        content.append(EndSessionContent(type="end-session"))
    return ChatMessage(timestamp=datetime.now(timezone.utc), msg_id=uuid4(), content=content)


async def _chat(ctx: Context, sender: str, text: str, end: bool = False):
    await ctx.send(sender, _make_chat(text, end))


async def _get_items() -> list[dict]:
    """Fetch item list from the most recent active run."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        r = await client.get(f"{FASTAPI_BASE_URL}/active-run-id")
        run_id = r.json().get("run_id", "")
        if not run_id:
            return []
        r2 = await client.get(f"{FASTAPI_BASE_URL}/run-sessions?run_id={run_id}")
        return r2.json().get("sessions", [])


def _create_checkout(amount_cents: int, description: str, user_address: str, chat_session_id: str) -> dict:
    """Create Stripe embedded checkout — exact same format as stripe-horoscope-agent."""
    stripe_lib.api_key = STRIPE_SECRET_KEY

    expires_at = int(time.time()) + 1800  # 30 min

    session = stripe_lib.checkout.Session.create(
        ui_mode="embedded",
        redirect_on_completion="if_required",
        payment_method_types=["card"],
        mode="payment",
        return_url=f"https://agentverse.ai/payment-success?session_id={{CHECKOUT_SESSION_ID}}&user={user_address}",
        expires_at=expires_at,
        line_items=[{
            "price_data": {
                "currency": "usd",
                "product_data": {
                    "name": "Kaimon Cart Purchase",
                    "description": description,
                },
                "unit_amount": amount_cents,
            },
            "quantity": 1,
        }],
        metadata={
            "user_address": user_address,
            "session_id": chat_session_id,
            "service": "cart_purchase",
        },
    )

    # Return the exact same keys as stripe-horoscope-agent
    return {
        "client_secret": session.client_secret,
        "id": session.id,
        "checkout_session_id": session.id,
        "publishable_key": STRIPE_PUBLISHABLE_KEY,
        "currency": "usd",
        "amount_cents": amount_cents,
        "ui_mode": "embedded",
    }


def _verify_paid(checkout_session_id: str) -> bool:
    stripe_lib.api_key = STRIPE_SECRET_KEY
    s = stripe_lib.checkout.Session.retrieve(checkout_session_id)
    paid = getattr(s, "payment_status", None) == "paid"
    logger.info(f"[cart_agent] {checkout_session_id[:20]}… payment_status={s.payment_status}")
    return paid


# ── chat handler ──────────────────────────────────────────────────────────────

@chat_proto.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    pass


@chat_proto.on_message(ChatMessage)
async def handle_chat(ctx: Context, sender: str, msg: ChatMessage):
    await ctx.send(sender, ChatAcknowledgement(
        timestamp=datetime.now(timezone.utc), acknowledged_msg_id=msg.msg_id,
    ))

    if sender in _pending:
        await _chat(ctx, sender, "Payment already pending — complete or cancel it first.", end=True)
        return

    # Fetch items from active run
    try:
        items = await _get_items()
    except Exception as e:
        await _chat(ctx, sender, f"Could not reach backend: {e}", end=True)
        return

    valid = [s for s in items if s.get("item_name")]

    if not valid:
        await _chat(ctx, sender,
            "No items found. Run the orchestrator first to find products.", end=True)
        return

    # Build item list with prices (fallback to $1.00 per item if no price)
    cart_items = []
    for s in valid:
        price = float(s.get("final_price") or 0.0)
        if price <= 0:
            price = 1.00  # fallback for demo
        cart_items.append({"name": s["item_name"], "price": price})

    total_cents = sum(int(i["price"] * 100) for i in cart_items)
    items_summary = ", ".join(f"{i['name']} (${i['price']:.2f})" for i in cart_items)

    await _chat(ctx, sender,
        f"Ready to checkout!\n\n{items_summary}\n\nTotal: ${total_cents / 100:.2f}\n\nCreating payment…")

    # Create Stripe checkout
    checkout = _create_checkout(
        amount_cents=total_cents,
        description=items_summary,
        user_address=sender,
        chat_session_id=str(msg.msg_id),
    )

    _pending[sender] = {
        "checkout": checkout,
        "total_cents": total_cents,
        "items": cart_items,
    }

    # Send native ASI:One payment button — exact same format as stripe-horoscope-agent
    req = RequestPayment(
        accepted_funds=[Funds(
            currency="USD",
            amount=f"{total_cents / 100:.2f}",
            payment_method="stripe",
        )],
        recipient=str(ctx.agent.address),
        deadline_seconds=600,
        reference=str(msg.msg_id),
        description=f"Cart purchase — {len(cart_items)} item(s): ${total_cents / 100:.2f}",
        metadata={
            "stripe": checkout,
            "service": "cart_purchase",
        },
    )
    await ctx.send(sender, req)
    logger.info(f"[cart_agent] RequestPayment sent → ${total_cents / 100:.2f}")


# ── payment handlers ──────────────────────────────────────────────────────────

@payment_proto.on_message(CommitPayment)
async def on_commit(ctx: Context, sender: str, msg: CommitPayment):
    pending = _pending.pop(sender, None)
    if not pending:
        logger.warning(f"[cart_agent] CommitPayment from unknown sender {sender[:20]}")
        return

    checkout_session_id = msg.transaction_id or pending["checkout"].get("checkout_session_id", "")

    loop = asyncio.get_event_loop()
    paid = await loop.run_in_executor(None, _verify_paid, checkout_session_id)

    if not paid:
        await _chat(ctx, sender, "Payment could not be verified. Please try again.", end=True)
        return

    await ctx.send(sender, CompletePayment(transaction_id=checkout_session_id))

    total = pending["total_cents"] / 100
    n = len(pending["items"])
    await _chat(ctx, sender,
        f"Payment confirmed! ✓ ${total:.2f} received.\n\n"
        f"Your {n} item(s) are reserved. Thank you!", end=True)
    logger.info(f"[cart_agent] Payment confirmed ${total:.2f} for {sender[:20]}…")


@payment_proto.on_message(RejectPayment)
async def on_reject(ctx: Context, sender: str, msg: RejectPayment):
    _pending.pop(sender, None)
    await _chat(ctx, sender, "Payment cancelled.", end=True)
    logger.info(f"[cart_agent] Payment rejected by {sender[:20]}…")


cart_agent.include(chat_proto, publish_manifest=True)
cart_agent.include(payment_proto, publish_manifest=True)

if __name__ == "__main__":
    cart_agent.run()
