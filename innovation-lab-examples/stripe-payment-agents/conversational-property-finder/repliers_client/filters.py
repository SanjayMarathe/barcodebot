"""
Build Repliers API query parameters from our structured filter dict.
"""

from typing import Any


# Map our property_type to Repliers "class" values
PROPERTY_CLASS_MAP = {
    "condo": "condo",
    "condos": "condo",
    "condominium": "condo",
    "apartment": "residential",
    "apartments": "residential",
    "house": "residential",
    "houses": "residential",
    "home": "residential",
    "homes": "residential",
    "residential": "residential",
    "townhouse": "residential",
    "townhouses": "residential",
    "single family": "residential",
    "commercial": "commercial",
}


def build_query_params(filters: dict[str, Any]) -> dict[str, Any]:
    """
    Convert our internal filter dict to Repliers API query parameters.
    - location -> city (array of one element for simplicity)
    - max_price -> maxPrice
    - min_price -> minPrice
    - bedrooms -> minBedrooms (and optionally maxBedrooms same value for exact)
    - property_type -> class (mapped)
    - deal_type -> type (sale vs lease)
    - page -> pageNum (Repliers uses pageNum)
    - pageSize = 3
    - status = A (Active)
    - type = sale (from spec)
    """
    params: dict[str, Any] = {
        "pageSize": 3,
        "resultsPerPage": 3,  # Repliers pagination (some docs use this)
        "status": "A",  # Active
    }

    location = filters.get("location")
    if location:
        params["city"] = [location.strip()]

    max_price = filters.get("max_price")
    if max_price is not None:
        params["maxPrice"] = int(max_price)

    min_price = filters.get("min_price")
    if min_price is not None:
        params["minPrice"] = int(min_price)

    min_baths = filters.get("min_baths")
    if min_baths is not None:
        params["minBaths"] = int(min_baths)

    min_sqft = filters.get("min_sqft")
    if min_sqft is not None:
        params["minSqft"] = int(min_sqft)

    min_year_built = filters.get("min_year_built")
    if min_year_built is not None:
        params["minYearBuilt"] = int(min_year_built)

    bedrooms = filters.get("bedrooms")
    if bedrooms is not None:
        params["minBedrooms"] = int(bedrooms)
        # Optional: exact match via maxBedrooms
        params["maxBedrooms"] = int(bedrooms)

    prop_type = filters.get("property_type")
    if prop_type:
        normalized = prop_type.strip().lower()
        repliers_class = PROPERTY_CLASS_MAP.get(normalized)
        if repliers_class:
            params["class"] = [repliers_class]

    # Buy vs rent (sale vs lease)
    deal_type = (filters.get("deal_type") or "").strip().lower()
    if deal_type in ("rent", "rental", "lease", "leasehold"):
        # Repliers commonly uses Lease/Lease types for rentals
        params["type"] = "Lease"
    else:
        # Default to sale
        params["type"] = "sale"

    # Specific landmark-based searches (simple hard-coded support)
    near_landmark = (filters.get("near_landmark") or "").strip().lower()
    if near_landmark == "ut_austin":
        # UT Austin approximate coordinates with a small radius (in km or miles
        # depending on Repliers' expected units; docs use radius with lat/long).
        params["lat"] = "30.2855"
        params["long"] = "-97.7393"
        params["radius"] = "2"  # small radius around campus

    page = filters.get("page", 1)
    params["pageNum"] = max(1, int(page))

    return params
