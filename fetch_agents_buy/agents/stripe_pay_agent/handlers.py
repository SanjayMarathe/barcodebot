import asyncio
from datetime import datetime

import httpx
from uagents import Context, Model
from uagents_core.contrib.protocols.chat import ChatMessage
from uagents_core.contrib.protocols.payment import (
    CommitPayment,
    CompletePayment,
    Funds,
    RejectPayment,
    RequestPayment,
)


class LogPurchase(Model):
    items: str
    total_cents: int
    transaction_id: str
    user_address: str

from config import STRIPE_AMOUNT_CENTS
from state import clear_state, extract_text, make_chat
from stripe_payments import create_embedded_checkout_session, verify_checkout_session_paid

BACKEND_URL = "http://localhost:8099"
CALLBACK_URL = f"{BACKEND_URL}/internal/agent-event"
SHEETS_AGENT_ADDRESS = "agent1qdk60qep56tzkdk8jf6sue5rkwwffx3946ld9w25eqwyufrnnmss63c0xsr"


async def post_event(run_id: str, event_type: str, payload: dict):
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(CALLBACK_URL, json={
                "run_id": run_id,
                "agent_name": "stripe-pay-agent",
                "event_type": event_type,
                "timestamp": datetime.utcnow().isoformat(),
                "payload": payload,
            })
    except Exception:
        pass


async def _get_cart_total() -> tuple[int, str, str]:
    """Returns (total_cents, items_summary, run_id). Falls back to STRIPE_AMOUNT_CENTS if no items found."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{BACKEND_URL}/active-run-id")
            run_id = r.json().get("run_id", "")
            if not run_id:
                return STRIPE_AMOUNT_CENTS, "Kaimon cart purchase", ""
            r2 = await client.get(f"{BACKEND_URL}/run-sessions?run_id={run_id}")
            sessions = r2.json().get("sessions", [])
    except Exception:
        return STRIPE_AMOUNT_CENTS, "Kaimon cart purchase", ""

    items = [s for s in sessions if s.get("item_name")]
    if not items:
        return STRIPE_AMOUNT_CENTS, "Kaimon cart purchase", run_id

    total_cents = 0
    parts = []
    for s in items:
        price = float(s.get("final_price") or 0.0)
        if price <= 0:
            price = 1.00
        total_cents += int(price * 100)
        parts.append(f"{s['item_name']} (${price:.2f})")

    return total_cents, ", ".join(parts), run_id


async def on_chat(ctx: Context, sender: str, msg: ChatMessage):
    text = extract_text(msg)
    ctx.logger.info(f"[pay-agent] chat from {sender[:20]} text={text!r}")

    # Always clear old state and create a fresh checkout with current prices
    clear_state(ctx, sender)

    # Fetch cart total from backend
    total_cents, items_summary, run_id = await _get_cart_total()
    ctx.logger.info(f"[pay-agent] cart total={total_cents} items={items_summary}")

    await post_event(run_id, "payment_started", {
        "total_cents": total_cents,
        "items": items_summary,
        "status": f"Requesting payment of ${total_cents / 100:.2f}",
    })

    # Create Stripe checkout
    checkout = await asyncio.to_thread(
        create_embedded_checkout_session,
        user_address=sender,
        chat_session_id=str(ctx.session),
        description=items_summary,
        amount_cents=total_cents,
    )

    req = RequestPayment(
        accepted_funds=[Funds(currency="USD", amount=f"{total_cents / 100:.2f}", payment_method="stripe")],
        recipient=str(ctx.agent.address),
        deadline_seconds=300,
        reference=str(ctx.session),
        description=f"Pay ${total_cents / 100:.2f} to complete your cart purchase.",
        metadata={"stripe": checkout, "service": "cart_purchase"},
    )
    await ctx.send(sender, req)
    await ctx.send(sender, make_chat(f"Your cart: {items_summary}\n\nTotal: ${total_cents / 100:.2f} — complete the payment below."))


async def on_commit(ctx: Context, sender: str, msg: CommitPayment):
    if msg.funds.payment_method != "stripe" or not msg.transaction_id:
        await ctx.send(sender, RejectPayment(reason="Unsupported payment method (expected stripe)."))
        return

    paid = await asyncio.to_thread(verify_checkout_session_paid, msg.transaction_id)
    if not paid:
        await ctx.send(sender, RejectPayment(reason="Stripe payment not completed yet."))
        return

    total_cents, items_summary, run_id = await _get_cart_total()
    await post_event(run_id, "payment_complete", {
        "transaction_id": msg.transaction_id,
        "status": "Payment confirmed",
    })

    await ctx.send(sender, CompletePayment(transaction_id=msg.transaction_id))
    await ctx.send(sender, make_chat("Payment confirmed! ✓ Logging your purchase to Google Sheets…"))
    clear_state(ctx, sender)

    await ctx.send(SHEETS_AGENT_ADDRESS, LogPurchase(
        items=items_summary,
        total_cents=total_cents,
        transaction_id=msg.transaction_id,
        user_address=sender,
    ))


async def on_reject(ctx: Context, sender: str, msg: RejectPayment):
    _, _, run_id = await _get_cart_total()
    await post_event(run_id, "payment_rejected", {"reason": msg.reason or "cancelled"})
    clear_state(ctx, sender)
    await ctx.send(sender, make_chat(f"Payment cancelled. {msg.reason or ''}".strip()))
