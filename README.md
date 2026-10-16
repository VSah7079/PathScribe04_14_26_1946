

## Batch 580 — Styled dropdown lists

In Chrome and Edge, every dropdown's open list is a styled panel, and dropdowns keep their usual width. Firefox and Safari keep the dark list until they support it. See `src/i18n/README.md`.

## Batch 579 — Template reviewer screen; billing codes saved

A guide for template reviewers, dark question comments, Reset away from Approve (PS-63). A specimen's billing codes and the Sequencer's order are saved the moment they're made. See `src/i18n/README.md`.

## Batch 578 — Workload cap screen follow-ups

A cap that isn't saved is said beside its own field, and the add pickers offer only facilities and people without an override. See `src/i18n/README.md`.

## Batch 577 — "Use their version" without a reload

The Edit Conflict dialog's "Use their version" shows the other person's save in place. After taking up their version, the page's lists and the synoptic form are read again (correcting Batch 575, whose form kept the old answers). "Who else has it open" sits in the tab bar and no longer moves the page. See `src/i18n/README.md`.

## Batch 576 — Follow-ups

Cytology workload caps can no longer be set above CLIA's 100 slides (or to nothing), and a person's own cap needs the same permission as the others. "Editing" in who-else-has-the-case-open now shows as soon as someone edits. See `src/i18n/README.md`.

## Batch 575 — "Show their changes" without losing your work

When someone else saves a case you have open, **Show their changes** now brings their changes in without reloading the page, and keeps what you haven't saved on top; where you both changed the same thing, your next save asks which to keep. See `src/i18n/README.md`.

## Batch 574 — Cytology workload counter; night shifts on the right day

Cytotechnologists now see, before they reach it, how much of their workload limit is left. Night shifts can sign off both days they worked, and a lab can start its screening day at, say, 6 am. **Correction:** editing a saved cytology review had counted its slide again toward the limit; it no longer does. See `src/i18n/README.md`.

## Batch 573 — Who else has the case open

The case report now shows who else has the same case open, whether they are editing, and how to reach them, so two people can talk before their saves collide. It works between windows of one browser in the demo, and between users once the server's live hub is in place (phase 2e). See `src/i18n/README.md`.

## Batch 572 — "Someone else saved this case"; screening hours signed off daily

When someone else saves a case you have open, the report tells you at once instead of refusing your next save. Cytology screeners confirm their screening hours at the end of each day (the server will record screening time with its own clock; the browser's timer is not trusted, readiness finding F7), and the supervisor's workload report flags corrections. **Correction:** the cytology workload limit had risen above a person's assigned cap for days longer than 8 hours; it no longer does. See `src/i18n/README.md`.

## Batch 571 — Live updates: one general event (decision recorded)

Open screens will hear about changes through one general event that names only what changed; each screen then re-reads what the user may see. Decided by Pete on Oct 14, 2026, and recorded in the server contracts. See `src/i18n/README.md`.

## Batch 570 — Focus kept after deleting a saved search; deployment readiness brought up to date

Deleting a saved search or query from the keyboard keeps your place. The deployment readiness review (`docs/architecture/DEPLOYMENT_READINESS_REVIEW.md`) now opens with where every item stands: the browser side is done, and the server side (phase 2e) is what remains before any production deployment. A manual screen reader test plan for the QC team is ready. See `src/i18n/README.md`.

## Batch 569 — Keyboard focus kept after a delete; a wider automatic check (WCAG 2.1 AA)

Deleting a message from the keyboard moves focus to the next message instead of losing it. The automatic check now also covers hand-made buttons, and found and fixed three more spots (saved-search chips and a dot on the case report). See `src/i18n/README.md`.

## Batch 568 — Every screen checked for controls inside controls (WCAG 2.1 AA)

The last five places where a clickable row held its own buttons are fixed (terminology alerts, protocol upload, the screenshot view, the template builder, the Contribution teaching tile), and an automatic check now covers every screen. See `src/i18n/README.md`.

## Batch 567 — The inbox and the report editor's windows work properly with screen readers (WCAG 2.1 AA)

In the inbox, the add code, delegate and protocol change windows, billing review and the sequencer, each item now opens or applies from a real button, so keyboard and screen-reader users reach it and its own buttons separately; clicking the row still works. See `src/i18n/README.md`.

## Batch 566 — Cytology rows and view tiles work properly with screen readers (WCAG 2.1 AA)

On the Cytology worklist, each case's name is now the button that opens it, so keyboard and screen-reader users reach the case and the row's own buttons separately; clicking the row still works. The Worklist's LIS / Outreach tiles and Batch Management's stage tiles say which one is on. Checked in a real browser. See `src/i18n/README.md`.

## Batch 565 — Easier-to-read text everywhere else (WCAG 2.1 AA)

The rest of PathScribe's faint grey text, the filter tiles when selected, chart labels and a few coloured labels now meet WCAG 2.1 AA, and selected tiles are announced to screen readers. Checked in a real browser. See `src/i18n/README.md`.

## Batch 564 — Easier-to-read text across PathScribe (WCAG 2.1 AA)

Every main screen was opened in a real browser and checked for accessibility. The only problem found was faint grey text (and a few coloured labels) on 13 screens; it is now readable to the WCAG 2.1 AA standard. Also fixed: an old grossing link opened the report editor instead of grossing. See `src/i18n/README.md`.

## Batch 563 — Accessibility check of the connection banner and loading states (PS-622)

Checked in a real browser: the "Offline"/"Reconnected" banner and the loading messages behave as designed for keyboard and screen-reader users, and three newer screens pass accessibility checks. Fixed on the way: "still loading" could vanish and reappear when PathScribe first opens, and the Audit Log tabs' text was too faint. Still for a person: listening with NVDA or VoiceOver. See `src/i18n/README.md`.

## Batch 562 — The Molecular Order Queue updates as results come in (PS-539 phase 2d)

With the PathScribe server's live updates, the Molecular Order Queue shows instrument and reference-lab results and other technologists' changes as they happen, and the Print Queue's site agent line follows every site. Two items of the deployment readiness review are closed. See `src/i18n/README.md`.

## Batch 561 — Tidy-up of Batches 559 and 560 (PS-539 phase 2d)

Small timing fixes for the screens that update live, the tests that Batches 559 and 560 left open, and a correction: a held result message doesn't wait forever; the rule for the server is now written down. See `src/i18n/README.md`.

## Batch 560 — Screens updated as things change (PS-539 phase 2d)

With the PathScribe server's live updates, the inbox, Facility Ops, held reports, the Engraver Monitor, the registry exceptions badge, Site agents and Interfaces → Engines change as soon as something happens, instead of every 5 to 60 seconds. Without them (the demo, or a password session) they refresh as before. Browser side built; the server side is phase 2e. See `src/i18n/README.md`.

## Batch 559 — Live updates for the screens that refresh on a timer: the contract (PS-539 phase 2d)

The way the PathScribe server will tell the inbox, Facility Ops, held reports, the engravers, the registry exceptions badge, site agents and interface engines that something changed, so they update at once instead of every 5 to 60 seconds. Browser side built; the screens switch over in Batch 560, and the server side is phase 2e. Also closes Batch 558's two open items. See `src/i18n/README.md`.

## Batch 558 — Report versions through the API (PS-539 phase 2d)

With the PathScribe server, the signed versions of a report (Version History) are fetched from the server too, and every version's PDF is checked against its fingerprint before it is opened or sent. Browser side built; in use once the server's endpoints exist (phase 2e). See `src/i18n/README.md`.

## Batch 557 — The server's /api/config and hosting regions (PS-539 phase 2d)

The PathScribe server can give the app a few of its settings, and says where it keeps the hospital's data (database and file storage regions), which administrators now see. Sign-in and other security settings stay in the site's own config.json. See `src/i18n/README.md`.

## Batch 556 — Report documents through the API (PS-539 phase 2d)

With the PathScribe server, the reports PathScribe sent are fetched from the server, with each one's fingerprint checked again, instead of from the browser. Browser side built; in use once the server's document endpoints exist (phase 2e). See `src/i18n/README.md`.

## Batch 555 — Browser stand-ins for server jobs (PS-539 phase 2d)

The background work the browser does today in place of the server (retrying deliveries, releasing held reports, sending follow-up alerts and similar) moves to the server job by job. A deployment setting, `VITE_SERVER_JOBS`, says which jobs its server runs, so nothing is done twice and nothing is left undone. See `src/i18n/README.md`.

## Batch 554 — Interface monitoring (PS-539 phase 2d)

Administrators see each hospital's interface engine (its listeners, queues and failed messages) in Audit Log → Interfaces → Engines, with a status line above the Interfaces view. The browser side is built. It comes into use once the engines' heartbeat and the server's endpoint exist (phase 2e). See `src/i18n/README.md`.

## Batch 553 — Site agent printers in routing (PS-539 phase 2d)

Print routing rules, a facility's default printer and Redirect choose a lab's printer by name through its site agent, instead of an IP address, and a report always prints at its own lab. Browser side built; printing through the agent once the agent and the server's endpoints exist (phase 2e). See `src/i18n/README.md`.

## Batch 552 — Site agent screens (PS-539 phase 2d)

Administrators can enrol, see and revoke a performing lab's site agents, and set up its agent printers and file shares (Configuration → System → Site agents). The browser side is built. It comes into use once the agent and the server's endpoints exist (phase 2e). See `src/i18n/README.md`.

## Batch 551 — Server jobs view (PS-539 phase 2d)

Administrators can see the server's background jobs and requeue a failed one (System Logs → Server jobs). Browser side built; in use once the server's `/api/jobs` endpoints exist (phase 2e). See `src/i18n/README.md`.

## Batch 550 — Exports through the server (PS-539 phase 2d, D7)

The browser side of "request it, get notified, download it" is built. Every export button goes through one export service, with a notice and a My exports page. It is in use once the server's export endpoints exist (phase 2e); the demo is unchanged. See `src/i18n/README.md`.

## Batch 549 — Open items carried over (PS-539 phase 2d)

Every open item from Batches 537–548 that can be finished in code here is finished. Those include loading states on every screen, the immediate reconnect, preloading the app's code, https-only logos and imaging addresses, findings F1 and F10, the Assist sign-out time, and report document storage. What's left needs sign-in, the API server, staging or native review. It is listed in PS-539. See `src/i18n/README.md`.

## Batch 548 — Connection banner and waiting states (PS-539 phase 2d)

- A banner below the top bar when the connection drops, then "Connection restored" (`components/Connectivity/`).
- Screens show a placeholder only after 300 ms, and "still working" after 3 s (`components/Common/LoadingState.tsx`, `PageLoader.tsx`).
- **Xray:** PS-621, PS-622.

## Batch 547 — Runtime configuration: one build for every deployment (PS-539 phase 2d)

- Each deployment's settings come from its `config.json` at start-up (`services/runtimeConfig/`, `docs/architecture/RUNTIME_CONFIG.md`).
- One server build (`npm run build:server`) serves every site, with no demo accounts or tools.
- A wrong config.json stops start-up with a clear screen.
- **Xray:** PS-617, PS-618.

## Batch 546 — Site agent contract (D3); F3 and F4 fixed (PS-539)

- `docs/architecture/SITE_AGENT_API.md` and `services/siteAgent/siteAgentContract.ts` (new): the site agent contract for printers and file shares.
- A network report print from the browser fails cleanly and goes straight to the fallback (F3). The CSP allows the workstation print bridges (F4).
- **Xray:** PS-614, PS-615.

## Batch 545 — Interface engine edge contract (D6), F10 fixed (PS-539)

- `docs/architecture/INTERFACE_ENGINE_EDGE.md` and `services/interfaceEngine/engineEdgeContract.ts` (new): the BridgeLink ↔ API contract, hosted or on site.
- Engine webhooks no longer lose an event that arrives before its case (F10).
- **Xray:** PS-612, PS-613.

## Batch 544 — Images and attachments are links only; single-facility QA exports (PS-539)

- PathScribe stores no image or attachment files, only links (`BLOB_STORAGE_API.md` rewritten); the staff signature is now an https link.
- Six more QA reports can be filtered and exported for one facility (`services/qualityAssurance/qaScopeRows.ts`, `hooks/useQaCaseScope.ts`).
- **Xray:** PS-609, PS-610.

## Batch 543 — CSV formula injection fixed, disposal export audited, file storage contract (PS-539)

- Every CSV export neutralizes formula cells (F8, `utils/csv.ts`); the disposal report export is audited (F9).
- `docs/architecture/BLOB_STORAGE_API.md` (new): file storage contract.
- **Xray:** PS-604, PS-605.

## Batch 542 — Phase 2c contracts (PS-539)

- `docs/architecture/MESSAGE_BUS_API.md` (jobs and events in SQL Server, decision D1) and `docs/architecture/ASYNC_EXPORT_API.md` with `src/services/exports/asyncExportContract.ts` (request, notify, download, decision D7).
- New findings: F8 (CSV formula injection in browser exports) and F9 (disposal export not audited), not fixed.
- **Xray:** PS-602, PS-603.

## Batch 541 — Hosting decisions recorded (PS-539 phase 2b)

- Pete's decisions D1 and D3–D7 (Oct 13) recorded in `docs/architecture/DEPLOYMENT_READINESS_REVIEW.md` §13, each with his verification check. Next: the phase 2c contracts.
- **Xray:** PS-600, PS-601.

## Batch 540 — No correction or addendum during the release delay (PS-539)

- While a report is in its release delay, a correction or addendum can't be started (surgical, Assist, cytology); recall it instead (`services/reportRelease/revisionDuringDelay.ts`).
- A released PDF never carries the "pending release" watermark.
- **Xray:** PS-591, PS-592.

## Batch 539 — Cytology report PDFs from the report renderer (PS-539 D2)

- Every cytology PDF (sign-out, case report, correction, addendum, preliminary, print preview) is made by the report renderer (`functions/cytology_report.py`); the browser composes the lines (`services/cytology/cytologyRenderPayload.ts`). Preview and release match except the preview's PRELIMINARY watermark.
- Print case report on a released case opens the stored document.
- The jsPDF renderer is removed. **`functions/` must be redeployed** before using this zip.
- **Xray:** PS-589, PS-590.

## Batch 538 — One stored report document per release (PS-539 D2)

- Every released report is rendered once and stored with its SHA-256 (`services/reportDocuments/`). The result message, cytology and Assist messages, print, fax, file drop, fallbacks and their retries send that stored file.
- Fixes: a correction's fax retry sent the original sign-out; a preliminary's fax retry never went; the cytology message drew its own PDF.
- Print preview uses the release's payload; only the watermark differs.
- Version History → Released documents, with **View as sent**.
- Contract for the server: `docs/architecture/REPORT_DOCUMENT_STORE_API.md`. Cytology server rendering is next.
- **Xray:** PS-587, PS-588.

## Batch 537 — Deployment readiness review (PS-539)

- `docs/architecture/DEPLOYMENT_READINESS_REVIEW.md`, a cloud-agnostic review of how PathScribe is hosted:
  - each server part rated (serverless, always-on or on-site);
  - the 1-second refresh budget;
  - the hosting rules by market;
  - the changes ranked;
  - Pete's decisions D1 to D7;
  - seven findings in the code.
- **Xray:** PS-585, PS-586.

Details in [src/i18n/README.md](src/i18n/README.md). Full suite: 1,115 files: 1,110 pass, 4 skipped, 1 fails (`firestore.rules.test.ts`, emulator, unrelated); 9,416 tests pass, 32 skipped (+3).
