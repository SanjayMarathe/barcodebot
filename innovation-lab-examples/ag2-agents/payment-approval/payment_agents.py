"""
AG2 payment approval agents.

researcher  — investigates recipient, produces risk assessment
executor    — formats assessment, decides proceed/reject (no human stdin in uAgent mode)
"""

from autogen import ConversableAgent, LLMConfig


def build_agents(llm_config: LLMConfig) -> tuple[ConversableAgent, ConversableAgent]:
    researcher = ConversableAgent(
        name="researcher",
        system_message=(
            "You are a payment risk analyst. Investigate the payment recipient using available "
            "tools: check their Fetch.ai address history, reputation, and any known flags. "
            "Produce a concise risk assessment with a clear recommendation (proceed / do not proceed). "
            "End your assessment with ASSESSMENT COMPLETE."
        ),
        llm_config=llm_config,
    )

    executor = ConversableAgent(
        name="payment_executor",
        system_message=(
            "You handle payment execution. Present the researcher's risk assessment clearly, "
            "state the exact payment details (recipient, amount, reason), then give a final "
            "verdict: APPROVED or REJECTED based on the risk assessment.\n\n"
            "If approved, end with: PAYMENT APPROVED. TERMINATE\n"
            "If rejected, end with: PAYMENT REJECTED. TERMINATE"
        ),
        llm_config=llm_config,
        human_input_mode="NEVER",
        is_termination_msg=lambda m: "TERMINATE" in (m.get("content") or ""),
    )

    return researcher, executor
