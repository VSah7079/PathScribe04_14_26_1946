# Findings while drafting the Autopsy, OR Suite, Facility Operations, My Exports, Outbound Queue and Registry Exceptions articles (group "ops")

Found by reading the screens against the code. Nothing was changed in source; each article describes the behaviour as it is today.

| # | Where | Finding |
|---|---|---|
| 1 | My Exports | The note "In this demonstration, exports download straight away, so there is nothing to list here" (`myExports.demoNote`) is never shown: since Batch 611 the demonstration has a simulated export server, so the screen always lists exports and shows the Simulated note. The text is dead. |
| 2 | Outbound Queue | Dead-lettered: no code path found that sets `maxRetriesExceeded` to true (the dispatch code always passes false), so the Dead-lettered tile and state cannot occur from the current dispatch queues. — Fixed in Batch 669 (Pete's ruling: remove it): the Dead-lettered state and tile are gone; a message past its retries stays Failed and can be retried. |
| 3 | Outbound Queue | The Facility filter lists raw facility codes, not facility names. A message with no known facility is hidden when any facility is chosen. |
| 4 | Outbound Queue | The "Amendment deltas" tile looks like the other tiles but is a plain count: it is not a button and does not filter. |
| 5 | Outbound Queue | Outcome of an action is one summary line only (counts by refusal); there is no per-row message, and the line stays until the next action. |
| 6 | Outbound Queue | By default only Administrator can open the screen; Lab Director and QA Reviewer do not, although the hub description reads as an oversight screen for quality staff. Decide whether intended. |
| 7 | Registry Exceptions | "Capture as CAPA" has no capability of its own: anyone who can open the screen can raise a CAPA (code comment says this is deliberate). |
| 8 | Registry Exceptions | The transmission audit download for a user without the export permission shows a greyed button (CapabilityButton), but the `audit.notPermitted` message is also coded; it is reachable only when the server path is not used. |
| 9 | Autopsy Dashboards | No Refresh button: figures are fixed when the screen opens. No export or print. Real cases always show cause of death "Not recorded" (disclosed in KNOWN_GAPS). |
| 10 | Autopsy Dashboards | The "Reports overdue now" row prints the tier code (PAD/FAD) untranslated inside the translated sentence. |
| 11 | Facility Operations | Stat tile labels, alert kinds ("STAT", "QC Failed", "Cold-Chain Excursion"), queue details (including processing step names) and the cold-chain time are fixed English text in the compute functions, not translated. |
| 12 | Facility Operations | Locale text for the old typed device-token step (`confirmTokenTitle`, `confirmTokenError`, and similar) is unused since the Display Token (Batch 603). |
| 13 | Facility Operations | Send-Out transit tiles count only batches with a tracking record; batches without one appear in the queue but in no tile. |
| 14 | OR Suite | "Stop demo" stops the advancing timer only; the four DEMO frozen-section entries stay in the real intraoperative data and on the board until dismissed. The Start demo button is shown to anyone at the board, with no permission. — Fixed in Batch 669: Start and Stop demo need the permission config:or-board-demo:run (checked in the service too), and Stop demo removes the demo cases it created. |
| 15 | OR Suite | A refused dismissal shows only "Could not dismiss this case. Try again."; if the dismissal succeeds but the event-log write fails, the row is dismissed and nothing is shown to the person (logged to the browser console only). — Fixed in Batch 669: a dismissal whose log write fails now shows a message on the board (a refused dismissal already did). |
| 16 | OR Suite | The dismissal window labels the OR number "Case ID". Entries recorded without a location never appear on any board, with no message at the Intraop Queue to say so. |
| 17 | OR Suite / Facility Operations | The server-side check of the Display Token (refusing a revoked token on the server) is Planned, not built (KNOWN_GAPS). |
