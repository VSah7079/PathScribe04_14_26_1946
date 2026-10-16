

## Batch 580 — Styled dropdown list (PS-62)

`utils/selectAutoWidth.ts` and the base-select rules in `pathscribe.css`. See `i18n/README.md`.

## Batch 579 — Reviewer screen (PS-63); specimen billing codes and Sequencer saved at once

`services/templates/templateReviewWork.ts` comments, `services/reportEditing/reportSequence.ts`. See `i18n/README.md`.

## Batch 578 — Cap errors beside their field; add pickers without existing overrides

The workload cap screen's errors and pickers; a clock for the settings service. See `i18n/README.md`.

## Batch 577 — "Use their version" in place; lists and form read again

`services/cases/caseWrite.ts` `takeTheirVersion` and `selectionAfterTakeUp`; the report page re-reads its lists and synoptic answers after taking up a version; presence in the tab bar. See `i18n/README.md`.

## Batch 576 — Caps checked; "editing" follows the person's edits

Cytology workload caps are 1–100 whole slides everywhere; presence's "editing" and the unsaved-changes warning follow the person's own edits; theme colours for recent notices; a test clock for the sign-off service. See `i18n/README.md`.

## Batch 575 — "Show their changes" in place

The case report's "someone else saved this case" notice takes the newer case up in place, keeping unsaved work (`services/cases/caseWrite.ts` `takeUpNewerCase`). See `i18n/README.md`.

## Batch 574 — Workload counter; night-shift sign-off

Cytotechnologists see their slides and what is left of their workload limit on the worklist and screening page (`services/cytology/cytologyWorkloadSummary.ts`); yesterday's hours can be signed off and the lab sets when its day starts; the report shows why hours were corrected. Correction: editing a review no longer counts its slide again. See `i18n/README.md`.

## Batch 573 — Who else has the case open

An open case report shows who else has the same case open and whether they are editing, above the tabs (`hooks/useCasePresence.ts`, `liveUpdates/casePresence.ts`); the case's support reference now comes from the API server so every user has the same one. See `i18n/README.md`.

## Batch 572 — "Someone else saved this case"; screening hours sign-off

An open case report hears of another user's save (`hooks/useCaseUpdateNotice.ts`, the `caseReport` live topic) and says so above the tabs. The Cytology worklist asks each screener to confirm or correct their day's screening hours; the workload report shows recorded and signed-off hours, and the workload limit no longer rises above the cap for days over 8 hours (a correction). See `i18n/README.md`.

## Batch 571 — Live updates: one general event, decided

Pete chose one general `DataChanged` event with topics, on `/hubs/live`, over per-screen events; recorded in the contracts. No code change. See `i18n/README.md`.

## Batch 570 — Focus after deleting a saved search; readiness review updated

Saved searches and queries keep keyboard focus after a delete, through one shared hook (`hooks/useFocusAfterRemoval.ts`) the inbox uses too; tests for the template canvas and the screenshot view; the deployment readiness review's status section. See `i18n/README.md`.

## Batch 569 — Focus after a keyboard delete; a wider source check

Focus moves to the next message after a keyboard delete in the inbox; the "no control inside another" check covers buttons and hand-made controls and reads comments with the TypeScript parser; saved-search chips and the rail's review dot fixed. See `i18n/README.md`.

## Batch 568 — No control inside another, app-wide

Terminology alerts, the protocol upload, the screenshot view, the template builder and the Contribution teaching tile fixed; the source check runs over every UI file; the Worklist's view tiles' colours come from the stylesheet. See `i18n/README.md`.

## Batch 567 — No control inside another: inbox, worklist, report editor

Message rows, the add code, delegate and protocol-change windows, billing review and the sequencer preview each open from a real button instead of being a button around other controls; a new source check (`nestedInteractive`). See `i18n/README.md`.

## Batch 566 — Rows that hold buttons; view tiles that say which is on

Cytology worklist rows open from their name (a real button) instead of being a button around buttons; the accessibility guard checks the new `clickableContainer`; the Worklist mode and Batch Management stage tiles say which is on. See `i18n/README.md`.

## Batch 565 — The rest of the faint text; other screen states

504 more stylesheet rules on dark surfaces moved off the old greys; selected tiles, a selected case and opened batches checked in the browser and fixed; chart text readable. See `i18n/README.md`.

## Batch 564 — Every screen checked for accessibility; contrast fixed

A browser check of all 38 top-level screens found faint text on 13; fixed (the "dim" grey and others in `pathscribe.css`). An old grossing link no longer opens the synoptic page. See `i18n/README.md`.

## Batch 563 — Connection banner and waiting states checked in a browser (PS-622)

Automated browser checks for the banner, the page loader and three phase 2d screens; "still loading" no longer resets on a cold start; Audit Log tab contrast fixed. See `i18n/README.md`.

## Batch 562 — The last polling screens on live updates (PS-539 phase 2d)

The Molecular Order Queue and the Print Queue's agent line follow the live-update hub; the readiness review's browser items for push and the security policy are closed. See `i18n/README.md`.

## Batch 561 — Carried items from Batches 559 and 560 (PS-539 phase 2d)

Live screens' timed reads no longer slip when the connection flaps or a read is slow; tests for Batch 559's and 560's untested paths; the server's rule for retrying a held result written down. See `i18n/README.md`.

## Batch 560 — Screens updated by the live-update hub (PS-539 phase 2d)

The inbox, Facility Ops, held reports, the Engraver Monitor, the registry exceptions badge, Site agents and Interfaces → Engines re-read when the hub says something changed, with a minute's safety poll, instead of every 5 to 60 seconds (`hooks/useLiveData.ts`). See `i18n/README.md`.

## Batch 559 — Data topics for live updates (PS-539 phase 2d)

The hub contract and client for pushing changes to the screens that re-read on a timer (one `DataChanged` event, by topic); the screens switch over in Batch 560. Also: a result message is held when its workup version can't be known, and the PDF's hash goes with every result. See `i18n/README.md`.

## Batch 558 — Report versions through the API (PS-539 phase 2d)

With the API server, signed report versions are listed from it too and their PDFs read through it; every version's PDF is checked against its SHA-256 before it is shown or sent (`services/reports/reportVersionPdf.ts`). See `i18n/README.md`.

## Batch 557 — The server's /api/config and hosting regions (PS-539 phase 2d)

With an API server, start-up also reads its `/api/config` (a few AI and voice settings, and where it keeps data), under config.json's own values; administrators see the database and file storage regions beside the AI region. `services/runtimeConfig/`. See `i18n/README.md`.

## Batch 556 — Report documents through the API (PS-539 phase 2d)

With the API server, released report documents are read through it, with their SHA-256 checked again; every reader uses one store (`services/reportDocuments/reportDocumentInstance.ts`). See `i18n/README.md`.

## Batch 555 — Browser stand-ins for server jobs (PS-539 phase 2d)

The browser's stand-ins for server jobs (delivery retries, release-delay releases, expiries, escalations, follow-up alerts, the correlation sweep) stop job by job as the deployment lists them in `VITE_SERVER_JOBS` (`services/serverJobs/browserStandIns.ts`). See `i18n/README.md`.

## Batch 554 — Interface monitoring (PS-539 phase 2d)

Audit Log → Interfaces → Engines: each hospital's interface engine, its listeners and channels, what is waiting and what failed, problems first, with a status line above the Interfaces sub-tabs (`interface:engine-status:view`, Admin). `services/interfaceMonitoring/`, `pages/InterfaceEnginesSection.tsx`. See `i18n/README.md`.

## Batch 553 — Site agent printers in routing (PS-539 phase 2d)

Routing rules, a facility's default printer and Print Queue Redirect pick one of a lab's site agent printers by name (`services/printRouting/printDestinationRules.ts`, `components/Printing/PrintDestinationFields.tsx`); a report prints only at the lab that performed it. Site agents: quick-pick revoke reasons, the update window, the pickup hand-over picklist. See `i18n/README.md`.

## Batch 552 — Site agent screens (PS-539 phase 2d)

Configuration → System → Site agents:
- the performing lab's agents and their status;
- one-time enrolment codes;
- revoking;
- the lab's agent printers and file shares (`config:site-agents:enroll`, `config:site-agent-config:manage`; Admin, Lab Director).

The Print Queue shows "Sent to printer" and the agents' status. `services/siteAgent/`. See `i18n/README.md`.

## Batch 551 — Server jobs view (PS-539 phase 2d)

System Logs → Server jobs: the API server's job kinds, recurring jobs and dead-lettered jobs, with one-click requeue (`jobs:server-job:view`, `jobs:server-job:requeue`, Admin). `services/serverJobs/`, `services/apiServer/`. See `i18n/README.md`.

## Batch 550 — Exports through the server (PS-539 phase 2d, D7)

Every export button goes through one export service (`services/exports/`). With the API server, a quick export downloads at once, a long one shows a notice with Download, and My exports (top bar, `/my-exports`) lists the user's exports. The demo builds exports in the browser as before. `ExportStatus` hub event; notices cleared at sign-out. See `i18n/README.md`.

## Batch 549 — Open items carried over (PS-539 phase 2d)

Every remaining loading text through `LoadingState`. The hub reconnects as soon as the network returns. The app's code is preloaded while `config.json` is read. Logos and the imaging vendor's address must be https links (editors and services). F1 dead hook and `jspdf` removed. Assist results carry the sign-out time. One storage entry per report document. F10 fixed for the last two engine webhooks. Translated "needs the site agent" print reason. Organisation-scoped QA export check tried and taken out (PS-610). See `i18n/README.md`.

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

Details in i18n/README.md. Full suite: 1,115 files: 1,110 pass, 4 skipped, 1 fails (`firestore.rules.test.ts`, emulator, unrelated); 9,416 tests pass, 32 skipped (+3).

## Batch 554 (PS-539 phase 2d: interface monitoring)

- Batch 554: interface monitoring (`services/interfaceMonitoring/`, `pages/InterfaceEnginesSection.tsx`, `components/Interfaces/`).

## Batch 555 (PS-539 phase 2d: browser stand-ins for server jobs)

- Batch 555: the browser's stand-ins for server jobs stop job by job as the server takes them (`services/serverJobs/browserStandIns.ts`, `VITE_SERVER_JOBS`).

## Batch 556 (PS-539 phase 2d: report documents through the API)

- Batch 556: released report documents are read through the API server when there is one (`services/reportDocuments/`).

## Batch 557 (PS-539 phase 2d: /api/config and hosting regions)

- Batch 557: `main.tsx` reads the API server's `/api/config` after config.json (`services/runtimeConfig/`), and keeps its hosting regions for administrators.

## Batch 558 (PS-539 phase 2d: report versions through the API)

- Batch 558: signed report versions and their PDFs are read through the API server when there is one (`services/reports/`).

## Batch 559 (PS-539 phase 2d: data topics; Batch 558's open items)

- Batch 559: `services/liveUpdates/` data topics; `services/reports/` result holds and PDF hashes.

## Batch 560 (PS-539 phase 2d: push instead of polling)

- Batch 560: `hooks/useLiveData.ts`; seven screens updated by the live-update hub instead of a timer.

## Batch 561 (PS-539 phase 2d)

- Batch 561: `hooks/useLiveData.ts` timing; tests carried from Batches 559 and 560.

## Batch 562 (PS-539 phase 2d)

- Batch 562: the Molecular Order Queue and the Print Queue's agent line on live updates.

## Batch 563 (PS-622)

- Batch 563: one waiting clock for the page loaders; Audit Log tab contrast (`pathscribe.css`).

## Batch 564 (WCAG 2.1 AA)

- Batch 564: `pathscribe.css` contrast fixes; `loaders/synopticLoader.ts` (`grossingLoader`); `SignedInApp.tsx` uses it.

## Batch 565 (WCAG 2.1 AA)

- Batch 565: `pathscribe.css` (504 rules to `--ps-text-dim`; tile labels; case id); `utils/chartTheme.ts`; `aria-pressed` on filter tiles; cytology pool rows.
