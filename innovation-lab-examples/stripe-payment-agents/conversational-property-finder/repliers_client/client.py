"""
Repliers MLS API client: search_listings(filters) -> list of simplified listing objects.
"""

import os
from typing import Any

import requests  # type: ignore[import-untyped]

from .filters import build_query_params
from .formatter import format_listings  # noqa: F401 — re-export if needed


REPLIERS_BASE = "https://api.repliers.io/listings"
# Repliers returns image paths like "sample/IMG-ACT123_0.jpg" or "area/IMG-..."; prefix with CDN base for full URL
REPLIERS_CDN_BASE = "https://cdn.repliers.io"


def _simplify_listing(raw: dict[str, Any]) -> dict[str, Any]:
    """
    Extract a richer, but still concise, subset of fields from a Repliers listing.
    This is what we pass to the chat formatter.
    """
    address_obj = raw.get("address") or {}
    if isinstance(address_obj, dict):
        # Build street + city/state as needed; structure may vary by MLS
        street = address_obj.get("streetAddress") or address_obj.get("street") or ""
        city = address_obj.get("city") or ""
        state = address_obj.get("stateOrProvince") or address_obj.get("state") or ""
        postal_code = address_obj.get("postalCode") or address_obj.get("zip") or ""
        neighborhood = address_obj.get("area") or address_obj.get("district") or ""
        parts = [p for p in [street, city, state] if p]
        base_address = ", ".join(parts) if parts else raw.get("addressKey") or "—"
        if postal_code:
            address = f"{base_address} {postal_code}"
        else:
            address = base_address
    else:
        address = str(address_obj)

    list_price = raw.get("listPrice")
    if list_price is not None:
        try:
            price = int(float(list_price))
        except (TypeError, ValueError):
            price = None
    else:
        price = raw.get("price")

    details = raw.get("details") or {}
    if isinstance(details, dict):
        beds = details.get("numBedrooms")
        baths = details.get("numBathrooms")
        sqft = (
            details.get("sqft")
            or details.get("sqFt")
            or details.get("approxSquareFootage")
        )
        year_built = details.get("yearBuilt") or details.get("yearBuiltDetails")
        property_type = details.get("type") or details.get("propertyType")
        days_on_market = details.get("daysOnMarket") or details.get("dom")
    else:
        beds = raw.get("numBedrooms") or raw.get("beds")
        baths = raw.get("numBathrooms") or raw.get("baths")
        sqft = raw.get("sqft") or raw.get("sqFt")
        year_built = raw.get("yearBuilt")
        property_type = raw.get("propertyType") or raw.get("class")
        days_on_market = raw.get("daysOnMarket") or raw.get("dom")

    mls = raw.get("mlsNumber") or raw.get("mls") or raw.get("listingId") or "—"

    # Description / remarks
    description = (
        raw.get("remarks") or raw.get("publicRemarks") or raw.get("description")
    )
    if isinstance(description, str):
        description = description.strip()

    # Images: capture primary and a small list of URLs (Repliers returns relative paths; make them full CDN URLs)
    def _full_image_url(path: str) -> str:
        if not path or not path.strip():
            return path
        path = path.strip()
        if path.startswith("http://") or path.startswith("https://"):
            return path
        base = REPLIERS_CDN_BASE.rstrip("/")
        return f"{base}/{path.lstrip('/')}"

    image_url: str | None = None
    all_images: list[str] = []
    images = raw.get("images")
    if isinstance(images, list) and images:
        for item in images:
            url = None
            if isinstance(item, dict):
                url = item.get("url") or item.get("imageUrl") or item.get("src")
            else:
                url = str(item)
            if url:
                url = _full_image_url(url)
                if image_url is None:
                    image_url = url
                all_images.append(url)
            if len(all_images) >= 15:
                break

    # Coordinates (if available) for potential distance calculations
    lat = (
        raw.get("lat")
        or raw.get("latitude")
        or (address_obj.get("lat") if isinstance(address_obj, dict) else None)
    )
    lon = (
        raw.get("long")
        or raw.get("lng")
        or raw.get("lon")
        or (address_obj.get("long") if isinstance(address_obj, dict) else None)
    )

    return {
        "address": address or "—",
        "price": price,
        "beds": beds,
        "baths": baths,
        "mls": str(mls) if mls else "—",
        "sqft": sqft,
        "year_built": year_built,
        "property_type": property_type,
        "days_on_market": days_on_market,
        "description": description,
        "image_url": image_url,
        "neighborhood": neighborhood or None,
        "lat": lat,
        "lon": lon,
        "images": all_images,
    }


def search_listings(
    filters: dict[str, Any],
    export_page_size: int | None = None,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """
    Call Repliers API and return (list of simplified listing dicts, meta).
    - Always returns at most 3 listings for chat display.
    - If export_page_size is set (e.g. 50), requests that many from API and
      puts the full list in meta["all_listings"] for Google Sheet export.
    """
    api_key = os.getenv("REPLIERS_API_KEY")
    if not api_key:
        raise ValueError("REPLIERS_API_KEY not set in environment")

    params = build_query_params(filters)
    if export_page_size is not None and export_page_size > 3:
        params["pageSize"] = export_page_size
        params["resultsPerPage"] = export_page_size
    headers = {"REPLIERS-API-KEY": api_key}

    response = requests.get(
        REPLIERS_BASE,
        params=params,
        headers=headers,
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()

    listings_raw = data.get("listings") or data.get("data") or []
    if isinstance(listings_raw, dict):
        listings_raw = list(listings_raw.values()) if listings_raw else []
    all_listings = [_simplify_listing(item) for item in listings_raw]
    display_size = 3
    listings = all_listings[:display_size]

    page = data.get("page", filters.get("page", 1))
    num_pages = data.get("numPages", 0)
    count = data.get("count", 0)
    has_more = page < num_pages if num_pages else len(listings_raw) >= display_size

    meta = {
        "page": page,
        "num_pages": num_pages,
        "count": count,
        "has_more": has_more,
        "all_listings": all_listings,
    }
    return listings, meta


def fetch_listing_by_mls(mls: str) -> dict[str, Any] | None:
    """
    Fetch a single raw listing from Repliers by MLS number.
    Used for the 'details' view when the user picks a specific result so we
    can expose richer fields (taxes, HOA, rooms, etc.).
    """
    api_key = os.getenv("REPLIERS_API_KEY")
    if not api_key or not mls:
        return None

    params: dict[str, Any] = {
        "mlsNumber": mls,
        # Include both Active and Unavailable so details still work if status changed
        "status": ["A", "U"],
        "pageSize": 1,
        "resultsPerPage": 1,
    }
    headers = {"REPLIERS-API-KEY": api_key}

    try:
        response = requests.get(
            REPLIERS_BASE,
            params=params,
            headers=headers,
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        listings_raw = data.get("listings") or data.get("data") or []
        if isinstance(listings_raw, dict):
            listings_raw = list(listings_raw.values()) if listings_raw else []
        if not listings_raw:
            return None
        return listings_raw[0]
    except Exception:
        return None
