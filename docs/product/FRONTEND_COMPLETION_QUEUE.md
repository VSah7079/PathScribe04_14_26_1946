# Front-end completion queue

Status: queued 2026-10-17 at the CEO's direction: nothing ships in Partial, Stub or Planned. Every capability ends as Built or Demonstration (browser side complete, running against a mock service or the dev proxy, waiting only on the server, a vendor spec, a licence, hardware or another team).

## How this queue was made

Every one of the 197 non-Built inventory entries was reviewed against the code. Results:

- Front-end work still to build: 118
- Already complete in the browser; relabel as Demonstration: 67
- Only the server, a licence, hardware or a decision remains: 6
- Already built; inventory text was stale: 5
- Needs a decision: 1

The 118 front-end entries break into 167 tasks (63 small, 95 medium, 9 large), planned as eight batches, foundations first.

## Rules for every batch

- Simulated behaviour is always labelled Simulated on screen and in the audit trail; nothing pretends to reach a real system.
- Tests, five-language strings, docs and README updates, a Jira Test and its own Xray JSON (sent as a separate attachment) and a delta zip.
- After each batch the inventory statuses move to Built or Demonstration and the product guide page is regenerated.
- Delivered as delta zips; no commit, no push.

## Batch 604: Simulated mail, alerts and notices

Status: DELIVERED (Jira Test PS-769). Entries #30, 40, 75, 81, 94, 97, 121, 122, 152, 159, 160, 191, 192, 193, 196, 197 are now Built (Demo) in the inventory.

One shared demo mail path (handlers for /api/notifications/email and /template-events), a Simulated mail outbox for admins, honest labels on secure e-mail, critical-alert channels and ticket delivery, support-access notices.

Entries: 16; tasks: 23 (S 17, M 6, L 0).

### #30 Automated critical alerts (SMS, secure email, EHR push) and reference page

- Was: Stub - the three channel adapters only console.info and return method 'stub' (verified); reference page and audit tab are Built (Demo) on a mock token service. EHR SSO hand-off: Planned.
- [S] In Audit Log > Critical Alerts, show per channel the recorded detail text (what would be sent, to whom) with a SIMULATED badge.
- Waiting on (server side, not built here): SMS gateway, secure e-mail relay and EHR push endpoint; EHR SSO hand-off for the reference link.

### #40 Template review, governance and lifecycle e-mails

- Was: Partial - review and governance Built (Demo); e-mail send Planned (server phase 2e; nothing is sent in the demo); visible-to-all-reviewers comments Planned (PS-345).
- [S] Add demo handlers for POST /api/notifications/email and /template-events that store each message as a clearly labelled 'Simulated e-mail' in browser storage, with an audit entry and a visible toast.
- [M] Add a 'Simulated mail outbox' list (admin) so a person can open every e-mail the demo would have sent (recipient, subject, body), labelled simulated.
- Waiting on (server side, not built here): Server picks recipients and sends template lifecycle e-mails; comments saved with the template version (PS-345).

### #75 Clinician follow-up e-mail

- Was: Partial (Demo) - drafting works; sending needs the API mail service.
- [S] Without an API server, send goes through a labelled 'simulated' mail path that shows success and records the audit entry (shared with entry 159).
- Waiting on (server side, not built here): Mail service endpoint /notifications/email.

### #81 Critical alert dispatch and reference page

- Was: Stub (Demo) - dispatch adapters log only; page and audit tab work against a mock token service.
- [S] Show per-channel outcome and message text in the critical alerts audit tab, labelled Simulated (method stub)
- Waiting on (server side, not built here): SMS gateway, secure e-mail and EHR push via the engine.

### #94 Support audit stream

- Was: Partial (Demo): browser stand-in; originating IP and country recorded empty (server only), PDF export, e-mail and webhook notification to approvers, ending access on ticket close, and tenant-isolated 
- [S] Record support's own exports and configuration changes in the support audit stream as well as the main audit log.
- [S] When support requests access, show a SIMULATED e-mail/webhook notice to approvers in the Messages inbox, with an audit entry.
- [S] Add a printable PDF view of the audit stream (browser print to PDF).
- Waiting on (server side, not built here): Capture originating IP/country; end access on ticket close; tenant-isolated audit table (PS-358); real e-mail/webhook.

### #97 System-generated staff notices

- Was: Partial (Demo): in-app messages work against browser storage; e-mail (block exhaustion, tumor board invite) needs the server mail service. Inbox push needs the hub (Planned phase 2e).
- [M] Simulated e-mail outbox: when no API, sendEmail stores the message in a viewable Simulated e-mail log and writes an audit entry
- Waiting on (server side, not built here): Server mail service and hub inbox push.

### #121 Critical alert delivery channels (SMS, secure email, EHR push)

- Was: Stub — checked: dispatchCriticalAlerts.ts imports the stub channels; EHR SSO hand-off Planned.
- [S] Show each channel's simulated outcome and message in the audit tab and reference page with a Simulated label (same screen as entry 81)
- Waiting on (server side, not built here): SMS gateway, secure e-mail, EHR push and SSO hand-off.

### #122 Secure messaging gateways

- Was: Partial (Demo) — real transports not built (PS-332/PS-143); per-site gateways Planned.
- [S] Label the secure e-mail sent state and its audit entry as SIMULATED (no real gateway) until a transport exists.
- Waiting on (server side, not built here): Real gateway transports for each catalogue entry (PS-332/PS-143) and per-site gateways.

### #152 Template lifecycle e-mails (server decides recipients)

- Was: Planned — client built; nothing is sent in the demo.
- [S] Add demo handlers for POST /api/notifications/email and /template-events that store each message as a clearly labelled 'Simulated e-mail' in browser storage, with an audit entry and a visible toast.
- [M] Add a 'Simulated mail outbox' list (admin) so a person can open every e-mail the demo would have sent (recipient, subject, body), labelled simulated.
- Waiting on (server side, not built here): Server chooses recipients, writes localised e-mail and sends it.

### #159 Support ticket and feedback privacy checks

- Was: Partial (Demo) - names and attachments not covered; delivery needs server mail.
- [M] Ticket text is checked for the open case's patient name and a screenshot attachment triggers a warning, with replace/edit/send anyway.
- [S] Simulated labelled delivery so the user sees a submitted result in demo (shared with entry 75).
- Waiting on (server side, not built here): Mail service for ticket delivery.

### #160 Support audit stream (tamper evident)

- Was: Partial (Demo) - chain and CSV/JSON built; origin IP/country, PDF export, ticket-close ending, tenant-isolated storage Planned.
- [S] Add a PDF export of the support audit stream with pdf-lib.
- [S] Add a labelled-simulated 'Ticket closed' action that ends the access and writes an audit entry.
- Waiting on (server side, not built here): IP/country capture, ticketing close event, tenant-isolated storage.

### #191 Secure email through lab gateways

- Was: Partial (Demo) — window and checks work; the send is simulated (1.8 s mock); real transports are PS-332.
- [S] Sent screen is labelled 'Simulated' in demo and the send writes an audit entry.
- Waiting on (server side, not built here): Real gateway transports (PS-332).

### #192 Critical finding notification record and alert dispatch

- Was: Partial (Demo) — human-logged record and email draft built; automated dispatch Stub (console log); interface-engine alert channels built but not wired (Planned).
- [M] Show per-channel results in the critical alert audit table and a sign-out toast, labelled Simulated, and send the e-mail leg to the simulated outbox.
- Waiting on (server side, not built here): Engine alert channels (SMS, secure e-mail, EHR inbox push).

### #193 Notifications: toasts, email transport and calendar invites

- Was: Partial — toasts built; email send is mock/server-side; template lifecycle e-mails Planned (phase 2e, TEMPLATE_NOTIFICATIONS_API.md); no e-mail goes out in the demo.
- [M] Simulated e-mail outbox for sendEmail and template events when no API, viewable and audited, labelled simulated (shared with entry 97)
- Waiting on (server side, not built here): Server mail service and /api/notifications endpoints (phase 2e).

### #196 QA and enhancement feedback with PHI-redacted screenshot

- Was: Partial (Demo) — delivery needs server mail.
- [S] Add demo handlers for POST /api/notifications/email and /template-events that store each message as a clearly labelled 'Simulated e-mail' in browser storage, with an audit entry and a visible toast.
- Waiting on (server side, not built here): Server mail transport.

### #197 ForMedrixAI support access policy and tamper-evident audit

- Was: Partial (Demo) — IP and country capture, PDF export, approver email/webhook, ticket-close ending and tenant isolation Planned.
- [S] Add PDF export of the support audit stream (print view or report renderer)
- [S] Add a simulated Ticket closed action that ends the grant, labelled simulated, with audit entry
- Waiting on (server side, not built here): Server-captured IP and country, approver e-mail/webhook, ticket system integration, tenant isolation.

## Batch 605: Simulated interface engine: inbound and outbound

Status: DELIVERED (Jira Test PS-770). All 33 entries are Built (Demo). Note: #107 and #188 send the financial-class payload straight to the simulated engine at sign-out rather than through the outbound charge queue.

Inbound ADT and event simulator with manual identity binding; outbound order, block, slide, scan, charge and registry messages dispatched to the mock engine with visible results; engine and engraver monitors that work without Firebase or a server.

Entries: 33; tasks: 43 (S 18, M 25, L 0).

### #1 Patient ID validation, status dot and national identifiers

- Was: Partial — validation and dot built; extracting the HL7 status code from inbound ADT is not built. Some national rules are unconfirmed (NZ, FR, IE, CA Ontario) and await national-lead sign-off.
- [M] Read the NHS number status indicator from inbound PID and store it on the national identifier
- [S] Pass the stored status to PatientIdStatusDot on Accession and order lookup so NHS shows green only for 01 (plus a clearly labelled simulated inbound ADT sample to show it)
- Waiting on (server side, not built here): Real ADT feed from the interface engine; national leads to sign off NZ, FR, IE, CA Ontario rules.

### #2 Patient management: merge, link, move case, reassign

- Was: Partial (Demo) — target search limited to one organisation (no cross-organisation merge/link). Conflict resolved: the AccessionPage README says an outside-case move "is not built"; ReassignCasePatient
- [M] A cross-tenant admin can search targets in any active organisation for merge/link/move, with an extra warning confirm and a cross-tenant audit entry.

### #3 Encounters (visit records) and auto-fill at Accession

- Was: Partial (Demo) — no encounter lookup for a freshly typed manual patient (resolution runs only at submit); ADT A45/A50/A34 not handled; no inbound HL7 listener.
- [M] A manually typed patient with a known MRN shows the active-encounter badge or picker at Accession before submit.
- [M] A45, A50 and A34 messages are parsed and applied (move visit, change visit number, merge) so a test message changes the encounter on screen.
- Waiting on (server side, not built here): Inbound HL7 ADT listener that feeds processAdtMessage.

### #4 Inbound ADT and interface exceptions

- Was: Partial (Demo) — A40/A24/A47 manual identity-binding UI not built; no inbound listener calls processAdtMessage outside tests.
- [M] Add an 'Inbound message simulator' (labelled Simulated) where a person picks or pastes a sample A01/A08/A40/A24/A47/A43 message, runs it through the ADT processors, and sees the outcome, patient/encounter change and any Interface Exception queue entry.
- [M] Build the manual identity-binding action for A40 merge, A24 link and A47 change-identifier exceptions in the review modal (pick target patient, apply through the same operations, audit).
- Waiting on (server side, not built here): Interface engine sends real HL7 ADT to an inbound listener that calls the ADT processors.

### #5 Pending orders queue, order resolution and facility crosswalk

- Was: Partial (Demo) — site-scoped matching not possible (IncomingOrder has no site).
- [S] Add optional siteId to IncomingOrder and make crosswalk matching prefer the site entry, then org-wide, with a test and a siteId picker in the crosswalk admin
- Waiting on (server side, not built here): Interface engine must supply the sending site on inbound orders.

### #7 Outbound OrderCreated message for walk-in cases

- Was: Partial (Demo) — dispatches to the generic stand-in receiver; engine downstream not present.
- [S] OrderCreated payload carries assigningAuthority and the resolved encounter so the trail shows them.
- [S] If the OrderCreated send fails, the accessioner sees a non-blocking notice instead of a console line only.
- Waiting on (server side, not built here): Interface engine consuming OrderCreated.

### #8 Specimen add/edit and LIS sync state

- Was: Partial (Demo) — write-back answers need the interface engine.
- [M] After a LIS case specimen is saved, the mock interface engine acknowledges (or rejects, by setting) and the sidebar badge moves to Sent or Rejected, with an audit entry; labelled simulated.
- Waiting on (server side, not built here): Interface engine returns real write-back ACK/NAK for specimen updates.

### #20 Engraver Monitor, engine webhooks and dispatch history

- Was: Partial (Demo) — reads Firestore `engraver_devices`; src/firebase/config.ts holds "YOUR_API_KEY" placeholders so it cannot succeed in a browser; webhooks never run against a real deployment; to be rep
- [M] Make Engraver Monitor and dispatch history work with no Firebase: when config holds placeholder keys use a seeded, labelled-simulated device list and dispatch history instead of showing an error.
- Waiting on (server side, not built here): Engine webhooks (api/webhooks/engine), real engraver feeds and SQL Server API.

### #29 Hardware order dispatch and ORM^O01 builder

- Was: Stub — no importer of ModeAInterfaceService in src (checked).
- [M] Add a Send block order to instrument action on block cards that builds the ORM, shows it, and records an audit entry, labelled simulated until an adapter exists
- [M] Build slide-order and specimen-label dispatch as simulated results (message preview plus audit) instead of not implemented
- Waiting on (server side, not built here): Verified Vantage/Cerebro integration guide and endpoint mapping.

### #58 Cancer registry reporting at surgical sign-out

- Was: Partial — dispatch and definitions built (Demo); registry wire formats Planned; not a full NAACCR rule set; live ICD-O-3 code entry in the app is "coming soon".
- [M] Add a labelled SIMULATED ICD-O (and ICD-11) lookup from a small seeded list so a user can pick a morphology code with behaviour digit and see the registry check respond.
- Waiting on (server side, not built here): Registry wire formats per registry; licensed ICD-O-3 / ICD-11 terminology proxy.

### #69 Frozen section billing suggestion

- Was: Stub — `frozenSectionBilling.ts` and its test exist, but nothing outside the test imports it.
- [S] Show frozen section CPT suggestions (88331/88332 by block count, labelled unconfirmed) in the billing review with accept/dismiss and audit

### #95 Interface engine monitor and server jobs view

- Was: Partial (Demo) - needs API endpoints.
- [M] In demo, a labelled simulated service supplies sample engines with heartbeat and channel health, server job health, dead letters and a working Requeue with audit.
- Waiting on (server side, not built here): Engine status and server-jobs API endpoints.

### #99 Assist LIS ingestion (inbound LIS status feed)

- Was: Partial — adapters, staging queue, retry and admin screen built (Demo). No timer or inbound endpoint exists; only Poll now and the test message run it (checked: runAssistPollNow is called only from As
- [S] While the app is open in demo, the saved interval triggers a labelled 'simulated schedule' poll with a visible last/next run time.
- Waiting on (server side, not built here): Scheduled poll job, inbound HTTPS endpoint, message authentication, real LIS source.

### #100 LIS-side case data: on-demand fetch, prior reports, flags, amendment notices, specimen sync state

- Was: Partial — (1) Built (Demo) mock fetch; (2) Partial: the nightly refresh and cache-destroy functions have no callers; (3) Built (Demo); (4) Partial, no write-back; (5) Unverified (service exists, UI no
- [S] Add a 'Refresh prior reports now' action in the server jobs page that runs the refresh sweep, and destroy the history cache at sign-out.
- [M] Simulated LIS acknowledgement for specimen sync state as in item 8.
- Waiting on (server side, not built here): Nightly refresh job and LIS FHIR/HL7 write-back.

### #102 Outbound OrderCreated and accession events

- Was: Partial (Demo) — messages built and queued; assigningAuthority and encounter not populated; downstream HL7/FHIR translation is the engine's.
- [S] Add assigningAuthority (origin organisation) and the linked encounter (id, class, location) to the OrderCreated payload, with tests.
- Waiting on (server side, not built here): Interface engine translates to HL7/FHIR.

### #104 HL7 ORM^O01 builder and Mode A hardware dispatch

- Was: Stub — ModeAInterfaceService has no importer outside comments and types (checked in src/); ormBuilder has no test file (segmentBuilders does).
- [M] Call block-order dispatch when blocks are created or routed and show a labelled simulated hand-off result (with the ORM text) in the Outbound Dispatch Trail and audit.
- [S] Add ormBuilder tests.
- Waiting on (server side, not built here): Vendor HL7 field layout (IHL7VendorAdapter) and engraver endpoint.

### #106 DFT^P03 charge message builder and preview

- Was: Partial (Demo) — builder and preview only; nothing dispatches it.
- [M] Add a charge (DFT) transaction type and send the built DFT^P03 from the outbound charge queue via the interface-engine dispatch, so a user sees QUEUED then SENT with audit.
- Waiting on (server side, not built here): Interface engine endpoint for charge messages.

### #107 Billing JSON webhook and financial-class payloads

- Was: Stub — pre-integration scaffolding; named formats (X12 837P, KVDT, SESAM-Vitale) Planned.
- [M] Charge capture and financial-class payloads enter an outbound queue at sign-out and are dispatched to the dev receiver, showing in Interfaces > Outbound with audit.
- Waiting on (server side, not built here): Downstream billing engine; X12 837P, KVDT, SESAM-Vitale specifications.

### #108 Inbound ADT processing and encounter updates

- Was: Partial — parsing and service wiring built and unit-tested; no inbound HL7 listener or route calls processAdtMessage (checked: only its own test and comments).
- [M] Add an 'Inbound message simulator' (labelled Simulated) where a person picks or pastes a sample A01/A08/A40/A24/A47/A43 message, runs it through the ADT processors, and sees the outcome, patient/encounter change and any Interface Exception queue entry.
- Waiting on (server side, not built here): Interface engine inbound listener for ADT.

### #109 Inbound patient merge, link, change-identifier and move (A40, A24, A47, A43)

- Was: Partial (Demo) — manual identity binding for A40/A24/A47 not built; no live transport.
- [M] Add a clearly labelled simulated inbound ADT tool (A40/A24/A47/A43 samples) that feeds the processors and queues exceptions
- [M] Add manual patient pick-and-bind for unresolved A40/A24/A47 exceptions with audit
- Waiting on (server side, not built here): Live HL7 transport from the engine.

### #110 Inbound canonical events (block exception, material location, instruments, results)

- Was: Partial (Demo) — processors built and tested; real vendor connections and the receiving endpoint are not.
- [M] Add an 'Inbound events' simulator to the mock interface engine page: send block exception, material location and HPV result samples through the real processors and show outcome and audit, labelled SIMULATED.
- Waiting on (server side, not built here): Receiving endpoint plus real vendor connections.

### #112 Engraver Monitor and dispatch history (engine-fed screens)

- Was: Partial (Demo) — placeholder Firebase credentials mean live reads cannot succeed until the SQL Server API exists; device list not filtered by organisation.
- [M] Make Engraver Monitor and dispatch history work with no Firebase: when config holds placeholder keys use a seeded, labelled-simulated device list and dispatch history instead of showing an error.
- [S] Filter the device list by organisation.
- Waiting on (server side, not built here): SQL Server API and engine feeds.

### #116 Interface engine monitoring (Engines view and status line)

- Was: Partial (Demo) — screens built; the demo has no engine; needs GET /api/interface/engines and the heartbeat.
- [M] Add a labelled-simulated engine status source (online, attention, degraded, offline examples) used when no API server is configured.
- Waiting on (server side, not built here): GET /api/interface/engines and engine heartbeat.

### #117 Order intake: pending orders and specimen code crosswalk

- Was: Partial (Demo) — IncomingOrder has no site, so site-scoped matching is not possible.
- [S] Add optional siteId to IncomingOrder and prefer the site-specific crosswalk entry, with a siteId control in the crosswalk admin
- Waiting on (server side, not built here): Engine must send the sending site on orders.

### #124 Material scan event dispatch

- Was: Stub — dispatchMaterialScanEvent.
- [M] Send the scan event through the outbound interface pipeline to the mock engine, show it in the Outbound Dispatch Trail labelled simulated, and audit it.
- Waiting on (server side, not built here): LIS/middleware endpoint.

### #133 Cancer registry report at surgical sign-out

- Was: Partial (Demo) — reaches the engine as JSON; registry wire formats are not produced; live ICD-O-3 code capture is open (see Terminology).
- [S] Add manual ICD-O-3 code entry (with behaviour digit check) in the Add Code window so cases become reportable
- [S] Show the queued registry report as a simulated submission with audit entry
- Waiting on (server side, not built here): Registry wire formats and ICD-O terminology proxy.

### #134 Registry acknowledgements and escalation

- Was: Partial (Demo) — endpoint spec only (REGISTRY_ACKNOWLEDGEMENT_API.md); escalation moves to server job registry.escalateStale.
- [S] Add a SIMULATED 'receive registry acknowledgement' action (accepted, warnings, rejected, silent) on sent submissions that calls recordRegistryAcknowledgement and shows the resulting status and audit.
- Waiting on (server side, not built here): Engine posts normalised acknowledgement JSON; registry.escalateStale server job.

### #172 Assist-mode AI drafting from LIS milestones

- Was: Partial (Demo) — only Poll now and Test message run it; no real LIS poll source, no timer, no inbound endpoint (verified by caller search).
- [S] Run the poll cycle on a timer honouring Enabled and Interval while the app is open (demo only), with the result visible in latest activity.
- Waiting on (server side, not built here): Real LIS poll source or inbound endpoint.

### #184 Place of Service dictionary

- Was: Partial (Demo) — dictionary and facility fields exist; the billing webhook payload still carries only CLIA, not POS.
- [S] Add the facility Place of Service code to the billing webhook payload and its preview.

### #185 Frozen section billing suggestion

- Was: Stub — suggestFrozenSectionCptCodes exists but only its own test imports it (verified); no screen uses it. The README calls it Partial.
- [S] Same as entry 69: surface frozen section CPT suggestions in the billing review

### #186 Outbound charge queue and dead-letter view

- Was: Partial (Demo) — queue, validation and screen built; no real transport.
- [M] Add a Dispatch action for queued charges (through the interface-engine mock or a labelled SIMULATED send) that moves QUEUED to SENT with an audit entry; consider adding charges to the unified outbound screen.
- Waiting on (server side, not built here): Charge transport to the billing system/engine.

### #187 DFT charge message and JSON charge payload (preview only)

- Was: Partial (Demo) — builders and preview built; no transport (webhook builder is Stub).
- [M] Preview gets a 'Send to billing engine' action that queues the DFT and JSON charge payload and dispatches to the dev receiver (shared with entry 107).
- Waiting on (server side, not built here): Billing engine endpoint.

### #188 Financial class payload for a downstream engine

- Was: Stub — verified no non-test caller; formats (X12 837P, KVDT, SESAM-Vitale) Planned.
- [S] Show the financial class payload in the outbound message preview (and attach it to the billing export), labelled preview.
- Waiting on (server side, not built here): Format specifications and downstream engine for X12 837P, KVDT, SESAM-Vitale.

## Batch 606: Printing, labels and the site agent

Status: DELIVERED (Jira Test PS-771). All 15 entries are Built (Demo). The Python report renderers (`functions/main.py`, `cytology_report.py`) do not yet read the new page-setup and technical-branding fields (see KNOWN_GAPS).

A labelled Simulated site agent and network printing, label designer layouts that actually drive printed output, label layout admin, microtome and grossing hardware capture.

Entries: 15; tasks: 23 (S 6, M 15, L 2).

### #13 Grossing hardware: camera, scale, profiles and gross photo

- Was: Partial (Demo) — upload simulated; no physical scale or agent verified; specimen-level photo not wired.
- [M] Wire a Capture weight button (agent scale, clearly labelled simulated when no agent) into the grossing weight field, with manual fallback and audit entry
- [S] Add specimen-level Capture Gross Photo using CameraCaptureControl kind gross_photo
- Waiting on (server side, not built here): Gross Imaging vendor upload endpoint; real PathScribe Agent and scale at site.

### #14 Scanner listener, material scan tracking and scan beep

- Was: Partial (Demo) — dispatchMaterialScanEvent to external LIS/middleware is a stub; a placeholder slide label still prints from the global tracker at the Microtome stations regardless of printer support (two
- [S] Make the material-scan dispatch a clearly labelled SIMULATED send that shows a small result (toast/log panel) and writes an audit entry.
- [M] Reconcile the two microtome slide-label paths so a scan prints/engraves once through the station's configured printer route, or shows a labelled simulated result and audit entry.
- Waiting on (server side, not built here): Receive MaterialScanEventPayload from the interface engine/middleware.

### #15 Microtome workstation

- Was: Partial (Demo) — SlideLabelLayoutConfig (20 x 8 mm, 0.2 mm module, 1.2 mm font) drives preview aspect and fit warnings only; buildSlideZplTemplate keeps hard-coded coordinates and no admin editor exis
- [M] Slide print output follows the configured slide label size/layout, and an admin screen edits it with a visible preview.

### #22 Label building and printing

- Was: Partial (Demo) — QZ Tray and browser dialog work; PathScribe Agent program, BarTender, Zebra Browser Print not built; network dispatch needs API `POST /api/print/jobs`; dispatchContainerLabelPrint is 
- [M] Make slide, cassette, matrix-cassette and container engrave/print dispatch show a labelled SIMULATED result (toast) and write a label-print audit entry when no real printer route answers.
- Waiting on (server side, not built here): POST /api/print/jobs; PathScribe Agent / BarTender / Zebra Browser Print programs (other team); real QZ printer test on hardware.

### #24 Printer profiles and bridge types

- Was: Partial (Demo) — only QZ Tray and OS dialog usable.
- [M] For BarTender, Zebra Browser Print, Direct via Interface Engine and PathScribe Agent, add a clearly labelled 'Simulated' dispatch that shows a success result and writes a label-print audit entry.
- Waiting on (server side, not built here): Site agent, BarTender REST, Zebra Browser Print and engine print route specs.

### #26 Label Designer

- Was: Partial (Demo) — designer and saved layouts work, but saved layouts are not consumed by real print output (nine print call sites unchanged; only services/index.ts references the layout service). Confl
- [L] Make requisition, specimen, decant, block, slide and molecular label output read the saved layout (facility override then Enterprise default) so a designer change shows in the print preview.
- [S] Add tests proving a saved layout changes printed output and that the default is used when none is saved.

### #27 Dynamic label rules, template store, printer-agnostic payload

- Was: Planned (backend scope).
- [L] Printing a label uses the saved designer layout for its label type (ten print entry points), falling back to the built-in one.
- [M] Designer lets an admin set a show/hide rule per field based on specimen context, with preview.
- [M] Layouts keep versions (history, restore, who and when) in the mock store.
- [M] Export for EPL and DPL as well as ZPL from one payload.

### #36 Document style and page setup

- Was: Partial - saves and drives the template preview; the PDF renderer still prints A4 (verified).
- [S] Send the lab page size and margins in the report render payloads (surgical and cytology) so the renderer can use them.
- Waiting on (server side, not built here): Renderer (functions/main.py, cytology_report.py) must honour page size and margins.

### #37 Report language, date format and letterhead branding

- Was: Partial - language Built; branding resolution Built but the split-'26' technical-facility block is not built and PDF layout steps wait on the deployed renderer.
- [M] Add an optional technical-component facility to the case and resolve a second branding block for split 26 reports
- Waiting on (server side, not built here): Deploy the report renderer for the PDF layout steps.

### #43 Print routing, print queue and site agents (report printing)

- Was: Partial (Demo) - screens and rules Built; sending to physical printers needs the site agent and API server; QZ/IPP/RAW untested on real hardware.
- [M] In demo, a release print job goes to a clearly labelled 'Simulated: sent to printer' state with audit entry, plus a failure simulator.
- Waiting on (server side, not built here): Site agent and API server sending; real-hardware tests of RAW/LPR/IPP.

### #63 Molecular barcodes and labels

- Was: Partial — QZ Tray bridge works; other bridge types fall back to the browser dialog; PathScribe Agent not built.
- [M] Molecular labels sendable through Direct via Interface Engine with the simulate-result buttons used for cassette/slide labels.
- Waiting on (server side, not built here): PathScribe Agent program (PS-52).

### #128 Print routing and print queue delivery modes

- Was: Partial (Demo) — QZ Tray and OS dialog work; Mode 2/3 from a browser need the site agent or server (POST /api/print/jobs not built); no demo facility has printing turned on; real-hardware tests are ma
- [M] In demo mode, mark network and agent print jobs as delivered through a labelled 'Simulated' transport, with a visible result and audit entry.
- [S] Turn printing on for a demo facility so the flow can be shown.
- Waiting on (server side, not built here): Site agent or POST /api/print/jobs; real hardware tests (PS-750).

### #131 Label printing bridges and PathScribe Agent client

- Was: Partial (Demo) — QZ Tray and OS dialog available; Agent client, contract and status UI built against a fake agent but the agent program is not (PS-52); Direct via Interface Engine sending is a stub (A
- [M] Demo mode offers a labelled simulated PathScribe Agent so printing via the agent shows a result and audit.
- [M] Direct via Interface Engine supports container and molecular labels (see entry 63).
- Waiting on (server side, not built here): PathScribe Agent program (PS-52); Direct-print API (PS-53); BarTender and Zebra Browser Print are vendor work.

### #153 Planned server-side pieces with client contracts only

- Was: Planned.
- [M] Add conditional show/hide rules per label field in the label designer and apply them when printing
- Waiting on (server side, not built here): Signed consult tokens and media proxy, inking endpoints, purge job, central label template store, queue-based live updates.

### #165 Printer profiles, print settings, label designer, print routing, site agents

- Was: Partial (Demo) - QZ Tray bridge works; PathScribe Agent program and site agent service not built (client, contract and status UI built against a fake agent); network dispatch needs `POST /api/print/jo
- [S] Add admin controls for the slide label layout (SlideLabelLayoutConfig) in Print Settings, or confirm the label designer covers it
- Waiting on (server side, not built here): PathScribe Agent, site agent service, POST /api/print/jobs.

## Batch 607: Code systems and coding

Status: DELIVERED (Jira Test PS-772). All 7 entries are Built (Demo).

Enforce the code-system policy in Add Code, sign-out and outbound messages; one coded-entry model with ICD-10 and ICD-11 side by side; ICD-O-3 table and manual entry; OPCS-4 licence notice.

Entries: 7; tasks: 9 (S 2, M 6, L 1).

### #137 Code systems policy per jurisdiction

- Was: Partial (Demo) — settings screen and service built; nothing reads the policy (checked: only CodeSystemsSection, tests, the services index and the capability catalog reference it). Enforcement Planned.
- [M] Enforce the code system policy in the Add Code window, sign-out check and outbound payloads

### #138 Uniform coded entry model (ICD-10/11 side by side)

- Was: Stub — library and tests only, not wired into any screen (Batch 594).
- [L] Make the Add Code window and the case coding display read and write CodedEntry (system, release, source, AI detail, ICD-11 clusters) through caseCodingAdapter.
- [M] Show ICD-10 and ICD-11 side by side for a case with a labelled SIMULATED demo map from a small seeded table.
- Waiting on (server side, not built here): Terminology server, ICD-10 to ICD-11 maps, SNOMED/WHO licences, nightly monitoring.

### #139 Clinical code search (SNOMED CT, ICD-10, ICD-11, LOINC, ICD-O, CPT)

- Was: Partial (Demo) — works against NLM only with outbound access or the dev proxy; production UMLS proxy, OPCS-4 and full CPT Planned/Stub.
- [S] OPCS-4 tab shows a clear 'needs NHS TRUD licence' notice, optionally a small labelled sample list.
- Waiting on (server side, not built here): Production UMLS proxy; NHS TRUD and full CPT licences.

### #140 ICD-O-3 code capture gap

- Was: Partial — search exists (searchIcdo, comment says to replace with a dedicated ICD-O-3 backend); true ICD-O-3 capture missing.
- [M] Add a bundled ICD-O-3 morphology table (code and behaviour) and search it in the ICD-O tab.

### #161 Code Systems policy per jurisdiction

- Was: Partial (Demo) - settings saved and audited, enforcement Planned; terminology server, ICD-10 to ICD-11 maps and licences open.
- [M] Same as entry 137: enforce the policy in the Add Code window, sign-out check and outbound payloads
- Waiting on (server side, not built here): Terminology server, ICD-10 to ICD-11 maps and licences.

### #182 Code Systems policy per jurisdiction

- Was: Partial (Demo) — nothing reads the policy; only CodeSystemsSection and the services index import it (verified). Add Code window, sign-out and outbound messages Planned. CodedEntry model exists but not
- [M] Make the Add Code window show only enabled systems and mark required ones, per the case's jurisdiction.
- [M] At sign-out, warn or block when a required code system has no code from its start date, with an audited override.

### #183 Terminology services and clinical code search

- Was: Partial (Demo) — CPT and non-US ICD-10 need a licensed proxy not built; OPCS-4 Stub; terminology server and nightly monitoring Planned.
- [S] OPCS-4 tab shows the licence notice or labelled sample (as entry 139).
- Waiting on (server side, not built here): Licensed proxy for CPT and non-US ICD-10, terminology server, nightly monitoring.

## Batch 608: Cytology and screening

Status: DELIVERED (Jira Test PS-773). All 12 entries are Built (Demo).

QC compliance report, reviewer pool and roles, Return to Trainee, severity badge, high-risk history, HPV and failsafe reports, interval adherence.

Entries: 12; tasks: 17 (S 6, M 9, L 2).

### #32 Countersign and Return to Trainee

- Was: Partial - surgical path Built (Demo); cytology/autopsy use only hard-coded resident/cytotech checks and cytology Return-to-Trainee UI is not built (service ready).
- [M] Add a Return to Trainee action with required feedback on cytology sign-out/countersign, and a feedback banner for the trainee; check the autopsy path the same way.

### #47 Cytology clinical history and high-risk factors at accession

- Was: Partial — captured and flowing into the report and high-risk logic; prior cervical procedure criterion uses diagnosis history as a proxy, no procedure codes.
- [M] A prior cervical procedure can be recorded (picker entry or PR1 from ADT) and drives the high-risk factor.

### #50 Cytology Peer Review Queue and QC review bar

- Was: Partial — queue and actions built (Demo); reviewer-pool role enforcement is not implemented (checked `resolveQcReviewerEligibility.ts`: only the self-review rule) and staff records lack reviewer-role 
- [S] Add reviewer-role codes to staff records and a Config > Staff field to set them.
- [M] Enforce the reviewer pool when assigning a QC reviewer and hide/disable Assign to Me for ineligible users, with a clear refusal message and tests.

### #51 HPV and molecular QA reports

- Was: Partial — reports built on Demo data; the molecular reports read synthetic seeded runs (13 runs, CYTO-1/CYTO-2); UK-QA-01 lacks failsafe-action columns; MOL-QA-01 lacks assay name.
- [M] Assay name is captured on molecular HPV runs/results and shown in the MOL-QA-01 breakdown.
- [M] Record follow-up action on a positive result so UK-QA-01 shows failsafe referral and non-response columns.

### #52 Compliance and proficiency QA reports (EU matrix, PT/APAC)

- Was: Partial — three EU columns not computable; PT provider exchange simulated.
- [M] Capture the facility national registry ID and a ThinPrep/SurePath choice on cytology specimens, then show both columns in EU-QA-01.
- [L] Add a per-country, per-age screening interval table and compute interval adherence from patient history.

### #53 Cytology QC compliance report

- Was: Stub — `resolveCytologyQcComplianceReport.ts` and its test exist; a repo-wide search found no caller or screen.
- [S] Add a Cytology QC Compliance tab showing tier/trigger breakdown and per-reviewer discrepancy rates, with a dash when no resolved data

### #54 Abnormal severity flag from Bethesda review

- Was: Stub — `resolveCytologyAbnormalSeverity.ts` has no non-test caller (only comments in `abnormalDetection`).
- [S] Show the reduced highest abnormal severity as an advisory badge on the Bethesda review in the cytology screening page and the QC queue.

### #62 Scan-verified worklist dispatch and inbound run results

- Was: Partial — real fetch exists but there is no backend endpoint (dev-only mock response); inbound results need the interface engine; a control well's Trace is empty (README open item).
- [S] Make the Trace action work for control/calibrator wells (look up by well position/control lot) so it shows plate, lots and movement.
- Waiting on (server side, not built here): POST /api/v1/events/molecular-worklist endpoint; interface engine posts inbound run results.

### #76 Jurisdiction cytology QA reports: UK HPV failsafe, EU matrix, HPV positivity monitor

- Was: Partial (Demo) - named columns cannot be computed from app data; UI says so.
- [L] Track colposcopy referral and response for HPV-positive results so UK failsafe referral and non-response columns have values.
- [S] Capture assay name on molecular orders and show it in MOL-QA-01; EU columns as in item 52.

### #77 Molecular QC and proficiency-testing reports

- Was: Partial (Demo) - synthetic data; provider exchange simulated.
- [M] Add a proficiency test panel: build the submission, show it, and apply a simulated graded provider result with audit, labelled simulated
- [S] Scope molecular QC reports by selected facility
- Waiting on (server side, not built here): PT provider exchange.

### #79 Cytology QC safeguards: no self-review, reviewer pool, QC flag

- Was: Partial - self-review block built; reviewer pool not enforced (staff records lack reviewer-role codes).
- [M] Staff screen assigns QC reviewer role codes; taking or recording a QC review is refused for people outside the matching rule's pool.

### #84 Participation types, facility sign-out authority and countersign routing

- Was: Partial (Demo) - cytology/autopsy use hardcoded resident/cytotech checks; cytology reject UI Planned.
- [M] Add Return to Trainee with required feedback to cytology (and autopsy if absent), reusing the countersign service reject.

## Batch 609: Reports, rendering and templates

Renderer honours page style, headers and footers; image attachment and embedding; template lifecycle audit and validation; mismatch check after amendments; document style.

Entries: 10; tasks: 12 (S 4, M 8, L 0).

Status: DELIVERED (Jira Test PS-780). All 10 entries are Built (Demo). Images (#44) are attached as links and nothing is stored; the Python renderers must be redeployed before page setup and headers take effect; the German, French and Dutch medical lists are starter sets needing native-speaker clinical review.

### #31 Clinical-pathologic mismatch check at sign-out

- Was: Partial - amendments and corrections after sign-out are not checked.
- [M] An amendment or correction runs the mismatch check and shows the report alert; a decision on whether Block holds release is a setting.

### #35 Report PDF renderer and PDF content rules

- Was: Partial (Demo) - dev renderer (Cloud Function) built and tested; page size is hard-coded A4, and `documentStyle`, `headerAssembly`, `footerAssembly` are not read (verified in main.py); PDF/A and deter
- [M] Report PDF honours page size, document style, header and footer parts set in admin (Python function, same as entry 127).
- Waiting on (server side, not built here): Production renderer (Playwright/headless Chromium) in API server; PDF/A and deterministic output (PS-333).

### #38 Declared Final Diagnosis field

- Was: Partial - resolver is used in dispatch, but the validator has no caller in any save/publish flow (verified).
- [S] Run the Final Diagnosis validator on template save/publish and show its error (at most one field, Final templates only) so an invalid design cannot be published.

### #39 Synoptic Library (templates and lifecycle)

- Was: Partial - library Built (Demo); template content is placeholder; Upload Protocol format is Unverified; lifecycle transitions log to console, not the audit log.
- [S] Every template lifecycle transition writes an audit entry visible in the Audit Log.
- [S] Upload Protocol shows a clear validation result for the file format, labelled as unverified against CAP/RCPath.
- Waiting on (server side, not built here): CAP/RCPath licence to replace about 1,500 placeholder field labels.

### #44 Image embedding in report PDFs

- Was: Stub - code present but unused (only its test references it); server cytology template does not draw images; surgical renderer has no equivalent. Earlier README "DONE for cytology" superseded.
- [M] Add a screen to attach images to a case report (use the mock upload service) with the below-300-DPI warning.
- [M] Call the embed function on the returned PDF bytes in the surgical and cytology PDF paths so attached images appear in the printed report.
- Waiting on (server side, not built here): Image storage service for real files.

### #127 Report renderer (server-side PDF)

- Was: Partial (Demo) — renderer is a Python Cloud Function in the repo (Firebase being retired); browser preview needs it; some payload fields (header/footer parts, disclaimer, document style) were reported
- [M] Renderer draws documentStyle, header and footer parts, with tests (see entry 35).
- Waiting on (server side, not built here): Production renderer endpoint (https VITE_REPORT_PDF_ENDPOINT) in API server.

### #173 ForMedrixAI model catalog, store and organisation adoption

- Was: Partial (Demo) — firestoreModelService is a stub; rules not run on an emulator; configOverrides and thresholdOverrides are read by nothing; store licence is mock.
- [M] Add per-adoption config/threshold override editing in Models config, and have the AI service read them
- Waiting on (server side, not built here): Firestore model service with emulator-tested rules; real store licensing.

### #177 Dictation with AI refinement

- Was: Partial (Demo) — works with a configured model; spelling variant wrong for AU/CA.
- [S] Choose spelling convention per locale (en-AU, en-CA, en-GB) in the dictation refinement prompt, with tests

### #179 Multi-language voice dictation and commands

- Was: Partial (Demo) — phrases machine translated; native review and the Gemini refinement-prompt audit not done; English fallback can cause cross-language false matches.
- [M] Admin toggle that drops the English fuzzy fallback once a non-English profile matches, plus review of the refinement prompt per language.
- Waiting on (server side, not built here): Native-speaker review of machine-translated phrases (people, not code).

### #180 Medical spell check, language control and word lists

- Was: Partial — engine works offline; medical coverage is thin (about 815 English and 150 Korean entries, none for German/French/Dutch; German false flags); licensed SNOMED/LOINC/SPECIALIST releases not add
- [M] Add medical word lists for German, French and Dutch, and fix the German false flags.
- Waiting on (server side, not built here): Licensed SNOMED/LOINC/SPECIALIST releases (PS-343).

## Batch 610: Dashboards, targets and bench workflow

Autopsy dashboards and TAT, performance and client SLA targets, frozen-section clock settings, cold chain, retention holds queue, block deletion and exhaustion, delegation, inking, jurisdiction overview, AI discordance, tumor board rules.

Entries: 18; tasks: 30 (S 8, M 19, L 3).

Status: DELIVERED (Jira Test PS-783). All 18 entries are Built (Demo), except #163 which is Built. Cold-chain readings, autopsy dashboard data and the saved targets all live in the browser until the API server exists; SLA hours run continuously with no business-hours or holiday calendar.

### #9 Structured inking (margins, ink colours, Gate A and Gate B)

- Was: Partial — browser side built; /inking/validate, /inking/override endpoints and SQL audit table Planned; ink next to synoptic margin labels and in organ-map legends not built.
- [M] Show recorded ink colour next to margin names in the organ-map legend and on synoptic margin labels
- Waiting on (server side, not built here): POST /inking/validate, /inking/override and the SQL override audit table.

### #11 Delete a block while in process

- Was: Partial — tier 1 built (Demo); deleting after sign-out, amended-report flag (tiers 2-3) and server 409 on stale version Planned.
- [M] Authorised users delete a block after sign-out; it is marked Invalidated with reason, billing deficiency and audit entry.
- [M] A pathologist or QM flags a block Invalidated or Superseded on an amended report, with audit and no deletion.
- [S] Deleted blocks appear in the case material list with reason, who and when.
- Waiting on (server side, not built here): Server 409 on stale case version (BLOCK_DELETION_API.md).

### #12 Active retention holds queue

- Was: Planned — checked repo: no RetentionHoldsQueue file; READMEs and FO already say so.
- [M] Build a Retention Holds queue page listing every active retention hold (case, reason, who, when) with release action and CSV export.

### #16 Block exhaustion exception and pathologist response

- Was: Partial (Demo) — the tech flag is not wired into the Microtome workstation (verified: no block-exhaust code in pages/MicrotomyWorkstationPage).
- [S] Add a 'Block exhausted' button on the Microtome workstation that calls flagAddOnException and shows the result.
- [M] Make the pathologist decision act: Cancel/Modify restore the block status, and an exhausted block blocks cutting until Approve Destructive Cutting is recorded.
- Waiting on (server side, not built here): Mail transport for the pathologist e-mail (see simulated mail).

### #17 Cold chain: smart containers, storage and excursion gate

- Was: Partial (Demo) — gate and deficiency built; telemetry ingestion has no transport (no MQTT/REST endpoint, no caller outside tests); storage units/condition types have no UI.
- [S] Add a clearly labelled simulated temperature-reading control on the batch detail page that feeds the telemetry processor and shows the excursion
- [M] Add a Storage Units and Condition Types admin section (create, edit, deactivate)
- Waiting on (server side, not built here): MQTT/REST telemetry ingestion endpoint from smart containers.

### #60 Autopsy worklist tab, badges and TAT/SLA target

- Was: Partial — authority, hold and PAD/FAD badges built; the SLA is a static target only (no overdue verdict).
- [M] Compute elapsed time against the jurisdiction target and show On track / Due soon / Overdue on the worklist chip and report status badge.
- [M] Let an admin override the autopsy targets in TAT configuration.

### #61 Autopsy three-tier BI/reporting dashboards

- Was: Planned — not started.
- [L] Build autopsy dashboards (case, department, enterprise tiers) from mock autopsy data with TAT, consent, retention and cause-of-death views

### #68 Frozen section STAT turnaround clock

- Was: Partial: clock built (Demo) with fixed 20/5 defaults; admin override not built.
- [S] Make the OR Suite board read the FROZEN_SECTION target (STAT and routine) from TAT configuration instead of fixed defaults.

### #71 Tumor Board auto-flag rules (margin distance)

- Was: Partial — margin criterion only; diagnosis/biomarker rules and routing overrides are Planned.
- [L] Admins add diagnosis and biomarker auto-flag rules that create tumor board listings at sign-out with a trigger reason.
- [M] Per-facility routing overrides for which board a rule flags.

### #78 AI/human discordance and stalled-result reports

- Was: Partial - prompt and logic files exist; screen location for the reports not verified.
- [S] Add the stalled-AI-result rule (ordered results past a configurable timeout).
- [M] Add a QA tab showing per-vendor discordance rate and the stalled-results list, with export.

### #83 Case delegation

- Was: Partial (Demo) - voice DELEGATE_CONFIRM works; DELEGATE_PEER_REVIEW/FORMAL_CONSULT/FULL_TRANSFER voice actions are registered but not wired; delegationService.complete() exists but nothing calls it, s
- [S] Completing the delegated work calls delegationService.complete() so the item leaves Delegated to me.
- [S] Saying peer review, formal consult or full transfer opens the Delegate modal preset to that type.

### #87 Performance targets and client SLA targets

- Was: Stub - services and mocks exist, nothing imports them.
- [M] Admin screens to set performance targets (cases/RVU per period) and per-client first-touch and total TAT hours with STAT variants.
- [M] Productivity and TAT dashboards show actual against target and SLA with met/missed state.

### #88 Autopsy TAT/SLA target display

- Was: Partial.
- [M] Compute elapsed versus target and show an On track/Overdue state on the chip and tooltip.

### #89 Autopsy BI dashboards

- Was: Planned (not started).
- [L] Same work as entry 61: autopsy three-tier dashboards on mock data

### #91 Frozen section STAT turnaround clock

- Was: Partial - override parameters exist, no screen sets them.
- [S] Admin sets frozen section target and warning minutes (per facility), read by the OR dashboard clock.

### #123 Cold-chain telemetry ingestion

- Was: Stub — service logic with tests; no MQTT/IoT/REST endpoint, store or caller outside tests.
- [M] Admin screens for storage units and storage condition types.
- [M] Simulated telemetry feed (labelled simulated) posts readings through the ingestion service, with excursion shown, batch hold and CAPA visible.
- [M] Readings and excursion status on storage unit and container views.
- Waiting on (server side, not built here): MQTT/IoT/REST ingestion endpoint and reading store.

### #163 Jurisdiction setup (no single screen)

- Was: Partial (documentation gap, by design).
- [M] A read-only Jurisdiction overview in System config lists, per jurisdiction, its facilities and key settings (participation types, signing rules, code systems, AI policy, retention body, registries) with links.

### #164 Client SLA targets

- Was: Stub - service and mock exist; grep found no importers outside the folder.
- [M] Add an admin screen to set per-client first-touch and total TAT targets (STAT variants).
- [M] Use the targets in the worklist/TAT display and report so a client SLA breach is shown.

## Batch 611: Migration, exports, identity and remaining items — DELIVERED (PS-785)

Legacy import, demo export API, biometric labels, block editor comments, patient management across organisations, remaining items.

Entries: 7; tasks: 10 (S 2, M 7, L 1).

### #10 Block and stain editor, matrix blocks and comments

- Was: Partial — matrix block comment field exists but has no UI.
- [S] Add a plain-text Comments list and composer (author, time, audited) to the matrix block editor Details tab, same as ordinary blocks.

### #59 Autopsy organ retention (HTA jurisdictions)

- Was: Partial — tier, detail and disposal built (Demo); retention custody chain is Planned.
- [M] Autopsy organ retention shows a custody history (each location/recipient change with who and when) and stores it.

### #132 Legacy data migration pipeline

- Was: Partial (Demo) — mapping, validation and MPI dedup built; case creation and bulk import are not.
- [M] Add 'Import legacy records' to the Migration Jobs page: choose source system, upload CSV/JSON, run mapping, validation and MPI matching, and see counts.
- [M] Create draft cases from succeeded records.
- Waiting on (server side, not built here): Bulk import jobs and OCR in the interface engine.

### #158 Biometric e-signature policy and enrolment

- Was: Stub (Demo) - `verifyBiometric` always succeeds after enrolment after a simulated 1.2 s prompt; real WebAuthn with server-verified challenge Planned. Policy storage and enrolment UI are built. Earlier
- [S] Label enrolment and sign-out biometric checks as SIMULATED in the modal and in the audit entry.
- [M] Optional: use the browser's WebAuthn platform authenticator with a locally generated challenge so the demo shows the real fingerprint/face prompt.
- Waiting on (server side, not built here): Server-issued WebAuthn challenge and verification.

### #166 Legacy migration tools (field mappings and Migration Jobs)

- Was: Partial (Demo) - mappings and job viewer built; ingestion stub (verified: grep finds no caller of processLegacyRecordImport outside tests); case creation and bulk import Planned. NO-README coverage fo
- [M] Add 'Import legacy file' on Migration Jobs: choose a CSV/JSON file, run processLegacyRecordImport with the saved mappings, and show the new job with per-record results.
- [M] Create draft cases in the mock case store from succeeded records (labelled SIMULATED bulk import) with audit.
- Waiting on (server side, not built here): Server-side bulk import of legacy records.

### #189 AI charge capture (Smart Capture layer)

- Was: Planned
- [L] Prototype Smart Capture drawer at sign-off with mock suggestions, mandatory pathologist confirmation, structured payload preview, labelled Prototype, not yet compliance-reviewed
- Waiting on (server side, not built here): Attorney and claims-specialist review; the institution's LIS/RCM receiver.

### #194 Exports through the server and My exports

- Was: Partial (Demo) — browser side built; server endpoints Planned; icon shows only with an API server.
- [M] Add a demo export API (in-memory/mock storage) behind the same interface, as site agents do, so long exports show Preparing, appear in My exports and download.
- Waiting on (server side, not built here): /api/exports endpoints, worker, signed links, hub status events.

## Entries needing no build

### Already complete in the browser; relabel as Demonstration

- #6 Clinical history after accession, inbound event and accession status: Enqueue is wired in AccessionPage and the queue appears in the unified outbound screen (OutboundInterfaceDlqSection: dispatch, resend, simulate failure). Only the engine/HL7 translation is missing.
- #18 External referral batches and inter-laboratory referral: Referral manifest queue is in the unified outbound screen (dispatch, resend, simulate failure) with tracking and inbound result processors built. Delivery to the reference lab needs the engine.
- #21 Inbound canonical events (block exception, material location): Block exception and location events are applied through the normal write path, with Sim buttons in the report page Dev Tools menu and location badges. Vantage/Cerebro translation awaits vendor guides.
- #23 Requisition sticker sheet and station/container labels: Sticker sheet prints end to end with ZPL overlap checks and an admin preset; hard-coded field order is not a dead end. Configurability is covered by entry 27 wiring.
- #25 Network label print status and PathScribe Agent status line: Print status list, retry/dismiss and agent status line are built, with Simulate buttons when no API server. Real send needs POST /api/print/jobs and the agent.
- #28 Site agents and print destinations (label-relevant): Enrolment, revoke, update window, shares and routing-rule screens exist with tests; only the agent and its endpoints are external. Printing outcome is covered under print routing (#128).
- #33 Report versions and Version History: Version History modal, immutable versions with hashes and mock/http services are built; only server version endpoints are missing.
- #34 E-fax and file-drop delivery: Browser rules, queue, REPORT_DELIVERY dispatch, retry and dead-letter view are built; dev receiver and tests exist. Real fax gateway, SFTP target and production receiver are server work.
- #41 Spell check in report text: Hunspell worker, tiers, menu and dictionaries work in the browser. Open items are licensed SNOMED/LOINC data, native-speaker review and the GPL source-offer address (a data file).
- #42 External consult links and consultant opinion: Issue, view, opinion, rating and audit all work on the mock token service; banner already says link opens only in the issuing browser. Real tokens, media proxy and identity check are server.
- #45 Cytology PDF rendering, preview and printing: Client payload, renderCytologyPdf and functions/cytology_report.py all exist; generateCytologyReportPdf.ts is intentionally gone. Only deployment of the renderer is missing.
- #46 Cytology result dispatch and report-released event: Cytology result queue and event publish are built and appear in the unified outbound screen with dispatch/resend/simulate. Only the real interface-engine endpoint is missing.
- #48 HPV result display, inbound HPV event and recording: Processor is idempotent and tested; the worklist 'record HPV result' button is a labelled simulation of the inbound event (handleRecordHpvResult). Only the real molecular interface is missing.
- #49 Screening hours sign-off and screening-day start: ScreeningHoursPanel, rules, saveScreeningDayStart and settings are wired in the cytology worklist; only server screening events and endpoints remain.
- #55 Cervical screening registry engine and dispatch at sign-out: Engine, settings, queue, payloads and go-live panel are built and send through the dev receiver. Real endpoints and wire specs are external (verified or configurable).
- #56 Patient national identifiers and registry opt-out: Identifier inputs, checksum, two opt-outs, statute override and audit are built; only an HL7 consent source (an interface engine specification) is missing. REGISTRY_CONSENT_UPDATED handler exists.
- #57 Registry go-live gate (validation vs production): RegistryGoLivePanel, send gate, synthetic suite and payload boundary are wired in the browser. Engine-side check, ForMedrixAI template publishing and real transmission are other-team work.
- #64 Send-out molecular orders and reference labs: Add-on molecular lines ingest into the molecular order engine; lab choice, referral dispatch to IN_RUN and a demo send-out result (simulateSendOutResult) exist. Inventory text is stale; engine queue is external.
- #65 Intraop pre-check queue (frozen section capture): Queue and capture work; the camera barcode scanner is now wired (BarcodeScanner), so the inventory note is stale. Photo upload goes to the mock vendor service.
- #66 OR terminals, quick PIN and case dismissal: PIN, station identity, two-step dismissal and event log are built (OrSuiteDashboardPage, dismissFromBoardWithAudit). Only badge/RFID reader hardware is missing.
- #67 Intraop live updates and OR status badge: Badge, local cross-window updates and 15 s/60 s polling work with no server; the SignalR hub is the only missing piece.
- #70 Structured inking (margins, ink applications, gates): Gate, ink applications, dictionary, modal and override record are built in the browser (evaluateInkingGate, InkingGateModal). Server /inking/validate, /inking/override and SQL audit table are server work.
- #72 Deficiency server endpoints (contain, resolve, verify, raise-and-resolve): In-app deficiency flows run on the mock service and work; the Vercel endpoints exist with unit tests. Real Firestore run and OIDC caller authentication are server-side.
- #73 Enterprise Rollup: EnterpriseRollupTab and resolveJurisdictionRollup are wired into the QA page and aggregate locally; true per-jurisdiction hosting is the backend's.
- #74 Follow-up internal alerts: Browser stand-in runs when a screen loads and hands over to the server job when VITE_SERVER_JOBS is on (browserStandIns.ts). Server job is backend only.
- #80 Screening hours sign-off: Panel is mounted on the cytology worklist with confirm/correct, reasons, supervisor flags and append-only audit; server events and endpoints are the only gap.
- #82 Outside consult links (issue, view, opinion, assess): Same as consult links entry: issue, view, opinion, rating, audit work on mock token service; UI banner discloses browser-only links. Real tokens, media proxy, identity check are server.
- #85 Report page "Data as of / Check now" indicator: HeaderBar indicator and Check now work against the mock LIS sync service and apply flags; only the real LIS call is missing.
- #86 AI Contribution tab: Per-user and workflow numbers are real; override examples and synoptic comparison are hardcoded but badged with DemoDataBadge. Department/peer aggregates across users need the server.
- #90 OR board dismissal, event log and terminal identity: Duplicate of OR terminals entry: dismissal, PIN, terminal binding and demo mode are built. Only badge/RFID hardware is missing.
- #92 Live updates and live status badge: LiveStatusBadge is on OR board, intraop queue and WSI pages; localLiveUpdateService gives same-browser updates in the demo. Only the SignalR hub is server work.
- #93 Case presence: Presence strip, hooks and announcements are built; demo shows this browser's other windows via BroadcastChannel. Cross-user presence needs the hub.
- #96 Exports through the server and My exports: Every export goes through runExport; with no server the browser builds the file and the My exports page exists. Async endpoints are server work.
- #98 Template lifecycle e-mail notifications: Browser posts the event from the template lifecycle (templateLifecycleEvent.ts) and never blocks; built and tested. The server picks recipients, writes localised e-mails and sends them.
- #101 Vendor-neutral outbound events and interface transaction types: Contracts, builders, queues and the stand-in receiver are built; vendor translation is the engine's job and no engine ships here.
- #103 Outbound patient ADT messages (A08, A40, A47): Queue, builders, retry and dead letter work and Audit Log > Interfaces > Outbound can dispatch, resend or simulate failure through the dev receiver. Only a real engine is missing.
- #105 Vendor HL7 adapters (Vantage, Cerebro): identityAdapter works; Vantage and Cerebro adapters deliberately throw until a verified vendor integration guide exists.
- #113 Stand-in interface message receiver (Python): receive_interface_message exists in functions/main.py with a guard test covering all transaction types; it needs deploying and is later replaced by the real engine.
- #118 Inter-laboratory referral manifests and results: Duplicate of referral entry: manifest queue, tracking, transit rules and inbound result processor are built and in the unified outbound screen. Only delivery to reference labs needs the engine.
- #119 Molecular worklist dispatch and instrument results: Dispatch, validation gates and run results work end to end in demo: MSW handler plus Mock Interface Engine page and instrument simulator answer the POST.
- #120 Digital pathology integration: WSI scan batches, viewers, AI screening: Mock scan batch service, simulated scanner, mock WSI viewer page and AI screening result store/processor exist; real scanners, vendor viewer URLs and AI traffic are external.
- #125 Report release event, delivery channels and retries: Rules, plan, queue, retries and DeliveryExceptionsPanel are built; the stand-in receiver functions/report_delivery.py exists. Production server and scheduled sweep are backend.
- #126 Stored report documents and version PDFs through the API: Browser store, HTTP clients, hash checks and Version History 'View as sent' are built (reportDocuments, VersionHistoryModal). Server store/endpoints and ids for older entries are backend.
- #129 Site agents (on-site print and file-share bridge): SiteAgentsSection, status line and routing are built against fake agent data; the .NET agent and its endpoints are another team's work.
- #130 Site agent contract (design): Contract and admin screens are built (SiteAgentsSection, siteAgentAdmin, demo API; print routing uses AgentPrinter), so 'nothing uses it' is stale. The .NET agent and hub are other-team work.
- #135 Registry go-live gate and validation versus production instance: Go-live panel, gate, synthetic suite, validation export and audit are built on a mock service. Remaining: server endpoints, engine boundary copy, vendor template publishing, signing.
- #136 Registry consent, opt-out and statutory override: Accession checkboxes, statute override, audit, FAILED/EXCLUDED queueing, patient badge and a REGISTRY_CONSENT_UPDATED handler are built; only an HL7 consent source is missing.
- #141 Terminology services configuration and health monitor: Endpoint list, health check, Test All and ICD-10 variant mapping are built; CPT and non-US ICD-10 need licensed backend proxies.
- #142 Licensed terminology build for spell check: Build tool and tests exist; derived lists ship in public/spellcheck. Only the licensed SNOMED/UMLS/LOINC release files (a licence) are missing.
- #144 Shared HTTP client for the API server: apiHttpClient and selectByConfiguration are built; the demo correctly uses mock services, and each service moves onto the client when its server exists.
- #145 Server-supplied settings (/api/config) and hosting regions card: runtimeConfig client and HostingRegionsCard are built and say plainly that the demo has no server; values come from /api/config.
- #146 Server jobs view: Screen and hook are built and the demo says the browser does the work itself (demoNote). Needs the /api/jobs endpoint only.
- #147 Exports through the server, My exports and export notices: All export buttons use one service; browser builds the file in demo and My exports plus notices are built. Server request/worker path is backend; 5,000-row search cap is the demo limit.
- #148 Live updates (SignalR hub) and data topics: Client built with local live updates for the demo; all nine topics are used by screens through useLiveData. Only the SignalR hub is missing.
- #149 Live status badge on OR screens: LiveStatusBadge is on the OR Suite board, Intraop Queue and WSI batches and shows Local updates without a hub; real-time needs the hub.
- #151 AI proxy, provider adapters and vendor policy (server side): Adapters, vendor policy and dev proxy are built; browser holds no keys (guard test). Only the production proxy routes are missing.
- #155 OR staff quick PIN: PIN attribution works with lab-staff refusal; only the badge/RFID reader hardware is missing.
- #156 Single sign-on (OpenID Connect): OIDC client with PKCE, config, role mapping and tests against a local fake provider are built; real IdP check and server-held sessions are external.
- #162 Terminology Services endpoints and health monitor: Endpoint list, health check, Test All and superadmin-only details are built. Licensed CPT/ICD-10 proxies are backend; UMLS works through the dev proxy.
- #167 Vendor HL7 adapters, vendor-neutral events and engine webhooks: Vendor-neutral events and the identity adapter work and dispatch; Vantage and Cerebro adapters deliberately throw pending vendor specs. Webhooks are server (entry 111).
- #168 AI proxy and AI vendor policy: Browser policy check is built and the dev proxy in vite.config serves AI calls; the production proxy routes and server-side policy repeat are server work.
- #169 Data retention policy and retention windows: Retention settings, material retention windows, holds and the disposal queue are built; the purge that acts on the AI/audit/snapshot settings is a server job (PS-345).
- #170 AI proxy (server holds every key): Dev proxy routes work and NavBar/System Info call checkAiProxyStatus; key-exposure guard test exists. The production API-server proxy is backend.
- #171 AI vendor policy by jurisdiction and facility: Policy rules screen, pre-call check, refusal and AI_CALL_REFUSED audit are built in the browser; the same 403 check in the server proxy is backend.
- #174 AI contribution tab: Duplicate of AI Contribution tab: real per-user numbers; hardcoded override examples are badged demo data. Cross-user aggregates need the server.
- #190 Cytology screening hours sign-off and workload report CYT-QA-05: Panel, rules, supervisor flags and CYT-QA-05 are built in the browser. Only server-recorded screening events (replacing the display timer) are backend.
- #195 Hosting regions card: Read-only card is built, labelled for demo, and reads server /api/config when present; region data is genuinely server supplied.

### Already built; inventory text was stale

- #114 Mock interface engine (developer tool): Built dev tool: MSW handlers with succeed/fail/hang modes plus slide-scanner and molecular-instrument simulators, routed at /dev/mock-interface-engine. 'Stub' is its intended nature, not a gap.
- #150 Mock EMR window and mock WSI viewer: Built demo tools: /mock-emr and /wsi-viewer routes exist (SignedInApp.tsx:309-310) behind __DEMO_TOOLS__. 'Stub' is their purpose; excluded from server builds on purpose.
- #175 AI spell check (retired) and unused mock AI service: RETIRED. Inventory entry removed on 18 October 2026: AI spell check was replaced by dictionary spell check in Batch 338. `MockAIIntegrationService.ts` is dead code that nothing imports; it can be deleted together with its line in the exemption list of `serviceResultShape.guard.test.ts`.
- #178 Known hotkey clashes: Batch 602 resolved clashes by policy: screen in focus wins, Alt+J leader, guard tests enforce it; 'known defect' is stale. Mac Option/AltGr fixed in Batch 614 (tested with simulated key presses).
- #181 Terminology decisions (French IPP, Korean honorifics, percentage points): src/i18n/README.md now has a Terminology decisions section, including the Ms. qualifier rule. It says Pete to confirm, so only his sign-off is left.

### Only the server, a licence, hardware or a decision remains

- #19 Retention policy setting (administrative data): Retention setting screen is built and saved with permission check; nothing purges, which is a scheduled server job (PS-345).
- #111 Engine webhooks (Vercel/Firestore implementation): api/webhooks/engine functions are real and unit-tested but are server code, to be replaced by the SQL Server API; browser side has no missing screen.
- #115 Interface engine edge contract (BridgeLink): Design contract only; the edge is the interface engine (hosting, ACK, retry, dead letters). TypeScript contract exists and the monitor screen reads it.
- #143 Production architecture direction and server contracts (what exists versus is specified): Architecture statement: the SQL Server API with SignalR is the backend team's build. Browser services are swappable behind src/services/index.ts.
- #154 Deficiency endpoints (Vercel functions): Server code under /api/qa/deficiencies (Vercel functions), not browser work. Nothing to build in the front end.
- #157 Multi-factor authentication: No app MFA by design: hospital SSO supplies it; password sign-in is demo accounts only. App-level MFA would be an auth-server feature. Needs Pete's product decision.

### Needs a decision

- #176 Computational Sidecar: RETIRED on 18 October 2026 at the product owner's request. Inventory entry removed; the four leftover voice commands and shortcuts (Open Computational Panel, Order Additional Test, Place Computational Orders, Cancel Computational Order) are removed from the action registry; flag maintenance and the display of past audit entries stay.

## Decisions (development team response, 17 October 2026)

1. #157 Multi-factor authentication: stays in Release 1 with documented acceptance criteria (supported protocol and identity provider documented, invalid and expired sessions rejected, MFA configuration evidence, logout and session-expiry tests, cross-organisation access tests, authentication audit events without secrets). Demonstration alone is not enough without test evidence.
2. #189 AI charge capture: stays in Release 1 as a human-reviewed capability. Distinct suggested, reviewed, approved and exported states; evidence and rule versions in the audit trail; no autonomous claim submission; production activation gated on validation, security, privacy and legal review. Any prototype is labelled not compliance-reviewed.
3. #2 One-organisation limit: kept provisionally until the deployment model (a separate instance per customer, or shared multi-tenant) is written down.
4. #176 Computational Sidecar: to be retired as superseded. Checked on 17 October: nothing in the code depends on it (only `constants/computationalActions.ts` and the flag audit logging remain). Retire the inventory entry after the team confirms no deployment configuration uses it. Update, 18 October 2026: the product owner asked for it to be removed, and it has been.

## Batch 612: Interface dictionary, workstation registry, report font sizes in points: DELIVERED (PS-788)
Interface Dictionary / Message Mapper (ForMedrixAI staff only, scope guard, Vendor fields panel), workstation registry with revocable tokens and context binding feeding print routing, enterprise vs facility scope reference, report font sizes in points with Convert to points, non-breaking dependency patches, @sentry/browser pre-bundled in vite.config.ts, mock AI integration service removed (DELETED_FILES.txt). Server side still open: interface engine applying published profiles, site agent token check, redeploy of functions/.

## Batch 613: Case search reporting, related cases, patient summary, patient case access, reporting feed: DELIVERED (PS-790)
Enhance case search rather than build a separate report writer: grouping and counts, user-chosen result columns, search on synoptic answer values, saved report definitions, scheduled-run setup (browser side against the mock service; running on a schedule needs server jobs). Also in 613 (Pete, Oct 18, 2026: "go with patient summary print"): a Patient summary print from the patient history view. Released cases only, chosen by the user in date order with diagnoses and source accessions, clearly labelled as a summary and not a signed report, own capability and audit entry, access limited to cases the user may already see.

### Batch 613 decisions (Pete, Oct 18, 2026): related cases at sign-out
- At sign-out an inline notice lists the patient's other released cases; the pathologist chooses which to attach. The selected reports are shown inside the sign-out view itself so the pathologist sees exactly what will go out.
- Each candidate shows the physicians tied to it (ordering and copy-to) so the pathologist can decide whether to include it. The choice is the pathologist's; no automatic recipient filtering.
- The attached section is frozen at sign-out. A later amendment to a related case raises a flag on the case; it does not change the attached section.
- It is part of what the pathologist signs and sends. The case goes out, in print, PDF and outbound results, exactly as the pathologist saw it at sign-out, attached reports included.
- The intraoperative diagnosis belongs to the case report and appears with it, like addendum data. It is not a separate report. To verify in 613: the signed report output and the sign-out view show it in the case report, and the related-case summaries do the same.

### Batch 613 decisions (Pete, Oct 18, 2026): access to a patient's other cases
- Patient History tells the viewer that other cases exist that they cannot view (count only, no details) and offers "Request access".
- New tracked request type "patient cases" on the existing access request record (patient, cases, required reason). Approvers: the case's assigned pathologist or an administrator. Grant stays open until revoked (revocation screen and audit). Requester is messaged on grant or denial.
- Timing: the notice and request are available from the moment the pathologist opens the case for workup, so access is normally settled before sign-out. Sign-out still shows the notice as a backstop; the pathologist can cancel sign-out, request, and resume.
- Every request, grant, denial, revocation and view is audited.

### Report font sizes (Pete, Oct 18, 2026: "7.5 is really too small")
Font sizes in Document Style and label settings change from CSS pixels to points: the number entered is the printed size (10 prints at 10 pt). Editor labels say pt, the preview matches, floor raised from 7 pt to 8 pt. Existing stored values are read as points, so existing templates print about a third larger; layouts to be rechecked. Renderer constant: PX_TO_PT in functions/report_layout.py. Scheduled with Batch 612.

### Report font sizes: plan revised (Pete, Oct 18, 2026)
1. Preview draws at true print size (1 pt = 1.333 px at 96 DPI) so 10 pt on screen matches paper; editor labels say pt.
2. Every template carries `units`: new templates "pt"; existing ones "legacy_px" and render as today (0.75 pt per px) until converted. Built-in default styles reset to 10-11 pt baselines. Editor offers "Convert to points" on a legacy template, listing each size to change, author confirms, audited. No automatic x0.75 conversion (it would keep the too-small 7.5 pt print). Floor 8 pt for pt templates. Recheck shipped layouts for page count. Batch 612.

- Batch 612 fork B (workstation registry and scope reference): built; browser side complete against a mock service, token check Simulated. See docs/architecture/WORKSTATION_REGISTRY.md.

### Batch 613: Power BI / BI feed (Pete chose the reporting API, Oct 18, 2026; backend work item PS-787)
Server work: read-only reporting views on SQL Server, or a reporting API (revocable tokens, same access rules, audit per pull, de-identified mode). Browser side: admin screen to enable the feed, choose datasets, create/revoke feed tokens, Simulated last-pulled status, field catalogue; plus an architecture document defining the contract. No existing contract in the repo.

## Batch 614: Voice and hotkey handlers, Code Systems wiring, keyboard and print follow-ups: DELIVERED (PS-791)
- A. Voice phrases/hotkeys with screen handlers for the 98 permission-only Role Dictionary entries (inventory says voice for them is Planned; that line must end Built (Demo)). Also the Alt+J cheat sheet gap and the Mac Option/AltGr caveat.
- B. PS-762: wire the Code Systems policy into the coding screens (batches 594-595 gap). Correlation report print view must not show MRN where the print rules say it should not.
- C. Hotkey clashes: the 67 known clashes triaged by rule (screen wins, Alt+J prefix); any that need Pete's decision listed for him, not guessed.
- Not code: PS-761 (look by eye after dead CSS removal), PS-322 (billing triage conflict), PS-497 (split oversized components gradually), default grants review, fr/de/nl/ko review.

## Batch 615: Open-ticket sweep: HTTP service pattern, CI, labels, RTL groundwork, flagged-finding code search: DELIVERED (PS-792)
- Built: PS-481 (API server chosen by configuration, mock stays the demo default), PS-482 cases only (HTTP case service, CASE_API.md section 6), `docs/architecture/HTTP_SERVICES_PATTERN.md` for the next wave, PS-471 (`.github/workflows/ci.yml`; takes effect once the repo is on GitHub, PS-468), PS-360 (vial, rack, plate and scan-batch labels; no screen calls them yet), PS-138 (Code Manager searches for flagged findings), PS-293 groundwork (direction follows language, logical CSS properties).
- Already built (triage was wrong), Jira comment only: PS-62, 72, 76, 294, 323, 479, 485, 491, 520, 554, 558, 359, 496.
- Decision (Pete, Oct 18, 2026): Arabic and Hebrew are held for a future release. No right-to-left language is enabled. PS-293 stays open for that.
- Wave 2 (not started): PS-483, 484, 498 to 515 HTTP implementations from the pattern doc; PS-487 (remove Firebase) waits on PS-501, 506, 512, 515; PS-486 and 488 need an audit.
- Waiting on Pete: PS-336 (where the second facility is recorded and when), PS-357 (voice and keys as access control versus the standing rule). Blocked: PS-347 (needs a Belgian speaker), PS-352 (server logs).

## Batch 616: Server (HTTP) versions of services, command-based follow-up tracking, biometric flow, audits: DELIVERED (PS-796)
- Built: server versions of 136 services across PS-483 (follow-up tracking included, command-based per Pete, Oct 18), 484, 498, 499, 500, 501, 502, 503, 504, 505, 506, 507, 508, 509, 510, 511, 512, 513, 515. Each has a fake-fetch test and a contract doc; the mock stays the default with no API address. Biometric sign-in now runs through one flow (server makes the challenge and checks the answer; demo stays Simulated).
- Audits: PS-486 partly (guard test for demo tools; a server build still bundles the mock services, lazy loading per service needed), PS-488 (AI and licensed UMLS routes are same-origin; the public NLM look-up is called from the browser: Pete to decide whether to route it through the API server).
- Still open: PS-514 (86 services still mock, listed in `docs/architecture/HTTP_SERVICES_REMAINING.md`), PS-487 (remove Firebase), peer review, CAPA recommendations, QA trend policy, label reprint runs and intraoperative critical results (no interface file yet).
- Routes are proposals (REST per resource in some contracts, `/api/<area>/<service>/<method>` in others, HTTP_SERVICES_PATTERN.md section 7): the India team must agree to them or the generator changes.
- Fixes with this batch: Korean Open History phrase now "과거 증례" (Pete, Oct 18); PrintRoutingRuleSection test double render; FacilityEditorModal test mock.

## Decisions (Pete, Oct 18, 2026, late)
- PS-336: the second facility is `technicalComponentFacilityId` on the case, set at accessioning; the technical charge goes out immediately, the professional -26 line and second branding block wait for final sign-out. Batch 618.
- PS-492: partial nephrectomy drawing always shows perinephric fat; adrenal only when staging logs a contiguous adrenal; Gerota's fascia only when staging logs disease beyond it. Batch 618.
- PS-497: no pilot yet, so no big-bang split. Large files are split when a story touches them (CLAUDE.md rule 10). A size ratchet guard (no file over 1,000 lines grows) is a small item for Batch 618.
- Arabic and Hebrew held for a future release (PS-293).
- Batch 617 route style: one convention `/api/<area>/<service>/<method-kebab>`, GET for plain reads, POST otherwise (HTTP_SERVICES_PATTERN.md section 7, HTTP_ROUTE_MAPPING.md).

## Batch 617: Remaining server versions (PS-514), one route style, NLM through the server, biometric switch, actions sweep: DELIVERED (PS-798)
- Built: server versions for the remaining services, about 220 in total across Batches 615 to 617; three stay in the browser by design (voice and hotkey registry, AI instruction rules, interface dictionary rules). One route style for all: `/api/<area>/<service>/<method-kebab>` (guard test `httpRoutes.guard.test.ts`; `HTTP_ROUTE_MAPPING.md` lists earlier paths). NLM look-ups (ICD-10-CM, ICD-11, LOINC) go through `/api/terminology/nlm/...` in server builds (PS-488, `TERMINOLOGY_PROXY_API.md`). Deployment switch `VITE_BIOMETRIC_SIGN_IN` turns biometric sign-in off. Actions sweep: 16 new Role Dictionary entries (371 total).
- Still open: PS-487 (remove Firebase: direct users remain in FirestoreCaseService, engraver monitor fetchers, deficiency fetchers, caseMaskService, biometric tenant lookups; the firebase folder, firestore.rules and packages go last), PS-486 (a server build still bundles mock services), PS-336 and PS-492 (decided; Batch 618), size guard (Batch 618).
- Waiting on others: the server (nothing was tried against a real server), a real authenticator, native review of fr/de/nl/ko text.

## Decisions (Pete, Oct 19, 2026): outbound delivery and registries (PS-800, Batch 619 and 620)
- PathScribe owns what is sent and when (rules, schedule, queue, status, audit); the interface engine owns how (translation, transport, transport retry, acknowledgements). One source of truth: engine acknowledgements update PathScribe's status.
- Schedules are held at enterprise level with performing-facility overrides.
- Registries use the same schedule tool: dynamic with a short review hold for cancer registries; batch for programs that only take files. Per-registry schedule, reporting deadline flag, amendments re-queue.
- Transport (REST with mutual TLS, encrypted SFTP, portal upload) is per-jurisdiction destination configuration, abstracted from the schedule.
- Rejection loop: central registries return validation errors that are queued back for a coder or pathologist to fix within a turnaround window (for example the UK 5-day COSD correction rule); a rejected state with a correction due date is part of the queue.
- Build priority for registry feeds (Batch 620, after the schedule and queue screens land): 1. US state cancer registries (NAACCR XML, batch-to-dynamic staging), 2. UK national registries (COSD XML, strict schema validation), 3. cervical and specialised screening programs (flat-file or custom HL7/FHIR on the batch pipeline).

## Decision, Oct 19 2026: registry feed order (Batch 620 and after)
Confirmed by Pete: 1) US ePath HL7 v2.5.1 (CDC NPCR), 2) UK COSD XML with the NCRAS correction loop, 3) screening programs and batch file fallback, 4) NAACCR XML as an optional abstract-level feed later.
Jurisdiction table supplied by Pete (US, UK, AU, CA, EU, South Korea, NZ): AU, CA, EU, Korea and NZ rows are a later batch. Their standards (HL7 v2.x variants, ICCR datasets, IARC/CanReg) must be verified against each registry's own specification before building.

## Decision, Oct 19 2026: US ePath design (Batch 620)
Generic NPCR ePath base (HL7 v2.5.1: MSH, PID, PV1, OBR, OBX; SNOMED/ICD-O coding; specimen identifiers; report status; case-finding triggers), plus a state profile layer (JSON per state: required and optional fields, transport, validation rules, field extensions), plus a transport adapter layer (PHIN-MS, SFTP, direct TCP, HTTPS API). No state is built first; states are profiles. The example field codes in Pete's note are illustrative and each real profile must be checked against that state's published specification.

## Decision, Oct 19 2026: which state registry receives the ePath feed
Per Pete: the state is chosen by where the work is performed, not where the patient lives. Registry routing for the US ePath feed keys off the performing facility's state (facility address), never the patient address. Where the technical component facility differs from the reading site (PS-336), the routing rule for the two facilities must be stated in each state profile and checked against that state's published requirements.

## Decision, Oct 19 2026: Spain in the first release, Mexico in version 2
Per Pete: add Spain now; hold Mexico until version 2 (the first release cannot support everyone).
Spain scope, to be planned as its own batch after Batches 618 to 620: Spanish locale (es-ES, sixth language, native review needed); Spanish cancer registry feed profiles (research each autonomous community's requirements first); Spanish invoicing and tax identifier rules in the international financial class work; Spanish coding and terminology; Spanish data protection and records rules. Mexico items stay listed as version 2.
Spain scope addition (Oct 19): Spanish spell-check dictionaries in the same two layers as the existing languages, a base es-ES Hunspell dictionary (licence added to NOTICE) and a Castilian pathology medical list, registered in the manifest with tests; native pathologist review needed; es-MX layer is version 2. Spanish SNOMED CT edition licensing to be checked under the terminology item.

## Scope freeze, Oct 19 2026
Per Pete: this is the last scope update for the first release. Spain is in, Mexico is version 2.
Spain cytology and HPV screening: add ES to the screening interval table (src/services/cytology/screeningIntervals.ts), choose the default screening strategy and any age-split rule, add Spanish cytology report wording, and add the regional screening and registry profile. Ages and intervals must be verified against Spain's published screening recommendations first; they are not entered from memory. Re-check the existing FR, DE, NL, BE and IE flows against current national programmes at the same time, because the EU countries differ.

## Jira sweep, requested Oct 19 2026
After the Spain work, sweep all existing PS tickets, including each "Not in this ticket" section, and confirm every item is built, scheduled in a batch, or owned by someone. Report gaps to Pete. No tickets are created unless Pete directs.

## Decision, Oct 19 2026: compete with mTuitive xPert, no integration
Per Pete: PathScribe replaces xPert as the synoptic layer instead of integrating with it. No xPert template, launch or write-back work is planned. Revisit only if a named customer requires it or mTuitive offers a documented partner interface. Customers switching from xPert will need their historical xPert reports brought in: that is a data migration question, tracked with the legacy migration work (PS-265), not an integration.

## Direction, Oct 19 2026: history from a legacy LIS (including xPert reports)
Per Pete: the legacy LIS keeps embedded synoptics inside its formal report, so in Assist mode they are available with the history. Where PathScribe owns the report, preferred approach for the first release: the old LIS stays read-only and PathScribe calls it. Converting through the interface engine (parsing embedded synoptic text into structured fields, PS-265) is a later option for labs that need structured history. Limits to state to customers: embedded synoptic text can be shown but not searched or reported on element by element; each legacy LIS needs a query interface, a long-term read-only home, and retention compliance. Related: PS-263, PS-266.
Future release (Pete, Oct 19 2026): AI extraction of structured synoptic data from historical reports, using the same capability Assist mode uses on gross and microscopic text. Needs: values labelled AI-extracted and shown beside the source text, pathologist confirmation before clinical use, mapping to the protocol version current at the time, the signed report staying the legal record, and accuracy validation on each lab's own reports. Builds on PS-265 and Assist mode. Planned, not built.

## Batch 621 (approved by Pete, Oct 19 2026): AI-read synoptic metadata for historical cases
When a historical case is pulled or refreshed, the existing AI synoptic capability reads its microscopic and final diagnosis text and saves the result as metadata beside the cached case: advisory, labelled "AI-extracted, not verified", shown beside the source text, never in a report, registry submission, billing or rule. Off by default (enterprise setting, facility overrides); every call checked against the AI vendor policy (PS-558); runs on open or refresh only, cached by source text, in the background; own capability and audit entries; a way to flag a wrong extraction. Starts after Batch 620 is delivered. Build on services/patientHistory and aiIntegration.

## Decision, Oct 19 2026: when history extraction runs (Batch 621)
Extraction stays bound to a signed-in user opening or refreshing a case, so the permission check and audit entry always have a real user. The Assist-mode LIS summary event does not run it. Alternatives considered and not built: a restricted system identity with its own audited permission to run extraction in the background; a queued request that waits and runs under the pathologist's session when the case is opened (this adds little over the current behaviour). Revisit the system identity only if labs need results ready before anyone opens the case.

Spain scope additions from Pete's dev note (Oct 19 2026). To be checked against the Spain research (/tmp/claude-0/spain_research.md) before building:
- Voice: add an es-ES (Castilian) voice profile; the browser's speech recognition decides what is supported. Catalan, Basque and Galician (co-official languages) are later, on demand; support in the browser engine varies and must be tested.
- Add Spain as a jurisdiction (ES): date and address formats, retention, code systems, signing authority.
- Wording: Iberian medical Spanish ("Anatomía Patológica", volante de petición, biopsia, pieza quirúrgica, médico solicitante); native review needed.
- Billing and coding: no CPT or RVU; diagnosis coding with ICD-10-ES (CIE-10-ES) and the procedure and payer frameworks of regional health services and private insurers, to be confirmed.
- Registries: autonomous community cancer registries (REDECAN network) and regional cervical and colorectal screening programmes; UI labels must map to those structures.
- Spain research with sources: docs/product/SPAIN_RESEARCH.md

- Jira sweep of 19 Oct 2026 (every "Not in this ticket" item checked): docs/product/JIRA_SWEEP_2026-10-19.md
