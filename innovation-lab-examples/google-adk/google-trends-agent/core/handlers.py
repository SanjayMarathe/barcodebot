"""
handlers.py — business logic for the Google Trends uAgent.

Flow:
  1. User sends a trends question via chat
  2. Agent creates a Stripe Checkout session and sends RequestPayment
  3. Agentverse UI shows the Stripe embedded checkout widget
  4. On successful payment → CommitPayment arrives
  5. Agent verifies payment with Stripe, runs the trends query, replies
  6. On rejected / cancelled payment → clear state and notify user
"""

import time

from uagents import Context
from uagents_core.contrib.protocols.chat import ChatMessage
from protocols.payment_proto import (
    CommitPayment,
    CompletePayment,
    Funds,
    RejectPayment,
    RequestPayment,
)

from core.config import STRIPE_AMOUNT_CENTS
from services.google_trends import run_trends_query
from core.state import (
    clear_state,
    extract_text,
    load_state,
    make_chat,
    make_chat_ongoing,
    save_state,
)
from services.stripe_payments import create_checkout_session, verify_paid

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_GREETING_STARTERS = (
    "hello",
    "hi",
    "hey",
    "what can you do",
    "who are you",
    "how can you help",
    "help",
    "start",
)

_EXAMPLE_QUERIES = (
    "- Top 10 trending terms in the US this week\n"
    "- Rising search trends in India over the last 3 weeks\n"
    "- Most searched topics in Canada in January 2024\n"
    "- Compare trending terms between Germany and France last month"
)


def _is_greeting(text: str) -> bool:
    t = text.lower()
    return any(t.startswith(s) for s in _GREETING_STARTERS)


def _looks_like_trends_query(text: str) -> bool:
    keywords = (
        "trend",
        "search",
        "top",
        "popular",
        "rising",
        "terms",
        "queries",
        "google",
        "rank",
        "week",
        "month",
        "country",
    )
    t = text.lower()
    return any(k in t for k in keywords)


# ---------------------------------------------------------------------------
# Chat handler — called for every incoming ChatMessage
# ---------------------------------------------------------------------------


async def on_chat(ctx: Context, sender: str, msg: ChatMessage):
    text = extract_text(msg)

    state = load_state(ctx, sender)
    awaiting_payment = state.get("awaiting_payment", False)
    saved_query = state.get("query", "")

    # --- Greeting / help — clear any pending payment state so user isn't stuck ---
    if _is_greeting(text) or not text:
        if awaiting_payment:
            clear_state(ctx, sender)
        await ctx.send(
            sender,
            make_chat(
                "Hi! I'm the **Google Trends Agent**.\n\n"
                "Ask me anything about trending searches worldwide.\n\n"
                f"**Example queries:**\n{_EXAMPLE_QUERIES}\n\n"
                f"Each query costs **${STRIPE_AMOUNT_CENTS / 100:.2f}** (paid via Stripe)."
            ),
        )
        return

    # --- User re-sends a message while payment is still pending ---
    if awaiting_payment and saved_query:
        # First: check if the stored session is already paid (Agentverse may not
        # have delivered CommitPayment even though Stripe processed the payment).
        # Only check sessions that are at least 60s old to avoid false positives
        # on freshly-created sessions.
        stored_checkout = state.get("pending_stripe") or {}
        stored_session_id = stored_checkout.get("checkout_session_id")
        session_created_at = state.get("session_created_at", 0)
        session_age = time.time() - session_created_at
        if stored_session_id and session_age > 60:
            try:
                already_paid = await verify_paid(stored_session_id)
            except Exception:
                already_paid = False

            if already_paid:
                ctx.logger.info(
                    f"Fallback: session {stored_session_id} already paid — running query"
                )
                clear_state(ctx, sender)
                await ctx.send(
                    sender,
                    make_chat_ongoing(
                        "Payment confirmed! Running your Google Trends query..."
                    ),
                )
                try:
                    result = await run_trends_query(saved_query)
                except Exception as exc:
                    ctx.logger.error(f"Trends query failed: {exc}")
                    result = "Sorry, an error occurred while querying Google Trends. Please try again."
                await ctx.send(sender, make_chat(result))
                return

        # Session not paid yet — create a fresh checkout session (old one may have expired)
        try:
            fresh_checkout = await create_checkout_session(
                user_address=sender,
                chat_session_id=str(ctx.session),
                query=saved_query,
            )
        except Exception as exc:
            ctx.logger.error(f"Stripe session refresh failed: {exc}")
            await ctx.send(
                sender,
                make_chat("Sorry, payment setup failed. Please try again later."),
            )
            return
        state["pending_stripe"] = fresh_checkout
        state["session_created_at"] = time.time()
        save_state(ctx, sender, state)

        amount_str = f"{STRIPE_AMOUNT_CENTS / 100:.2f}"
        await ctx.send(
            sender,
            RequestPayment(
                accepted_funds=[
                    Funds(
                        currency="USD",
                        amount=amount_str,
                        payment_method="stripe",
                    )
                ],
                recipient=str(ctx.agent.address),
                deadline_seconds=600,
                reference=str(ctx.session),
                description=f"Google Trends query: {saved_query[:80]}",
                metadata={
                    "stripe": fresh_checkout,
                    "service": "google_trends",
                },
            ),
        )
        return

    # --- Treat user message as a trends query ---
    if not _looks_like_trends_query(text):
        await ctx.send(
            sender,
            make_chat(
                "I specialise in Google Trends queries.\n\n"
                f"Try asking something like:\n{_EXAMPLE_QUERIES}"
            ),
        )
        return

    # Create Stripe checkout session
    try:
        checkout = await create_checkout_session(
            user_address=sender,
            chat_session_id=str(ctx.session),
            query=text,
        )
    except Exception as exc:
        ctx.logger.error(f"Stripe session creation failed: {exc}")
        await ctx.send(
            sender, make_chat("Sorry, payment setup failed. Please try again later.")
        )
        return

    # Persist state
    state["awaiting_payment"] = True
    state["pending_stripe"] = checkout
    state["query"] = text
    state["session_created_at"] = time.time()
    save_state(ctx, sender, state)

    amount_str = f"{STRIPE_AMOUNT_CENTS / 100:.2f}"

    # Send the payment request — Agentverse/ASI:One renders this as an embedded payment card
    await ctx.send(
        sender,
        RequestPayment(
            accepted_funds=[
                Funds(
                    currency="USD",
                    amount=amount_str,
                    payment_method="stripe",
                )
            ],
            recipient=str(ctx.agent.address),
            deadline_seconds=600,
            reference=str(ctx.session),
            description=f"Google Trends query: {text[:80]}",
            metadata={
                "stripe": checkout,
                "service": "google_trends",
            },
        ),
    )
    await ctx.send(
        sender,
        make_chat_ongoing(
            f"**Payment required** (${amount_str}) to run this Google Trends query.\n\n"
            "Complete the payment in the card above — your results will appear automatically."
        ),
    )


# ---------------------------------------------------------------------------
# Payment commit handler — payment was approved by the user
# ---------------------------------------------------------------------------


async def on_commit(ctx: Context, sender: str, msg: CommitPayment):
    if not msg.transaction_id:
        await ctx.send(sender, RejectPayment(reason="Missing transaction ID."))
        return

    # Verify with Stripe that the session was actually paid
    ctx.logger.info(f"Verifying payment: {msg.transaction_id}")
    try:
        paid = await verify_paid(msg.transaction_id)
    except Exception as exc:
        ctx.logger.error(f"Stripe verification error: {exc}")
        await ctx.send(sender, RejectPayment(reason="Could not verify Stripe payment."))
        return

    ctx.logger.info(f"verify_paid={paid}")
    if not paid:
        await ctx.send(
            sender,
            RejectPayment(
                reason="Payment not completed. Please finish the Stripe checkout first."
            ),
        )
        return

    # Payment confirmed — complete the payment protocol
    await ctx.send(sender, CompletePayment(transaction_id=msg.transaction_id))

    state = load_state(ctx, sender)
    query = state.get("query", "")
    clear_state(ctx, sender)

    if not query:
        await ctx.send(
            sender,
            make_chat(
                "Payment received! But I lost track of your query. Please ask again."
            ),
        )
        return

    await ctx.send(
        sender,
        make_chat_ongoing("Payment confirmed! Running your Google Trends query..."),
    )
    try:
        result = await run_trends_query(query)
    except Exception as exc:
        ctx.logger.error(f"Trends query failed: {exc}")
        result = (
            "Sorry, an error occurred while querying Google Trends. Please try again."
        )

    await ctx.send(sender, make_chat(result))


# ---------------------------------------------------------------------------
# Payment reject handler — user declined or payment failed
# ---------------------------------------------------------------------------


async def on_reject(ctx: Context, sender: str, msg: RejectPayment):
    clear_state(ctx, sender)
    reason = msg.reason or "Payment was rejected."
    await ctx.send(
        sender,
        make_chat(
            f"Payment not completed: {reason}\n\nSend your query again whenever you're ready."
        ),
    )
