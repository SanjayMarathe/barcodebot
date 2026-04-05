"""
Natural language parser: extract structured filters from user text.
Uses regex for price, bedrooms, location; optional property type.
"""

import re
from typing import Any


# Patterns
# Use more permissive digit patterns so we handle plain numbers like 300000 (no commas).
PRICE_PATTERNS = [
    r"\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*k\b",  # 600k, $600k
    r"under\s+\$?\s*(\d[\d,]*)",  # under $600000 or under 600,000
    r"\$?\s*(\d[\d,]*)\s*and\s+under",  # 600000 and under
    r"max\s*(?:price)?\s*\$?\s*(\d[\d,.]*)",  # max price 600000
    r"under\s+(\d+)\s*k",  # under 600k
]
BEDROOM_PATTERNS = [
    r"(\d+)\s*bed(?:room)?s?",
    r"(\d+)\s*bed\b",
    r"(\d+)\s*br\b",
    r"bedrooms?\s*[=:]?\s*(\d+)",
]

BATH_PATTERNS = [
    r"(\d+)\s*bath(?:room)?s?\+?",
    r"(\d+)\s*\+?\s*baths?",
    r"(\d+)\s*\+?\s*ba\b",
    r"baths?\s*[=:]?\s*(\d+)",
]

SQFT_PATTERNS = [
    r"(?:over|at least|minimum|min)\s*(\d[\d,]*)\s*(?:sqft|square feet|sq ft)",
    r"(\d[\d,]*)\s*(?:sqft|square feet|sq ft)\s*(?:or more|\+)",
]

YEAR_BUILT_PATTERNS = [
    r"built\s+after\s+(\d{4})",
    r"built\s+since\s+(\d{4})",
    r"newer\s+than\s+(\d{4})",
]
PROPERTY_TYPE_PATTERNS = [
    r"only\s+condos?",
    r"condos?\s+only",
    r"just\s+condos?",
    r"only\s+houses?",
    r"houses?\s+only",
    r"only\s+(residential|commercial)",
    r"(condo|condos|house|houses|townhouse|residential|commercial)\s+only",
]
LOCATION_PATTERNS = [
    r"(?:in|at)\s+([A-Za-z\s]+?)(?:\s+under|\s+with|\s*$|,)",
    r"([A-Za-z\s]+)\s+(?:under|with)\s+\$",
    r"in\s+([A-Za-z\s]+)",
]


def _parse_price(text: str) -> int | None:
    """Return price as integer (e.g. 600k -> 600000)."""
    lower = text.lower().strip()
    for pat in PRICE_PATTERNS:
        m = re.search(pat, lower, re.IGNORECASE)
        if m:
            raw = m.group(1).replace(",", "").strip()
            if "k" in lower[m.start() : m.end()] or re.search(r"\d+\s*k", lower):
                try:
                    return int(float(raw) * 1000)
                except ValueError:
                    pass
            try:
                return int(float(raw))
            except ValueError:
                pass
    return None


def _parse_bedrooms(text: str) -> int | None:
    """Return number of bedrooms."""
    for pat in BEDROOM_PATTERNS:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            try:
                return int(m.group(1))
            except (ValueError, IndexError):
                pass
    return None


def _parse_min_baths(text: str) -> int | None:
    """Return minimum number of bathrooms requested (e.g. '2+ baths')."""
    for pat in BATH_PATTERNS:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            try:
                return int(m.group(1))
            except (ValueError, IndexError):
                pass
    return None


def _parse_min_sqft(text: str) -> int | None:
    """Return minimum square footage if mentioned."""
    for pat in SQFT_PATTERNS:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            raw = m.group(1).replace(",", "").strip()
            try:
                return int(raw)
            except ValueError:
                continue
    return None


def _parse_min_year_built(text: str) -> int | None:
    """Return minimum year built if user says 'built after/since 2010' etc."""
    for pat in YEAR_BUILT_PATTERNS:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            try:
                return int(m.group(1))
            except (ValueError, IndexError):
                pass
    return None


def _parse_property_type(text: str) -> str | None:
    """Return normalized property type (condo, residential, etc.)."""
    lower = text.lower().strip()
    if re.search(r"only\s+condos?|condos?\s+only|just\s+condos?", lower):
        return "condo"
    if re.search(r"only\s+houses?|houses?\s+only", lower):
        return "residential"
    if "condo" in lower or "condos" in lower:
        return "condo"
    if "townhouse" in lower:
        return "residential"
    if "commercial" in lower:
        return "commercial"
    return None


def _parse_deal_type(text: str) -> str | None:
    """
    Return 'rent' or 'buy' if the text clearly indicates rental vs purchase.
    """
    lower = text.lower()
    if any(
        w in lower
        for w in ["for rent", "to rent", "rental", "renting", "lease", "for lease"]
    ):
        return "rent"
    if any(w in lower for w in ["for sale", "to buy", "buying", "purchase", "own"]):
        return "buy"
    return None


def _parse_near_landmark(text: str) -> str | None:
    """
    Detect specific landmarks we support for 'near' searches.
    For now, handle UT Austin as a special case.
    """
    lower = text.lower()
    if (
        "ut austin" in lower
        or "university of texas at austin" in lower
        or "university of texas austin" in lower
    ):
        if "near" in lower or "close to" in lower or "by" in lower:
            return "ut_austin"
    return None


# Words that are not location names (avoid "bedroom homes", "2 bed", etc.)
_LOCATION_STOP_WORDS = {
    "bedroom",
    "bedrooms",
    "beds",
    "bed",
    "bath",
    "baths",
    "bathroom",
    "bathrooms",
    "home",
    "homes",
    "house",
    "houses",
    "under",
    "only",
    "condo",
    "condos",
    "refine",
    "change",
    "more",
    "listings",
    "properties",
    "property",
}


def _parse_location(text: str) -> str | None:
    """Extract city/area name (e.g. Austin)."""

    def _is_plausible_location(loc: str) -> bool:
        if not loc or len(loc) > 80 or re.match(r"^\d+$", loc):
            return False
        words = set(loc.lower().split())
        if words & _LOCATION_STOP_WORDS:
            return False
        return True

    for pat in LOCATION_PATTERNS:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            loc = m.group(1).strip()
            if _is_plausible_location(loc):
                return loc
    # Fallback: look for "in <place>" and take the last/best match (often the city)
    for m in re.finditer(
        r"\bin\s+([A-Za-z][A-Za-z\s]{1,50}?)(?=\s+under|\s*\.|,|\s+\d+\s*k|\s*$)", text
    ):
        loc = m.group(1).strip()
        if _is_plausible_location(loc):
            return loc
    return None


def parse_filters(user_text: str) -> dict[str, Any]:
    """
    Extract structured filters from natural language.
    Returns dict with keys: location, max_price, min_price, bedrooms, property_type.
    Missing keys are None.
    """
    if not user_text or not isinstance(user_text, str):
        return {
            "location": None,
            "max_price": None,
            "min_price": None,
            "bedrooms": None,
            "property_type": None,
            "deal_type": None,
            "min_baths": None,
            "min_sqft": None,
            "min_year_built": None,
            "near_landmark": None,
        }

    text = user_text.strip()
    return {
        "location": _parse_location(text),
        "max_price": _parse_price(text),
        "min_price": None,  # extend if needed
        "bedrooms": _parse_bedrooms(text),
        "property_type": _parse_property_type(text),
        "deal_type": _parse_deal_type(text),
        "min_baths": _parse_min_baths(text),
        "min_sqft": _parse_min_sqft(text),
        "min_year_built": _parse_min_year_built(text),
        "near_landmark": _parse_near_landmark(text),
    }
