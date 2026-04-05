"""
Treasury Agent — internal budget approval for shopping runs.

Responsibilities:
- Receives BudgetRequest from orchestrator
- Approves or denies each line item against remaining budget
- Uses mock mode (default) or Stripe test-mode (optional)
- Returns BudgetResponse with per-item approvals
- Posts status events to FastAPI
"""
import asyncio
import logging
import sys
from datetime import datetime
from pathlib import Path

# Make repo root importable
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import httpx
from uagents import Agent, Context, Protocol

from agents.shared.config import (
    FASTAPI_CALLBACK_URL,
    TOTAL_BUDGET,
    TREASURY_PORT,
    TREASURY_SEED,
)
from agents.shared.messages import BudgetRequest, BudgetResponse
from agents.treasury.stripe_module import TreasuryState, authorize_item

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("treasury_agent")

# ---------------------------------------------------------------------------
# Agent setup
# ---------------------------------------------------------------------------

treasury_agent = Agent(
    name="treasury-agent",
    seed=TREASURY_SEED,
    port=TREASURY_PORT,
    mailbox=True,
)

treasury_proto = Protocol(name="treasury-protocol")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def post_event(run_id: str, event_type: str, payload: dict):
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(FASTAPI_CALLBACK_URL, json={
                "run_id": run_id,
                "agent_name": "treasury",
                "event_type": event_type,
                "timestamp": datetime.utcnow().isoformat(),
                "payload": payload,
            })
    except Exception as e:
        logger.warning(f"Failed to post event {event_type}: {e}")


# ---------------------------------------------------------------------------
# Message handler
# ---------------------------------------------------------------------------

@treasury_proto.on_message(BudgetRequest)
async def handle_budget_request(ctx: Context, sender: str, msg: BudgetRequest):
    logger.info(f"[treasury] Budget request for run {msg.run_id[:8]}: {len(msg.line_items)} items, total=${msg.total_amount:.2f}")

    await post_event(msg.run_id, "budget_request_received", {
        "item_count": len(msg.line_items),
        "total_requested": msg.total_amount,
    })

    state = TreasuryState(total_budget=TOTAL_BUDGET)
    approvals = []
    denied = []

    for line_item in msg.line_items:
        item_name = line_item.get("item_name", "unknown")
        amount = float(line_item.get("amount", 0.0))
        approval = await authorize_item(item_name, amount, state)
        approvals.append(approval.to_dict())

        if approval.approved:
            logger.info(f"[treasury] Approved ${amount:.2f} for '{item_name}' ({approval.mode})")
        else:
            logger.warning(f"[treasury] Denied '{item_name}': {approval.denial_reason}")
            denied.append(item_name)

    await post_event(msg.run_id, "budget_approved", {
        "approvals": approvals,
        "approved_count": len(approvals) - len(denied),
        "denied_count": len(denied),
        "denied_items": denied,
        "approved_total": state.committed,
        "remaining_budget": state.remaining,
    })

    response = BudgetResponse(
        run_id=msg.run_id,
        approvals=approvals,
        approved_total=state.committed,
        denied_items=denied,
    )
    await ctx.send(sender, response)
    logger.info(f"[treasury] Sent BudgetResponse to orchestrator for run {msg.run_id[:8]}")


treasury_agent.include(treasury_proto)

if __name__ == "__main__":
    treasury_agent.run()
