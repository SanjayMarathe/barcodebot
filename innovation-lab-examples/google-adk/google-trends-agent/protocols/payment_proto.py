"""
payment_proto.py — re-exports from the official uagents_core payment protocol.

uagents_core 0.4.x ships uagents_core.contrib.protocols.payment which
Agentverse / ASI:One recognise and render as a native payment card.
"""

from uagents_core.contrib.protocols.payment import (  # noqa: F401
    CancelPayment,
    CommitPayment,
    CompletePayment,
    Funds,
    RejectPayment,
    RequestPayment,
    payment_protocol_spec,
)

from typing import Awaitable, Callable
from uagents import Context, Protocol


CommitHandler = Callable[[Context, str, CommitPayment], Awaitable[None]]
RejectHandler = Callable[[Context, str, RejectPayment], Awaitable[None]]


def build_payment_proto(on_commit: CommitHandler, on_reject: RejectHandler) -> Protocol:
    proto = Protocol(spec=payment_protocol_spec, role="seller")

    @proto.on_message(CommitPayment)
    async def _on_commit(ctx: Context, sender: str, msg: CommitPayment):
        await on_commit(ctx, sender, msg)

    @proto.on_message(RejectPayment)
    async def _on_reject(ctx: Context, sender: str, msg: RejectPayment):
        await on_reject(ctx, sender, msg)

    return proto
