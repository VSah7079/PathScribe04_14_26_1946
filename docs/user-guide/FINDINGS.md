**Batch 666:** writing the articles for the remaining screens logged a further 126 findings, one file per group: `FINDINGS_666_batch.md`, `_cytology.md`, `_molecular.md`, `_workstations.md`, `_ops.md`, `_access.md`, `_report.md`, `_everyday.md`. They are for Pete to rule on; none is fixed.

**Batch 661 status:** 5 (sex part) fixed. **Batch 660 status:** fixed: 9 (Collaborating Cases built, Ctrl+Alt+F) and 14. Batch 659: 6, 7, 8, 10, 11, 12. Batch 658: 1, 2, 3, 4, 5, 13, 15. 16: designed, not built (decided Oct 23: a sweep every minute; a missed window releases late and is flagged).

# Findings while drafting the first User Guide pages (Batch 657, Oct 23, 2026)

Found by reading the screens against the code. None is changed by Batch 657; each is a decision or a defect for Pete. Pages describe the behaviour as it is today and should be updated when these are settled.

| # | Where | Finding |
|---|---|---|
| 1 | My Contribution, Quality Flags | Selecting a deficiency goes to `/deficiencies?open=…`, which is not a route, so the person lands on the sign-in screen. It should open the Quality Assurance screen. |
| 2 | Search | The role-on-case labels (`searchPage.pathologistRole`) are scrambled in English: signed out reads "Delegated to", resident reads "Countersigner", countersigner reads "Signed out", delegated to reads "Resident". |
| 3 | Report | The Sign Out Case button appears only once every synoptic report on the case is finalized, and nothing found moves an Orchestration case's reports to finalized. Check that Orchestration sign-out can be reached. |
| 4 | Report | Alt+V is Full View on the report screen, so View Help does not open there; the Help button does. |
| 5 | Accession | Downtime Reason is marked required but submit is never blocked without one. Sex defaults to Female. (Sex: fixed in Batch 661, blank and required.) |
| 6 | Accession | "Open Accession" in the Lockbox overnight folder opens a blank form (no prefill). |
| 7 | Intraop Queue | The form says a frozen diagnosis can be added later from the log, but a saved specimen's card has no box for it. The merge text says it appends to Gross Description and Clinical History; the code copies the findings onto the case as intraoperative findings (shown in a labelled block since Batch 655). A manually typed case ID is not checked against real cases. Accessioners lack Intraop Queue access by default. |
| 8 | Grossing | Complete grossing checks matrix blocks and piece description, but the Grossing screen has no field for either. Cassette and label printing and the triage checklist are on the report's Material tab, not the Grossing screen. The hotkey list names Next Block and Previous Block, with no handler found. |
| 9 | Worklist | "Collaborating Cases" (Ctrl+Alt+F, formerly "Filter My Cases") has no tile or filter. Alt+R reloads the whole page. The pool claim window falls back to the pool name "MFT Pool". The page has audit logging wired up but never calls it. |
| 10 | Search | A click on a result opens the case at once, so Reassign Patient is reachable only by keyboard selection. Quick Links are hard-coded examples, and the Systems links go to "#". Alt+L (load saved search) has no handler. |
| 11 | Tumor Board | A refused Claim or scheduling change shows no message and the row reverts; the "locked" and "not eligible" messages appear only in the Flag for MDT window on the report. |
| 12 | Quality | When a change comes back "not saved" the window closes and what was typed is lost. Management Review submission has no permission check or "not saved" handling in the page. |
| 13 | My Contribution | The subtitle always reads "Pathologist". Productivity > Peer Comparison uses a different rule from the Overview "Peer avg" (all other active pathologists, no minimum of three). AI Contribution is demonstration data. |
| 14 | Bench Contributions | Daily accessioning is calculated but not charted. The subtitle says "your own" but Queue Aging and Stage-to-Stage TAT are laboratory-wide. |
| 15 | Pathology Workspace | Seven tiles, not six (Margin Exception Review). Tile names differ from the page titles they open. |
| 16 | Report | The release countdown runs only in the open browser window: nothing releases a case nobody has open (the serverless direction, CLAUDE.md rule 11, already covers this). **Batch 658:** the stored due time already existed; the server job is designed in `docs/architecture/RELEASE_SWEEP_SERVER_JOB.md` and is not built. Decided Oct 23: a sweep every minute; a missed window releases late and is flagged. |
