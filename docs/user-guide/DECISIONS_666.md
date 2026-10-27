# User Guide findings: what I recommend you decide (Batch 666)

The eight `FINDINGS_666_*.md` files hold 126 things the guide writers found by reading each screen against the code. Nothing in the application was changed for them. The guide describes today's behaviour and says so where a screen falls short. This sheet sorts them so you can rule quickly. References are file and number, for example **ws-9** = FINDINGS_666_workstations.md, finding 9.

Reply per group, for example "A: fix all except ws-16" or "B: access-2 yes, ops-6 no".

## A. Defects I recommend fixing (a screen does something its own text or the safety logic says it should not)

Patient-safety or traceability first:

- **ws-17** Resolve and Dismiss on Margin Exception Review write no audit entry, and resolved items are listed nowhere.
- **ws-16** Resolve and Dismiss do not re-run the tumor board rules, so a recorded margin flags a case only at the next rules run. Nothing on screen says so.
- **ws-8, ws-11** Embedding, Slide Distribution and Add-On Orders show a change as saved when the save failed (console only). Microtomy already retries and says "Not saved".
- **ws-10** Embedding: a discrepancy flag does not stop Confirm, cannot be cleared, and shows a user ID instead of a name.
- **ws-4** Microtomy print refusals and printer failures show no message on two buttons.
- **everyday-17** Cancelling the Flag Manager leaves audit entries for flag changes that were never saved.
- **everyday-22** "Apply STAT Flag" (Alt+S) only opens the Flag Manager; it does not apply STAT.
- **access-11** An External Consult Draft shows the same "recorded and returned" confirmation as a Signed opinion.
- **access-1** Audit Log footer prints fixed claims "SYSTEMS OPERATIONAL" and "HIPAA Compliant". They are not checks. I recommend removing or replacing them before any customer demonstration.

Workflow bugs:

- **ws-2** Microtomy decant: slide comment and Reprint reason do nothing.
- **ws-5** Accept suggestion adds the same slides every press.
- **ws-14** Slide Distribution replacement label ignores the configured label layout.
- **mol-3** Every Positive press on the standalone Order Queue fires another reflex order.
- **mol-6** Dispatch leaves the batch Draft, so the Active tab fills only from seed data.
- **mol-7** Dispatch uses a plain web call that fails in a deployed demo.
- **mol-9** Clone & Supersede strands in-house orders and leaves only Cancel.
- **mol-10** Control Lot Number sets a one-letter control id; expected value always NEGATIVE; expiry not kept.
- **mol-14** Control rules: Edit allows a duplicate assay; a rule with no controls saves; no reason recorded.
- **batch-1** Rescanning a Matched item flashes red "Unexpected".
- **batch-4** Disposal queue and scan check can disagree on an item's last location.
- **everyday-1, everyday-3** Messaging: own sent messages show unread; a reply overwrites the body.
- **ops-2** Dead-lettered state cannot occur (nothing sets it). Either build it or remove the tile.
- **ops-14, ops-15** OR Suite: Stop demo leaves four demo entries in real intraoperative data; a failed dismissal log is silent.
- **access-12** Critical Alert "Viewed n times" lags by one.

## B. Decisions only you can make (intent, not defects)

- **access-2 / ops-6** Who opens the Audit Log and Outbound Queue by default. Lab Director and QA Reviewer cannot open the Outbound Queue; a Pathologist cannot open the Audit Log.
- **access-5** Migration Jobs has no tile or menu; only the typed address.
- **access-11** External Consult page shows patient name and date of birth to anyone holding the link.
- **ws-9** Should Embedding's Observed count start empty? (Today one click records "no discrepancy".)
- **ws-3** Block exhausted e-mail goes to nobody if the slide had no ordering pathologist, and the pathologist has no screen to answer.
- **ws-1** Back on the three stations goes to Worklist, not the Pathology Workspace.
- **ws-21 / cyt-7 / mol-5** Names differ between tile, title and breadcrumb (Workspace vs Workstation vs Workcenter, Cytology Worklist vs Workspace).
- **mol-1, mol-2, mol-4, mol-12** Control Rules gated by the Molecular permission; two things called "Molecular Order Queue"; outbound order never reaching the in-house engine; Auto-fill and controls-only plates.
- **cyt-2** Cytology QC opens for someone with only the supervisor-bypass permission.
- **everyday-15** Personal macros live in Configuration, which pathologists cannot open by default.
- **everyday-13, everyday-14** No personal signature or theme setting; compact header and editor mode are per browser.
- **ops-7** Anyone who can open Registry Exceptions can raise a CAPA.
- **report-6** Synoptic protocols read as CAP/RCPath but are generic placeholders. Say so on screen?
- **Hotkeys** rulings 13 to 17 in `docs/product/HOTKEY_DECISIONS.md`.

## C. Wording and translation clean-ups (safe; I can do on your word)

- Developer-note wording on screen: **batch-6** ("A real, computed list...", "Computing the real, current queue...").
- **batch-5** Disposal subtitle says blocks and slides but includes wet tissue.
- Text stuck in English in every language: **cyt-3, mol-3, mol-7, mol-9, ops-11, report-9, ws-10, batch-2, ops-10** (tier code PAD/FAD).
- Unused text to delete: **ops-1, ops-12**.
- **mol-3** raw codes (`already-applied`) shown to the user.
- **everyday-25** the language list shows eight entries; machine-translated languages need native review.

## D. Recorded in the guide only (no action unless you want it)

Everything else, including stubs that are labelled Simulated (secure email, SMS, EHR push), demonstration-only pages, dead code with no visible effect (**access-7, batch-7, batch-11, everyday-18**), and features not yet built (**cyt-4, cyt-10, report-10, report-11, ws-13, ws-18**).

## Already fixed this session

Report article corrections (report-1 to report-3, report-5), the Surgical QA description in the Worklist article (cyt-1), and the hotkey documentation for Add Collaborator and Collaborating Cases.
