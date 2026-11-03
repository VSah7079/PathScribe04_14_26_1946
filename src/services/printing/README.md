**Batch 734:** `directDevicePrinting.ts` — `directPrintDecision(bridge, demo, facilityAllows)` and `checkDirectDevicePrint(printer, document, deps)`: direct bridges (QZ Tray, PathScribe agent, Zebra Browser Print, BarTender) are allowed in the demo, and in a server deployment only for a facility that allows them; each is audited ("Direct Device Print" / "Direct Device Print Blocked"). `directDevicePrintingDeps.ts` wires the app's services. `attemptPrintDelivery` checks it on the QZ Tray branch (a refused job fails with PRINT_REJECTED, not retried).

# services/printing/

Component B of the "Decoupled Dispatch & Print Management System" spec — the Print Queue Engine. All three real delivery modes the source spec (and PS-278) describe, gated by Component C (`services/delivery/`) and running as a genuinely concurrent second subscriber to `services/reports/publishReportReleasedEvent.ts`, alongside electronic dispatch.

**Pattern:** standard interface/mock pattern for the queue (`IPrintQueueService`/`mockPrintQueueService`), mirroring `services/reports/mockOutboundResultQueueService.ts`'s own already-proven queue/retry/error-code shape rather than inventing a new one.

## What's real and built

- **`types/printing/PrintJob.ts`** — the queue entry shape. `PrintDeliveryMode` is exactly the source spec's own two modes:
  - `NATIVE_QZ_TRAY` (Mode 1, Native Spooler) — routes the rendered PDF directly to a printer via the same, already-integrated QZ Tray bridge (`utils/labels/qzTrayBridge.ts`) this app already uses for cassette/slide labels, extended here with a real PDF print path (`printPdfViaQzTray`) alongside its existing raw-ZPL one. Checked directly against QZ Tray's own real, installed type definitions (`@types/qz-tray`) before building this — the correct real shape is `{type: 'pixel', format: 'pdf', flavor: 'base64', data}`, not a guessed one.
  - `INTERFACE_ENGINE_HANDOFF` (Mode 2) — hands the rendered PDF off via `services/interfaceDispatch/dispatchInterfaceMessage.ts`'s own, already-generic dispatch (`'PRINT_JOB'` added to `InterfaceTransactionType`), letting the Interface Engine's own real printer-spooling middleware take over from there. This is also the real, correct home for PS-278 §2.1.3's own "print-server abstraction" option — see `types/printRouting/PrintDestination.ts`'s own header for why that's already exactly this, not a gap.
  - `DIRECT_NETWORK_PRINT` (Mode 3, **new, PS-278**) — no QZ Tray, no Interface Engine: a printer is resolved via `services/printRouting/resolvePrintDestination.ts`'s own real, four-tier hierarchy (workstation → location → clientAccount → facility, falling back to `Facility.printDeliveryConfig.directNetworkPrintDestination` only when no real `PrintRoutingRule` matched at any tier), then reached directly over one of the three real IP protocols §2.1.3 names (`services/printing/transport/`). *Batch 553:* the destination may instead be a **site agent printer** (`{ agentPrinter: { siteId, destinationId } }`), which the API server hands to the site's agent (`SITE_AGENT_API.md` §3); nothing here sends to one, so such a job fails at once with "needs the site agent" outside the server. See `services/printRouting/README.md` for the full, real routing-engine account.
  - `PaperSize` (`'LETTER' | 'A4' | 'LEGAL'`) — a facility-level setting (`Facility.printDeliveryConfig.paperSize`, `services/facilities/IFacilityService.ts`), since which paper a printer is loaded with is a property of the site, not any one report. Defaults to `LETTER` (this app's own existing US-market default) when unset — never silently assumed `A4` for a site that never configured it. Real, accurate mm dimensions (`PAPER_SIZE_DIMENSIONS_MM`), passed through to QZ Tray's own real `size`/`units` config. Not consulted by Mode 3, which prints raw/protocol-level bytes with no paper-size negotiation of its own.
- **`IPrintQueueService.ts` / `mockPrintQueueService.ts`** — the real, persisted queue: enqueue, retry, mark-failed (with a real, permanent audit log entry the moment a failure happens, same posture `services/reports/mockOutboundResultQueueService.ts` already established), mark-printed.
- **`dispatchPrintJob.ts`** — the real function tying it together. Resolves a facility's `printDeliveryConfig`; a facility that never configured print is a real, honest `not_configured` outcome, never a surprise print job. Routes to whichever mode the facility chose, and fails a job honestly (`PRINTER_OFFLINE`, `PRINTER_UNREACHABLE`, `PRINT_REJECTED`) rather than throwing — per the source spec's own Use Case 2 ("holds the job, alerts the administrator, re-attempts... without blocking the electronic HL7 interface"). Real, honest requirement: needs a `generatePdf` callback from its own caller, since the actual PDF-rendering function lives inside `pages/SynopticReportPage/SynopticReportPage.tsx`'s own React closure (`generateReportPdfSnapshot`) — this file has no way to reach it on its own, same real structural limit `services/reports/buildOruR01Payload.ts`'s own identical parameter already documents. A caller with no real access to one fails the print job honestly rather than queuing one with nothing to ever print. 18 tests covering every real branch of all three modes.
- **`transport/`** (**new, PS-278 §2.1.3**) — `sendRawPrintJob.ts` (RAW/9100), `sendLprPrintJob.ts` (LPR/LPD, RFC 1179), `sendIppPrintJob.ts` (IPP, RFC 8010) and `dispatchViaPrintProtocol.ts` (the one, real dispatch point picking among them). Real, correct, unit-tested wire-protocol clients — RAW/9100 and LPR/LPD tested byte-for-byte against a real, local TCP mock server; IPP's own binary attribute encoding tested for real self-consistency (a decoder independently re-derived in its own test confirms the exact bytes sent), though — same honest posture this app's own PDF/A veraPDF-validation attempt already established — that is self-consistency, not independently verified interoperability against a real CUPS instance or physical printer, which this sandbox has no way to reach. See "Real, remaining gaps" below for the one, real, important execution-context caveat all three carry. **PS-279 §2.2.4** added an optional `presentation` (`{paperSource, duplexMode}`) parameter, carried all the way to `sendIppPrintJob.ts`, which encodes it as a real IPP job-template attribute group (`sides`/`media-source`, RFC 8011 keyword values) — RAW_9100/LPR_LPD have no real protocol-level attribute channel to carry it at all, disclosed rather than faked.

## PS-279 — Print Queue Management Dashboard & Batch Operations

- **`attemptPrintDelivery.ts`** (**new**) — the real Mode 1/2/3 delivery-attempt branching, extracted verbatim out of `dispatchPrintJob.ts` so a second real caller (`redispatchPrintJob.ts`) can reuse it without duplicating the branching a second time. `dispatchPrintJob.ts` itself now only ever handles what's genuinely first-dispatch-only: resolving config, routing context, presentation options, and the destination (Mode 3), then enqueuing — the actual attempt is this file's job either way.
- **`resolvePrintPresentationOptions.ts`** (**new, §2.2.4**) — pure resolver: `PrintJobReportType` → a real default `{paperSource, duplexMode}` (FINAL/CORRECTED: Tray 1 letterhead + duplex; ADDENDUM: Tray 1 + simplex; PRELIMINARY: Tray 2 plain + simplex), overridden per-field by the ORDERING facility's own, new `Facility.printPresentationPreference` (`services/facilities/IFacilityService.ts`) — deliberately a different real facility record than the PERFORMING facility's own `printDeliveryConfig`, since paper/duplex is a client preference about how ITS OWN reports look, not a property of the printer. Resolved once, unconditionally, at `dispatchPrintJob.ts`'s own enqueue time (every mode, not just Direct Network Print) and persisted onto `PrintJob.paperSource`/`duplexMode` for the dashboard's own real display and for a later Retry to resend identically.
- **`types/printing/PrintBatch.ts` + `aggregatePrintJobsForBatch.ts`** (**new, §2.2.2**) — pure grouping: real, `QUEUED`, non-interfaced jobs (`NATIVE_QZ_TRAY`/`DIRECT_NETWORK_PRINT` by default, overridable) whose `queuedAt` falls in a given `HH:mm`–`HH:mm` window are grouped by `orderingFacilityId` ("client account") or `pointOfCare` ("delivery route" — this app has no distinct, named delivery-route registry, so `Location.pointOfCare`, the same real field `resolvePrintDestination.ts`'s own `location` tier already resolves against, is reused honestly rather than inventing a new entity). **Honest scope, stated up front**: "one consolidated job" here means every job in a group shares one real `batchId`, is listed and dispatched together as one admin action — never a byte-merged PDF document (this app's queue never persists more than one job's own rendered bytes at rest as a matter of general architecture; merging several real PDFs into one physical document is real, separate, disclosed future work this ticket doesn't ask for). Window boundaries are evaluated in **UTC**, not the runtime's own local timezone — deliberate, since every real `queuedAt` this app stores is UTC (`toISOString()`) and this app has no per-facility timezone field yet to convert a genuine site-local workday against; using `Date.getHours()` instead was caught and fixed as a real, host-timezone-dependent bug before this shipped (see `isWithinWindow`'s own doc comment).
- **`runScheduledBatchAggregation.ts`** (**new, §2.2.2**) — the real, thin, on-demand orchestration ("Run Batch Now" on the dashboard) that fetches real `QUEUED` jobs, hands them to `aggregatePrintJobsForBatch`, and tags every resulting group's jobs with its `batchId` via the queue service. **Honest, disclosed scope**: this app has no real cron/scheduler infrastructure anywhere — confirmed directly before building this — so this is admin-triggered, not a true background timer; a real, future scheduler would call this exact same function.
- **`IPrintQueueService.ts` / `mockPrintQueueService.ts`** (**extended, §2.2.3**) — `getById`, `persistRenderedPdf` (data-only, deliberately not audit-logged — it's part of the one real dispatch attempt that already gets its own audit record), `holdPrintJob`/`releaseHold`/`cancelPrintJob`/`redirectPrintJob` (each with the same real `auditService.logEvent` convention the four original methods established) plus real, sequential (never `Promise.all`'d) bulk variants (`holdMany`/`releaseHoldMany`/`cancelMany`) and `tagBatch`. Real business rules enforced in exactly one place: only `QUEUED`/`PRINTING`/`FAILED` can be held; `QUEUED`/`PRINTING`/`FAILED`/`HOLD` can be cancelled; an already-`PRINTED` or `CANCELLED` job can do neither. `releaseHold` restores the real, exact status recorded in `statusBeforeHold` at hold time — never a hardcoded `QUEUED` guess — mirroring `ServiceChargeRecord.approvalStatusBeforeHold`'s own established convention.
- **`redispatchPrintJob.ts`** (**new, §2.2.3 Retry/Redirect**) — real re-send orchestration for an already-queued job, reusing `attemptPrintDelivery` and the job's own persisted `pdfBase64` (see `PrintJob.pdfBase64`'s own doc comment: PS-279 added this persistence in one, deliberate, disclosed way — the bytes are already in memory right before original dispatch, so they're saved there rather than attempting the much harder, out-of-scope "regenerate from source data" problem). `job.redirectedToDestination` always wins over `job.resolvedDestination` once an admin sets it. `redirectAndRedispatchPrintJob`/`redirectAndRedispatchManyPrintJobs` compose the real "redirect" (`IPrintQueueService.redirectPrintJob`, which only ever records the override) with an immediate real redispatch attempt — the one real place those two steps are sequenced, so the dashboard's own UI code never has to.
- **`src/pages/PrintQueueDashboardSection.tsx`** (**new, §2.2.1**) — the real admin dashboard: status filter, a hand-rolled `.ps-conf-table` (no shared `<DataTable>` exists anywhere in this app) listing every real `PrintJob`, per-row Hold/Release/Retry/Redirect/Cancel gated by the exact same real status rules the service enforces, a `Set<string>`-based bulk selection (mirroring `useMicrotomyWorkstation.ts`'s own `batchSelection` pattern) with a bulk-actions toolbar, an inline Redirect mini-form (protocol/IP/port), and the batch-aggregation control panel (`groupBy` + window start/end + "Run Batch Now"). Registered as a third `interfacesSubTab` (`'print_queue'`) inside `AuditLogPage.tsx`'s existing "Interfaces" tab, alongside Exceptions/Outbound DLQ. Every string routes through `t()` under a new `printQueueDashboard.*` namespace (all 5 locales); no inline `style={{}}` anywhere — only existing `.ps-conf-*`/`.ps-dlq-*`/`.ps-qa-tab-toolbar` classes; every piece of real decision-making (which jobs are holdable, how a batch groups, how a redirect actually resends) lives in the service files above, never in this component.

## Where this is wired in

`services/reports/publishReportReleasedEvent.ts` runs `dispatchPrintJob` via `Promise.all` alongside electronic dispatch, only when Component C's own resolved action calls for it (`PRINT_ONLY` or `DUAL`). A print failure is caught and reported as an honest `printOutcome: 'failed'` on the event's own result — never allowed to break the whole publish call or mask electronic dispatch succeeding independently.

## Real, deliberate scope not yet built

- **No facility has `printDeliveryConfig` set in seed data**, and there's no admin UI to set one — this built the engine itself, not its own settings screen. (The Delivery Rules Engine's configuration UI, once named here as the same kind of gap, has since been built: `components/Config/System/DeliveryRulesSection.tsx`.)
- **QZ Tray's actual print behavior can't be exercised in this sandbox** regardless of UI — it's a real, external desktop application. The 18 tests on `dispatchPrintJob.ts` are the real coverage for all three modes' own logic; nothing here can prove a physical printer actually receives ink.
- **Real, important execution-context caveat, PS-278's own `transport/` clients** — a real TCP socket (RAW_9100, LPR_LPD) cannot run inside a browser tab at all, ever, structurally, not as a temporary gap. This is exactly why QZ Tray (Mode 1) and the Interface Engine hand-off (Mode 2) already exist as this app's own, established precedent for "how a browser reaches real printer hardware" — a browser genuinely can't do it directly. `transport/`'s own three clients are written the same way `dispatchInterfaceMessage.ts`/`dispatchPrintJob.ts` already are: real, correct, testable service-layer code that runs wherever this app's own "services/" layer actually executes server-side (a real Node backend/Cloud Function), not inside the end user's own browser tab. IPP's own HTTP transport could in principle run from a browser if the target printer's own endpoint allowed it, but real, unmanaged network printers overwhelmingly don't set CORS headers, so in practice it needs the same real server-side execution context. See `services/printing/transport/sendRawPrintJob.ts`'s own header for the full account.
- Cytology's own PDF generation for this path is real (`services/cytology/generateCytologyReportPdfSnapshot.ts` — see that folder's own README), so print genuinely works for a Cytology case once a facility configures it.
- **PS-279's own IPP job-template attributes (`sides`/`media-source`) are self-consistency tested only**, same real, disclosed limit as the rest of `sendIppPrintJob.ts` — not verified against a real CUPS instance or physical printer.
- **Closed — PS-279's `NATIVE_QZ_TRAY` mode now forwards paperSource/duplexMode to QZ Tray.** Verified directly against the installed `qz-tray` package's own source/types: `qz.configs.create()` accepts real `duplex` (`one-sided`/`long-edge`/etc.) and `printerTray` config keys. `utils/labels/qzTrayBridge.ts` now maps `DuplexMode`→`QZ_DUPLEX_BY_DUPLEX_MODE` and `PaperSourceTray`→`QZ_TRAY_BY_PAPER_SOURCE`, and `printPdfViaQzTray()` takes an optional 5th `presentation` param that `attemptPrintDelivery.ts` (via `dispatchPrintJob.ts`) now always forwards — the same resolved `{paperSource, duplexMode}` that already reached `DIRECT_NETWORK_PRINT`/IPP now reaches Mode 1 too. One real, honest, remaining caveat: unlike IPP's registered `media-source` keywords, QZ Tray's `printerTray` value is driver-specific with no universal standard — the mapping is a real, working default (`Tray 1`/`Tray 2`), not a guaranteed-portable one across every QZ Tray-managed printer driver.
- **Batch aggregation windows are UTC, not genuine per-site local time** — see `aggregatePrintJobsForBatch.ts`'s own header; closing this for real needs a `Facility`-level timezone field this app doesn't have yet.
- **No true background scheduler** — `runScheduledBatchAggregation.ts` is admin-triggered ("Run Batch Now"), not a real timer; this app has no cron/scheduler infrastructure anywhere to hang one off of.

*Corrected in the Batch 496 README audit (Oct 9, 2026): the Delivery Rules configuration screen now exists; the `printDeliveryConfig` screen is still missing.*

## Batch 613 (part A) — case search reporting

`exportGate.ts`: `case-search-report` is checked with `search:case-report:export`.

## Batch 437 (PS-282, PS-357): print and export audit

Pete: needed for HIPAA. Every print, reprint, preview print, stored-PDF open and export now writes one entry in the existing audit log:

- `documentOutputAudit.ts` (pure) builds the entry:
  - event `DOCUMENT_PRINTED`, `DOCUMENT_REPRINTED`, `DOCUMENT_PREVIEW_PRINTED`, `DOCUMENT_RENDERED`, `DOCUMENT_EXPORTED` or `DOCUMENT_FAXED`;
  - detail with the document, id, version, destination, status, the time in UTC with the local offset, and the reason, format and row count when there are any.
  - A print handed to the browser's dialog is `pending`, because the browser never says whether paper came out.
  - `wasPrintedBefore`, `planDocumentPrint` and `printPromptComplete` decide reprints and the reprint reason.
- `recordDocumentOutput.ts`: the app's wiring (the signed-in person, the audit service). `planReportPrint` reads the audit log and the performing lab's print settings.
- `exportGate.ts`:
  - `beginExport` checks an export's capability, then records it. A refusal makes no file.
  - The capabilities are the Audit Log page's five logs, case search results, and the two My Contributions files.
  - `recordExport` audits a configuration export that has no capability of its own.
- Label prints are audited too (`utils/labels/labelPrintAudit.ts`). QZ Tray and agent prints record the printer and whether it took the job.

Tests: `documentOutputAudit.test.ts`. Server contract: `docs/architecture/AUTHORIZATION_API.md`, "Exports and the print/export audit".

## Batch 450 — test evidence for Priority 1 and 2 tickets (PS-282)

`printExportAuditPaths.test.ts`: the print/export paths reachable from services write their audit entries, and the reprint-reason setting. QA report exports now record `DOCUMENT_EXPORTED` (`qualityAssurance/qaExport.ts`).

## Batch 451 — screen-level test evidence for Priority 2 tickets

`reportPrintAudit.ts`: the report page Print button's audit entry (PS-282).

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 495 — case-report print permission and scan-and-correlate footer (PS-283)

- **`reportPrintGate.ts`** (new): `beginReportPrint({ caseId, facilityId })` checks `report:case-report:print` before any case report is printed, reprinted, printed from the preview window, or a stored version's PDF is opened. A refusal produces no document. Same shape as `exportGate.ts`'s `beginExport()`. Called from `SynopticReportPage.tsx` (`printReport`, the orchestration print), `CopilotReportViewModal.tsx` (assist-mode print), `ReportPreviewPage.tsx` (preview window) and `VersionHistoryModal.tsx` (stored version PDF). Before this, none of the four was checked.
- **`buildReportDocumentReference.ts`** (new, PS-283 §4.2.3): the footer reference on every report PathScribe renders itself — a Code 128 of the accession (which `ScannerProvider` already resolves, so scanning a printout opens the case) plus the record version. Never throws: an accession the barcode can't encode keeps the readable reference and drops the barcode.
- **Not covered, disclosed:** (1) restricting print for VIP/confidential cases — PathScribe has no such case flag in its data model (only the age-based pediatric restriction), so it needs a product decision first, the same precedent `documentRendering/README.md` set for the split '26' branding block; (2) the surgical-pathology PDF itself comes from the external `render_report` service, which can't check the permission or draw the footer from here — that is PS-333 (renderer) and PS-358 (API-server enforcement). Label/ZPL printing (cassettes, containers) is not a case report and is not covered by this capability. *(Batch 516: done — see below.)*
- Tests: `reportPrintGate.test.ts` (3), `buildReportDocumentReference.test.ts` (5, including a real Code 128 from bwip-js).

*Correction (Batch 496 README audit): the surgical/orchestration PDF renderer is not external — it is `render_report` in `functions/main.py` in this repo. It reads only the case header, institution, body parts, sections, synoptic answers, map figures and render scope; it ignores `amendments`, `revisionStatus`, `watermarkText`, `preAnalyticDisclaimerText`, `documentStyle` and the header/footer parts, so none of those appear on the generated PDF yet. That work is in this repo (PS-333), not blocked.*

## Batch 497

The preview window was retired, so `beginReportPrint()` now guards three paths: the report page's orchestration print, the CoPilot report view, and opening a stored version's PDF. The `preview-print` audit action stays in `documentOutputAudit.ts` so earlier `DOCUMENT_PREVIEW_PRINTED` entries still count as prints; nothing produces it now.

## Batch 498

The surgical/orchestration PDF (`render_report`) now prints the same footer reference as `buildReportDocumentReference.ts` — Code 128 of the accession plus the record version — on every page, alongside the release-buffer watermark and the revision banner. See `functions/README.md`.

## Batch 515 (PS-283): Print Queue permissions

- The Print Queue dashboard's actions check a capability in the service:
  - hold and release: `print:job:hold`;
  - cancel: `print:job:cancel`;
  - redirect: `print:job:redirect` (all in `mockPrintQueueService.ts`);
  - retry: `print:job:retry` (`redispatchPrintJob.ts`).
- Before, anyone who could open Audit Log → Interfaces could do all of them.
- A refusal changes nothing (`PRINT_JOB_NOT_PERMITTED`; a retry returns outcome `'refused'`).
- A bulk action checks once for the whole selection.
- Queueing and the dispatch bookkeeping (mark printed or failed, retry counter) are the system's own steps and are not checked.
- Seeded to everyone who opens the Audit Log (Admin, Lab Director, QA Reviewer, and a hospital's own roles with configuration access).

## Batch 516 (PS-283): restricted cases

- `reportPrintGate.ts`: `checkReportPrint` returns `allowed`, `notPermitted` or `restrictedCase`.
- A case carrying an active, case-level flag marked **Restricts printing** (`Flag.restrictsPrinting`; VIP, confidential consultation) also needs `report:restricted-case:print`, checked after `report:case-report:print`.
- `beginReportPrint` still returns true or false.
- The seeded flag "Confidential — Restricted Printing" (CONF) restricts printing. A lab can mark any of its case flags this way in Configuration → Case Flags.
- The permission is seeded to Pathologist; an administrator grants it to anyone else.

## Batch 517 — facility report-printing settings (PS-337)

`facilityReportPrinting.ts` (+ test) holds the rules for `Facility.printDeliveryConfig` (the performing lab's mode, printer, paper size and default network printer) and `Facility.printPresentationPreference` (the ordering client's tray and duplex).
- It converts between a facility and the Printing tab's form. Fields that don't apply to the chosen mode or protocol are dropped.
- `facilityPrintProblem` names what is wrong:
  - an enabled QZ Tray setup without a printer name;
  - a default network printer without an address, or with an invalid one;
  - a port outside 1–65535.
- `facilityService.setPrintSettings` applies these rules and checks `config:print-settings:manage`.

**Not seeded.** No demo facility has printing turned on. Turning it on for a demo lab would start real print jobs on release.

## Batch 521 (PS-281)

`redispatchPrintJob.ts`: `retryPrintJobAutomatically(jobId)`, the system's own scheduled retry of a failed release print job (services/delivery/deliveryRetries.ts). A person's Retry still needs `print:job:retry`.

## Batch 538

`dispatchPrintJob.ts` / `mockPrintQueueService.persistRenderedPdf`: the job records the release's report document id and SHA-256 and keeps no copy of the bytes. `redispatchPrintJob.ts` (retry, redirect) reads the document; a document that can't be read, or fails its hash check, marks the job failed rather than printing something else. A job without a document (not stored, or from before Batch 538) keeps its bytes as before.

## Batch 546: finding F3

`attemptPrintDelivery.ts` no longer tries a network print (`DIRECT_NETWORK_PRINT`) from the browser. The Raw/LPR/IPP transports need Node, so the browser threw "Buffer is not defined" and left the job `QUEUED` with no retry.
- **From a browser** (`transport/networkPrintRuntime.ts`, `canSendNetworkPrintHere`), the job fails at once with `NEEDS_SITE_AGENT`. It returns `retriable: false`, so the release goes straight to the exception queue, the fallback channels and the alert (`delivery/deliveryRetries.ts`).
- **A transport that throws** now fails the job, instead of leaving it queued.
- `dispatchPrintJob` passes `retriable` through.

Network printing on site is the site agent's (`docs/architecture/SITE_AGENT_API.md`).

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- `printJobFailureReason.ts` (new): the Print Queue shows a failed job's reason in the user's language when the code alone says what happened (today `NEEDS_SITE_AGENT`, finding F3). The job keeps its English text for the record. Open since Batch 546.

## Batch 552 (PS-539 phase 2d: site agent screens)

- `printJobStatusKey` (in `printJobFailureReason.ts`): a PRINTED job with `confirmation: 'sent'` shows "Sent to printer" (SITE_AGENT_API.md §5).

## Batch 553 (PS-539 phase 2d: site agent printers in routing)

Batch 553 (PS-539 phase 2d; `SITE_AGENT_API.md` §3):
- **`dispatchPrintJob.ts`:**
  - It records the job's performing lab (`PrintJob.performingFacilityId`).
  - It skips a routing rule that names another lab's agent printer, so the next tier or the facility's default applies.
- **`attemptPrintDelivery.ts`:** an agent-printer job fails at once with "needs the site agent" (`AGENT_PRINT_NEEDS_SERVER`), not retried. The API server is what sends it to the agent.
- **`mockPrintQueueService.redirectPrintJob`** refuses:
  - an unusable destination (`PRINT_JOB_BAD_DESTINATION`);
  - another lab's agent printer (`PRINT_JOB_WRONG_SITE`).

  The audit entry names the printer's id and site.
- **`redispatchPrintJob.ts`:** results carry `redirectError`. `redirectNotDone` (`printJobFailureReason.ts`) counts the jobs that weren't redirected.
- **`facilityReportPrinting.ts`:** the default printer can be one of the facility's own agent printers (`agentPrinterOtherSite` otherwise).
- **Transports:** they take only a printer address (`NetworkPrintDestination`).

## Batch 556 (PS-539 phase 2d: report documents through the API)

- Batch 556: a print retry whose stored document the server couldn't give right now (not answering, or not allowed) stays retryable; a changed or missing document still fails for good (`redispatchPrintJob.ts`). Documents are read through `reportDocuments/reportDocumentInstance.ts`.

## Batch 606 (printing, labels and the site agent)

- `simulatedPrint.ts` (+ test): the demo stand-in for routes with no real transport. `recordSimulatedPrint` keeps a Simulated record (browser store), shows a toast and writes a PHI-free audit entry; `simulationAllowed()` is true only with no API server. A failure switch (`setSimulatedPrintFailure`) makes simulated sends fail. Read in Configuration, System, Simulated print log.
- `attemptPrintDelivery.ts`: in the demo, network and site-agent report print goes through the Simulated transport and the job is marked PRINTED with `simulated: true` (the print queue shows "Simulated: sent to printer"). With an API server it still fails with NEEDS_SITE_AGENT.

## Batch 617 (part B): server version (PS-514)

The print queue service now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are in `docs/architecture/DELIVERY_PRINTING_API.md`.

## Batch 652 (defect fixes)

`reportBarcodePrintCss.guard.test.ts`: the report footer barcode CSS stays solid black (the PDF side is tested in `functions/test_main.py`).

Batch 756: `simulatedPrint.ts` shows one toast per burst of simulated sends of the same kind to the same place (`nextSimulatedToastCount`, 6 s), counting them ("Site agent print × 12"); printing a case's 12 cassettes used to raise 24 toasts. New keys `simulatedPrint.toastRepeated`, `toastFailedRepeated`.
