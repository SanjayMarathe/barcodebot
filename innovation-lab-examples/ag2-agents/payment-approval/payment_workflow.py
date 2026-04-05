"""Async payment assessment workflow using AG2 two-agent chat."""

from autogen import LLMConfig

from payment_agents import build_agents


async def run_payment_assessment(
    recipient: str,
    amount: float,
    reason: str,
    llm_config: LLMConfig,
    currency: str = "USDC",
) -> str:
    """Run researcher → executor assessment and return the final verdict.

    Returns the executor's last message containing the risk assessment
    summary and APPROVED/REJECTED verdict.
    """
    researcher, executor = build_agents(llm_config)

    await researcher.a_initiate_chat(
        executor,
        message=(
            f"Payment request: {amount} {currency} to {recipient} — reason: '{reason}'. "
            f"Investigate the recipient and produce a risk assessment."
        ),
        max_turns=6,
    )

    # Return the executor's final verdict (filter by name to avoid
    # returning a researcher message if max_turns is reached mid-turn)
    for msg in reversed(executor.chat_messages.get(researcher, [])):
        if msg.get("name") == "payment_executor" and msg.get("content"):
            return msg["content"]

    return "Payment assessment did not complete."
