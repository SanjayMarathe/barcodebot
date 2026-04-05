"""
Google Trends query engine.

Architecture mirrors the original Google ADK sample:
  1. SQL Generator  — ASI:One LLM generates a BigQuery SQL query
  2. SQL Executor   — google-cloud-bigquery runs the query and returns results

The ADK SequentialAgent pipeline is replaced by direct async calls so this
module can be embedded inside a uAgent handler without running a second event loop.

BigQuery public dataset used:
  `bigquery-public-data.google_trends.top_terms`
  `bigquery-public-data.google_trends.top_rising_terms`
"""

import asyncio
import json
import re
from core.config import GOOGLE_CLOUD_PROJECT, ASI1_API_KEY
from openai import AsyncOpenAI

_client = AsyncOpenAI(
    base_url="https://api.asi1.ai/v1",
    api_key=ASI1_API_KEY,
)

# ---------------------------------------------------------------------------
# Prompt — instructs ASI1 to generate valid BigQuery SQL for Google Trends
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """You are a BigQuery SQL expert specialising in the Google Trends public dataset.

Available tables (project: bigquery-public-data, dataset: google_trends):
  - top_terms          columns: rank, refresh_date, dma_name, dma_id, term, week, score
  - top_rising_terms   columns: dma_id, term, week, score, rank, percent_gain, refresh_date, dma_name

Column notes:
  - dma_name: US Designated Market Area name — always includes a state/region suffix.
              Exact names to use (copy these precisely):
                'New York NY', 'Los Angeles CA', 'Chicago IL', 'Philadelphia PA',
                'Dallas-Ft. Worth TX', 'Houston TX', 'Atlanta GA', 'Phoenix AZ',
                'Miami-Ft. Lauderdale FL', 'San Antonio TX', 'Seattle-Tacoma WA',
                'Boston MA-Manchester NH', 'San Francisco-Oak-San Jose CA',
                'Washington DC (Hagerstown MD)'
              When the user says a city name, map it to the closest exact DMA name above.
  - dma_id:   numeric DMA identifier
  - week:     DATE, start of the week. Data lags ~5-7 days; latest available is typically
              the week starting ~5 days ago. NEVER use DATE_TRUNC(CURRENT_DATE(), WEEK) —
              it will return no results. Use DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY) instead.
  - refresh_date: DATE, when the data was last updated
  - score:    relative search interest (0-100)
  - rank:     popularity rank within the DMA/week
  - There are NO country or region columns — data is US-only, broken down by DMA.

Rules:
- CRITICAL: Table names MUST be wrapped in backticks (project name has hyphens).
  Correct:   FROM `bigquery-public-data.google_trends.top_terms`
  Wrong:     FROM bigquery-public-data.google_trends.top_terms
- For "this week" or "recent" queries use: week >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
- For "US-wide" or country-level queries, omit the DMA filter and GROUP BY term,
  aggregating with SUM(score) across all DMAs.
- Default to the last 4 weeks unless the user specifies a time range.
- Limit results to 20 rows unless the user asks for more.
- Return ONLY the raw SQL query — no markdown fences, no explanation.
"""

_INTERPRETATION_PROMPT = """You are a data analyst. The user asked a question about Google Trends.
Here is the SQL result (JSON array):

{results}

Provide a concise, friendly interpretation in markdown. Highlight the top findings.
Do NOT repeat the raw JSON or the SQL query.
"""


_TABLE_NAMES = [
    "bigquery-public-data.google_trends.top_terms",
    "bigquery-public-data.google_trends.top_rising_terms",
]


def _clean_sql(text: str) -> str:
    text = re.sub(r"```sql", "", text, flags=re.IGNORECASE)
    text = re.sub(r"```", "", text)
    text = text.strip()
    # Ensure table names with hyphens are always backtick-quoted
    for table in _TABLE_NAMES:
        # Replace unquoted occurrences (not already wrapped in backticks)
        text = re.sub(
            r"(?<!`)" + re.escape(table) + r"(?!`)",
            f"`{table}`",
            text,
        )
    return text


async def generate_sql(user_question: str) -> str:
    """Step 1: use ASI:One to turn the user's question into BigQuery SQL."""
    response = await _client.chat.completions.create(
        model="asi1",
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_question},
        ],
        max_tokens=512,
        temperature=0,
    )
    raw = response.choices[0].message.content or ""
    return _clean_sql(raw)


def _execute_sql(sql: str) -> str:
    """Step 2: run the SQL against BigQuery and return a JSON string."""
    from google.cloud import bigquery

    client = bigquery.Client(project=GOOGLE_CLOUD_PROJECT)
    try:
        job = client.query(sql)
        rows = [dict(row) for row in job.result()]
        if not rows:
            return "Query returned no results."
        return json.dumps(rows, default=str)
    except Exception as exc:
        return f"BigQuery error: {exc}"


async def interpret_results(results_json: str) -> str:
    """Step 3: ask ASI:One to interpret the raw JSON results."""
    prompt = _INTERPRETATION_PROMPT.format(results=results_json[:6000])
    response = await _client.chat.completions.create(
        model="asi1",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1024,
    )
    return (response.choices[0].message.content or "").strip()


async def run_trends_query(user_question: str) -> str:
    """
    Full pipeline: question → SQL → BigQuery → interpretation.
    Returns a markdown-formatted answer ready to send to the user.
    """
    sql = await generate_sql(user_question)
    results_json = await asyncio.to_thread(_execute_sql, sql)
    interpretation = await interpret_results(results_json)

    return (
        f"### Generated SQL\n```sql\n{sql}\n```\n\n"
        "---\n\n"
        f"### Insights\n{interpretation}"
    )
