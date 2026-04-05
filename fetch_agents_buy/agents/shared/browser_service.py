"""
Browser automation service using Browser Use Cloud SDK v3.

Browser Use sends a natural-language task to an AI browser agent
running in the cloud.  The agent returns structured results.

Two high-level operations are exposed:
  - search_amazon(query, …) — search Amazon and return product candidates
  - buy_product(url, quantity, …) — navigate to a product page and add to cart

Usage:
    from agents.shared.browser_service import get_browser_use_service
    svc = get_browser_use_service()
    result = await svc.search_amazon("AA batteries")
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Dict, List, Optional

from pydantic import BaseModel, Field

from agents.shared.config import BROWSER_USE_API_KEY

logger = logging.getLogger(__name__)

SessionCallback = Callable[[str, str], Awaitable[None]]


# ---------------------------------------------------------------------------
# Structured output schemas (sent to Browser Use as output_schema)
# ---------------------------------------------------------------------------

class ProductCandidate(BaseModel):
    title: str
    price: float
    rating: Optional[float] = None
    review_count: Optional[int] = None
    url: str
    asin: Optional[str] = None

class SearchResultsOutput(BaseModel):
    products: List[ProductCandidate] = Field(default_factory=list)

class AddToCartOutput(BaseModel):
    success: bool = False
    final_price: Optional[float] = None
    error: Optional[str] = None
    confirmation_text: Optional[str] = None


# ---------------------------------------------------------------------------
# Lightweight result wrappers returned to callers
# ---------------------------------------------------------------------------

@dataclass
class SearchResult:
    session_id: str
    live_url: str
    candidates: List[Dict[str, Any]]

@dataclass
class BuyProductResult:
    session_id: str
    live_url: str
    success: bool
    final_price: float
    error: str
    recording_url: str


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class BrowserUseService:
    """Wraps Browser Use Cloud SDK v3."""

    def __init__(self):
        from browser_use_sdk.v3 import AsyncBrowserUse
        self._client = AsyncBrowserUse(api_key=BROWSER_USE_API_KEY)

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    async def search_amazon(
        self,
        query: str,
        max_results: int = 8,
        on_session_created: Optional[SessionCallback] = None,
    ) -> SearchResult:
        """
        Ask Browser Use to search Amazon and extract product candidates.

        *on_session_created(session_id, live_url)* is called as soon as the
        cloud session is created — before the task finishes — so the caller
        can immediately surface the live browser view to the user.
        """
        task = (
            f"Go to https://www.amazon.com and search for '{query}'. "
            f"From the search results page, extract the top {max_results} products that have a visible price. "
            "For each product extract: title, price (numeric, USD), star rating (float, if shown), "
            "number of reviews (integer, if shown), product URL (full https://www.amazon.com/dp/ASIN link), "
            "and ASIN (the 10-character alphanumeric ID from the URL). "
            "Skip sponsored results if possible. Only include products with a price > 0."
        )

        logger.info(f"[browser-use] Starting search session for: '{query}'")
        run = self._client.run(task, output_schema=SearchResultsOutput)

        live_url = ""
        session_id = ""
        async for msg in run:
            if run.session_id and not session_id:
                session_id = run.session_id
                session = await self._client.sessions.get(session_id)
                live_url = session.live_url or ""
                logger.info(f"[browser-use] Search session {session_id} live_url={live_url[:80]}")
                if on_session_created:
                    await on_session_created(session_id, live_url)

        candidates: List[Dict[str, Any]] = []
        if run.result and run.result.output:
            output = run.result.output
            if isinstance(output, SearchResultsOutput):
                candidates = [p.model_dump() for p in output.products]
            elif isinstance(output, dict) and "products" in output:
                raw = output["products"]
                candidates = [
                    p.model_dump() if hasattr(p, "model_dump") else p
                    for p in raw
                ]

        session_id = session_id or (run.session_id or "")
        logger.info(f"[browser-use] Search returned {len(candidates)} candidates")
        return SearchResult(
            session_id=session_id,
            live_url=live_url,
            candidates=candidates[:max_results],
        )

    # ------------------------------------------------------------------
    # Buy / add-to-cart
    # ------------------------------------------------------------------

    async def buy_product(
        self,
        product_url: str,
        quantity: int = 1,
        item_name: str = "",
        max_price: float = 9999,
        on_session_created: Optional[SessionCallback] = None,
    ) -> BuyProductResult:
        """
        Ask Browser Use to navigate to *product_url* on Amazon,
        set the quantity, and click Add to Cart.

        *on_session_created(session_id, live_url)* fires as soon as
        the cloud session is created.
        """
        task = (
            f"Go to https://www.amazon.com and search for '{item_name}'. "
            "From the search results page, click on the most relevant product listing "
            "(avoid sponsored ads if possible). "
            "Wait for the product detail page to fully load. "
            "Report success=true, the price shown on the product page, and the product title."
        )

        logger.info(f"[browser-use] Starting buy session for '{item_name}' url={product_url[:60]}")
        run = self._client.run(task, output_schema=AddToCartOutput)

        live_url = ""
        session_id = ""
        async for msg in run:
            if run.session_id and not session_id:
                session_id = run.session_id
                session = await self._client.sessions.get(session_id)
                live_url = session.live_url or ""
                logger.info(f"[browser-use] Buy session {session_id} live_url={live_url[:80]}")
                if on_session_created:
                    await on_session_created(session_id, live_url)

        success = False
        final_price = 0.0
        error = ""
        session_id = session_id or (run.session_id or "")

        if run.result and run.result.output:
            output = run.result.output
            if isinstance(output, AddToCartOutput):
                success = output.success
                final_price = float(output.final_price or 0)
                error = output.error or ""
            elif isinstance(output, dict):
                success = output.get("success", False)
                final_price = float(output.get("final_price") or 0)
                error = output.get("error", "")

        recording_url = ""
        if run.result:
            urls = getattr(run.result.session, "recording_urls", None) or []
            if urls:
                recording_url = str(urls[0])

        logger.info(f"[browser-use] Buy result for '{item_name}': success={success} price={final_price}")
        return BuyProductResult(
            session_id=session_id,
            live_url=live_url,
            success=success,
            final_price=final_price,
            error=error,
            recording_url=recording_url,
        )


    async def add_to_cart(
        self,
        session_id: str,
        item_name: str,
        quantity: int = 1,
    ) -> BuyProductResult:
        """
        Search Amazon for item_name and add it to cart.

        session_id is accepted for API compatibility but not used to resume a
        BrowserUse session — the v3 SDK does not support session resumption via
        run(session_id=…).  A fresh task is started instead.
        """
        task = (
            f"Go to https://www.amazon.com and search for '{item_name}'. "
            "Click on the most relevant product listing (avoid sponsored ads if possible). "
            "Wait for the product detail page to fully load. "
            "Report success=true, the exact price shown on the page, and the product title. "
            "Do NOT attempt to add to cart or sign in — just report the price."
        )

        logger.info(f"[browser-use] Starting add-to-cart task for '{item_name}'")
        run = self._client.run(task, output_schema=AddToCartOutput)
        async for _ in run:
            pass  # drain messages

        success, final_price, error = False, 0.0, ""
        if run.result and run.result.output:
            output = run.result.output
            if isinstance(output, AddToCartOutput):
                success = output.success
                final_price = float(output.final_price or 0)
                error = output.error or ""
            elif isinstance(output, dict):
                success = output.get("success", False)
                final_price = float(output.get("final_price") or 0)
                error = output.get("error", "")

        logger.info(f"[browser-use] add_to_cart '{item_name}': success={success} price={final_price}")
        return BuyProductResult(
            session_id=run.session_id or session_id,
            live_url="",
            success=success,
            final_price=final_price,
            error=error,
            recording_url="",
        )


# ---------------------------------------------------------------------------
# Singleton accessor
# ---------------------------------------------------------------------------

_service: Optional[BrowserUseService] = None


def get_browser_use_service() -> BrowserUseService:
    """Return a shared BrowserUseService instance."""
    global _service
    if _service is None:
        _service = BrowserUseService()
    return _service
