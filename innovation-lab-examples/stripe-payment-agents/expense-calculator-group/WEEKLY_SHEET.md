# Weekly Task Sheet (ASI Adoption / Innovation Lab Repo Examples)

---

## Copy-paste for your weekly sheet (one row)

Paste the row below into your spreadsheet (one cell per line, or comma-separated if your sheet uses CSV).

**Task Details (ASI Adoption/Innovation Lab Repo Examples/Specific Tasks)**  
Expense Calculator agent for ASI-One group chat. Receipt photo, extract items, poll for who brought what, fair split. Polish: display names from profile, formatted output, testing, docs.

**Task Start Date**  
[Your week start, e.g. 17-Feb-2025]

**Task Completed Date**  
[Leave blank until Friday or 21-Feb-2025]

**Week's Goal - What you are planning to ship by the end of week**  
Ship a polished Expense Calculator. Receipt photo so items get extracted. Poll where each person replies with item numbers they brought. Fair split with total per person and names from profile when possible. Tested in a group on ASI-One. README and agent_README updated.

**Definition of Done - What you are going to show on Friday**  
Demo on ASI-One. Upload a receipt image and the agent lists items. Say done. Two people reply with item numbers. Say calculate. Agent shows total per person with names and amounts, plus receipt total.

**Status - Not Started/Started/Pending/Blocked**  
Started

**Planned hours per task**  
Expense Calculator poll and split logic, 5 hours. Display names from profile and override, 3 hours. Format output and testing, 5 hours. Docs and demo prep, 4 hours. Demo run and final testing, 3 hours. Total 20 hours.

**Actual Total Hours clocked in This Week**  
20

---

## This week (example: 17 Feb to 21 Feb 2025, adjust dates to your actual week)

| Field | Value |
|-------|--------|
| **Task Details** | Expense Calculator agent for ASI-One group chat. Receipt photo, extract items, poll for who brought what, fair split. Polish: display names from profile, formatted output, testing, docs. |
| **Task Start Date** | [e.g. 17-Feb-2025] |
| **Task Completed Date** | [e.g. 21-Feb-2025 or leave blank until Friday] |
| **Week's Goal** | Ship a polished Expense Calculator. Receipt photo so items get extracted. Poll where each person replies with item numbers they brought. Fair split with total per person and names from profile when possible. Tested in a group on ASI-One. README and agent_README updated. |
| **Definition of Done** | Demo on ASI-One. Upload a receipt image and the agent lists items. Say done. Two people reply with item numbers. Say calculate. Agent shows total per person with names and amounts, plus receipt total. |
| **Status** | Started |
| **Planned hours per task** | Poll and split logic, 5 h. Display names from profile and override, 3 h. Format output and testing, 5 h. Docs and demo prep, 4 h. Demo run and final testing, 3 h. Total planned 20 h. |
| **Actual Total Hours clocked in This Week** | 20 |

---

## 5-day plan for this week

| Day | Focus | Deliverable |
|-----|--------|-------------|
| **Monday** | Poll flow, split, basic names | Users reply with item numbers. Agent records per sender. Calculate shows fair split and total per person. Names: I'm X or Friend 1, Friend 2. |
| **Tuesday** | Names from profile, formatting | Agent reads display name from ASI-One profile metadata so users do not type their name. Final output shows total per person at top, then receipt total, then per item and breakdown. |
| **Wednesday** | Testing and polish | Test with 2 or 3 people in the group. Fix bugs. Poll message has quick-copy line for item numbers. Welcome text updated. |
| **Thursday** | Docs and edge cases | README and agent_README updated. Handle edge cases such as no profile name or duplicate items. |
| **Friday** | Demo prep and sheet update | Final end-to-end test. Demo ready for Definition of Done. Update this sheet with actual hours and completed date. |

---

## End-of-day updates (copy into your sheet or standup)

### Monday EOD
**Task:** Expense Calculator, poll flow and split.  
**Done today:** Implemented poll flow. Each member replies with item numbers they brought. Agent stores selection per sender. Calculate runs fair split so only people who brought an item share its cost. Output shows total per person at top and receipt total. Added display name handling: I'm Name and Friend 1, Friend 2 when no name is set.  
**Next:** Read name from profile or metadata so users do not need to type it. Improve formatting of final output.

### Tuesday EOD (template)
**Done today:** Display name is read from ASI-One profile metadata, including nested profile and user_preferences. Formatted calculation output: total per person first, then receipt total, then per item and breakdown per person.  
**Next:** Test with 2 or 3 people in the group. Polish poll and welcome messages.

### Wednesday EOD (template)
**Done today:** Group test with 2 or 3 people. Fixed [list any bugs]. Poll message includes quick-copy line for item numbers. Welcome text mentions profile name.  
**Next:** Update README and agent_README. Handle edge cases.

### Thursday EOD (template)
**Done today:** README and agent_README updated. [Any edge cases handled.]  
**Next:** Final test and demo prep for Friday.

### Friday EOD (template)
**Done today:** Final demo run. Weekly sheet updated with actual hours and completed date. Definition of Done met. [Brief note on what you showed.]
