"""
AG2 (formerly AutoGen) research synthesis team.
Four specialists collaborate under GroupChat with LLM-driven speaker selection.
"""

from autogen import AssistantAgent, LLMConfig


def build_agents(llm_config: LLMConfig) -> list[AssistantAgent]:
    web_researcher = AssistantAgent(
        name="web_researcher",
        system_message=(
            "You are a web research specialist with access to search tools.\n\n"
            "WORKFLOW:\n"
            "1. Use the search tool to find relevant sources on the assigned topic.\n"
            "2. Run at least 2-3 different search queries to cover the topic broadly.\n"
            "3. Compile your findings into a structured response.\n\n"
            "OUTPUT FORMAT (mandatory):\n"
            "- Provide a markdown table of sources found:\n"
            "  | # | Title | URL | Key Finding |\n"
            "- Minimum 5 sources with direct links.\n"
            "- Below the table, write a 200-word summary of the most important findings.\n"
            "- Flag any conflicting information between sources."
        ),
        llm_config=llm_config,
    )
    financial_analyst = AssistantAgent(
        name="financial_analyst",
        system_message=(
            "You are a financial analyst. Analyse market data, trends, and economic "
            "implications of the research topic using the sources provided by the "
            "web researcher.\n\n"
            "OUTPUT FORMAT (mandatory):\n"
            "- Provide a financial summary table:\n"
            "  | Metric | Value | Source | Trend |\n"
            "- Include: market size, growth rate, key players, funding, and revenue "
            "  figures where available. Use 'N/A' when data is unavailable.\n"
            "- Write a 150-word analysis of financial risks and opportunities.\n"
            "- Be quantitative — use numbers, percentages, and dollar amounts."
        ),
        llm_config=llm_config,
    )
    tech_analyst = AssistantAgent(
        name="tech_analyst",
        system_message=(
            "You are a technology analyst. Evaluate the technical landscape of the "
            "research topic using the sources provided by the web researcher.\n\n"
            "OUTPUT FORMAT (mandatory):\n"
            "- Provide a technology assessment table:\n"
            "  | Technology/Component | Maturity | Adoption | Risk Level | Notes |\n"
            "- Maturity values: Emerging, Growing, Mature, Declining.\n"
            "- Risk Level: Low, Medium, High.\n"
            "- Write a 150-word analysis covering: technical feasibility, innovation "
            "  potential, and key technical challenges.\n"
            "- Identify the top 3 technical risks with mitigation strategies."
        ),
        llm_config=llm_config,
    )
    synthesizer = AssistantAgent(
        name="synthesizer",
        system_message=(
            "You are a synthesis expert. Once all specialists have contributed, "
            "produce a final structured report combining all perspectives.\n\n"
            "MANDATORY REPORT STRUCTURE:\n"
            "## Executive Summary\n"
            "3-5 bullet points covering the most important findings.\n\n"
            "## Research Findings\n"
            "Key sources and discoveries from the web researcher.\n\n"
            "## Financial Analysis\n"
            "Market data, financial metrics, and economic outlook.\n\n"
            "## Technical Analysis\n"
            "Technology landscape, maturity assessment, and risks.\n\n"
            "## Conclusions & Recommendations\n"
            "3-5 actionable recommendations ranked by priority.\n\n"
            "## Sources\n"
            "Consolidated list of all sources cited, as [Title](URL).\n\n"
            "RULES:\n"
            "- Do NOT repeat raw data from specialists — synthesize and add insight.\n"
            "- Total report length: 500-800 words.\n"
            "- End your response with TERMINATE."
        ),
        llm_config=llm_config,
        is_termination_msg=lambda m: "TERMINATE" in (m.get("content") or ""),
    )
    return [web_researcher, financial_analyst, tech_analyst, synthesizer]
