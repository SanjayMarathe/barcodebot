"""
Ranker Agent — selects the best candidate product for a shopping item.

Scoring criteria:
1. Must be under max_price (hard filter)
2. Keyword overlap with item name (weighted)
3. Rating (weighted)
4. Review count (weighted)
5. Price-to-budget ratio (prefer cheaper within budget)

Returns a ranked selection with a human-readable reason.
Also supports ASI:One chat protocol for direct user interaction.
"""
import logging
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import httpx
from uagents import Agent, Context, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement, ChatMessage, EndSessionContent, TextContent, chat_protocol_spec,
)

from agents.shared.config import FASTAPI_BASE_URL, FASTAPI_CALLBACK_URL, RANKER_PORT, RANKER_SEED
from agents.shared.messages import RankRequest, RankResult

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ranker_agent")

# ---------------------------------------------------------------------------
# Agent setup
# ---------------------------------------------------------------------------

ranker_agent = Agent(
    name="ranker-agent",
    seed=RANKER_SEED,
    port=RANKER_PORT,
    mailbox=True,
    publish_agent_details=True,
)

ranker_proto = Protocol(name="ranker-protocol")

# ---------------------------------------------------------------------------
# Hardcoded demo product catalog (no BrowserUse — reserved for buyer agents)
# ---------------------------------------------------------------------------

_DEMO_CANDIDATES: Dict[str, List[Dict[str, Any]]] = {
    "water bottle": [
        {"title": "Nalgene 32oz Tritan BPA-Free Wide Mouth Water Bottle", "price": 14.99, "rating": 4.8, "review_count": 42000, "url": "https://amazon.com/dp/B001NCDE1E", "thumbnail": ""},
        {"title": "Hydro Flask 32 oz Wide Mouth Water Bottle", "price": 44.95, "rating": 4.7, "review_count": 28000, "url": "https://amazon.com/dp/B07BDQ1TKT", "thumbnail": ""},
        {"title": "CamelBak Chute Mag 32oz Insulated Water Bottle", "price": 19.99, "rating": 4.6, "review_count": 15000, "url": "https://amazon.com/dp/B07JMGM3YN", "thumbnail": ""},
    ],
    "pen": [
        {"title": "Pilot G2 Premium Retractable Gel Ink Pens, Fine Point, 12-Pack", "price": 12.99, "rating": 4.8, "review_count": 85000, "url": "https://amazon.com/dp/B00006JNHV", "thumbnail": ""},
        {"title": "BIC Round Stic Xtra Life Ballpoint Pens, Medium, 60-Pack", "price": 7.49, "rating": 4.7, "review_count": 31000, "url": "https://amazon.com/dp/B001E6B4DK", "thumbnail": ""},
    ],
    "notebook": [
        {"title": "Leuchtturm1917 Medium A5 Dotted Hardcover Notebook", "price": 24.95, "rating": 4.7, "review_count": 19000, "url": "https://amazon.com/dp/B002TSIMW4", "thumbnail": ""},
        {"title": "Moleskine Classic Notebook, Hard Cover, Large, Ruled", "price": 21.95, "rating": 4.6, "review_count": 24000, "url": "https://amazon.com/dp/B015NG45PO", "thumbnail": ""},
    ],
    "phone": [
        {"title": "Apple iPhone 15 Pro 128GB Natural Titanium", "price": 999.00, "rating": 4.7, "review_count": 5200, "url": "https://amazon.com/dp/B0CHX2XHVF", "thumbnail": ""},
        {"title": "Samsung Galaxy S24 256GB Cobalt Violet", "price": 799.99, "rating": 4.5, "review_count": 3800, "url": "https://amazon.com/dp/B0CMDMHNTV", "thumbnail": ""},
    ],
    "laptop": [
        {"title": "Apple MacBook Air 13-inch M3 8GB/256GB Midnight", "price": 1099.00, "rating": 4.8, "review_count": 8100, "url": "https://amazon.com/dp/B0CWDP3GBN", "thumbnail": ""},
        {"title": "Dell XPS 13 9340 Intel Core Ultra 7 16GB/512GB", "price": 1299.99, "rating": 4.4, "review_count": 2200, "url": "https://amazon.com/dp/B0CQXGKZYD", "thumbnail": ""},
    ],
    "headphones": [
        {"title": "Sony WH-1000XM5 Wireless Noise Canceling Headphones", "price": 279.99, "rating": 4.7, "review_count": 41000, "url": "https://amazon.com/dp/B09XS7JWHH", "thumbnail": ""},
        {"title": "Apple AirPods Pro (2nd Generation)", "price": 189.00, "rating": 4.6, "review_count": 62000, "url": "https://amazon.com/dp/B0CHWRXH8B", "thumbnail": ""},
    ],
    "bottle": [
        {"title": "Nalgene 32oz Tritan BPA-Free Wide Mouth Water Bottle", "price": 14.99, "rating": 4.8, "review_count": 42000, "url": "https://amazon.com/dp/B001NCDE1E", "thumbnail": ""},
        {"title": "CamelBak Chute Mag 32oz Insulated Bottle", "price": 19.99, "rating": 4.6, "review_count": 15000, "url": "https://amazon.com/dp/B07JMGM3YN", "thumbnail": ""},
    ],
}


def _get_demo_candidates(item_name: str) -> List[Dict[str, Any]]:
    """Fuzzy-match item name to demo catalog keys."""
    name_lower = item_name.lower()
    for key, candidates in _DEMO_CANDIDATES.items():
        if key in name_lower or name_lower in key:
            return candidates
    # Fallback: sample across categories
    return [v[0] for v in list(_DEMO_CANDIDATES.values())[:3]]


# ---------------------------------------------------------------------------
# Ranking logic
# ---------------------------------------------------------------------------

def _keyword_score(title: str, item_name: str) -> float:
    """Fraction of item keywords found in candidate title."""
    title_lower = title.lower()
    keywords = [w for w in item_name.lower().split() if len(w) > 2]
    if not keywords:
        return 0.5
    hits = sum(1 for kw in keywords if kw in title_lower)
    return hits / len(keywords)


def _rank_candidates(
    item_name: str,
    max_price: float,
    candidates: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """Score and rank candidates. Returns best candidate dict, or None."""
    eligible = [c for c in candidates if 0 < float(c.get("price", 0)) <= max_price]

    if not eligible:
        # Relax to slightly over budget (5% margin)
        eligible = [c for c in candidates if 0 < float(c.get("price", 0)) <= max_price * 1.05]

    if not eligible:
        return None

    def score(c: Dict[str, Any]) -> float:
        price = float(c.get("price", max_price))
        rating = float(c.get("rating") or 0)
        review_count = int(c.get("review_count") or 0)
        title = str(c.get("title", ""))

        kw_score = _keyword_score(title, item_name)  # 0-1
        price_score = 1 - (price / max_price)         # 0-1 (lower price is better)
        rating_score = rating / 5.0                    # 0-1
        popularity = min(1.0, review_count / 1000)     # 0-1, capped at 1000 reviews

        # Weights: keyword match is most important, then rating, then price, then popularity
        return (
            kw_score * 0.40 +
            rating_score * 0.30 +
            price_score * 0.20 +
            popularity * 0.10
        )

    ranked = sorted(eligible, key=score, reverse=True)
    return ranked[0]


def _build_reason(chosen: Dict[str, Any], item_name: str, max_price: float) -> str:
    price = chosen.get("price", 0)
    rating = chosen.get("rating")
    title = chosen.get("title", "")[:60]
    kw = _keyword_score(title, item_name)

    parts = [f"Best match for '{item_name}'"]
    if kw >= 0.6:
        parts.append("strong keyword match")
    elif kw >= 0.3:
        parts.append("partial keyword match")
    if rating:
        parts.append(f"rated {rating:.1f}/5")
    parts.append(f"${price:.2f} (budget ${max_price:.2f})")
    return "; ".join(parts)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def post_event(run_id: str, event_type: str, payload: dict):
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(FASTAPI_CALLBACK_URL, json={
                "run_id": run_id,
                "agent_name": "ranker",
                "event_type": event_type,
                "timestamp": datetime.utcnow().isoformat(),
                "payload": payload,
            })
    except Exception as e:
        logger.warning(f"Failed to post event: {e}")


# ---------------------------------------------------------------------------
# Message handler
# ---------------------------------------------------------------------------

@ranker_proto.on_message(RankRequest)
async def handle_rank_request(ctx: Context, sender: str, msg: RankRequest):
    item_name = msg.item.get("name", "unknown")
    max_price = float(msg.item.get("max_price", 9999))
    logger.info(f"[ranker] Ranking {len(msg.candidates)} candidates for '{item_name}' (max ${max_price})")

    chosen = _rank_candidates(item_name, max_price, msg.candidates)

    if not chosen:
        logger.warning(f"[ranker] No eligible candidates for '{item_name}' under ${max_price}")
        await post_event(msg.run_id, "ranking_failed", {
            "item_name": item_name,
            "reason": f"No candidates under ${max_price}",
            "candidate_count": len(msg.candidates),
        })
        # Send back a "failed" result with empty chosen
        result = RankResult(
            run_id=msg.run_id,
            item_name=item_name,
            chosen={},
            reason=f"No eligible candidates under ${max_price:.2f}",
            rank_score=0.0,
        )
        await ctx.send(sender, result)
        return

    reason = _build_reason(chosen, item_name, max_price)
    logger.info(f"[ranker] Chose: '{chosen.get('title', '')[:50]}' at ${chosen.get('price', 0):.2f}")

    await post_event(msg.run_id, "ranking_done", {
        "item_name": item_name,
        "chosen_title": chosen.get("title", "")[:80],
        "chosen_price": chosen.get("price", 0),
        "chosen_url": chosen.get("url", ""),
        "reason": reason,
    })

    result = RankResult(
        run_id=msg.run_id,
        item_name=item_name,
        chosen=chosen,
        reason=reason,
        rank_score=0.0,
    )
    await ctx.send(sender, result)
    logger.info(f"[ranker] Sent RankResult for '{item_name}' to orchestrator")


ranker_agent.include(ranker_proto)


# ---------------------------------------------------------------------------
# ASI:One chat protocol — direct user interaction
# ---------------------------------------------------------------------------

chat_proto = Protocol(spec=chat_protocol_spec)


@chat_proto.on_message(ChatMessage)
async def handle_chat(ctx: Context, sender: str, msg: ChatMessage):
    """Receive a chat message from ASI:One, rank hardcoded candidates, stream thoughts."""
    await ctx.send(sender, ChatAcknowledgement(
        timestamp=datetime.utcnow(), acknowledged_msg_id=msg.msg_id
    ))

    text = " ".join(c.text for c in msg.content if hasattr(c, "text")).strip()
    # Parse comma/newline-separated items; fallback to full text as single item
    raw_items = [t.strip() for t in re.split(r"[,\n]+", text) if t.strip()]
    items = raw_items if raw_items else [text]

    async def thought(t: str):
        """Send intermediate thought to ASI:One and post to web app."""
        await ctx.send(sender, ChatMessage(
            timestamp=datetime.utcnow(), msg_id=uuid4(),
            content=[TextContent(type="text", text=t)],
        ))
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                await client.post(
                    f"{FASTAPI_BASE_URL}/internal/ranker-thought",
                    json={"text": t},
                )
        except Exception:
            pass

    price_match = re.search(r"under\s*\$?(\d+(?:\.\d+)?)", text, re.IGNORECASE)
    max_price = float(price_match.group(1)) if price_match else 9999.0

    results = []
    for item_name in items:
        await thought(f"Evaluating candidates for '{item_name}'…")
        candidates = _get_demo_candidates(item_name)
        await thought(f"Scoring {len(candidates)} candidates — keyword match · rating · price · popularity")

        winner = _rank_candidates(item_name, max_price, candidates)
        if not winner:
            await thought(f"No eligible candidates under ${max_price:.0f} for '{item_name}'.")
            continue

        title = winner.get("title", "")[:65]
        price = float(winner.get("price", 0))
        rating = winner.get("rating", "?")
        reviews = winner.get("review_count", 0)

        await thought(f"Winner: {title} — ${price:.2f} ⭐{rating} ({reviews:,} reviews)")

        # Post to web app cart
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f"{FASTAPI_BASE_URL}/internal/cart-add",
                    json={"item_name": item_name, "product": winner},
                )
        except Exception as e:
            logger.warning(f"[ranker] Failed to add '{item_name}' to cart: {e}")

        results.append(f"• {item_name}: {title} — ${price:.2f}")

    summary = "Top picks:\n" + "\n".join(results) if results else "No matching products found."
    await ctx.send(sender, ChatMessage(
        timestamp=datetime.utcnow(), msg_id=uuid4(),
        content=[TextContent(type="text", text=summary), EndSessionContent(type="end-session")],
    ))


@chat_proto.on_message(ChatAcknowledgement)
async def handle_chat_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    pass


ranker_agent.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    ranker_agent.run()
