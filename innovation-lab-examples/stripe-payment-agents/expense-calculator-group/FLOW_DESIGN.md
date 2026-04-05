# Expense Calculator (Group Receipt Split) — Flow Design

This document describes the **end-to-end flow** for the ASI-One group-chat expense calculator, including **receipt photo upload** as the first step. It references existing docs and agents in this workspace for implementation.

---

## 1. References (docs & agents in this workspace)

Use these when implementing:

| Reference | Location | What to use |
|-----------|----------|-------------|
| **Deploy on Agentverse / ASI-One** | `innovation-lab-examples/deploy-agent-on-av/docs.md` | Chat protocol (`ChatMessage`, `ChatAcknowledgement`, `TextContent`), ASI API, Agentverse registration, mailbox, `publish_manifest=True`. |
| **GigMart / ASI-One uAgent** | `GigMart/docs.md` | Launch ASI-One compatible uAgent, Chat Protocol integration, endpoint, registration script, README best practices. |
| **Scholarship Finder agent** | `innovation-lab-examples/openai-agent-sdk/Scholarship-finder/` | **Bridge pattern**: `uagent_bridge.py` (chat handler) + `workflow.py` (OpenAI/LLM). `StartSessionContent` → welcome; `MetadataContent` for `attachments`; `TextContent`; `ctx.storage` per sender/session; ACK then process. |
| **PDF Summariser (attachments)** | `innovation-lab-examples/pdf-summariser-example/` | **Receipt photo = same pattern as PDF**: `ResourceContent`, `download_resource()` via **ExternalStorage** (Agentverse storage) + optional URI fallback; advertise `attachments: "true"` in session; collect content items (text + resource), then process. Use for **downloading receipt image** from ASI-One/Agentverse. |
| **Claude Vision agent (images)** | `innovation-lab-examples/anthropic-quickstart/02-claude-vision-agent/claude_vision_agent.py` | **Image handling**: `ResourceContent` → resource URI or storage → `download_image_from_uri()` → image bytes → base64 → **vision API** (Claude/OpenAI). Use for **receipt image → line items** (vision/OCR). |
| **Expense logic** | `expense-calculator-group/expense_logic.py` | `Receipt`, `parse_item_selection()`, `compute_splits()`, `format_split_result()`. |

---

## 2. High-level flow (with receipt photo)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ASI-One group: Friends’ agents + Expense Calculator agent                  │
└─────────────────────────────────────────────────────────────────────────────┘

  [1] Someone adds PHOTO of receipt
        │
        ▼
  [2] Agent receives image (ResourceContent) → download (PDF-summariser pattern)
        │
        ▼
  [3] Extract line items from image (Vision API – Claude vision / OpenAI pattern)
        │
        ▼
  [4] Agent shows “I found: 1. Pizza $12, 2. Coffee $3 …” → confirm / edit / done
        │
        ▼
  [5] “Start poll” → each member replies with item numbers they brought (e.g. 1,2,3)
        │
        ▼
  [6] “Calculate” → fair split per person (only people who brought an item share it)
        │
        ▼
  [7] Show final amount per person to the group
```

---

## 3. Detailed flow (step by step)

### Phase 0: Group setup (ASI-One)

- User creates a **group chat** in ASI-One.
- Adds **friends’ agents** (each friend’s agent = one participant).
- Adds the **Expense Calculator** agent to the same group.
- All messages in that group are seen by the agent with a **sender** per message (each friend identified by their agent/sender address).

**Doc ref:** GigMart `docs.md` — “Launch ASI-One Compatible uAgent”, “Connect Your Agents - Chat Protocol”, “Find AI Agents → ASI:One Chat”.

---

### Phase 1: Receipt photo upload

- **User action:** Any member sends a **photo of the receipt** in the group (camera or gallery).
- **ASI-One:** Sends a `ChatMessage` that can contain:
  - `TextContent` (optional caption, e.g. “Here’s the receipt”).
  - **`ResourceContent`** (the image), with `resource_id` and/or resource URI (same pattern as PDF in pdf-summariser).
- **Agent:**
  - On **StartSessionContent**: send `MetadataContent(metadata={"attachments": "true"})` so ASI-One shows attachment UI (see pdf-summariser `chat_proto.py`).
  - On **ResourceContent**: download the image using the **same pattern as pdf-summariser** `download_resource()`:
    - Prefer **Agentverse storage**: `ExternalStorage(identity=ctx.agent.identity, storage_url=AGENTVERSE_URL + "/v1/storage")` → `storage.download(str(item.resource_id))` → decode base64 `contents`, get `mime_type`.
    - Fallback: if storage fails, try resource URI (e.g. `item.resource[0].uri`) with `httpx.get()` (pdf-summariser fallback).
  - Support **image** mime types: `image/jpeg`, `image/png`, `image/webp`, etc. (no PDF extraction; pass bytes to vision step).

**Doc ref:** `innovation-lab-examples/pdf-summariser-example/chat_proto.py` (ResourceContent, download_resource, prompt_content list), `utils.py` (get_pdf_text pattern for “content items” — we’ll have an “image” path instead of PDF text).

---

### Phase 2: Extract line items from receipt image (vision)

- **Input:** Image bytes (from Phase 1).
- **Process:**
  - Use a **vision-capable API** (OpenAI GPT-4 Vision or Claude Vision, same pattern as `claude_vision_agent.py`):
    - Build message with image (base64 + correct mime type).
    - **Prompt:** “This is a photo of a receipt. List every line item with a price. For each line return: item name, price (number only). Format: one per line as 'Name | price' or return a JSON array of {name, price}. Include only items that have a price.”
  - Parse model output into a list of `(name, price)`.
- **Output:** In-memory / `ctx.storage` list of receipt items (same structure as current `Receipt` in `expense_logic.py`).
- **Edge cases:** No items found → ask for manual list or another photo. Optional: allow “add item” / “edit item” by text (already in current design).

**Doc ref:** `innovation-lab-examples/anthropic-quickstart/02-claude-vision-agent/claude_vision_agent.py` (download image, base64, build message with image, call vision API). Scholarship Finder uses OpenAI in `workflow.py`; we can use the same OpenAI client with vision for receipt parsing.

---

### Phase 3: Confirm / edit items, then lock

- **Agent sends:** “I found these items: 1. Pizza $12.00, 2. Coffee $3.50, 3. Salad $8.00. Total $23.50. Reply with **done** to start the poll, or **add &lt;name&gt; &lt;price&gt;** / **remove 2** to edit.”
- **State:** Same as current: `draft` until “done” / “start poll”.
- **Optional:** If user sent only text (no photo), keep current behaviour: “add Pizza 12” etc. to build receipt manually.

---

### Phase 4: Poll — “Who brought which items?”

- **Agent sends:** “Which items did you bring? Reply with the **numbers**, e.g. 1,2,3. Multiple people can have the same items.”
- **Per sender:** On each reply that looks like a list of numbers (e.g. “1,2,3” or “1 2”), store `selections[sender] = [1, 2, 3]` (reuse `parse_item_selection()` from `expense_logic.py`).
- **Identity:** In group chat, each friend’s message has a different **sender** (agent address or user identity). No change to current logic: one selection set per sender.

**Doc ref:** Scholarship Finder uses `sender` and `ctx.storage` per user; we use the same for `receipt_selections[sender]`.

---

### Phase 5: Calculate and show split

- **Trigger:** Someone says “calculate” or “show split”.
- **Logic:** Use existing `compute_splits(receipt, selections)` and `format_split_result()` from `expense_logic.py`: for each item, only people who selected it share the cost; each person sees their total and breakdown.
- **Agent sends:** Formatted result to the requester (and optionally to the group; depends on ASI-One group semantics — if one reply is visible to all, one message is enough).

---

## 4. Agent states (summary)

| State    | Meaning                          | Allowed actions                                      |
|----------|----------------------------------|------------------------------------------------------|
| `idle`   | No active receipt                | “New receipt”, “Help”; optionally “Send receipt photo” |
| `draft`  | Receipt has items (from photo or manual) | “Add …”, “Remove …”, “Done” / “Start poll”     |
| `polling`| Waiting for members to claim items | Replies “1,2,3”, “Calculate”                     |
| `done`   | Split was shown                  | “New receipt” to start over                          |

---

## 5. Implementation checklist (with references)

- [ ] **Chat protocol & session**  
  - Use `chat_protocol_spec`, `ChatMessage`, `ChatAcknowledgement`, `TextContent`, `StartSessionContent`, `MetadataContent`, **`ResourceContent`**.  
  - Refs: Scholarship Finder `uagent_bridge.py`, deploy-agent-on-av `docs.md`, GigMart `docs.md`.

- [ ] **Attachments**  
  - Send `MetadataContent(metadata={"attachments": "true"})` on session start.  
  - Ref: pdf-summariser `chat_proto.py`.

- [ ] **Download receipt image**  
  - On `ResourceContent`, use `ExternalStorage` + `storage.download(resource_id)` then base64 decode; fallback to URI.  
  - Ref: pdf-summariser `download_resource()`; support image mime types and save bytes for vision.

- [ ] **Extract items from image**  
  - Call vision API (OpenAI or Claude) with receipt image + structured prompt; parse response into list of (name, price); build `Receipt` in storage.  
  - Ref: Claude vision agent (image → API); Scholarship Finder (workflow pattern).

- [ ] **Draft / edit / done**  
  - Same as current text-based flow: add/remove items, “done” → move to `polling`.  
  - Ref: current `expense-calculator-group/agent.py` and `expense_logic.py`.

- [ ] **Poll and calculate**  
  - Same as current: parse “1,2,3” per sender, `compute_splits`, `format_split_result`.  
  - Ref: `expense_logic.py`.

- [ ] **Deploy**  
  - Agentverse + mailbox; optional Render (or similar) per deploy-agent-on-av `docs.md`; ASI-One group = add this agent to a group chat.  
  - Ref: deploy-agent-on-av, GigMart docs.

---

## 6. Optional: Display names

- Allow “I’m Alice” to set a display name for `sender` (stored in `ctx.storage`).
- Use in `format_split_result(..., sender_display_names)` so the split shows “Alice” instead of raw address.  
  Already supported in current `expense_logic.py` and agent.

---

## 7. Summary

- **Receipt input:** Photo first (ResourceContent → download → vision API → line items); manual “add item” still supported.
- **Flow:** Photo → extract items → confirm/edit → start poll → each member replies with item numbers → calculate → show split.
- **Implementation:** Reuse pdf-summariser for **attachment + resource download**, Claude vision agent for **image → vision API**, Scholarship Finder for **chat + storage + workflow**, existing **expense_logic** for split math and formatting. All referenced docs and agents are in this workspace.
