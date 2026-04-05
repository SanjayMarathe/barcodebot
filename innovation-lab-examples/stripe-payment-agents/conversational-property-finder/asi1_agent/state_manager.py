"""
Conversation state manager: in-memory session filters keyed by session ID.
No database. Handles: new search, refinements (under 550k, 3 bedrooms, only condos), "more" -> page += 1.
"""

from typing import Any

# Session ID -> filter state (location, max_price, bedrooms, property_type, deal_type, page)
_sessions: dict[str, dict[str, Any]] = {}


DEFAULT_FILTERS: dict[str, Any] = {
    "location": None,
    "max_price": None,
    "min_price": None,
    "bedrooms": None,
    "property_type": None,
    "deal_type": None,  # "buy" or "rent"
    "min_baths": None,
    "min_sqft": None,
    "min_year_built": None,
    "near_landmark": None,
    "page": 1,
}


def get_state(session_id: str) -> dict[str, Any]:
    """Return current filter state for session; default if new."""
    return _sessions.get(session_id) or dict(DEFAULT_FILTERS)


def update_state(
    session_id: str,
    *,
    location: str | None = None,
    max_price: int | None = None,
    min_price: int | None = None,
    bedrooms: int | None = None,
    property_type: str | None = None,
    deal_type: str | None = None,
    min_baths: int | None = None,
    min_sqft: int | None = None,
    min_year_built: int | None = None,
    near_landmark: str | None = None,
    page: int | None = None,
    full_replace: bool = False,
) -> dict[str, Any]:
    """
    Update session state. None values mean "don't change" unless full_replace=True.
    full_replace: if True, set state to exactly the provided values (None clears).
    Returns updated state.
    """
    current = get_state(session_id)
    if full_replace:
        new_state = {
            "location": location,
            "max_price": max_price,
            "min_price": min_price,
            "bedrooms": bedrooms,
            "property_type": property_type,
            "deal_type": deal_type,
            "min_baths": min_baths,
            "min_sqft": min_sqft,
            "min_year_built": min_year_built,
            "near_landmark": near_landmark,
            "page": page if page is not None else 1,
        }
    else:
        new_state = dict(current)
        if location is not None:
            new_state["location"] = location
        if max_price is not None:
            new_state["max_price"] = max_price
        if min_price is not None:
            new_state["min_price"] = min_price
        if bedrooms is not None:
            new_state["bedrooms"] = bedrooms
        if property_type is not None:
            new_state["property_type"] = property_type
        if deal_type is not None:
            new_state["deal_type"] = deal_type
        if min_baths is not None:
            new_state["min_baths"] = min_baths
        if min_sqft is not None:
            new_state["min_sqft"] = min_sqft
        if min_year_built is not None:
            new_state["min_year_built"] = min_year_built
        if near_landmark is not None:
            new_state["near_landmark"] = near_landmark
        if page is not None:
            new_state["page"] = max(1, page)
    _sessions[session_id] = new_state
    return new_state


def merge_parsed_into_state(
    session_id: str, parsed: dict[str, Any], is_refinement: bool
) -> dict[str, Any]:
    """
    Merge parsed filters into session state.
    - If is_refinement: only update fields that are present in parsed (non-None).
    - If new search: replace state with parsed, set page=1.
    """
    if is_refinement:
        updates = {k: v for k, v in parsed.items() if v is not None and k != "page"}
        if not updates:
            return get_state(session_id)
        # Any refinement should restart pagination from page 1
        updates["page"] = 1
        return update_state(session_id, **updates)
    # New search: use parsed as base, page=1
    return update_state(
        session_id,
        location=parsed.get("location"),
        max_price=parsed.get("max_price"),
        min_price=parsed.get("min_price"),
        bedrooms=parsed.get("bedrooms"),
        property_type=parsed.get("property_type"),
        deal_type=parsed.get("deal_type"),
        min_baths=parsed.get("min_baths"),
        min_sqft=parsed.get("min_sqft"),
        min_year_built=parsed.get("min_year_built"),
        near_landmark=parsed.get("near_landmark"),
        page=1,
        full_replace=True,
    )


def next_page(session_id: str) -> dict[str, Any]:
    """Increment page for session; return updated state."""
    current = get_state(session_id)
    return update_state(session_id, page=current.get("page", 1) + 1)
