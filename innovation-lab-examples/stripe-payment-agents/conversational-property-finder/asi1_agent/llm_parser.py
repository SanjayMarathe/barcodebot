"""
LLM-powered interpreter for natural language property queries.

If OPENAI_API_KEY is set, we use OpenAI to extract:
- intent: new_search | refinement | more | other
- filters: location, max_price, min_price, bedrooms, property_type, deal_type (buy/rent)

This is optional: if anything fails we fall back to the regex parser.
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, Optional

from openai import OpenAI


_client: Optional[OpenAI] = None


def _get_client() -> Optional[OpenAI]:
    """Create a shared OpenAI client if OPENAI_API_KEY is present."""
    global _client
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    if _client is None:
        _client = OpenAI(api_key=api_key)
    return _client


def llm_interpret(
    user_text: str, current_state: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """
    Use OpenAI to interpret the user message into intent + structured filters.

    Returns a dict like:
    {
      "intent": "new_search" | "refinement" | "more" | "other",
      "filters": {
        "location": str | null,
        "max_price": int | null,
        "min_price": int | null,
        "bedrooms": int | null,
        "property_type": str | null,
      }
    }
    or None on error / unavailable.
    """
    client = _get_client()
    if client is None:
        return None

    model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

    system_prompt = (
        "You are a strict JSON generator that interprets natural language "
        "real estate queries for a property search agent.\n"
        "Always respond with a single JSON object, nothing else.\n\n"
        "Fields:\n"
        "- intent: one of ['new_search', 'refinement', 'more', 'details', 'create_sheet', 'other']\n"
        "- listing_index: integer or null (1-based index of the listing the user refers to, "
        "when intent='details').\n"
        "- sheet_request: object or null. When intent='create_sheet', set sheet_request with: "
        "title (string, e.g. 'Chayan Shah - Personal Information'), and rows (array of arrays, "
        "e.g. [['Name', 'Chayan Shah']] or [['Name', 'Chayan Shah'], ['Date', '2025-02-19']]). "
        "Extract from the user message what they want in the sheet.\n"
        "- filters: object with optional keys: location (string or null), "
        "max_price (integer or null), min_price (integer or null), "
        "bedrooms (integer or null), property_type (string or null), "
        "deal_type (string or null: 'buy' or 'rent'), "
        "min_baths (integer or null), min_sqft (integer or null), "
        "min_year_built (integer or null).\n\n"
        "Guidelines:\n"
        "- If the user clearly asks for 'more results', set intent='more'.\n"
        "- If they adjust constraints (e.g. 'make it under 500k', 'only condos', "
        "'change to 3 bedrooms') based on an existing search, use intent='refinement'.\n"
        "- If they describe a new search (city/area, price, beds), use intent='new_search'.\n"
        "- If they say things like 'the second one', 'the first apartment', "
        "'listing number 3', they want more details about a specific result: "
        "set intent='details' and set listing_index to the 1-based number (2 for 'second', 1 for 'first').\n"
        "- If they ask to create a Google Sheet and add content (e.g. 'create a google sheet and add my name Chayan Shah'), "
        "set intent='create_sheet' and set sheet_request with a short title and rows: e.g. "
        "title: 'Chayan Shah - Personal Information', rows: [['Name', 'Chayan Shah']]. "
        "Support multiple rows if they mention more than one field.\n"
        "- If it is unrelated to property search and not a sheet request, intent='other'.\n"
        "- Use whole dollar amounts for prices (e.g. 600000 for '600k' or '$600,000').\n"
        "- property_type can be values like 'condo', 'apartment', 'house', "
        "'townhouse', 'residential', 'commercial'.\n"
        "- deal_type should be 'rent' when the user clearly wants rentals "
        "(e.g. 'for rent', 'rental', 'lease') and 'buy' when they clearly want "
        "to purchase (e.g. 'to buy', 'for sale'). If unclear, leave it null.\n"
        '- min_baths should reflect "2+ baths" requests, min_sqft for '
        "minimum square footage (e.g. 'over 1000 sqft'), and min_year_built "
        "for constraints like 'built after 2010'. If not mentioned, leave them null.\n"
    )

    # Pass current filters so the model can reason about refinements if it wants
    user_payload = {
        "message": user_text,
        "current_filters": {
            "location": current_state.get("location"),
            "max_price": current_state.get("max_price"),
            "min_price": current_state.get("min_price"),
            "bedrooms": current_state.get("bedrooms"),
            "property_type": current_state.get("property_type"),
            "deal_type": current_state.get("deal_type"),
            "min_baths": current_state.get("min_baths"),
            "min_sqft": current_state.get("min_sqft"),
            "min_year_built": current_state.get("min_year_built"),
        },
    }

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": json.dumps(user_payload),
                },
            ],
            temperature=0,
        )
        content = completion.choices[0].message.content or ""
        result = json.loads(content)
        # Basic validation
        if not isinstance(result, dict):
            return None
        if "filters" not in result or not isinstance(result["filters"], dict):
            result["filters"] = {}
        # listing_index is optional; if present, ensure it's an int
        idx = result.get("listing_index")
        if idx is not None:
            try:
                result["listing_index"] = int(idx)
            except (TypeError, ValueError):
                result["listing_index"] = None
        # sheet_request: ensure it's a dict with title and rows
        sr = result.get("sheet_request")
        if sr is not None and isinstance(sr, dict):
            if not isinstance(sr.get("rows"), list):
                sr["rows"] = []
            if not sr.get("title"):
                sr["title"] = "Sheet"
        return result
    except Exception:
        # On any error, fall back to regex path
        return None
