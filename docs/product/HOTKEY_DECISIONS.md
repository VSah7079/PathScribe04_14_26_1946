# Hotkey and voice decisions for Pete

**Answered Oct 20, 2026 (Batch 639):** 2 Move (Print Current Cassette is now Alt+Shift+O; Alt+P stays Previous Case); 7 Confirm (Discard Unsaved Changes keeps Alt+U and asks first); 1, 3 to 6 and 8 to 12 Keep. Sites that never changed the cassette key get the new default; customised keys stay. Alt+Shift+Z is the only free Alt+Shift letter left.

Batch 614. After the clash review, every remaining clash is already handled by the rule you set in Batch 602: **the screen in focus wins**, and the always-on command it covers is reached with Alt+J, then its key. Nothing is broken. The policy is settled and is not up for decision. This page lists 12 edge cases where the rule picks an outcome you may not want; each has a proposed answer (mostly Keep) that stands unless you say otherwise. Everything else that remains is on the known list in `src/services/actionRegistry/actionsCoverage.guard.test.ts` (26 key clashes and 25 voice phrase clashes since Batch 639), and a new clash now fails that test.

## What changed in Batch 614

The seven Intraoperative queue commands (Start New Intraop Entry, Log Touch Prep Performed, Skip Touch Prep, Log Frozen Section Cut, Log Squash Prep, Log Cytology / Fluid Evaluation, Log Gross Only) were filed as always-on, but their handlers exist only on the Intraoperative queue page; pressed anywhere else they did nothing. They are now Intraoperative screen commands. That removed 15 key clashes (they had been covering Sort by Date, Search Recipients, Apply STAT Flag, Toggle Urgent and others) and changed no key. The count of 67 known clashes is now 52.

## Decisions needed

| # | Always-on command (key) | Screen command that covers it | Screen | Proposed fix | Why it needs you |
|---|---|---|---|---|---|
| 1 | Next Case (Alt+N) | Add Specimen / Add New Specimen (Alt+N) | Accessioning, Synoptic report | Keep. Move nothing. | Next Case is the key pathologists use most, and on the report page it needs Alt+J then N. If that is too slow there, give Add New Specimen another key instead. |
| 2 | Previous Case (Alt+P) | Print Current Cassette (Alt+P) | Synoptic report | Keep, or give Print Current Cassette Alt+Shift+O (one of the two free Alt+Shift letters). | Same reason; printing a cassette is rarer than moving between cases. |
| 3 | Next Tab / Section (Alt+.) and Previous (Alt+,) | Next Block / Previous Block | Grossing | Keep. | Same direction and idea, so it reads naturally; say if tabs matter more on Grossing. |
| 4 | Go Home (Alt+H) | Open History (Alt+H) | Synoptic report | Keep. | Home is rarely needed mid-report, and History is what you want there. Alt+J, H still goes home. |
| 5 | Open Messages (Alt+I) | Internal Note (Alt+I); Import From Order (Alt+I) | Synoptic report; Accessioning | Keep. | Messages are reachable from the nav bar and Alt+J, I. |
| 6 | Log Out (Alt+L) | Log Surgeon Report; Load Saved Search | Synoptic report; Search | Keep. | The screen command covering Log Out is the safer direction. |
| 7 | System Audit (Alt+U) | Discard Unsaved Changes (Alt+U) | Synoptic report | Ask for a confirmation before Discard Unsaved Changes runs, and keep its key. | A destructive command that cannot be undone, on a casual key. A confirmation fits the click-economy rule for exactly this case. |
| 8 | Open Routing Rules (Alt+R), Test Routing Rule (Alt+Shift+T) | Save Report Draft, Refresh, Add Recipient, Show My Response Time Trend (Alt+R); Confirm Triage (Alt+Shift+T) | Several screens | Keep. Administrators reach them with Alt+J, then R (or Shift+T). | They are administrator commands that are covered on four screens. Nearly every Alt+Shift letter is already used (only O and Z are free), so a move would have to use a different pattern. |
| 9 | Open Search (Alt+F), Open Configuration (Alt+C), View Help (F1, moved from Alt+V in Batch 658) | Filter Urgent, Open Flag Manager, Clear Search, Filter Completed, Full View, View Recently Deleted and others | Worklist, Messages, Search, Contribution | Keep. | Each is covered on screens where the screen command is the one you want. |
| 10 | Go Back / Go Forward (voice "back", "forward", "zurück", "vorwärts", "terug", "vooruit", "뒤로", "앞으로") | Previous / Next section | Synoptic report | Keep, but say so in the guide: on the report page these words move between sections. | Spoken "back" there will not leave the page. |
| 11 | Previous Case (Korean "이전 증례") | Open History (Korean "이전 증례") | Synoptic report | Change the Open History phrase to "과거 증례" or similar. | The same words mean "previous case" and "earlier cases"; a native speaker should choose. | **Settled Oct 18 (Pete, from a Korean reviewer):** Previous Case stays "이전 증례"; Open History now says "과거 증례" (earlier cases; a second reviewer pointed out the plural suffix is easily dropped by speech recognition).
| 12 | Open Search (voice "search", "suchen", "zoeken", "rechercher", "검색") | Search Messages | Messages | Keep. | On Messages "search" searches messages; "open search" still opens Search. |

## Batch 650: keys that did nothing now act (no key changed)

Registered keys with no screen handler were found and wired; none was moved. Effects worth knowing:
- **Alt+H** on the report page opens History (the screen wins over Go Home, as decided in #4); before, it did nothing. **Alt+Shift+H** closes it.
- **Alt+A** and **Ctrl+Alt+P** (Accept / Pass) work in the pool claim window. While that window is open it takes the report screen's context, so on the Worklist **Alt+A** means Accept (not "Awaiting countersign") until the window closes. Pete: keep, or give Accept a key of its own (Alt+Shift+Z is the only free Alt+Shift letter left).
- **Alt+Shift+X** (Sign Out Case) and **Ctrl+Alt+Shift+O** (Sign Out and Next) only open their confirmation windows. Sign Out and Next works for Assist and Orchestration cases since Batch 664 (it arms the next case and opens it when the sign-out finishes).
- **Ctrl+Alt+G** (Go to Codes) and **Ctrl+Alt+H** (Add Code) both open the Codes window, the one the Codes button opens.
- Every one of these is ignored while another window is open in front, or when its button is hidden or greyed out.

## Batch 666: shared keys found while writing the User Guide (for your ruling)

The clashes below sit on different screens, so each key works where it is shown. None is verified at runtime. Reply "keep" or "move" with the number, as above.

| # | Key | Meaning 1 | Meaning 2 | Suggested |
|---|---|---|---|---|
| 13 | Ctrl+Alt+Shift+A | Save Cytology Review | Add Comment (Microtome) | Keep. Different screens. |
| 14 | Ctrl+Alt+Shift+N | Create Plate (Molecular) | Create Container; Add Note | Keep. Different screens. |
| 15 | Ctrl+Alt+Shift+P | Place Rack (Molecular) | Preview Report; Slide Checkout | Keep. Different screens. |
| 16 | Alt+F | Open Flag Manager (report) | Open Search (elsewhere) | Keep, same pattern as #9. |
| 17 | Alt+Shift+R | Reply in Messages | Read Flags (Worklist) | Keep. Different screens. |

Also built but not yet in this document: **Add Collaborator (Ctrl+Alt+Shift+0)** and **Collaborating Cases (Ctrl+Alt+F)** on the report screen. "Apply STAT Flag" (Alt+S) only opens the Flag Manager; it does not apply STAT.

## How to answer

Reply with the number and "move", "keep" or your own key. I will change the key (only Alt+Shift+O and Alt+Shift+Z are free as Alt+Shift letters; anything else needs a different pattern, which I would propose), add a migration so a site that never changed it gets the new default (customised keys stay), and update the known-clash list in the same change.

## Not done in this batch

- **Mac Option and AltGr.** Done later in Batch 614: Option and AltGr keys are read from the physical key, and AltGr counts as Alt. Tested with simulated key presses only, not on a real Mac or AltGr keyboard.
- **French, German, Dutch and Korean phrases.** Still unreviewed; the list for a reviewer is `docs/product/PHRASE_REVIEW_LIST.md`.
