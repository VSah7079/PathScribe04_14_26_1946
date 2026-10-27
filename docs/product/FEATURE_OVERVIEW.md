# PathScribe — Feature Overview

**Last verified:** August 2026, against the real, current codebase (not
inherited from any earlier doc). Sections marked "(Sep 2026)" were added or
updated in Batch 406 (Sep 30, 2026), checked against the routes in `App.tsx`. Written to be a source for generating
Jira epics/features from — each section below is a real, distinct
capability area, not a code-organization artifact.

## How to read this

Each feature area below names the real routes/pages it lives at and
the real folder to go to for implementation detail (every folder has
its own `README.md` — this document is the rollup, not a replacement).
Status is marked honestly: **Live** (built, working, in real use in
the demo), **Partial** (some real, working pieces; a real, named gap
remains), or **Planned** (deliberately scoped, not yet built).


**Four voices (Pete, Oct 20, 2026).** Each feature section opens with four short descriptions: for the practitioner (plain language), for the system administrator (where and how to set it up), for marketing (positive, and never claiming more than is built), and for FormedrixAI and partners (the plain reality, including what is not built). The original technical detail follows each, unchanged. These were drafted from the technical text and need Pete's review; the marketing and partner wording most of all.

---

## Core clinical workflow

### Synoptic Reporting (`/case/:caseId/synoptic`) — Live

**For the practitioner.** This is the main page where you build a report and sign it out. If someone else saves a case you have open, a notice appears above the tabs with Show their changes and Later, and the tab bar shows who else has the case open and whether they are editing or viewing.

**For the system administrator.** The page runs in one of two modes: CoPilot, where PathScribe captures synoptic data for a host LIS, or Orchestration, where PathScribe owns the report lifecycle as a lightweight LIS for outreach cases. The tab bar shows each other person with the case open, with their work email and phone when the lab has them. Through the server, the save notice and presence depend on the hub's caseReport topic and presence methods, which are phase 2e.

**For marketing.** The central page lets a pathologist build and sign out a report, either as a passive synoptic capture layer beside your LIS or as a lightweight LIS with AI-assisted narrative generation. Instant notices when a colleague saves the same case, and a view of who else has it open, keep teams in step, and both are live in the demo.

**For FormedrixAI and partners (the plain reality).** Status: Live. CoPilot and Orchestration are the two modes, and Orchestration includes the Orchestrator engine for AI-assisted narrative. The same-case save notice (Batch 572) and who-else-has-it-open presence (Batch 573) are live in the demo across tabs and windows of the same browser only. Through the server they are Partial: the hub's caseReport topic and presence methods are phase 2e and not built.

*Technical detail (for developers and Jira):*
The central page: a pathologist builds and signs out a report. Two
distinct operating modes:
- **CoPilot** — PathScribe as a passive synoptic data-capture layer
  feeding a host LIS.
- **Orchestration** — PathScribe owns the full report lifecycle as a
  lightweight LIS for outreach cases, including AI-assisted narrative
  generation (the Orchestrator engine).

See `src/pages/SynopticReportPage/hooks/README.md` for the full
architecture (14 `use*` hooks covering LIS integration, specimen/block
management, report generation, amendment workflow, grossing
completion, sign-out/finalize, and more).
*Corrected in the Batch 496 README audit (Oct 9, 2026): hook count 10 → 14 (`src/pages/SynopticReportPage/hooks/`).*

**Someone else saved this case (Batch 572) — Live in the demo (another tab); through the server, Partial (the hub's `caseReport` topic, phase 2e).** When another user saves a case you have open, the report says so at once, above the tabs ("Someone else saved this case", with Show their changes and Later) instead of your next save being refused. Your own saves show nothing. *Batch 575:* Show their changes takes the newer case up in place, without a reload: anything you typed and haven't saved stays on top; if it overlaps their changes, nothing is replaced and your next save asks which to keep. *Batch 577:* the Edit Conflict box's Use their version shows their save in place too, discarding your unsaved work; afterwards the whole page (the synoptic form, lists, preview) matches their save. **Who else has the case open (Batch 573) — Live in the demo (other windows of the same browser); through the server, Partial (the hub's presence methods, phase 2e).** In the tab bar (Batch 577; it no longer moves the page): each other person with the case open, whether they are editing (have unsaved changes) or viewing, and their work email and phone when the lab has them; the same person in another window shows as "You, in another window". Screen readers hear one short message when someone opens, starts editing or closes the case.

### Case Accessioning (`/accession`) — Live

**For the practitioner.** This is where a case is created. You bring in the order, the patient and visit are matched, and you enter the specimens.

**For the system administrator.** The accessioning page handles case creation, order import, patient and encounter resolution and specimen entry. The description lists no settings or permissions for it.

**For marketing.** Accessioning brings case creation, order import, patient and encounter matching and specimen entry together in one place, so a case starts cleanly.

**For FormedrixAI and partners (the plain reality).** Status: Live. Covers case creation, order import, patient and encounter resolution and specimen entry. The description names nothing as not built.

*Technical detail (for developers and Jira):*
Case creation, order import, patient/encounter resolution, specimen
entry.

### Sign-out checks, release permissions and privacy — Built (Demo), Batch 649

**For the practitioner.** Whichever way you sign (Sign Out Case or Finalize), PathScribe checks the same things first: hold, microscopic documentation, critical findings, required fields and unverified AI answers. If signing fails part way, the case is put back and you are told. Buttons you may not use are greyed, and a refusal names the missing permission. Only a pathologist or fellow releases a preliminary report. Support screenshots hide every patient identifier.

**For the system administrator.** 17 new capabilities (sign-out, preliminary and revision release, recall, pool claim and pass, flags, diagnosis codes, create case, informal review, four QA deficiency actions) are granted in the Role Dictionary; built-in roles are seeded as in `GUIDE_UPDATES.md` (Batch 649). Signing needs the capability and active case participation; there is no administrative override. The registry submission follows the FINAL's release after the delay.

**For marketing.** One consistent set of safety checks at every sign-out, a signature tied to the exact report version and its PDF fingerprint, fine-grained permissions with no back door, and support screenshots that hide patient identifiers.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). One-transaction sign-out is not built (API server planned): a version written before a later failure stays, and a correction released before a later failure is not undone. Open: role-name shortcuts in macro access, template publishing and billing-charge approval; most permission checks pass only the case id (facility-limited staff are refused). See `KNOWN_GAPS.md`. New interface text is machine translated.

*Technical detail (for developers and Jira):*
- Gates: `services/signoutGates/signOutReviewGates.ts` (`runSignOutReviewGates`), used by Assist Finalize and Orchestration Sign Out Case. Writes: `services/surgicalSignOut/` (`completeSurgicalSignOut` status first with rollback, then countersign, revisions, version, signature linked to version id, number and PDF SHA-256; `completeAssistFinalize`; `releaseRevisionsAtSignOut`; `releaseSurgicalFinal` for the registry).
- Release rules: `reports/revisionReleaseCapability.ts`, `releasePreliminaryReport.ts`, `publishDirectAddendum.ts`; recall in `reportRelease/releaseReport.ts`.
- Permissions: `authorization/workflowCapabilities.ts`, `capabilitySeeds.ts`; `auth/authorizeSurgicalSignOut.ts`, `canFinalizeCase` (no `admin-override`). Catalog 338 capabilities, 287 high risk.
- Privacy: `services/phiSelectors.ts` (every `data-phi` / `data-pii`), `services/scanner/scanKeyFilter.ts`.
- Tests: `docs/quality/evidence/PathScribe-Batch649-xray.json`.

### Audit trail for case and quality actions — Built (Demo), Batch 651

**For the practitioner.** More of the work you do is now on the record, so the lab can show who did what and when: taking or passing a pool case, handing a case to a colleague, changing the case team, adding a comment, adding a word to your own dictionary, changing your screen language, and the Quality deficiency actions. What you type in a comment is not copied into the audit record.

**For the system administrator.** Audit Log > System Logs now shows Pool case claimed / passed, Pool claim hold taken / released, Case delegated, Case team changed, Case comment added, Specimen comment added, Personal spelling dictionary word added / removed, Screen language changed, and Deficiency raised / escalated to CAPA / contained / effectiveness verified / reopened as recurred. Identifiers only; no comment text, notes, free text or dictionary word. No new setting.

**For marketing.** A fuller trail of who did what on every case: claims, hand-offs, team changes, comments and quality actions, each tied to the person and the facility, with no patient identifier or free text in the audit record.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). The general clinical audit log is still not tamper-evident: append-only by interface only (the app never edits or deletes an entry), with server-side tamper-evidence Planned for the API server. The 30-second claim hold is released by the window, not by a server clock, so a lapse with no window is not recorded. Accessioning-time comments are not audited separately. Voice-command audit is Batch 650a. Case and specimen comments are not printed and not sent to the LIS (KNOWN_GAPS).

*Technical detail (for developers and Jira):*
- Writers (each in the service doing the work): `cases/poolCaseActions.ts`, `delegations/delegationAudit.ts`, `cases/saveCaseTeam.ts` + `caseTeamAudit.ts`, `cases/postCaseComment.ts` (moved out of the 7,000-line report page), `spellcheck/mockCustomDictionaryService.ts`, `userSettings/personalLanguage.ts`, `deficiencies/qaDeficiencyActions.ts`. Event catalogue: `services/auditlog/README.md` (Batch 651).
- Tests: one per service (entry written on success with actor, case and facility; none when refused; no PHI).

### Defect fixes: peer averages, microtomy scan labels, multi-recipient delegation, https-only links, report barcode — Built (Demo), Batch 652

**For the practitioner.** My Contribution shows real peer averages (colleagues with your role at your facility) or "Not enough data" when there are fewer than three. Scanning a block at a microtomy bench prints its slide labels; a failed print leaves the slide pending. Teaching Case can go to several residents or fellows. Insecure (http) resource links are greyed and do not open. The footer barcode on a pending-release print is solid black and scans.

**For the system administrator.** Scan Stations: "Supports printing" plus a slide printer profile now drives the scan-time label. Delegation Types: the multi-recipient switch is honoured. External Resources: https only for new and edited links; old http links show a warning. No new capability: `case:delegation:create` is checked once per recipient.

**For marketing.** Peer comparison from real work, labels that print at the scan, team teaching hand-offs, secure reference links and a barcode that always scans.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo), tested with the print service mocked and never run on real printers. Peer averages are computed in the browser and need a server version. Comments still do not print or go to the LIS, and the release-hold print still warns rather than blocks (both product decisions, `KNOWN_GAPS.md`). Files: `pages/contributionDashboardCalculations.ts`, `utils/labels/dispatchScanSlideLabel.ts`, `services/delegations/delegateToRecipients.ts`, `services/externalResources/externalResourceUrl.ts`, `functions/main.py`.

### Lockbox Drop-Off (`/lockbox-drop-off`) — Built (Demo), Batch 645; demo seed cases Batch 648

**For the practitioner.** After hours, scan the container barcode and you are done: the specimen has a permanent "Received in Lockbox" receipt. If the order is already in PathScribe, the receipt shows its number and the ordering facility. If not, an optional form records who sent it and when, and a temporary placeholder keeps the record. Mark a drop **Urgent** (optionally with a callback number) and it goes to the top of the morning's **Overnight folder**.

**For the system administrator.** Home tile and Alt+Shift+Z. Capabilities: `screen:lockbox-drop-off:open`, `lockbox:specimen:receive` (scan; high risk, audited), `lockbox:folder:review` (folder, QA time figures, Mark accessioned) and `lockbox:placeholder:resolve` (link a placeholder). Client and physician lists come from the dictionaries. Receipts are append-only, one per barcode. In the demonstration the screen opens with six seeded receipts, and **Configuration > Demo Reset > Full Reset** puts them back. Admin Guide: Tier 3, reference pages.

**For marketing.** After-hours specimens are never lost between the lockbox and the bench: one scan writes a permanent receipt, urgent drops come first, and Quality gets drop-to-accessioned timings.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). The API server that stamps the receipt time and user is not built (the demo uses the browser's clock and the signed-in user), nor is a device-bound kiosk sign-in. The five non-English languages are machine translated. No patient name, date of birth or MRN is read or shown. The seed cases are demonstration data only; the presenting script is in `DEMO_GUIDE.md`.

*Technical detail (for developers and Jira):*
- What it does: scan, lookup (earlier receipt, pending order, or unknown), receive, placeholder (`LBX-PH-YYYYMMDD-NNN`, never an accession number), Overnight folder (urgent first, then oldest), link a placeholder, mark accessioned, drop-to-accessioned summary.
- Demo seed (Batch 648): `services/lockbox/lockboxDemoSeed.ts` builds six receipts and two resolutions from the clock; `mockLockboxService.ts` writes them on first read; Demo Reset clears the keys (mock-prefix sweep), so the next read re-seeds. Tests: `lockboxDemoSeed.test.ts`.
- Batch 652: a case accessioned from an order that came through the lockbox is linked to its receipt both ways (`LockboxResolution.caseId`, `Case.lockboxReceiptId`) and the receipt is marked accessioned in one call (`accessionReceiptForCase`, `lockbox:folder:review`, audited). The manual Mark accessioned button stays.
- Sources: `pages/LockboxDropOffPage/`, `services/lockbox/`, `docs/architecture/LOCKBOX_API.md`.

### Grossing — Live

**For the practitioner.** Grossing is driven by scanning. Default blocks and decants are made when the case is accessioned, scans fill in the grossing details, and cassettes are routed by color. Matrix and shared blocks are supported.

**For the system administrator.** Grossing is scan-driven: default block and decant generation at accession, grossing-scan hydration, cassette color routing and matrix and shared-block support. The description lists no screen or permission settings.

**For marketing.** Scan-driven grossing means less typing at the bench: default blocks and decants appear at accession, scans fill in the details, and cassette color routing and shared-block support are included.

**For FormedrixAI and partners (the plain reality).** Status: Live. Scan-driven grossing with default block and decant generation at accession, grossing-scan hydration, cassette color routing and matrix and shared-block support. The description names nothing as not built.

*Technical detail (for developers and Jira):*
Scan-driven grossing workflow: default block/decant generation at
accession, grossing-scan hydration, cassette color routing
(`services/cassetteRouting/`), matrix/shared-block support.

### Amendment, Correction & Addendum — Live

**For the practitioner.** When a signed report needs to change, the system handles it in two stages and sorts the change as a pure addendum, a pure amendment, or a correction with an addition. A PDF copy of the report is saved every time it is signed out.

**For the system administrator.** This is a real two-stage pipeline that sends the change before it releases it, and it handles LIS Amendment Notices. Changes are classified as pure addendum, pure amendment or corrected-with-addition, and a ReportVersionRecord PDF snapshot is kept at every sign-out.

**For marketing.** Corrections, amendments and addenda follow a real two-stage pipeline with automatic classification, and a PDF snapshot of the report is kept at every sign-out, giving a clear record of each version.

**For FormedrixAI and partners (the plain reality).** Status: Live. It is a real two-stage pipeline with transmission-before-release ordering, LIS Amendment Notice handling, hybrid classification and ReportVersionRecord PDF snapshots at every sign-out. The description names nothing as not built.

*Technical detail (for developers and Jira):*
Real two-stage pipeline (transmission-before-release ordering), LIS
Amendment Notice handling, hybrid classification (pure addendum / pure
amendment / corrected-with-addition), `ReportVersionRecord` PDF
snapshots at every sign-out.

### hrHPV result inbound — Partial, Batch 629 (PS-174)

**For the practitioner.** Results for the HPV high-risk test are partly in place. You can see an Invalid result on the triage row, but results cannot yet arrive from a real molecular platform.

**For the system administrator.** Result handling, triage, audit and the engine contract are built and tested. The server route and the engine channel for a real molecular platform are not built, so nothing arrives from a real platform yet.

**For marketing.** Inbound hrHPV result handling, triage and audit are built and tested, with an Invalid result visible right on the triage row. Connection to a real molecular platform is the next step.

**For FormedrixAI and partners (the plain reality).** Status: Partial (Batch 629, PS-174). Result handling, triage, audit and the engine contract are built and tested, and the Invalid result is visible on the triage row. NOT built: the server route and the engine channel for a real molecular platform. The duplicate-delivery check on an inbound result (`processedMessageIds`) lives in the browser's memory only, so it forgets on reload and does not protect across users; the server must keep that record (Planned, `HPV_RESULT_INBOUND.md`).

*Technical detail (for developers and Jira):*
Result handling, triage, audit and the engine contract are built and tested; the Invalid result is visible on the triage row. The server route and the engine channel for a real molecular platform are not built (`docs/architecture/HPV_RESULT_INBOUND.md`). The inbound duplicate check is an in-memory set in `processInboundHpvResultEvent.ts`; the server stores it as the composite key.

### CSMS eligibility check — Built (Demo), Batch 636 (PS-193)

**For the practitioner.** On the CSMS QA tab you record whether the patient is eligible, either verified in one click or not eligible with a quick-pick reason. The message to the registry waits for your answer: Verified sends it, and Not eligible closes it unsent with the reason.

**For the system administrator.** On the CSMS QA tab, the eligibility answer is recorded for a case, which clears its verification flag. It is permission-controlled and audited. The CSMS message waits for the answer, and Resend on Registry Exceptions cannot release it. PathScribe holds no eligibility data of its own.

**For marketing.** Recording a CSMS eligibility answer takes one click to verify, or a quick-pick reason if the patient is not eligible. It is permission-controlled and audited, and the message is held until the answer is in. It is built and available in demonstration.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo), Batch 636 (PS-193), with the waiting behavior from Batch 638. Tested in the demo only. NOT built: the server enforcement, which is part of phase 2e. PathScribe still holds no eligibility data of its own.

*Technical detail (for developers and Jira):*
The CSMS QA tab records the eligibility answer for a case (verified in one click, or not eligible with a quick-pick reason), clearing its verification flag; permission-controlled and audited. PathScribe still holds no eligibility data of its own. From Batch 638 the CSMS message itself waits for the answer: Verified sends it, Not eligible closes it unsent with the reason; Resend on Registry Exceptions cannot release it. Tested in the demo only; the server enforcement is part of phase 2e.

### CLIA workload reassignment to colleagues — Built (Demo), Batch 635 (PS-189)

**For the practitioner.** When the daily limit stops a cytotechnologist, their pending cases go to colleagues who still have room, and any left over go to the pool. The change is recorded and the accession status is not touched.

**For the system administrator.** When the daily limit blocks a cytotechnologist, pending cases are reassigned to colleagues who have room under their own cap, and the remainder go to the pool. The reassignment is audited and accession status is untouched.

**For marketing.** CLIA workload limits no longer leave cases stuck: pending cases move to colleagues with capacity, and the rest go to a shared pool, all audited. This is built and available in demonstration.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo), Batch 635 (PS-189). Reassignment to colleagues under their own cap, then the pool, is audited and leaves accession status untouched. The description gives no server or real-site testing.

*Technical detail (for developers and Jira):*
When the daily limit blocks a cytotechnologist, pending cases go to colleagues who have room under their own cap, and the rest to the pool; audited, accession status untouched.

### Result dispatch audit — Built (Demo), Batches 633–634 (PS-171)

**For the practitioner.** If a cytology or surgical result cannot be queued to go out because the patient is not found in the patient index, it is no longer skipped silently. It is written to the Audit Log with the case and the reason.

**For the system administrator.** A result that cannot be queued for the interface engine because the patient is not in the patient index is recorded in the Audit Log with the case and reason. The lookup uses the API server's patient index when one is connected.

**For marketing.** Results no longer disappear quietly: if a patient is missing from the patient index, the case and reason are recorded in the Audit Log. It is built and available in demonstration.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo), Batches 633 to 634 (PS-171). Failed queueing for the interface engine is logged with case and reason instead of being skipped. The lookup uses the API server's patient index only when one is connected, and the description does not say that has been tested.

*Technical detail (for developers and Jira):*
A cytology or surgical result that cannot be queued for the interface engine because the patient is not in the patient index is recorded in the Audit Log (case and reason) instead of being skipped silently; the lookup uses the API server's patient index when one is connected.

### Self-collected HPV recall, Australia and New Zealand — Partial, Batches 631–632

**For the practitioner.** This helps follow up self-collected HPV tests for Australia and New Zealand. Urgent genotypes are prioritized, recall wording is available in six languages, and an Invalid result prompts a repeat collection. The recall is closed automatically when the clinician-collected sample arrives. It is still waiting on programme sign-off.

**For the system administrator.** From Batch 640 the lab's administrator sets each country's windows and recall wording, per language, from a Country dropdown, and the changes are audited. The target windows are configurable and the register codes stay with the interface engine. The recall codes, windows and wording await programme sign-off.

**For marketing.** Self-collected HPV recall brings genotype-based priority, configurable target windows, programme wording in six languages, repeat collection for an Invalid result and automatic closure when the clinician-collected sample arrives. It is partly built and on its way to programme sign-off.

**For FormedrixAI and partners (the plain reality).** Status: Partial, Batches 631 to 632. Built: 16/18 urgent and other routine priority, configurable windows, six recommendation codes in the register payload, wording in six languages, repeat collection and automatic closure. NOT built: the register feeds, which are interface-engine work, and NZ is not yet scoped. The recall codes, windows and wording await programme sign-off.

*Technical detail (for developers and Jira):*
Recall priority by genotype (16/18 urgent, other routine), configurable target windows (Batch 632), the six recommendation codes in the register payload, programme wording in six languages, repeat collection for an Invalid result, and automatic closure when the clinician-collected sample arrives. The recall codes, windows and wording await programme sign-off; the register feeds are interface-engine work (not built; NZ not yet scoped). From Batch 640 the lab's administrator sets each country's windows and recall wording (per language) from a Country dropdown, audited; the register codes stay with the interface engine.

### Manual hrHPV result entry — Built (Demo), Batch 630 (PS-174)

**For the practitioner.** If an HPV high-risk result does not arrive through the interface, you can enter Positive or Negative by hand. You must give where the result came from, and if it would replace an interface result a second person has to approve it.

**For the system administrator.** Manual hrHPV entry is permission-controlled and requires a Result Source. Each entry is audited with who, when and the earlier result. A second person's approval is needed when the entry would replace an interface result.

**For marketing.** Results that do not arrive by the interface can still be recorded by hand, with a required source, a full audit trail and a second-person check where an interface result would be replaced. It is built and available in demonstration.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo), Batch 630 (PS-174). Positive and Negative hand entry with Result Source, audit and second-person approval for replacements. The description gives no server or real-site testing.

*Technical detail (for developers and Jira):*
Record Positive / Negative by hand for results that do not arrive by the interface: permission-controlled, a required Result Source, an audit entry with who, when and the earlier result, and a second person's approval when the entry would replace an interface result.

### Reactive changes sign-out setting — Built (Demo), Batch 626 (PS-163)

**For the practitioner.** A lab setting decides whether a cytotechnologist may sign out a negative GYN case with reactive changes, or whether a pathologist has to review it. The starting choice is the cytotechnologist.

**For the system administrator.** This is a one-switch lab setting under Cytology Categories. It controls whether a cytotechnologist may sign out a negative GYN case with reactive changes or a pathologist must review it. The default is cytotechnologist, and the setting applies to new reviews.

**For marketing.** Each lab can choose with a single switch who signs out negative GYN cases with reactive changes, a cytotechnologist or a pathologist. It is built and available in demonstration.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo), Batch 626 (PS-163). A one-switch lab setting in Cytology Categories, default cytotechnologist, applying to new reviews. The description gives no server or real-site testing.

*Technical detail (for developers and Jira):*
A one-switch lab setting (Cytology Categories) for whether a cytotechnologist may sign out a negative GYN case with reactive changes or a pathologist must review it; default cytotechnologist; applies to new reviews.

### Cytology case report: one report per accession — Live (Batch 532)

**For the practitioner.** Each cytology specimen is screened, reviewed and signed on its own, but the clinician gets one report for the whole case once it closes. An urgent finding can go out first as a clearly marked preliminary report, and your lab decides who may send it.

**For the system administrator.** Nothing is published until the case closes, then one consolidated PDF and one HL7 result message go out. Registry submissions go per sample, together, at closure. Who may send a preliminary report and whether it needs the electronic signature are set by each laboratory, and every output follows the laboratory's release delay.

**For marketing.** Clinicians receive a single, consolidated report per accession, with a summary page listing every specimen and its status. Urgent findings can be sent early as a clearly marked preliminary report.

**For FormedrixAI and partners (the plain reality).** Status: Live (Batch 532), with preliminary reports from Batch 533 and release delay from Batch 534. One consolidated PDF and one HL7 result message per accession, and unsigned specimens are listed as not reported with the reason on an early close. The description names nothing as not built.

*Technical detail (for developers and Jira):*
Each cytology specimen is screened, reviewed and signed on its own, but the
clinician receives one report for the accession: nothing is published until
the case closes (the last specimen signed, or the case finalized early), then
one consolidated PDF (a first page listing every specimen and its status,
then each specimen's signed report) and one HL7 result message. Registry
submissions go per sample, together, at closure. An early close lists unsigned
specimens as "not reported" with the reason; a correction or addendum
reissues the whole case report. An urgent finding on one specimen can go
out first as a clearly marked preliminary report (Batch 533); who may send
one and whether it needs the electronic signature are set by each
laboratory. Every one of these follows the laboratory's release delay
(Batch 534).

### Release delay and recall — Live (all outputs from Batch 534)

**For the practitioner.** After a report is released it waits out your lab's release delay before it reaches the clinician, print, fax or a registry. Until the delay ends, the person who released it can recall it, which reopens it for correction and sends nothing. STAT cases can skip the delay.

**For the system administrator.** The delay is set for the enterprise and per performing lab, and STAT cases can skip it. It applies to all report outputs, including preliminaries, corrections and addenda. A resend after a failed delivery is never delayed. While a report is in its delay, a correction or addendum cannot be started and is changed by recall, and a released PDF never carries the pending release watermark.

**For marketing.** A configurable release delay gives a safety window before any report goes out, and the releasing person can recall it in that time. It covers surgical, autopsy and cytology sign-outs.

**For FormedrixAI and partners (the plain reality).** Status: Live, with all outputs covered from Batch 534 and autopsy and surgical recall from Batch 535. NOT built: the server-side scheduler, which comes with the API server (PS-539).

*Technical detail (for developers and Jira):*
Every report output waits out the laboratory's release delay before it
reaches the clinician, EMR, print, fax or a registry: surgical, autopsy and
cytology sign-outs, preliminaries, corrections and addenda. The delay is set
for the enterprise and per performing lab; STAT cases can skip it. Until it
ends, the person who released the report can recall it, which reopens it
for correction and sends nothing. A resend after a failed delivery is never
delayed. Released on time from any open screen. Recall reopens surgical
corrections and addenda and autopsy PAD/FAD too (Batch 535). A
server-side scheduler comes with the API server (PS-539). While a report
is in its delay, a correction or addendum can't be started: it is changed
by recall (Batch 540), and a released PDF never carries the "pending
release" watermark. See [REPORT_RELEASE_DELAY.md](REPORT_RELEASE_DELAY.md).

### Site agents — Partial (browser side built, Batches 552–553; agent and server planned, phase 2e)

**For the practitioner.** Nothing here changes how you work yet. A small program on the lab's own network would send reports and labels to the lab's printers. The Print Queue shows Sent to printer when the printer cannot confirm, and Printed when it does.

**For the system administrator.** Go to Configuration → System → Site agents. There you can see each agent's status, version, last check-in and certificate expiry, make a one-time enrolment code, revoke an agent with a reason, set up agent printers (IPPS preferred) and file shares, and set the update window. Passwords are never entered in PathScribe, and the agent needs no inbound firewall port.

**For marketing.** A small site agent on the lab's own network will route reports and labels to local printers and file shares without opening an inbound firewall port. The administrator screens for managing agents, printers and update windows are built.

**For FormedrixAI and partners (the plain reality).** Status: Partial. Built: the browser side (Batches 552 to 553) including the Site agents screen, agent printer choice and Print Queue status. NOT built: the agent itself and the server, which are planned for phase 2e. Instruments are planned for agent version 2.

*Technical detail (for developers and Jira):*
**What it is:** the site agent is a small PathScribe program installed on a performing lab's own network. It sends reports and labels to the lab's printers, and writes and picks up files on its shares. It needs no inbound firewall port.

**Configuration → System → Site agents** lets administrators:
- see each agent's status (online, needs attention, offline), version, last check-in and certificate expiry;
- make a one-time enrolment code to install a new agent;
- revoke an agent, which cuts it off at once (with a reason picked from a short list);
- set up the lab's agent printers (IPPS preferred) and file shares. Passwords are never entered in PathScribe;
- set the agent's update window, so it updates outside working hours.

**Choosing an agent printer** (Batch 553): print routing rules, a facility's default printer and the Print Queue's Redirect pick one of the lab's agent printers by name, instead of typing an IP address. A report always prints at the lab that performed it.

**Print Queue:**
- It shows "Sent to printer" for printers that can't confirm printing (Raw 9100, LPR), and "Printed" when the printer confirmed it (IPPS).
- It also shows the agents' status.

**Planned:**
- Instruments (agent version 2).

Contract: `docs/architecture/SITE_AGENT_API.md`.

### Hosting regions shown to administrators — Partial (Batch 557; the server's /api/config planned, phase 2e)

**For the practitioner.** This is an administrator display and does not change what you do at the bench.

**For the system administrator.** In the AI provider settings, "Where PathScribe keeps data" shows the database and file storage regions reported by the PathScribe server, beside the AI service's region. A server can also give a few AI and voice settings at startup. Sign-in and other security settings always stay in the site's own config.json.

**For marketing.** Administrators can see at a glance where PathScribe keeps data, including database, file storage and AI service regions.

**For FormedrixAI and partners (the plain reality).** Status: Partial (Batch 557). Built: the display in the AI provider settings. NOT built: the server's /api/config, which is planned for phase 2e.

*Technical detail (for developers and Jira):*
"Where PathScribe keeps data", in the AI provider settings, shows the database and file storage regions reported by the PathScribe server, beside the AI service's region (Batch 536). A server can also give a few AI and voice settings when the app starts. Sign-in and other security settings always stay in the site's own config.json.

### Released report documents — Live in the demo; through the server, Partial (Batch 556)

**For the practitioner.** When a report is released, one stored copy is kept, and every way it is sent uses that same copy. In Version History, View as sent opens it, and you will see a message if the server cannot be reached.

**For the system administrator.** Every released report is stored once with its SHA-256 fingerprint, and every channel (result message, print, fax, file drop) sends those bytes. View as sent in Version History opens them. With the PathScribe server, the documents are fetched and checked again, and the screen warns when the server cannot be reached or the list may be incomplete.

**For marketing.** Every released report is stored once with a SHA-256 fingerprint, and every channel sends exactly those bytes, so what you review is what went out. It is live in the demo.

**For FormedrixAI and partners (the plain reality).** Status: Live in the demo; through the server, Partial (Batch 556). NOT built: the server's document endpoints, which are planned for phase 2e.

*Technical detail (for developers and Jira):*
Every released report is stored once, with its SHA-256 fingerprint, and every channel (result message, print, fax, file drop) sends those bytes. "View as sent" in Version History opens them (Batch 538).

With the PathScribe server (Batch 556), they are fetched from the server and checked again. The screen says when the server can't be reached or the list may be incomplete. Planned: the server's document endpoints (phase 2e).

### Signed report versions — Live in the demo; through the server, Partial (Batch 558)

**For the practitioner.** Version History lists each signed version of a report with who signed it, the patient and visit as they were, and its PDF. A version whose PDF fails its check is refused rather than opened or sent.

**For the system administrator.** Every version's PDF is checked against its SHA-256 fingerprint before it is opened, sent as a result message or used when a held report is released, and one that fails is refused. With the PathScribe server, the server's versions are listed too and their PDFs fetched from it.

**For marketing.** Version History gives a clear list of each signed version, with the signer, the patient and encounter as they were, and a verified PDF. It is live in the demo.

**For FormedrixAI and partners (the plain reality).** Status: Live in the demo; through the server, Partial (Batch 558). NOT built: the server's version endpoints, which are planned for phase 2e.

*Technical detail (for developers and Jira):*
Version History lists each signed version of a report, with who signed it, the patient and encounter as they were, and its PDF. Every version's PDF is checked against its SHA-256 fingerprint before it is opened, sent as a result message or used when a held report is released (Batch 558); one that fails is refused. With the PathScribe server, the server's versions are listed too and their PDFs fetched from it. Planned: the server's version endpoints (phase 2e).

### Server jobs — Partial (browser side built, Batch 551; server planned, phase 2e)

**For the practitioner.** This is an administrator screen and does not change your daily work. In the demo, the browser does the background work itself.

**For the system administrator.** System Logs → Server jobs shows what is waiting, running or overdue by kind, whether recurring jobs are running on time, and jobs that failed for good with their error. One click requeues a job and the requeue is audited. Two permissions (see and requeue) go to Admin by default, and someone assigned to some facilities sees only theirs. The deployment setting VITE_SERVER_JOBS names the jobs the server runs so the browser stops exactly those.

**For marketing.** Administrators get one screen showing the health of background work, with one-click, audited requeue for failed jobs. The browser side is built and works in the demo.

**For FormedrixAI and partners (the plain reality).** Status: Partial. Built: the browser side (Batch 551) and the hand-over setting (Batch 555). NOT built: the server and the jobs themselves, which are planned for phase 2e. In the demo the browser does this work itself.

*Technical detail (for developers and Jira):*
**What it shows:** with the PathScribe server, deliveries, prints, interface messages, held releases, charges and exports run as background jobs. System Logs → **Server jobs** shows administrators:
- what is waiting, running or overdue, by kind;
- whether each recurring job (delivery retries, held releases, link expiry and others) is running on time;
- the jobs that failed for good, each with its error. One click requeues it, and the requeue is audited. Interface and print jobs are resent from their own screens.

**Permissions:** two permissions (see and requeue), given to Admin by default. Someone assigned to some facilities sees only theirs.

**In the demo:** the browser does this work itself.

**Moving the work to the server** (Batch 555): until the server runs a recurring job, the browser keeps doing it while someone is signed in. A deployment setting (`VITE_SERVER_JOBS`) names the jobs the server runs, and the browser stops exactly those, so nothing is done twice or left undone. Planned: the jobs themselves (phase 2e).

Contract: `docs/architecture/MESSAGE_BUS_API.md` §4a.

### Large exports in the background — Partial (browser side built, Batch 550; server planned, phase 2e)

**For the practitioner.** A quick export downloads at once. A longer one shows a Preparing notice while you carry on working, and then offers Download. My exports in the top bar lists your exports from the last 7 days.

**For the system administrator.** Each export keeps its own permission, checked when it is requested and again at download. Only the requester can download it, and their notices are cleared at sign-out. My exports lists the last 7 days with Download, or Cancel while preparing. In the demo, 3 may be open per user and exports are labelled Simulated.

**For marketing.** Large exports no longer hold you up: they prepare in the background and offer Download when ready. The full experience is built and available in demonstration.

**For FormedrixAI and partners (the plain reality).** Status: Partial. Built: the browser side (Batch 550), with every export button going through one export service. Built (Demo): a simulated export server (Batch 611, #194), labelled Simulated. NOT built: the server's export endpoints and jobs, planned for phase 2e and the backend team's work.

*Technical detail (for developers and Jira):*
**What it does:** QA, audit, billing, disposal, contribution, change history and case search exports run on the server as background jobs.
- A quick export still downloads at once, with no extra click.
- A longer one shows a small "Preparing…" notice, and the user carries on working.
- When it's ready, the notice offers **Download**.
- **My exports** (top bar) lists the user's exports from the last 7 days, with Download, or Cancel while one is being prepared.

**Permissions:** each export keeps its own permission, checked when it is requested and again at download. Only the person who asked can download it, and their notices are cleared when they sign out.

**Status:**
- **Built (Batch 550):** every export button goes through the one export service, which uses the PathScribe server when one is configured.
- **Planned:** the server's export endpoints and jobs (phase 2e).
- **In the demo (Batch 611, #194):** a simulated export server keeps the whole experience: quick exports at once, larger ones Preparing then Download, 3 open per user, Cancel, 7-day expiry, all labelled Simulated and cleared at sign-out. It is Built (Demo); the real server remains the backend team's work.

Contract: `docs/architecture/ASYNC_EXPORT_API.md`.

### What was sent is what you see — Live in the browser (Batch 538; server storage Planned)

**For the practitioner.** Each released report is stored once, and everything sent out uses that exact file. View as sent in Version History opens it, so what you see is what went out. The print preview matches the released report except for the PRELIMINARY watermark and signature line before signing.

**For the system administrator.** Each delivery records the fingerprint, and a stored file that no longer matches its fingerprint is refused. In the demo, browser storage holds the documents within its size limit. Cytology reports, previews included, use the same server renderer as surgical reports, live once the report renderer is redeployed.

**For marketing.** What was sent is what you see: every channel, including retries, sends the same stored file with a SHA-256 fingerprint, and View as sent opens it byte for byte. This is live in the browser.

**For FormedrixAI and partners (the plain reality).** Status: Live in the browser (Batch 538). NOT built: server storage, where the API server would hold documents in tamper-proof storage. Not covered yet: deliveries queued before Batch 538, per-specimen cytology messages, and releases whose PDF could not be made. Cytology (Batch 539) is Live once the report renderer is redeployed.

*Technical detail (for developers and Jira):*
Each released report is stored once as a document, with its SHA-256 fingerprint. Every channel sends exactly that file:
- the result message to the EMR;
- print;
- e-fax;
- file drop;
- fallback channels;
- every retry.

Each delivery records the fingerprint. **View as sent** (Version History) opens the stored file itself, so what a pathologist or auditor sees is byte-for-byte what went out. A stored file that no longer matches its fingerprint is refused. The print preview is drawn from the same content as the released report: before signing it differs only in the PRELIMINARY watermark and the signature line.

Planned:
- the API server holds the documents in tamper-proof storage;

Not covered yet: deliveries queued before Batch 538, per-specimen cytology messages, and releases whose PDF could not be made carry no stored document, so their retries use the saved PDF as before. Browser storage holds the documents in the demo, within its size limit.

**Cytology (Batch 539, Live once the report renderer is redeployed):** cytology reports, previews included, are made by the same server renderer as surgical reports. A preview before sign-out carries PRELIMINARY — SUBJECT TO CHANGE and otherwise matches what is released; a released case's "Print case report" opens the report exactly as sent.

See `docs/architecture/REPORT_DOCUMENT_STORE_API.md`.

### Countersign & FPPE — Live

**For the practitioner.** Residents can draft reports and attendings countersign them. It also tracks Focused Professional Practice Evaluation for new hires.

**For the system administrator.** This covers a resident-drafts, attending-countersigns workflow, and Focused Professional Practice Evaluation tracking for new-hire credentialing. The description lists no settings or permissions.

**For marketing.** Training and credentialing are supported: residents draft, attendings countersign, and new-hire Focused Professional Practice Evaluation is tracked.

**For FormedrixAI and partners (the plain reality).** Status: Live. Resident-drafts, attending-countersigns workflow and FPPE tracking. The description names nothing as not built.

*Technical detail (for developers and Jira):*
Resident-drafts/attending-countersigns workflow, and Focused
Professional Practice Evaluation (new-hire credentialing) tracking.

---

## Roles and commands

**For the practitioner.** Hotkeys and voice depend on the screen you are on. A Go to panel shows the keys to reach commands a screen hides, and the report editor can be driven by voice or key. It has not yet been tried on a Mac.

**For the system administrator.** Always-on commands shadowed by a screen are reached with Alt+J, then their key. The Role Dictionary and Configuration → Actions show each route. Each built-in role starts with the commands its job uses, and a customer duplicates the nearest role and changes what differs. The list has 385 entries, and the defaults await review.

**For marketing.** Voice and hotkeys adapt to the screen in focus, the report editor can be driven by voice or key, and the Role Dictionary lists every command by group, so roles can start from sensible defaults and be tailored.

**For FormedrixAI and partners (the plain reality).** Status: Live. NOT done: not yet tried on a Mac, and the default commands await review. The Role Dictionary lists 385 entries, including actions with no voice phrase or hotkey of their own.

*Technical detail (for developers and Jira):*

Hotkeys and voice are screen-aware: the screen in focus decides which command a key or phrase means. Always-on commands a screen shadows are reached with Alt+J, then their key (a "Go to" panel shows the keys; the Role Dictionary action reference and Configuration → Actions show each route as "Alt+J, then X"). The report text editor can be driven by voice or key too: bold, italic, underline, lists, indent, find and replace, table, signature line, next and previous heading, formatting marks and a ruler. Mac Option and AltGr keys are handled. (Live; not yet tried on a Mac.)

The Role Dictionary lists every voice and shortcut command by group, including the commands that save, submit, log, order, print or create. Each built-in role starts with the commands its job uses; a customer duplicates the nearest role and changes what differs. The list also names the actions that have no voice phrase or hotkey of their own (manual hrHPV entry, CSMS eligibility answers, the AI history reading, registry batch files, the Outbound Queue and others), 385 entries in all. (Live; defaults awaiting review.)

## Voice engine: Report Draft commands and dictation

**For the practitioner.** On the Report Draft you can move between sections, switch tabs and start dictating into a chosen section by voice ("dictate gross description", "enter diagnosis"). The AI's tidied sentence replaces your dictated words instead of being added after them. Your own corrections are remembered. A few commands that are hard to undo ask you to say them twice. Spoken commands that are not for the screen you are on say so.

**For the system administrator.** No setting. Voice and the keyboard share one rule for which commands are available (screen, always-on, station area, station action group). Each spoken command that runs or is refused is written to System Logs as Voice command executed / refused, with the action id, screen and person, never the words or a case. The commands that must be said twice are a fixed list in code (six).

**For marketing.** Hands-free reporting that follows you around the report: say where you want to dictate, and the system takes you there, tidies the text in place, learns your corrections and leaves an audit trail.

**For FormedrixAI and partners (the plain reality).** Status: Partial (Batch 650a, tested with simulated speech, not a real microphone). Built: Report Draft phrases registered (they never were), Enter Gross / Micro / Diagnosis on the Report Draft and the Microscopic entry, replace-once AI refinement (2,000 ms budget), correction learning in the report editors, say-it-twice for six commands, one eligibility rule for voice and keys, an audit entry per spoken command. Not built: Enter Addendum, Insert Macro, Next / Previous Field by voice; Enter Gross / Diagnosis on the synoptic layout; a server-written audit entry; native-speaker review of the new phrases; the focus-then-mic route on the Intraop screens.

*Technical detail (for developers and Jira):*

`services/voice/`: `reportDraftVoiceActions.ts` (data), `dictationSegmentFlow.ts` (interim then one final per segment), `dictationEditorWriter.ts` + `tiptapDictationPort.ts` (replace the provisional range; track the last segment and record a correction on blur), `dictationCorrections.ts` (the per-person table, moved out of VoiceProvider), `dictationSectionPicker.ts`, `voiceCommandRunner.ts` (eligibility, say-it-twice, audit), `voiceCommandAudit.ts`. `services/actionRegistry/`: `commandEligibility.ts` (the one rule), `transientActions.ts` (`registerTransientActions`), `repeatConfirmationCommands.ts`. The page hook is `pages/SynopticReportPage/hooks/useReportDraftVoiceActions.ts`.

## Batch Management & Chain of Custody

### Batch Management (`/batch-management`) — Live

**For the practitioner.** This tracks cassettes and slides through processing steps by scanning container barcodes. The New Container form follows your organisation's Field Requirements, and refusals appear in your language.

**For the system administrator.** Chain of custody runs through Decal/Special Processing, Processing, Embedding, Microtomy/Sectioning, Staining and Checkout. The New Container form follows the organisation's Field Requirements. Aborting, overriding a reconciliation, acknowledging a cold-chain excursion, disposing of retained material and exporting the disposal report each need their own permission.

**For marketing.** Batch Management gives scan-driven chain of custody for cassettes and slides, a two-column New Container form, fine-grained permissions and refusals shown in the user's language.

**For FormedrixAI and partners (the plain reality).** Status: Live (Sep 2026, Batches 404 to 408). Barcode-scan chain of custody through the processing nodes. The description names nothing as not built.

*Technical detail (for developers and Jira):*
Cassette/slide chain-of-custody tracking through processing nodes
(Decal/Special Processing, Processing, Embedding, Microtomy/
Sectioning, Staining, Checkout) via container barcode scanning.
(Sep 2026, Batches 404–408) The New Container form follows the
organisation's Field Requirements and fits on screen in two columns.
Aborting, overriding a reconciliation, acknowledging a cold-chain
excursion, disposing of retained material and exporting the disposal
report each need their own permission. Every refusal is shown in the
user's language.

### Bench workstations (`/workstations/embedding`, `/workstations/microtomy`, `/workstations/slide-distribution`) — Live (Sep 2026)

**For the practitioner.** These are scan-driven stations for embedding, microtomy and slide distribution. They cover checking pieces, reprinting cassette and slide labels, checkout, scanner loading and exceptions.

**For the system administrator.** The workstations are for embedding (piece-count check, cassette reprint), microtomy and slide distribution (checkout, scanner loading, exceptions, label reprint). What each needs before it acts comes from the organisation's Field Requirements.

**For marketing.** Dedicated, scan-driven bench stations support embedding, microtomy and slide distribution, with requirements driven by your organisation's own Field Requirements.

**For FormedrixAI and partners (the plain reality).** Status: Live (Sep 2026). Embedding, microtomy and slide distribution stations. The description names nothing as not built.

*Technical detail (for developers and Jira):*
Scan-driven stations for embedding (piece-count check, cassette reprint),
microtomy and slide distribution (checkout, scanner loading, exceptions,
label reprint). What each needs before it acts comes from the organisation's
Field Requirements. See `src/pages/` for each workstation.

### Add-On Orders (`/add-on-orders`) — Live (Sep 2026)

**For the practitioner.** You can order recuts, special stains, IHC and molecular or send-out tests on existing blocks. If a technologist flags too little tissue, the pathologist cancels, modifies or approves the cutting. A send-out line always names its reference lab.

**For the system administrator.** A send-out line always names its reference lab, defaulted from the labs approved for that test in the Stain Dictionary. Placing orders and approving destructive cutting are separate permissions.

**For marketing.** Add-on orders for recuts, special stains, IHC and molecular or send-out work are handled in one place, with block-exception handling and a reference lab on every send-out line.

**For FormedrixAI and partners (the plain reality).** Status: Live (Sep 2026). The description names nothing as not built.

*Technical detail (for developers and Jira):*
Recuts, special stains, IHC and molecular/send-out orders on existing
blocks, with block-exception handling (a tech flags insufficient tissue;
the pathologist cancels, modifies, or approves destructive cutting). A
send-out line always names its reference lab, defaulted from the labs
approved for that test in the Stain Dictionary. Placing orders and approving
destructive cutting are separate permissions.

### Molecular (`/molecular`, `/molecular-rack`, `/molecular-control-rules`, `/molecular-order-queue`) — Live (Sep 2026)

**For the practitioner.** This is the molecular workcenter, covering extraction racks, plate building, sending worklists to the instrument, inbound results and cloning a result to supersede it. Rack loading requires the rack barcode and every tube's sample ID, and warns if a scanned deck position is wrong.

**For the system administrator.** The deck layout is set at Configuration → Equipment, as corrected to Configuration → System → Workstation & Hardware → Equipment. An assay's control rule can name the slots its sample rack may use. Rack Loading requires the barcode, sample IDs and instrument and slot (slot only on multi-slot instruments). Clone & Supersede has its own permission, and managing control rules is an Admin permission by default.

**For marketing.** The molecular workcenter covers racks, plate building with control rules and reagent-lot gating, scan-to-well, instrument worklists, inbound results and deck placement checks.

**For FormedrixAI and partners (the plain reality).** Status: Live (Sep 2026). The description names nothing as not built.

*Technical detail (for developers and Jira):*
The molecular workcenter: extraction racks, the plate builder (control rules,
reagent-lot gating, scan-to-well), worklist dispatch to the instrument,
inbound results, and Clone & Supersede (its own permission). Batch 406 added
deck placement: each analyser has a deck layout (Configuration → Equipment),
an assay's control rule can name the slots its sample rack may use, and Rack
Loading requires the rack's barcode, every tube's sample ID, and the
instrument and slot (slot only on multi-slot instruments), with a warning when
a scanned deck position is wrong. Managing control rules is an Admin
permission by default. See `src/services/molecular/README.md`.
*Corrected in the Batch 496 README audit (Oct 9, 2026): the deck layout lives at Configuration → System → Workstation & Hardware → Equipment.*

### Retention Hold & Disposal (`/batch-management/disposal`, `/batch-management/disposal-report`, `/batch-management/retention-holds`) — Live

**For the practitioner.** Retention rules follow your region, and a queue shows what is eligible for disposal, which you can dispose of directly by scanning. A Retention Hold placed from the case sidebar blocks disposal until you release it, and the Retention Holds queue (Batch Management) lists every active hold so it can be released from one place.

**For the system administrator.** Retention policy is jurisdiction-aware (RCPath/UK, CAP/CLIA/US and the other governing bodies) and its figures live on Governing Bodies (ForMedrixAI-only edit). A case-level Retention Hold is placed from the case sidebar and listed in the Retention Holds queue (`/batch-management/retention-holds`, `retention:holds-queue:export` for the CSV); release is the existing `case:retention-hold:release`. Seeded figures flagged "unverified placeholder" (CAP and CAP-ACP wet tissue, RCPA, Korea MSA) show an amber badge on the retention window; confirm them before go-live.

**For marketing.** Retention and disposal follow jurisdiction-aware policy, with a computed eligibility queue, scan-to-dispose and a case-level hold that keeps material safe until released.

**For FormedrixAI and partners (the plain reality).** Status: Live. Policies cover RCPath/UK and CAP/CLIA/US. The seeded CAP wet-tissue and RCPA figures are unverified placeholders (flagged on screen and in the Admin Guide); nobody has confirmed them against the published schedules. The Retention Holds queue exists (Batch 610).

*Technical detail (for developers and Jira):*
Jurisdiction-aware retention policy (RCPath/UK, CAP/CLIA/US), computed
disposal-eligibility queue with direct scan-to-dispose, and a
case-level Retention Hold (placed and released from the case sidebar)
that blocks disposal until explicitly released. The Retention Holds queue
(`RetentionHoldsQueuePage.tsx`, `services/retentionHolds/`, Batch 610) lists the active holds.
*Corrected twice: the Batch 496 README audit said the retention-holds route did not exist; it does (Batch 610), as `SignedInApp.tsx` shows. Batch 652 corrected this entry.*

### Smart Capture charge suggestions (case Billing panel; Configuration → System → Smart Capture) — Built (Demo), Prototype (Batch 611)

**For the practitioner.** The billing panel suggests charge lines with the rule and evidence behind each. You accept or reject every line, a pathologist confirms, and only then can they be exported. It is a prototype and has not been reviewed for compliance.

**For the system administrator.** Under Configuration → System → Smart Capture, a fixed, versioned rule set drives the suggestions. In the demo, export goes to the labelled Simulated engine and is refused to a real engine until the six-item production checklist is ticked. Suggestions are audited without patient data and shown stale when the case changes.

**For marketing.** Smart Capture suggests charge lines with the rule and evidence shown for each, with a person accepting every line and a pathologist confirming. It is a prototype available in demonstration.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo), Prototype (Batch 611), labelled Prototype, not compliance-reviewed. NOT done: export to a real engine, which is refused until the six-item checklist is ticked. Waiting on the institution: claims and legal review, payer policies and the receiving system.

*Technical detail (for developers and Jira):*

Suggested charge lines from a fixed, versioned rule set, shown with the rule and evidence behind each. A person accepts or rejects every line, a pathologist confirms, and only then can the approved lines be exported (to the labelled Simulated engine in the demo; refused to a real engine until the six-item production checklist is ticked). Audited without patient data; shown stale when the case changes. Labelled *Prototype, not compliance-reviewed*. Waiting on the institution: claims and legal review, payer policies, the receiving system. See `SMART_CAPTURE.md`.

### Case Hold (in-case sidebar) — Live

**For the practitioner.** A Case Hold stops a case from being finalized, for a named reason such as a quality issue, awaiting outside materials, a clinical discrepancy or pending consultation. Held cases appear on a Cases on Hold tile on the Worklist.

**For the system administrator.** Case Hold is separate from Retention Hold. It gates finalize on an active case, needs a real named reason, and surfaces through its own Cases on Hold Worklist tile. It is used from the in-case sidebar.

**For marketing.** Case Hold lets a team pause finalization for a documented reason, with held cases collected on their own Worklist tile.

**For FormedrixAI and partners (the plain reality).** Status: Live. A hold concept deliberately separate from Retention Hold, gating finalize with a named reason. The description names nothing as not built.

*Technical detail (for developers and Jira):*
A second, deliberately separate hold concept from Retention Hold —
gates **finalize** on an active case for a real, named reason (quality
issue, awaiting outside materials, clinical discrepancy, pending
consultation), surfaced via its own "Cases on Hold" Worklist tile.

### Pending Batch Load (`/batch-management/pending-load`) — Live

**For the practitioner.** This is a list of printed or engraved cassettes and slides that have not yet been scanned into any active batch.

**For the system administrator.** Pending Batch Load is a computed queue of printed or engraved cassettes and slides not yet scanned into any active batch. The description lists no settings.

**For marketing.** Pending Batch Load automatically lists cassettes and slides still waiting to be scanned into a batch, so nothing gets overlooked.

**For FormedrixAI and partners (the plain reality).** Status: Live. A computed queue with nothing listed as not built.

*Technical detail (for developers and Jira):*
Computed queue of printed/engraved cassettes and slides not yet
scanned into any active batch.

### Cassette Color Routing & Printing — Live

**For the practitioner.** Cassette colors and the rules that route them are managed by your administrators, and labels print with barcodes in the standard formats.

**For the system administrator.** Administrators manage a color dictionary and routing rules. The label printing architecture has 29 modules covering barcode rendering, GS1/ZPL encoding and dispatch.

**For marketing.** Cassette color routing and a full label-printing architecture are included, with an admin-manageable color dictionary and rules, plus GS1 and ZPL encoding.

**For FormedrixAI and partners (the plain reality).** Status: Live. Color dictionary, routing rules and a 29-module label printing architecture. The description names nothing as not built.

*Technical detail (for developers and Jira):*
Admin-manageable color dictionary and routing rules
(`services/cassetteColors/`, `services/cassetteRouting/`), full label-
printing architecture (`utils/labels/` — 29 modules covering barcode
rendering, GS1/ZPL encoding, and dispatch).
*Corrected in the Batch 496 README audit (Oct 9, 2026): module count 17 → 29.*

### Label Printing — Partial

**For the practitioner.** Printing cassette, slide, requisition, container, decant and molecular labels works through the QZ Tray. Printing over the network is not yet working.

**For the system administrator.** The QZ Tray bridge is wired for cassette, slide, requisition, container, decant and molecular labels. Network print via the Interface Engine and the Local Bridge Agent path record the job but wait on the API server to send it.

**For marketing.** Labels for cassettes, slides, requisitions, containers, decants and molecular work print through the QZ Tray bridge today, with network print on the way.

**For FormedrixAI and partners (the plain reality).** Status: Partial. Built: the QZ Tray bridge. NOT built: sending of network print jobs through the Interface Engine and the Local Bridge Agent path, which wait on the API server. Tracked in Jira as PS-51 through PS-55.

*Technical detail (for developers and Jira):*
The QZ Tray bridge is wired: cassette, slide, requisition, container,
decant and molecular labels print through it. Network print via the
Interface Engine and the Local Bridge Agent path record the job but
wait on the API server to send it (`POST /api/print/jobs`). Tracked in
Jira as PS-51 through PS-55.
*Corrected in the Batch 496 README audit (Oct 9, 2026): QZ Tray is no longer scaffolding (`utils/labels/README.md`, `qzTrayBridge.ts` callers).*

---

## Quality Assurance & Compliance

### Quality Assurance (`/quality-assurance`) — Live

**For the practitioner.** Quality Assurance gathers your quality work into seven areas, such as Operations, Financials, CAPA Engine and Inspection Mode, and most reports can be limited to one facility or opened across the whole enterprise. At the end of the day, cytotechnologists and pathologists confirm their own screening hours with one click, or correct them with a quick reason.

**For the system administrator.** Quality Assurance is organised into seven pillars. Reports whose items belong to a facility have a Scope picker (enterprise-wide, one organisation, or one facility; FPPE is facilities only), and the list, counts and export follow it. Screening hours sign-off needs capability cytology:screening-hours:sign-off (Pathologist, Fellow, Resident, Cytotechnologist); the lab sets when its screening day starts, and supervisors watch the workload report CYT-QA-05. The enterprise rollup, management reviews and patient match review stay lab-wide.

**For marketing.** Quality Assurance puts seven pillars of lab quality in one place, and a Scope picker lets teams work across the enterprise or focus on a single facility, with staff exporting their own facility's data. Cytology screening hours can be confirmed in one click in the browser, with the server side still to come.

**For FormedrixAI and partners (the plain reality).** Quality Assurance and the Scope picker (Batch 544) are Live. Cytology screening hours (Batch 572) are Partial: the browser side is built, but the server's own screening events are phase 2e, so the server does not yet record screening time with its own clock and the browser's timer is never trusted.

*Technical detail (for developers and Jira):*
Organised into seven pillars: Operations, Financials, CAPA Engine,
Cytology QA, Enterprise Rollup, QA Dashboard and Inspection Mode.
Operations has Deficiencies, Follow-up not received, Frozen Linkage,
Discordance, Countersign Turnaround, Credentialing Review (FPPE),
Post-Final Drift, Patient Match Review, Patient Management and Access
Requests. CAPA Engine has Recommended, Discordance Patterns, Escalated
to CAPA, Closed and Management Reviews. Financials has Billing
Deficiencies, Resolved, Code Review Pool and Charges awaiting approval.
*Corrected in the Batch 496 README audit (Oct 9, 2026): this listed eight report groups; the page now has pillars and more tiles (`src/pages/QualityAssurancePage.tsx`).*

**One facility or all (Batch 544, Pete, Oct 13, 2026):** every QA report whose items belong to a facility has a Scope picker: enterprise-wide, one organisation, or one facility (FPPE: facilities only). The list, its counts and its export follow the scope, and the export is checked for that one facility, so staff assigned to some facilities can export their own. Someone assigned to one facility opens on it. The enterprise rollup, management reviews and patient match review stay lab-wide.

**Cytology screening hours (Batch 572; readiness review F7, option C) — Partial: browser side built; the server's own screening events are phase 2e.** Each cytotechnologist or pathologist confirms their own screening hours at the end of the day on the Cytology worklist (one click), or corrects them with a quick-pick reason (screened at the microscope; a slide left open; other, with a note). A correction more than 0.5 h from the recorded figure, or one that turns an exceeded day into one within the limit, is flagged on the supervisor's workload report (CYT-QA-05), which shows recorded and signed-off hours side by side. A sign-off made before more screening was recorded stops counting until the person confirms again. The workload limit (assigned cap × hours ÷ 8) never rises above the cap. Capability `cytology:screening-hours:sign-off` (Pathologist, Fellow, Resident, Cytotechnologist). The server will record screening time with its own clock; the browser's timer is never trusted. *Batch 574:* yesterday can be signed off too while it still needs it (night shifts), and the lab sets when its screening day starts (applies from the change on). A **workload counter** on the worklist and screening page shows slides counted of the cap over the last 24 hours, reviews, and what is left now and in a full day, never more than the save-time check allows. The report shows each correction's reason. Editing a saved review no longer counts its slide again.

### Clinical-pathologic mismatch check — Live (PS-554 redesign Live, including governed AI instructions, Batch 536)

**For the practitioner.** While you review a surgical or autopsy report, PathScribe quietly compares what the ordering clinician expected with what you found, and shows a small alert if it sees a possible mismatch. You decide with one click and an optional note; only a high-risk mismatch holds sign-out until you record Resolved or Unresolved. The same alert appears per specimen in the Cytology Workspace, and only clinical text goes to the AI, never patient identifiers.

**For the system administrator.** Set the risk rules in Configuration → System → Clinical Mismatch Rules: a display threshold and an action threshold per kind of mismatch, for all specimen types or one, with an action of Block, Warn or Log. Changing them needs a permission no built-in role has; Pathologist, QA Reviewer and Lab Director can read them. AI instructions are under Configuration → System → AI Instructions: an edit waits for approval, the editor can't approve it, approval starts with the Lab Director, and no role or person can hold both the rules duty and the approval duty. Oversight is on the Clinical-Pathologic Correlation board under Quality Assurance → Activities.

**For marketing.** PathScribe gives pathologists a quiet second look at whether the diagnosis fits the clinical picture, so possible mismatches surface before sign-out. The AI suggests and the pathologist decides, the rules and AI instructions are governed with approvals, and every change is audited.

**For FormedrixAI and partners (the plain reality).** Live, including the PS-554 redesign and the governed AI instructions (Batch 536). The pathologist always decides, and AI instructions are never used before approval. The body lists no open items for this feature.

*Technical detail (for developers and Jira):*
PathScribe compares what the ordering clinician expected (the indication, the history, and for an autopsy the clinical cause of death) with what the pathologist found. It runs for surgical, cytology (pathologist track) and autopsy (FAD) reports.

The AI suggests and the pathologist decides. Only clinical text goes to the AI, never patient identifiers. An unresolved mismatch recommends a CAPA (PS-145; Batches 439 and 523).

**Live (Batch 529, PS-554):** configurable risk rules in Configuration → System → Clinical Mismatch Rules: a display threshold and an action threshold per kind of mismatch, for all specimen types or one, and an action (Block, Warn or Log). Changing them needs a permission no built-in role has; Pathologist, QA Reviewer and Lab Director can read them. Every change is audited.

**Live (Batch 530, PS-554):**
- the check runs in the background while the pathologist reviews a surgical or autopsy report, with an inline "AI suggests possible mismatch" alert (no window);
- only a high-risk mismatch (a Block rule) holds sign-out, until the pathologist records Resolved or Unresolved; a low-risk one is logged to the QA dashboard, or deferred to secondary review;
- one-click decisions with quick reasons; the note is optional;
- QA oversight: the Clinical-Pathologic Correlation board under Quality Assurance → Activities, and the secondary review queue on the Surgical QA worklist.
- Cytology: the same inline alert in the Cytology Workspace, per specimen (Batch 531).
- Batch 651: the rule-based fallback (confidence 50, used when the AI is not available or not allowed) is shown regardless of the 60% AI display threshold, labelled rule-based and always low risk (logged to QA, never holds sign-out); the AI threshold is unchanged. The version of the approved AI instructions used is stored on the QA record and the audit event.
- The check runs again when the diagnosis or clinical text changes, and asks again only if the result is worse (Batch 531).
- No clinical information on the requisition (any specialty): intake is never blocked; the check is deferred with a notice on the report, Cytology Workspace and grossing screens and an audit entry; the coded clinical history can be added later, until sign-out.

**Live (Batch 536, PS-554):** governed AI instructions (Configuration → System → AI Instructions). The instructions the AI gets for each discipline are versioned configuration: an edit waits for approval and is never used before it; the editor can't approve it; approving starts with the Lab Director (never ForMedrixAI's Superadmin); a Test panel runs a draft on a sample case before approval; every version, approval and rejection is kept and audited, and each AI suggestion records the version it used. Changing the mismatch rules and approving the instructions are separate duties: no role, and no person through several roles, can hold both. *(Earlier text here scheduled this for Batch 531; it shipped in Batch 536.)*

Full explanation: [`CLINICAL_MISMATCH_CHECK.md`](CLINICAL_MISMATCH_CHECK.md).

### System Audit / Quality Control record (`/audit`) — Live

**For the practitioner.** A permanent, complete record is kept of every event, whatever its status. It is separate from the working queue you use day to day.

**For the system administrator.** The System Audit / Quality Control record holds every event regardless of status. It is distinct from the working queue, so use it as the compliance record rather than for daily work.

**For marketing.** PathScribe keeps a permanent, complete compliance record of every event, so the full history is always there when it is needed.

**For FormedrixAI and partners (the plain reality).** Live. A permanent record of every event regardless of status, distinct from the working queue. The body gives no further detail on scope or testing.

*Technical detail (for developers and Jira):*
The permanent, complete compliance record — every event regardless of
status, distinct from the working queue above.

### Frozen-to-Permanent Reconciliation — Live

**For the practitioner.** This keeps a real audit trail covering every case that was reviewed, not only the ones with a mismatch. Nothing for you to do; it works in the background.

**For the system administrator.** Frozen-to-Permanent Reconciliation is a real audit trail covering the full reviewed population, not just mismatches. It is intended to match ISO 15189 and CAP audit-trail expectations.

**For marketing.** PathScribe backs up its quality checks with an audit trail that covers the full reviewed population, built around ISO 15189 and CAP audit-trail expectations.

**For FormedrixAI and partners (the plain reality).** Live. A real audit trail for the full reviewed population, matching ISO 15189 and CAP audit-trail expectations as stated in the body. The body makes no certification claim.

*Technical detail (for developers and Jira):*
Real audit trail proving the full reviewed population (not just
mismatches), matching ISO 15189/CAP audit-trail expectations.
Batch 652: at sign-out every non-deferred frozen specimen of the case is reconciled in turn (`services/quality/frozenReconciliationPlan.ts`), not only the first. The comparison is a category match confirmed by the pathologist; there is no AI in it (the stored setting key `aiComparisonEnabled` is kept for saved settings; the label reads "Automatic Category Comparison").

---

## Patient Identity & Interoperability

### Master Patient Index (MPI) — Live

**For the practitioner.** PathScribe matches patients in a consistent, rule-based way. When a match is unclear, the case goes to a real review queue instead of being guessed. Cases placed under a downtime placeholder identity can be moved to the right patient through a Break-Glass workflow.

**For the system administrator.** The Master Patient Index uses deterministic matching, a review queue for ambiguous matches, and a Break-Glass rebind workflow for downtime-placeholder identities. Expect ambiguous matches to wait for a person in the review queue.

**For marketing.** Patient matching in PathScribe is predictable and safe: clear matches are made automatically, doubtful ones go to a review queue, and downtime identities can be rebound with a controlled Break-Glass workflow.

**For FormedrixAI and partners (the plain reality).** Live. Deterministic matching, a real review queue and the Break-Glass rebind workflow. The body does not mention external or enterprise MPI integration.

*Technical detail (for developers and Jira):*
Deterministic patient matching, a real review queue for ambiguous
matches, Break-Glass rebind workflow for downtime-placeholder
identities.

### HL7 Processing — Partial

**For the practitioner.** Connections to outside lab and hospital systems are only partly ready. Some vendor-specific connections are not available yet.

**For the system administrator.** HL7 Processing is Partial. The standard core (ORM and ORU builders, segment builders) is tested, and identityAdapter (pass-through) is live. cerebroAdapter and vantageAdapter are deliberately unimplemented stubs, so do not plan on them until a vendor integration guide exists.

**For marketing.** PathScribe has a tested standard HL7 core with a working pass-through adapter, and vendor-specific adapters are on the roadmap, ready to be completed once a vendor integration guide is available.

**For FormedrixAI and partners (the plain reality).** Partial. The ORM/ORU builders and segment builders are real and tested, and identityAdapter (pass-through) is live. cerebroAdapter and vantageAdapter are deliberately unimplemented stubs with documented directional context, and they wait on a genuine vendor integration guide. No real vendor integration exists yet.

*Technical detail (for developers and Jira):*
Standard core (ORM/ORU builders, segment builders) is real and
tested. Vendor-specific adapters: `identityAdapter` (pass-through) is
live; `cerebroAdapter` and `vantageAdapter` are deliberately
unimplemented stubs, with real, documented directional context, waiting
on a genuine vendor integration guide.

### Interface Exception & Case-Binding — Live

**For the practitioner.** If a case was started under a temporary or downtime identity, it can later be moved to the confirmed patient, and you pick a reason from a standard list.

**For the system administrator.** Interface Exception & Case-Binding handles cases created under a temporary or downtime identity and rebinds them to the confirmed patient. Each rebind uses a reason code from a real reason-code taxonomy.

**For marketing.** When a case starts under a temporary identity, PathScribe rebinds it to the confirmed patient with a clear, coded reason, keeping the record tidy.

**For FormedrixAI and partners (the plain reality).** Live. Cases created under a temporary or downtime identity are rebound to the confirmed patient using a real reason-code taxonomy. The body gives no detail on interface testing.

*Technical detail (for developers and Jira):*
Handles cases created under a temporary/downtime identity, later
rebound to the confirmed patient via a real reason-code taxonomy.

### Interface monitoring — Partial (browser side built, Batch 554; engines' heartbeat and server planned, phase 2e)

**For the practitioner.** Staff can see at a glance whether the connections to the hospital are healthy, including a short summary line such as "1 offline, 1 listener down and 2 online". It is for viewing only.

**For the system administrator.** Open Audit Log → Interfaces → Engines to see each hospital's engine (hosted or on site): online, needs attention, degraded or offline; last check-in; whether it reaches PathScribe; free disk; certificate expiry; and each listener and channel with queue depth, oldest wait and permanently failed messages, problems first. The view is read only: start channels on the engine and resend failed messages from Outbound. It needs the "View interface engines" permission (Admin by default).

**For marketing.** Interface monitoring gives administrators a clear, problems-first view of every hospital's interface engine, with a one-line summary above the Interfaces sub-tabs and one click to the details.

**For FormedrixAI and partners (the plain reality).** Partial. The browser side is built (Batch 554). The engines' heartbeat and the server are planned for phase 2e, so the view is not yet fed by real engines, and it is read only by design.

*Technical detail (for developers and Jira):*
**Audit Log → Interfaces → Engines** shows each hospital's interface engine, hosted or on site. For each engine it shows:
- whether it is online, needs attention, degraded or offline;
- when it last checked in;
- whether it reaches PathScribe (if not, it stores messages to forward);
- free disk and certificate expiry;
- each listener and channel, with what is waiting, how long the oldest has waited, and the messages that failed for good. Problems are listed first.

A line above the Interfaces sub-tabs gives the same at a glance, for example "1 offline, 1 listener down and 2 online". One click opens Engines. The view is read only: channels are started on the engine, and failed messages are resent from Outbound. Permission: "View interface engines" (Admin by default). Contract: `docs/architecture/INTERFACE_ENGINE_EDGE.md` §9a.

---

## Administration & Configuration

### Code systems per jurisdiction (`Configuration → System → Code Systems`) — Built (Demo), Batches 607 and 614

**For the practitioner.** Where your organisation uses different coding systems in different countries, the screens follow those choices. A code from a system that is switched off is marked as outside policy.

**For the system administrator.** Go to Configuration → System → Code Systems and set, for each jurisdiction, each code system (ICD-10, ICD-11, ICD-O, SNOMED CT and others) as off, optional or required, and from what date. Changes are saved and audited under config:code-systems:manage. A screen with a system off says so in a short note.

**For marketing.** Each jurisdiction can have its own coding rules, with code systems set to off, optional or required from a chosen date, and the screens follow, from case coding to outbound messages. This is available in demonstration.

**For FormedrixAI and partners (the plain reality).** Built (Demo), Batches 607 and 614. The browser applies the policy across the Add Code window, case coding display, sign-out, outbound messages, case search, specimen edit window and the order message at accession. The terminology server and maps are server work and are not built.

*Technical detail (for developers and Jira):*
An administrator sets, for each jurisdiction, which code systems (ICD-10, ICD-11, ICD-O, SNOMED CT and others) are off, optional or required, and from what date. Saved and audited (`config:code-systems:manage`). The browser applies it on the Add Code window, the case coding display (a code in a system now off is marked outside policy), sign-out, outbound messages, case search, the specimen edit window and the order message sent at accession; a screen with a system off says so in a short note. The terminology server and maps are server work. See `docs/architecture/DIAGNOSIS_CODING.md`.

### One shared discordant review section — Built (Demo), Batch 625 (PS-118)

**For the practitioner.** The sign-out Discordance window and the general QA review form now show the same section for the difference, severity, root cause and comment, so wording matches. The sign-out window still keeps its own features.

**For the system administrator.** The sign-out Discordance window and the generic QA review form render one shared section for delta, severity, root cause and narrative comment. The window keeps its own Field Requirements, voice command and teaching feedback.

**For marketing.** Discordance reviews now share one consistent section across sign-out and QA review, so rules and wording stay aligned. This is available in demonstration.

**For FormedrixAI and partners (the plain reality).** Built (Demo), Batch 625 (PS-118). One shared section is in use in both places. The Discordance window is not yet the generic form itself; it keeps its own Field Requirements, voice command and teaching feedback.

*Technical detail (for developers and Jira):*
The sign-out Discordance window and the generic QA review form render one shared section for delta, severity, root cause and narrative comment, so rules and wording cannot drift. The window keeps its own Field Requirements, voice command and teaching feedback; it is not yet the generic form itself.

### Worklist wording in six languages — Built (Demo), Batch 624

**For the practitioner.** Parts of the worklist now follow your language, including the digital readiness line, PathScribe's own AI lines and the standard flag names. Scanner and AI vendor wording stays as received.

**For the system administrator.** The digital readiness line, PathScribe's own AI lines and the shipped flag names follow the user's language, in six languages. Scanner and AI vendor wording is shown as received, and flags an admin creates show as typed.

**For marketing.** The worklist speaks your language: readiness lines, PathScribe's AI lines and standard flag names appear in six languages, available in demonstration.

**For FormedrixAI and partners (the plain reality).** Built (Demo), Batch 624. Scanner and AI vendor wording is deliberately never translated (Pete's decision). Native-speaker review of the new text is pending, so the translations are not yet reviewed.

*Technical detail (for developers and Jira):*
The digital readiness line, PathScribe's own AI lines and the shipped flag names follow the user's language. Scanner and AI vendor wording is shown as received, never translated (Pete's decision). Admin-made flags show as typed. Native-speaker review of the new text is pending.

### Licensed terminologies (`Configuration → System → Code Systems`) — Built (Demo), Batch 623 (PS-130)

**For the practitioner.** Your organisation can record the terminology licences it holds, and licensed codes can then be used in abnormal-result rules. PathScribe does not supply the code sets.

**For the system administrator.** Under Configuration → System → Code Systems, record each SNOMED CT and ICD-O-3 licence: holder, edition, reference and last valid day. It is audited by the same permission as code systems, and one licence is allowed per enterprise. Real codes in an abnormal-result rule replace the marked test codes only while the licence is on and unexpired.

**For marketing.** Customers can bring their own SNOMED CT and ICD-O-3 licences into PathScribe and use real codes in abnormal-result rules, available in demonstration.

**For FormedrixAI and partners (the plain reality).** Built (Demo), Batch 623 (PS-130). PathScribe ships no code sets and does not check a code against the customer's edition. Real codes for AI-narrative findings are Planned.

*Technical detail (for developers and Jira):*
The customer records the SNOMED CT and ICD-O-3 licences it holds (holder, edition, reference, last valid day; audited by the same permission as code systems). An abnormal-result rule can carry real codes; they replace the clearly marked test codes only while that licence is on and unexpired. PathScribe ships no code sets and does not check a code against the customer's edition. One licence per enterprise. Real codes for AI-narrative findings are Planned.

### Report PDF layout and images in reports — Live in the demo (Batch 609, redeploy `functions/`)

**For the practitioner.** Printed reports follow your lab's page setup and style, and attached images print after the report, one per page with a caption. Report font sizes are in points, with a minimum of 8 pt. PathScribe links to images rather than storing them.

**For the system administrator.** The renderer uses the lab's page setup, Document Style and header/footer parts. Link images on the Attach images screen; they print one per page with a caption, with an Image Unavailable page if a link cannot be fetched. Styles saved in pixels print as before until an author uses Convert to points. Batch 609 needs a redeploy of `functions/`.

**For marketing.** Reports print with the lab's own layout and branding, and linked images appear with captions, all live in the demo.

**For FormedrixAI and partners (the plain reality).** Live in the demo (Batch 609). PathScribe stores no images, only links. Server-side fetching, private-address blocking and audited opening of links are Planned with the API server, so they are not built.

*Technical detail (for developers and Jira):*
The report renderer prints the lab's page setup, Document Style and header/footer parts. Images are linked to a report on the Attach images screen and printed after the report's pages, one per page with a caption (300 DPI flag; Image Unavailable page for a link that cannot be fetched). Report font sizes are in points (the printed size, 8 pt minimum); styles saved in pixels print as before until an author uses Convert to points (Batch 612). Links only: PathScribe stores no images. Server-side fetching, private-address blocking and audited opening of links are Planned with the API server.

### Images and attachments: links only — Live (Batch 544)

**For the practitioner.** PathScribe links to your images and attachments, such as gross photos and referral PDFs, in your hospital's own systems instead of keeping copies. It stores only the files it makes itself, like report documents and exports.

**For the system administrator.** Links only: gross photos, referral PDFs, letterhead logos and staff signatures stay in the hospital's systems. Configuration → Staff takes an https link for signatures, and since Batch 549 the letterhead logo (facility and department) and the gross imaging vendor's address must be https links too. PathScribe stores only report documents, report versions and exports.

**For marketing.** Your images stay in your own systems and PathScribe simply links to them, keeping storage simple and labs in control of their data.

**For FormedrixAI and partners (the plain reality).** Live (Batch 544). No copies of images or attachments are held. Planned: audited opening of links with the API server, which is not yet built.

*Technical detail (for developers and Jira):*
PathScribe keeps links to images and attachments in the hospital's own systems and stores no copies: gross photos (in the imaging system), referral PDFs, letterhead logos and, since Batch 544, staff signatures (Configuration → Staff takes an https link). It stores only the files it makes itself: report documents, report versions and exports. Labs without an imaging system link to wherever they keep photos. Contract: `docs/architecture/BLOB_STORAGE_API.md`. Since Batch 549 the letterhead logo (facility and department) and the gross imaging vendor's address must be https links too. Planned: audited opening of links with the API server.

### Capabilities, roles and Field Requirements — Live (Sep 2026)

**For the practitioner.** What each person can do in PathScribe depends on their role and facilities. Your organisation can choose which fields each screen requires; required fields are starred and missing ones are listed instead of blocking the save.

**For the system administrator.** Access is a catalog of 244 capabilities (as of Batch 496), checked in the service that does the work and granted through roles in the Role Dictionary, scoped by the staff member's facilities. Field Requirements in Configuration cover 16 pages, set per organisation and not fixed by jurisdiction; locked fields can't be switched off and show why. Every change is audited.

**For marketing.** Fine-grained access control and configurable Field Requirements let each organisation shape PathScribe to its workflow, covering 16 pages with every change audited.

**For FormedrixAI and partners (the plain reality).** Live (Sep 2026). 244 capabilities as of Batch 496, up from 67 at Batch 409, and Field Requirements on 16 pages (Batch 528, PS-359). The body notes no gaps.

*Technical detail (for developers and Jira):*
Access control is a catalog of capabilities (244 as of Batch 496; 67 at Batch 409), each
checked in the service that does the work, granted through roles in the Role
Dictionary and scoped by the staff member's facilities. The full list, with
default roles and where each is checked, is in
`docs/architecture/AUTHORIZATION_API.md` ("Capability catalog"). Field
Requirements (Configuration) let an organisation choose which fields each
page requires; locked fields can't be switched off.
*Corrected in the Batch 496 README audit (Oct 9, 2026): current capability count 244 (`capabilityCatalog.ts`).*

**Field Requirements cover 16 pages (Batch 528, PS-359):** Accession, Grossing, Case report,
Messaging, Cytology screening, Microtomy, Intraoperative consultation, Embedding,
Slide distribution, Add-on orders, Batch management, Molecular plate builder,
Molecular rack loading, and now **Staff**, the **Facility editor** and **Clinical
history (cytology)**. Settings are per organisation (the performing-lab tenant);
nothing is fixed by jurisdiction. Each screen marks required fields with a star and
lists anything missing ("Still required: …") instead of failing on save. Locked
fields show why they can't be switched off (for example, a facility's assigning
authority, because inbound HL7 orders are matched by it). Every change is audited.

### TAT (Turnaround Time) Configuration — Live

**For the practitioner.** Turnaround time targets can be set to fit your situation, by ordering facility, performing lab, specimen, subspecialty, urgency and role. The most specific match wins.

**For the system administrator.** TAT Configuration resolves each TAT type across six dimensions: ordering facility (client), performing lab, specimen, subspecialty, urgency (routine or STAT) and role. The most specific match wins, and matching is weighted rather than a fixed set of levels.

**For marketing.** Turnaround targets adapt to your lab, by facility, specimen, subspecialty, urgency and role, with the most specific rule applied automatically.

**For FormedrixAI and partners (the plain reality).** Live. Most-specific-wins resolution across six dimensions, with weighted matching. The body notes no open items.

*Technical detail (for developers and Jira):*
Most-specific-wins resolution for each TAT type across six dimensions:
ordering facility (client), performing lab, specimen, subspecialty,
urgency (routine/STAT) and role.
*Corrected in the Batch 496 README audit (Oct 9, 2026): performing lab and role are dimensions too, and matching is weighted rather than a fixed seven levels (`services/tatConfig/tatTargetResolution.ts`).*

### Autopsy Turnaround and Dashboards — Live (Batch 610)

**For the practitioner.** Autopsy worklists and report pages show turnaround chips for PAD and FAD, and dashboards show turnaround, consent, organ retention and cause of death at case, department and enterprise level. Simulated cases are labelled Simulated.

**For the system administrator.** Autopsy PAD and FAD turnaround chips follow the jurisdiction target or a configured Autopsy PAD/FAD rule, with ancillary hold time excluded. Frozen section targets and warning time come from TAT configuration, with a STAT/Routine switch per specimen. Dashboards come in three tiers: case, department and enterprise.

**For marketing.** Autopsy teams get turnaround chips and three-tier dashboards covering turnaround, consent, organ retention and cause of death.

**For FormedrixAI and partners (the plain reality).** Live (Batch 610). Simulated cases are labelled Simulated, so dashboards in the demo may show them. The body notes no unbuilt items.

*Technical detail (for developers and Jira):*
Autopsy PAD and FAD turnaround chips on the worklist and report page (jurisdiction target or configured Autopsy PAD/FAD rule, ancillary hold time excluded), and three-tier Autopsy Dashboards (case, department, enterprise) for turnaround, consent, organ retention and cause of death. Simulated cases are labelled Simulated. Frozen section targets and warning time come from TAT configuration, with a STAT/Routine switch per specimen. Implementation: `src/services/autopsy/`, `src/services/autopsy/dashboard/`, `src/services/tatConfig/resolveFrozenSectionClock.ts`.

### Delegation, Pools & Case Team — Live

**For the practitioner.** Cases can be delegated, claimed from subspecialty pools, and shared with an ad-hoc case team. Pool claiming only works for real members of the pool.

**For the system administrator.** Case delegation, subspecialty pool claiming with real membership enforcement, and ad-hoc case team assignment are available. Only actual pool members can claim.

**For marketing.** Work flows to the right people: delegate cases, claim from subspecialty pools and build ad-hoc case teams.

**For FormedrixAI and partners (the plain reality).** Live. Delegation, pool claiming with real membership enforcement and ad-hoc case teams. The body gives no further detail.

*Technical detail (for developers and Jira):*
Case delegation, subspecialty pool claiming with real membership
enforcement, ad-hoc case team assignment.

### Template Builder & Protocol Dictionary — Live

**For the practitioner.** Report templates are built from reusable parts, and a library of ready-made synoptic templates is included. Template changes go through review and approval. The included templates use generic placeholder wording, not CAP or RCPath content.

**For the system administrator.** Templates are assembled from reusable Parts with a full review and approval workflow, including a reviewer's guide and dark, labelled question comments (from Batch 579). The protocol dictionary seeds 31 templates (22 surgical, 1 autopsy, 5 cytology, 3 grossing) with generic placeholder wording until a content licence is in place.

**For marketing.** Build reports from reusable parts, with 31 ready-made synoptic templates and a review and approval workflow for every template change.

**For FormedrixAI and partners (the plain reality).** Live. 31 seeded templates (22 surgical, 1 autopsy, 5 cytology, 3 grossing) carry generic placeholder wording, not CAP or RCPath content, until a content licence is in place.

*Technical detail (for developers and Jira):*
Report templates assembled from reusable Parts, a synoptic protocol
dictionary (31 seeded templates: 22 surgical, 1 autopsy, 5 cytology,
3 grossing), full review/approval workflow for template changes (a reviewer's guide and dark, labelled question comments from Batch 579). The
seeded templates carry generic placeholder wording, not CAP or RCPath
content, until a content licence is in place.
*Corrected in the Batch 496 README audit (Oct 9, 2026): 27 → 31 seeded templates, and they are generic, not CAP/RCPath text (`services/templates/templateService.ts`, `src/data/templates/`).*

### Governing Bodies, Specimen Dictionary, Client/Facility Dictionary — Live

**For the practitioner.** The lists behind the application, such as governing bodies, specimens and clients or facilities, are kept by your administrators.

**For the system administrator.** Governing Bodies, the Specimen Dictionary and the Client/Facility Dictionary are admin-managed reference dictionaries that underlie the rest of the app.

**For marketing.** Admin-managed dictionaries for governing bodies, specimens and clients or facilities give the whole application a consistent foundation.

**For FormedrixAI and partners (the plain reality).** Live. Admin-managed reference dictionaries. The body gives no further detail.

*Technical detail (for developers and Jira):*
Admin-managed reference dictionaries underlying the rest of the app.

---

## AI & Computational Features

### Orchestrator (AI narrative generation) — Live

**For the practitioner.** In Orchestration mode, PathScribe writes suggested report narrative as you watch. For each suggestion it shows how confident it is and quotes the source text it came from.

**For the system administrator.** The Orchestrator streams AI-generated report narrative for Orchestration mode. Each suggestion carries field-level provenance: a confidence value and a source-text quote.

**For marketing.** AI-drafted narrative streams in as you work, with confidence and a source-text quote on every suggestion, so each one can be checked.

**For FormedrixAI and partners (the plain reality).** Live. Streaming AI narrative for Orchestration mode. Until Batch 651 this entry claimed a confidence and a source quote on every suggestion, but the sections streamed as plain prose with neither; they now come from one extra short AI call after each section (closed schema: confidence 0 to 100 and a verbatim quote, the quote checked against the report's source text, a quote not found shown as unverified). Built and tested with simulated replies, not a live model; it adds one call per section. Real codes for AI-narrative findings are not covered in this entry.

*Technical detail (for developers and Jira):*
Streaming AI-generated report narrative for Orchestration mode. Batch 651:
confidence (0 to 100) and a source-text quote per section from a second,
non-streaming call (`orchestrator/narrativeProvenance.ts`), quote checked with
`utils/sourceTextMatching.matchSourceInText`; shown by
`NarrativeProvenanceNote` (unverified when the quote is not found).

### Computational Sidecar — Retired

**For the practitioner.** This feature was withdrawn on 18 October 2026. Its side panel, ordering screens, voice commands and shortcuts are gone, so nothing is available.

**For the system administrator.** Retired on 18 October 2026 at the product owner's request. The side panel, its ordering screens and its voice commands and shortcuts are removed. Flag maintenance and the display of past sidecar audit entries are unchanged.

**For marketing.** The Computational Sidecar has been retired at the product owner's request, and flag maintenance and past audit entries remain available.

**For FormedrixAI and partners (the plain reality).** Retired on 18 October 2026 at the product owner's request. The side panel, ordering screens, voice commands and shortcuts are gone. Flag maintenance and past audit entries are unchanged.

*Technical detail (for developers and Jira):*
Retired on 18 October 2026 at the product owner's request. The side panel,
its ordering screens and its voice commands and shortcuts are gone.
Flag maintenance and the display of past sidecar audit entries are
unchanged.

### ForMedrixAI Store — Partial

**For the practitioner.** Customers can browse and download models from the ForMedrixAI Store. Access to the store by subscription is not finished yet.

**For the system administrator.** The ForMedrixAI Store has a built model browse and download workflow. Tenant scoping is done: a global catalog plus per-organisation adoption (Batch 320, PS-58). Subscription authorization is still open (PS-59).

**For marketing.** Customers can browse and download models from the ForMedrixAI Store, with each organisation adopting the models it wants.

**For FormedrixAI and partners (the plain reality).** Partial. The browse and download workflow is built and tenant scoping is done (Batch 320, PS-58). Subscription authorization is still open (PS-59).

*Technical detail (for developers and Jira):*
Customer-facing model browse/download workflow is built. Tenant
scoping is done (global catalog plus per-organisation adoption, Batch
320, PS-58). Subscription authorization is still open (PS-59).
*Corrected in the Batch 496 README audit (Oct 9, 2026): PS-58 is done (`services/models/`, `components/Config/Models/`).*

---

## Security, Accessibility & Platform (Oct 2026)

### Accessibility to WCAG 2.1 AA — Live (Batch 524, PS-491)

**For the practitioner.** PathScribe is built to work with the keyboard and screen readers: focus is always visible, controls announce their state, and text contrast meets the standard. Manual keyboard and screen-reader testing is still open.

**For the system administrator.** Automated axe-core checks run on every main screen and every Configuration section with no serious or critical violations (`npm run test:a11y`), and an app-wide guard stops regressions. Since Batches 563 to 566, every top-level screen and its selected states are also checked in the browser. Manual keyboard and screen-reader QA is open (PS-548).

**For marketing.** PathScribe is built to WCAG 2.1 AA, with keyboard access, visible focus, screen-reader names on every field and AA contrast, checked automatically across the app.

**For FormedrixAI and partners (the plain reality).** Live (Batch 524, PS-491) for the automated checks. Manual keyboard and screen-reader QA is open (PS-548), so human assistive-technology testing is not done.

*Technical detail (for developers and Jira):*
- Automated axe-core checks run on every main screen and every Configuration section, with no serious or critical violations (`npm run test:a11y`).
- Clickable elements work from the keyboard, focus is always visible, switches announce their state, and every field has a name a screen reader reads.
- An app-wide guard stops regressions.
- Since Batches 563–566: every top-level screen and its selected states are also checked in the browser; faint text across the app meets AA contrast; selected tiles are announced; worklist rows that hold buttons open from a real button.
- Manual keyboard and screen-reader QA is open (PS-548).

### No patient data on the workstation — Live for server installations (Batch 525, PS-485)

**For the practitioner.** When PathScribe runs against the hospital's server, patient information is not saved in your browser, and old copies are cleared at start-up. Only display preferences, workstation settings, language and a minimal sign-in record stay.

**For the system administrator.** With the API server configured, clinical data is never written to the browser's storage and old copies are removed at start-up. Only display preferences, workstation settings, the language and a minimal sign-in record remain.

**For marketing.** With a server installation, no patient data is left on the workstation, which keeps shared and public computers cleaner.

**For FormedrixAI and partners (the plain reality).** Live for server installations (Batch 525, PS-485). It depends on the API server being configured, so the demo without a server is not covered.

*Technical detail (for developers and Jira):*
- With the API server configured, clinical data is never written to the browser's storage, and old copies are removed at start-up.
- Only display preferences, workstation settings, the language and a minimal sign-in record stay.

### Template lifecycle e-mails — Partial (Batch 583, PS-63)

**For the practitioner.** Automatic e-mails about template progress are not working yet. Nothing is sent in the demo.

**For the system administrator.** The browser sends only the event; the server chooses recipients, writes the e-mail in each person's language and sends it from a PathScribe address. Submitted goes to Template Approvers and Lab Directors; changes requested, approved and published go to everyone who saved the template; the nightly protocol sync goes to Admins. It is immediate with no opt-out in the first release, and needs the API server.

**For marketing.** Template lifecycle e-mails are designed to keep the right people informed at every step, in each person's own language, and are on the way with the API server.

**For FormedrixAI and partners (the plain reality).** Partial (Batch 583, PS-63). The browser side sends the event only. It needs the API server (phase 2e), and nothing is sent in the demo, so no e-mail has been sent or tested.

*Technical detail (for developers and Jira):*
- The browser sends only the event; the server chooses who is e-mailed, writes the e-mail in each person's language and sends it from a PathScribe address. Submitted → Template Approvers and Lab Directors; changes requested, approved, published → everyone who saved the template; nightly protocol sync → Admins. Immediate, no opt-out in the first release. **Needs the API server (phase 2e); nothing is sent in the demo.** Contract: `docs/architecture/TEMPLATE_NOTIFICATIONS_API.md`.

### Single sign-on group mapping — Planned (after the first release)

**For the practitioner.** Nothing is available yet. This is planned for after the first release.

**For the system administrator.** Planned. Accounts will sync first from the hospital's directory (SCIM) so a leaver loses access, and roles stay assigned by hand. When mapping comes it covers bench roles only, a second admin approves each mapping, and each role shows its source.

**For marketing.** Single sign-on group mapping is on the roadmap after the first release, starting with directory account sync, then Microsoft Entra ID and Okta.

**For FormedrixAI and partners (the plain reality).** Planned (after the first release). Nothing is built. The order is SCIM account sync first, then bench-role mapping with second-admin approval, with Microsoft Entra ID first and then Okta.

*Technical detail (for developers and Jira):*
- User accounts sync from the hospital's directory first (SCIM), so a leaver loses access; roles stay assigned by hand. When mapping comes: bench roles only, a second admin approves each mapping, each role shows its source. Microsoft Entra ID first, then Okta.

### Post-sign-out billing changes — Live (Batch 583)

**For the practitioner.** On a case that has been signed out, changing a code for one specimen now asks you for a reason and records it, just as case-level changes do.

**For the system administrator.** Specimen-level code changes on a signed-out case ask for a reason and record it, matching case-level changes.

**For marketing.** Billing changes after sign-out are now documented with a reason at specimen level as well as case level, for a clearer audit trail.

**For FormedrixAI and partners (the plain reality).** Live (Batch 583). Specimen-level code changes after sign-out require and record a reason. The body notes no gaps.

*Technical detail (for developers and Jira):*
- Specimen-level code changes on a signed-out case ask for a reason and record it, as case-level changes do.

### Block deletion — Partial (Batch 588)

**For the practitioner.** You can delete a block that is still in process, with a reason. Billing staff then see a "Block deleted" finding. Deleting after sign-out is not available yet.

**For the system administrator.** Delete this block works for a block still in process (soft delete, reason, audited). It raises a "Block deleted" billing finding that billing staff resolve in Financials; nothing is credited automatically and nobody is messaged. Planned: deleting after sign-out and flagging a block on an amended report (see BLOCK_DELETION.md).

**For marketing.** Deleting a block in process is supported with a reason and an audit trail, and a billing finding keeps finance informed. Deletion after sign-out is on the roadmap.

**For FormedrixAI and partners (the plain reality).** Partial (Batch 588). Live: soft delete of an in-process block with a reason, audited, and the "Block deleted" billing finding. Not built: automatic credit, messaging, deleting after sign-out and flagging a block on an amended report, which are Planned.

*Technical detail (for developers and Jira):*
- **Live:** Delete this block for a block still in process (soft delete, reason, audited), and a "Block deleted" billing finding that billing staff resolve in Financials; nothing is credited automatically and nobody is messaged. **Planned:** deleting after sign-out, and flagging a block on an amended report. See `BLOCK_DELETION.md`.

### Supported browsers — Live (Pete, Oct 15, 2026)

**For the practitioner.** PathScribe supports current versions of Chrome, Microsoft Edge and Firefox. Safari is not supported.

**For the system administrator.** Supported browsers are current Chrome, Microsoft Edge and Firefox; Safari isn't on the list. In Chrome and Edge, dropdown lists are drawn as styled panels (Batch 580), while Firefox shows the browser's own dark list; behaviour is the same in all three.

**For marketing.** PathScribe works in the big 3 browsers: Chrome, Microsoft Edge and Firefox.

**For FormedrixAI and partners (the plain reality).** Live (Pete, Oct 15, 2026). Automated accessibility and review tests run in Chromium and in Firefox on request, but have not yet been run in Firefox because the build workspace can't download it. Screen-reader checks (NVDA, VoiceOver) are in the manual test plan (PS-687) and not yet run.

*Technical detail (for developers and Jira):*
- Chrome, Microsoft Edge and Firefox, current versions (Pete: "the big 3"). Safari isn't on the list.
- The automated browser tests (accessibility checks, and from Batch 581 the review tests) run in Chromium, the engine of Chrome and Edge, and in Firefox on request (`npm run test:e2e:firefox`; not yet run in Firefox, which the build workspace can't download). The screen-reader checks (NVDA, VoiceOver) are in the manual test plan (PS-687), not yet run.
- In Chrome and Edge, dropdown lists are drawn as styled panels (Batch 580); Firefox shows the browser's own dark list until it supports the styled one. Behaviour is the same in all three.

### Fast first load — Live (Batch 527, PS-486)

**For the practitioner.** PathScribe opens quickly to the sign-in screen, and the rest loads after you sign in. PDF and barcode tools load only when you use them.

**For the system administrator.** The download to the sign-in screen is 0.68 MB compressed, and the build fails over 1 MB. The rest loads after sign-in, and server installations leave out the demo and developer screens.

**For marketing.** PathScribe starts fast: 0.68 MB compressed to the sign-in screen, with the rest loading after sign-in.

**For FormedrixAI and partners (the plain reality).** Live (Batch 527, PS-486). 0.68 MB compressed to sign-in, with the build failing over 1 MB. The body gives no measured load times on real networks.

*Technical detail (for developers and Jira):*
- 0.68 MB compressed to the sign-in screen. The rest loads after sign-in, and PDF and barcode tools load only when used.
- The build fails over 1 MB.
- Server installations leave out the demo and developer screens.

### Outside consult links — Live (Batch 522, PS-290)

**For the practitioner.** An outside consultant can be given a link to view one case, or selected slides, and sign an opinion. The link expires and can be revoked.

**For the system administrator.** Consult links are scoped, expiring and revocable, giving a consultant access to one case or selected slides. The token is kept out of server logs. Oversight is in Audit Log → Consult links.

**For marketing.** Outside consultants can review a single case and sign an opinion through a secure link that expires and can be revoked.

**For FormedrixAI and partners (the plain reality).** Live (Batch 522, PS-290). Scoped, expiring, revocable links with the token kept out of server logs, and oversight in Audit Log → Consult links. The body notes no gaps.

*Technical detail (for developers and Jira):*
- Scoped, expiring, revocable links let an outside consultant view one case (or selected slides) and sign an opinion.
- The token is kept out of server logs.
- Oversight is in Audit Log → Consult links.

### AI vendor choice — Live; per-jurisdiction vendor rules Partial (PS-558, Batch 536)

**For the practitioner.** Your lab's AI features can use different AI services, and your organisation can limit which are allowed for each country or facility. If a service isn't allowed, the AI call is simply not made. Some screens don't yet say why.

**For the system administrator.** Configuration → AI Behavior → AI vendor policy sets the allowed AI services and hosting regions per jurisdiction, optionally narrowed per facility; everything is allowed by default. A refused call goes nowhere and never to another vendor, and every call is logged with service, model, region and jurisdiction. Choosing a service a served jurisdiction doesn't allow shows an inline warning before saving. All calls go through the server's AI proxy with no vendor key in the browser.

**For marketing.** PathScribe offers a choice of AI vendors (Anthropic Claude, OpenAI, Azure OpenAI, AWS Bedrock, Google Gemini and self-hosted OpenAI-compatible models), with jurisdiction rules that keep each call where it is allowed.

**For FormedrixAI and partners (the plain reality).** AI vendor choice is Live; per-jurisdiction vendor rules are Partial (PS-558, Batch 536). The policy is Live in the browser. The same check in the server's AI proxy is specified (PS-539) but not built, and features other than the mismatch check carry on without AI when refused but don't yet say why on screen.

*Technical detail (for developers and Jira):*
- One provider layer covers Anthropic Claude, OpenAI, Azure OpenAI, AWS Bedrock, Google Gemini and self-hosted OpenAI-compatible models. All calls go through the server's AI proxy, with no vendor key in the browser.
- **Live in the browser (Batch 536):** the AI vendor policy (Configuration → AI Behavior → AI vendor policy): the allowed AI services and hosting regions per jurisdiction, optionally narrowed per facility; everything allowed by default. Every AI call (the mismatch check, critical findings, suggestions, coding, voice and dictation, narrative generation) is checked against the jurisdiction of its case or facility before anything is sent; a refused call goes nowhere, never to another vendor. The service's hosting region is recorded, and every call is logged with service, model, region and jurisdiction. Choosing a service a served jurisdiction doesn't allow shows an inline warning before saving. The mismatch check says "AI is not available for this jurisdiction" when it falls back to its rule-based check.
- **Partial:** the same check in the server's AI proxy (the one that counts in production) is specified for the API server (`docs/architecture/AI_PROXY.md`, with PS-539). Features other than the mismatch check carry on without AI when refused, but don't yet say why on screen.

*What changed batch by batch, for the guides, training and marketing: [`GUIDE_UPDATES.md`](GUIDE_UPDATES.md).*

### Hosting: public cloud, private or sovereign cloud, or on premises — Planned (PS-539; review done, Batch 537)

**For the practitioner.** Nothing is available yet. Two small improvements already help you: a notice when the connection to the server drops and "Connection restored" when it returns.

**For the system administrator.** Planned (PS-539): one cloud-agnostic package, with an installation qualification checklist per hosting location. Live already: the connection banner and waiting states (Batch 548), and one build for every site, with each deployment's addresses and sign-in settings in its own config.json, read at start-up so a wrong setting stops start-up with a plain explanation (Batch 547). A small on-site agent over outbound HTTPS is planned for printers and file shares (version 1) and later instruments (version 2); until then, network report printing from the browser goes to the release's fallback channels.

**For marketing.** PathScribe is planned for public cloud, private or sovereign cloud, or on-premises hosting from one cloud-agnostic package. The connection banner and one-build-for-every-site configuration are already live.

**For FormedrixAI and partners (the plain reality).** Planned (PS-539; review done, Batch 537). Not built: the cloud-agnostic package, validation and installation qualification, the on-site agent, and the HL7 connection through the interface engine. Live: the connection banner and waiting states (Batch 548) and the one build with its own config.json (Batch 547). The review covers HIPAA, France HDS/SecNumCloud, Germany C5, NHS, Korea, India, Australia and Canada.

*Technical detail (for developers and Jira):*
- One cloud-agnostic package (containers, SQL Server, self-hosted live updates, jobs and events in SQL Server tables (decision D1)), validated once. Each hosting location gets an installation qualification checklist.
- **Connection banner and waiting states (Live, Batch 548):** a notice below the top bar when the connection to the server drops, and "Connection restored" when it's back. Screens show a placeholder only after 300 ms, and say they're still working after 3 s. Since Batch 549 every screen does this, and PathScribe reconnects as soon as the network returns.
- **One build for every site (Live, Batch 547):** each deployment's addresses and sign-in settings are in its own `config.json`, read when PathScribe starts, so the same validated build is installed everywhere. A wrong setting stops start-up with a plain explanation instead of running wrongly. `docs/architecture/RUNTIME_CONFIG.md`.
- Always-on parts keep the 1-second screen refresh; background jobs run as short scheduled tasks.
- A small on-site agent reaches printers and file shares (version 1), and later instruments (version 2), over outbound HTTPS only (decision D3; contract `docs/architecture/SITE_AGENT_API.md`, Batch 546). Until it exists, network report printing can't be sent from the browser: such a print goes straight to the release's fallback channels.
- HL7 connections go through the interface engine over VPN or MLLP over TLS. A message is acknowledged only once it is stored durably. The engine runs hosted by ForMedrixAI or in the hospital, per hospital, from the same container (decision D6); contract: `docs/architecture/INTERFACE_ENGINE_EDGE.md` (Batch 545).
- The review covers markets and their hosting rules (HIPAA, France HDS/SecNumCloud, Germany C5, NHS, Korea, India, Australia, Canada). Source: `docs/architecture/DEPLOYMENT_READINESS_REVIEW.md`.

## Planned / Not Yet Built

**For the practitioner.** Sign-in with Microsoft Entra ID or an Okta-style provider is available. Sign-in with Google is not available yet, and the suggestion drawer for charge capture is not available yet either.

**For the system administrator.** Microsoft Entra ID or a generic OpenID Connect provider such as Okta can be used for single sign-on. Google sign-in is not offered until the API server exists. The rule-based charge capture works and shows real RVU on the Productivity tab, but the AI suggestion drawer is not built, and the ForMedrixAI-only restrictions are enforced in the browser only.

**For marketing.** Single sign-on with Microsoft Entra ID or Okta-style OpenID Connect providers is built, and rule-based workload tracking with real RVU is in place. Google sign-in and AI charge suggestions are on the roadmap.

**For FormedrixAI and partners (the plain reality).** Status: Partial. Built: Microsoft and OpenID Connect SSO, the rule-based part of charge capture, and the platform-level admin restrictions in the browser (Superadmin is ForMedrixAI support only). NOT built: Google sign-in (needs the API server), the AI/NLP charge suggestion drawer, and the server side of platform restrictions, which is a separate ForMedrix identity tenant.

*Technical detail (for developers and Jira):*

- **SSO with Google** — single sign-on with Microsoft Entra ID or a
  generic OpenID Connect provider (such as Okta) is built (Batch 343,
  PS-60, `services/auth/`, `docs/architecture/AUTHENTICATION_OIDC.md`);
  Google sign-in needs the API server and isn't offered until then.
- **Workload Tracking & Charge Capture, AI part** — the rule-based part
  is built (`services/billing/`, real RVU on the Productivity tab); the
  AI/NLP suggestion drawer is not
  (`docs/product/WORKLOAD_AND_CHARGE_CAPTURE_SCOPE.md`).
- **Platform-level (ForMedrixAI-employee-only) admin restrictions** —
  built in the browser since Batch 371 (Superadmin is ForMedrixAI support
  only, `platform:` capabilities; corrected Sep 2026: this line said "not
  built"). The server side, a separate ForMedrix identity tenant
  (`docs/architecture/ACCESS_CONTROL_PLAN.md`), is not built.

*Corrected in the Batch 496 README audit (Oct 9, 2026): Microsoft SSO (Batch 343) and versioned case saves with an audited Overwrite (Batch 458, PS-71, `services/cases/caseWrite.ts`) are built and were removed from this list; charge capture is partly built.*


## Simulated mail outbox (Batch 604)

**For the practitioner.** If no mail service is connected, messages the system would send are kept on screen and clearly marked Simulated, so nothing real goes out. Administrators can read these messages.

**For the system administrator.** Read the kept messages under Configuration, System, Simulated mail outbox. Messages are labelled Simulated, shown with a notice and audited without subject or address. A real refusal from a real mail server is never simulated. Critical-alert channels, the secure e-mail Sent screen and support tickets behave the same way.

**For marketing.** Without a mail service connected, PathScribe still shows exactly what e-mail would be sent, clearly labelled Simulated and audited, so demonstrations and testing stay safe and easy to follow.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). Outgoing e-mail is kept in the browser and labelled Simulated until a mail service is connected. Nothing is actually sent. Support access gains a PDF export of its audit stream, a Simulated Ticket closed action, and a record of the support agent's own exports and configuration changes.

*Technical detail (for developers and Jira):*

When no mail service is connected, e-mail the system would send is kept in the browser, labelled Simulated, shown to the person with a notice and audited (the audit entry carries no subject or address). Administrators read the messages under Configuration, System, Simulated mail outbox. A real refusal from a real server is never simulated. Critical-alert channels, the secure e-mail Sent screen and support tickets use the same path and say so on screen. Support access adds a PDF export of its audit stream, a Simulated "Ticket closed" action, and a record of the support agent's own exports and configuration changes.

## Wall display access (Batch 603)

**For the practitioner.** Wall displays for facility operations and the operating room show information without anyone signing in. The operating room board shows case ID and room, never patient name or MRN, and the facility display shows no patient identifiers.

**For the system administrator.** A wall display is bound to its display profile or terminal only with an administrator-issued Display Token (Configuration). Tokens are revocable, long-lived and stored as a hash, and the screen blanks within a minute of revocation or expiry. The server-side 401 check is Planned.

**For marketing.** Shared wall displays for facility operations and the operating room keep teams informed at a glance, with no patient names or MRNs on screen and access controlled by revocable tokens.

**For FormedrixAI and partners (the plain reality).** Status: Built in the demo. The server-side 401 check is Planned and not built. Display tokens are administrator-issued, revocable and stored as a hash, and the displays blank within a minute of revocation or expiry.

*Technical detail (for developers and Jira):*

`/facility-ops-dashboard` and `/or-suite-dashboard` are shared screens with no signed-in user. Each binds to its display profile or terminal only with an administrator-issued Display Token (Configuration; revocable, long-lived, stored as a hash) and blanks within a minute of revocation or expiry. The OR board identifies rows by surgical case ID and room, never patient name or MRN; the Facility Ops display carries no patient identifiers. Server-side 401 check: Planned. Implementation: `src/services/displayAccess/`, `docs/architecture/DISPLAY_ACCESS_API.md`.

## Break-glass rebind permission (Batch 603)

**For the practitioner.** Re-linking a downtime patient identity needs a special high-risk permission, a reason code and a written justification, and the action is recorded.

**For the system administrator.** Rebinding a downtime patient identity (Audit Log) needs the permission patient:break-glass:rebind. It is high-risk and audited, and also requires a reason code and written justification. Grant it sparingly.

**For marketing.** Break-glass rebinding of downtime patient identities is protected by a dedicated permission, a reason code and written justification, with a full audit record.

**For FormedrixAI and partners (the plain reality).** Status: described as a built permission with no further status given. Rebinding a downtime patient identity needs the high-risk, audited permission patient:break-glass:rebind, plus a reason code and written justification. The body states no server enforcement detail.

*Technical detail (for developers and Jira):*

Rebinding a downtime patient identity (Audit Log) needs `patient:break-glass:rebind` (high-risk, audited), plus a reason code and written justification.

## Printing, labels and the site agent (Batch 606)

**For the practitioner.** Labels, engravings and report prints work even with no printer connected. The print is marked Simulated and logged. Slide labels can be designed, and gross weight and gross photos can be captured on the specimen form.

**For the system administrator.** With no printer service connected, prints come back labelled Simulated, with an audit entry (kind, printer, copies, no patient data) and a row in Configuration, System, Simulated print log. A switch there makes simulated prints fail for testing. The slide label layout (Print settings) and Label Designer layouts drive printed labels (ZPL and browser print). With an API server configured nothing is simulated and a missing transport is a real error.

**For marketing.** Label printing is flexible, with a Label Designer offering show rules, version history and export to ZPL, EPL and DPL. Specimen forms capture gross weight and gross photos, and reports can carry a technical component facility letterhead.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). Printing is simulated when no printer service is connected, and the scale agent is simulated in the demo (weight can also be typed). With an API server configured nothing is simulated and a missing transport is a real error. The body does not claim any real printer or scale hardware has been tested. Of the Label Designer's three export languages only ZPL is dispatched (through QZ Tray); EPL and DPL are export text that is never sent to a printer, and Zebra Browser Print is a Bridge Type setting with no Zebra SDK behind it (Planned; a profile on that bridge falls back to the browser print dialog or, in the demo, a Simulated result).

*Technical detail (for developers and Jira):*

With no printer service connected, a label, engraving or report print goes down the same route it would use and comes back labelled Simulated: a notice, an audit entry (kind, printer, copies; no patient data) and a row in Configuration, System, Simulated print log, with a switch that makes simulated prints fail. With an API server configured nothing is simulated and a missing transport is a real error. The slide label layout (Print settings) and layouts saved in the Label Designer now drive the printed labels (ZPL and browser print); the designer adds show rules, version history and export to ZPL, EPL and DPL. A slide label is produced once across the microtomy scan and the workstation print. The specimen form captures gross weight (scale agent, simulated in the demo, or typed) and gross photos. Report render requests carry the lab page size and margins, and a case can name a technical component facility whose letterhead is sent as a second block. Implementation: `src/services/printing/simulatedPrint.ts`, `src/utils/labels/`, `src/services/labelDesigner/`.

## Simulated interface engine (Batch 605)

**For the practitioner.** Incoming and outgoing messages to other systems can be tried out without a real connection. Everything is marked Simulated.

**For the system administrator.** Without an interface engine, run inbound messages from the Mock Interface Engine page. Outbound messages (block, slide and specimen label orders, scan events, charges, financial-class payloads, registry reports) go to a simulated engine that logs type and outcome. All of it is labelled Simulated and audited without patient data, and is replaced by real traffic when the engine is connected.

**For marketing.** Teams can explore the full message flow with a simulated interface engine, seeing each message type and outcome, ready to be replaced by real traffic once an engine is connected.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). No real interface engine is involved. Inbound messages come from the Mock Interface Engine page and outbound ones go to a simulated engine that logs type and outcome, audited without patient data. Real traffic only happens once an engine is connected.

*Technical detail (for developers and Jira):*

Without an interface engine, inbound messages are run from the Mock Interface Engine page and outbound messages (block, slide and specimen label orders, scan events, charges, financial-class payloads, registry reports) go to a simulated engine that logs type and outcome. All of it is labelled Simulated, audited without patient data, and replaced by real traffic when the engine is connected.

## Batch 607: code systems and coding

**For the practitioner.** When adding codes, only the code systems your lab allows are offered, and required ones are marked. Signing out warns you if a required code is missing. Codes can be compared side by side between ICD-10 and ICD-11, and ICD-O morphology can be searched.

**For the system administrator.** The code-system policy governs the Add Code window (allowed systems only, required ones marked), sign-out (warns first when a required system has no code, with an audited override) and the charge message (switched-off systems left out). The OPCS-4 tab explains the NHS TRUD licence, and the ICD-O tab searches a bundled ICD-O-3 morphology table.

**For marketing.** Coding is guided by lab policy, with required systems flagged before sign-out, an ICD-10 and ICD-11 side-by-side view and a built-in ICD-O-3 morphology search.

**For FormedrixAI and partners (the plain reality).** Status: delivered in the product with the ICD-10 to ICD-11 map marked Simulated, so it is not a real code map. Codes are kept as uniform entries beside the older lists. The ICD-O tab searches only a bundled ICD-O-3 table, and the OPCS-4 tab explains the NHS TRUD licence rather than supplying content.

*Technical detail (for developers and Jira):*

The code-system policy now governs the Add Code window (allowed systems only, required ones marked), sign-out (warn first when a required system has no code, with an audited override) and the charge message (switched-off systems left out). Codes are kept as uniform entries (system, release, source, AI detail) beside the older lists, with an ICD-10 and ICD-11 side-by-side view (Simulated map). The OPCS-4 tab explains the NHS TRUD licence, and the ICD-O tab searches a bundled ICD-O-3 morphology table.
Batch 651: AI code suggestions are parsed and checked in `services/coding/aiCodeSuggestions.ts` (one 0 to 100 confidence scale; the real provider and model id stored with each applied AI code); the OPCS-4 lookup reads the five-code Simulated demonstration list, whose codes cannot be applied (real reference data Planned).

## Batch 608: Cytology reviewer pools, QC compliance and screening reports

**For the practitioner.** Cytology quality review goes only to the reviewers a rule allows, never the person who signed. Cases can be returned to a trainee with required feedback shown as a banner. The screening page records HPV test details and follow-up, and more screening reports are available.

**For the system administrator.** Configuration, Staff sets the QC reviewer pool by rule (empty means the staff role); the signer is never a reviewer. The QC queue has a Compliance view and a suggested-severity badge. The facility record holds a national registry ID. The HPV positivity, UK failsafe and EU compliance reports gain assay, referral, non-response, registry ID, platform and interval-adherence columns. The proficiency report panel builder gives a Simulated graded result.

**For marketing.** Cytology teams get tighter quality review, trainee feedback loops, richer HPV and screening records, and expanded compliance reports for UK and EU needs.

**For FormedrixAI and partners (the plain reality).** Status: built in the product, with the proficiency panel graded result marked Simulated. Reviewer pools, countersign return to trainee, HPV and registry fields, expanded reports, molecular QC scope and control-well Trace are described as in place. No real graded proficiency service is claimed.

*Technical detail (for developers and Jira):*

QC review is limited to the pool a rule names (Configuration, Staff; empty means the staff role) and never the signer. The QC queue has a Compliance view and a suggested-severity badge; the screening page shows the same badge on the Bethesda review. Cytology and autopsy cases released for countersign can be returned to the trainee with required feedback, shown to the trainee as a banner. Accessioning records a prior cervical procedure that drives the high-risk factor. The screening page records HPV assay, ThinPrep or SurePath and the follow-up on a positive HPV result; the facility record holds a national registry ID. The HPV positivity, UK failsafe and EU compliance reports gain assay, referral and non-response, registry ID, platform and interval-adherence columns. The proficiency report has a panel builder with a Simulated graded result, molecular QC reports follow the selected scope, and Trace works for control wells. Implementation: `src/services/cytologyQc/`, `src/services/cases/returnCaseToTrainee.ts`, `src/services/cytology/screeningIntervals.ts`, `src/services/cytology/proficiencyPanel.ts`.

## Batch 609 (part C): AI models, dictation languages, medical spell check

**For the practitioner.** Dictation follows your lab's spelling (US, UK/IE, AU/NZ, CA) and keeps French, German, Dutch and Korean text in that language. Starter spell check lists exist for German, French and Dutch.

**For the system administrator.** Each adopted AI model has organisation-only settings (longest answer, confidence threshold). An admin switch stops mis-heard non-English phrases from fuzzy-matching English commands, and the instructions per language are visible for review. Spell check has starter pathology lists for German, French and Dutch.

**For marketing.** Dictation respects local spelling and keeps French, German, Dutch and Korean text in its own language, with starter medical spell check for German, French and Dutch.

**For FormedrixAI and partners (the plain reality).** Status: Live in the browser for model settings and dictation languages, but the dictation wording needs native-speaker review. Spell check is Partial: a starter set for German, French and Dutch, and the licensed extension is Planned.

*Technical detail (for developers and Jira):*

AI models: each adopted model has organisation-only settings (longest answer, confidence threshold) that the AI call path and the suggestion threshold read (Live in the browser). Dictation: AI refinement follows the lab's spelling (US, UK/IE, AU/NZ, CA) and keeps French, German, Dutch and Korean text in that language; an admin switch stops mis-heard non-English phrases from fuzzy-matching English commands; the instructions per language are visible for review (Live in the browser; wording needs native-speaker review). Spell check: starter pathology lists for German, French and Dutch (Partial: starter set, licensed extension Planned).

## Batch 609 (part B): Mismatch check after sign-out, Final Diagnosis rule, template audit, Upload Protocol check

**For the practitioner.** After sign-out, the check for clinical and pathologic mismatch also runs on amendments, corrections and addenda before release. A report template cannot be published with more than one Final Diagnosis field. Protocol files can be uploaded and checked.

**For the system administrator.** The mismatch check runs on an unlocked amendment or correction and on addendum text before release. A lab setting decides whether a high-risk mismatch holds the release (default: it does) and the change is audited. A Final template with more than one Final Diagnosis field cannot be published. Every protocol lifecycle step writes an Audit Log entry. Upload Protocol checks JSON, XML (CAP eCC / SDC) and Excel files and imports a PathScribe JSON protocol as a draft.

**For marketing.** Safer reporting with mismatch checks on amendments and addenda, guarded templates, full protocol audit trails and a protocol upload check.

**For FormedrixAI and partners (the plain reality).** Status: Live in the browser. Upload Protocol labels results unverified against CAP and RCPath. XML and Excel import and the licensed CAP / RCPath content are Planned and not built.

*Technical detail (for developers and Jira):*

The clinical-pathologic mismatch check also runs on an unlocked amendment or correction (alert on the report, re-sign-out asks again) and on an addendum's text before release; a lab setting decides whether a high-risk mismatch holds the release (default: it does) and the change is audited. A Final template with more than one Final Diagnosis field cannot be published, and the builders warn as it happens. Every protocol lifecycle step writes an Audit Log entry. Upload Protocol checks JSON, XML (CAP eCC / SDC) and Excel files, labels the result unverified against CAP and RCPath, and imports a PathScribe JSON protocol as a draft (Live in the browser). XML and Excel import and the licensed CAP / RCPath content are Planned.

### Tumor Board Criteria Rules, AI Discordance and Delegation by Voice — Live (Batch 610)

**For the practitioner.** Cases matching diagnosis, biomarker and margin rules are listed for the right tumor board automatically. Quality staff can see where AI and pathologists disagree, and delegation types can be chosen by voice.

**For the system administrator.** Find the settings in Configuration (Tumor Board Auto-Flag Rules), Quality Assurance (AI Discordance), the Delegate dialog and the Worklist. Finishing delegated work clears it from Delegated to me.

**For marketing.** Tumor board referral rules by diagnosis and biomarker, AI-versus-pathologist discordance monitoring and hands-free delegation are live in the front end.

**For FormedrixAI and partners (the plain reality).** Status: Live in the front end against browser-side services. The rule store, AI results and delegation records still have to move to the API server, which is not done.

*Technical detail (for developers and Jira):*
- **What it does:** Cases that match diagnosis, biomarker and margin rules are listed for the right tumor board automatically; QA sees where AI and pathologists disagree and which AI results stalled; delegation types can be chosen by voice, and finishing delegated work clears it from "Delegated to me".
- **User Guide:** Configuration (Tumor Board Auto-Flag Rules); Quality Assurance (AI Discordance); Delegate dialog; Worklist.
- **Marketing / RFP:** "Tumor board referral rules by diagnosis and biomarker; AI-versus-pathologist discordance monitoring; hands-free delegation."
- **Standards:** CAP and ISO 15189 (tumor board and AI monitoring), IEC 62304 (AI performance monitoring).
- **Status:** Live in the front end against browser-side services; the rule store, AI results and delegation records move to the API server.

### Performance targets, client service levels and jurisdiction overview (`Configuration → System`) — Live in the demo (Batch 610); server storage Planned

**For the practitioner.** Case and RVU targets feed a Targets tile on the productivity dashboard, and the worklist shows a badge on open cases past their client service level. A read-only overview shows each country's setup.

**For the system administrator.** Set targets and client service levels (first touch and signed report, with STAT variants) in Configuration, System. Built-in targets are protected and custom targets are allowed. The read-only Jurisdiction Overview links to each setting for editing. Settings are saved in the browser until the API server stores them.

**For marketing.** Targets, client service levels and a country-by-country overview give managers clear visibility, with SLA badges that flag late cases at a glance.

**For FormedrixAI and partners (the plain reality).** Status: Live in the demo, and server storage is Planned. Settings are saved in the browser until the API server stores them. There are no per-person targets and no business-hours calendar yet.

*Technical detail (for developers and Jira):*
Cases and RVU targets per period (built-in targets protected, custom targets allowed) feed a Targets tile on the Productivity dashboard. Client service levels (first touch and signed report, with STAT variants) are judged case by case: a per-client table on the Quality tab and Productivity dashboard, and an SLA badge on the worklist for open cases past target. A read-only Jurisdiction Overview gathers each country's facilities, roles, sign-out rules, code systems, AI policy, retention sources and registries with links to edit each. Saved in the browser until the API server stores them; no per-person targets and no business-hours calendar yet (see `KNOWN_GAPS.md`).

### Multi-factor sign-in (Session Security → Second factor; sign-in and signature prompts) — Built (Demo), Batch 611

**For the practitioner.** You can be asked for a second factor when signing in or signing a report. Demo accounts use a simulated authenticator code, which works once and locks after five failures.

**For the system administrator.** Under Session Security, Second factor, choose off, the roles that sign reports, or everyone, plus step-up minutes and session hours. Hospital single sign-on must report a second factor (amr / acr) or it is refused. The permission auth:mfa-enrolment:reset resets a colleague's enrolment within your own organisation. Everything is audited with no codes or secrets.

**For marketing.** Flexible multi-factor sign-in policy per organisation, with support for hospital single sign-on proof and fully audited enrolment resets, is available in demonstration.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). The authenticator is Simulated for demo accounts. NOT built: server-side enforcement and a real password-account secret, which are the backend team's work.

*Technical detail (for developers and Jira):*
- **Policy per organisation:** off, the roles that sign reports, or everyone; step-up minutes and session hours.
- **Hospital single sign-on:** requires the provider's sign-in response to report a second factor (`amr` / `acr`) and refuses it otherwise; a fresh provider sign-in with the same proof before a signature.
- **Demo accounts:** a Simulated authenticator (time-based code, recovery codes, "Show demo code"), lockout after five failures, a code works once.
- **Administration:** `auth:mfa-enrolment:reset` resets a colleague's enrolment (own organisation only). Everything is audited, with no codes or secrets.
- **Not yet:** the server-side enforcement and a real password-account secret are the backend team's work (`docs/architecture/MFA.md`).

### Sign-out authentication policy (Session Security → Sign-out authentication) — Built (Demo), Batch 642; network and workstation-lock rules Planned (API server)

**For the practitioner.** At sign-out you may be asked for your password, and the button says Sign Out (Password Required) when so. Each sign-out is recorded.

**For the system administrator.** Under Session Security, Sign-out authentication, choose a password at every sign-out (default) or once per session (15 min, 30 min, 60 min, 4 h), with an optional second factor. Set one enterprise default, per-performing-facility overrides, or lock every facility to the default. The audit table is exportable as CSV.

**For marketing.** Sign-out authentication can be tuned from every sign-out to once per session, with facility overrides and a complete exportable audit trail, available in demonstration.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). Planned and needing the API server: remote sign-out limited to trusted networks, session end on workstation lock, network classification in the audit, and the server repeating every check.

*Technical detail (for developers and Jira):*
- **Policy:** a password at every sign-out (default) or once per session (15 min, 30 min, 60 min, 4 h), with an optional second factor; one enterprise default, per-performing-facility overrides, and a lock so every facility follows the default. A case follows the policy of the facility that performed it.
- **At sign-out:** the button reads "Sign Out" or "Sign Out (Password Required)" with a tooltip; a session ends on timeout, logout or change of role; every authentication, in-session sign-out, expiry and policy change is audited with user, facility, policies, session, method, time, case and a device hint. The table is exportable as CSV for audits.
- **Planned (needs the API server):** remote sign-out limited to trusted networks, session end on workstation lock, network classification in the audit, and the server repeating every check (`docs/architecture/SIGN_OUT_AUTHENTICATION.md`).

### Workstation registry and scope reference (`Configuration → System`) — Built (Demo), Batch 612

**For the practitioner.** Workstations can be registered by name so printing goes to the right place. A reference screen explains which settings apply to the whole organisation and which to a facility.

**For the system administrator.** In Configuration, System, register named workstations with tokens that are shown once, stored as a hash, and can be rotated or revoked. Last seen is tracked and everything is audited. A context binding drives print routing.

**For marketing.** Named workstations with secure, revocable tokens and a clear scope reference make setup and print routing straightforward, available in demonstration.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). The token check is Simulated until the API server and site agent exist, and neither exists yet.

*Technical detail (for developers and Jira):*
Register named workstations with revocable tokens (shown once, stored as a hash, rotate, revoke, last seen, audited) and a context binding used for print routing; a reference screen explains enterprise versus performing-facility scope for each setting area. Token check is Simulated until the API server and site agent exist.

### Code Manager searches for flagged findings (Codes) — Built (Demo), Batch 615

**For the practitioner.** When a report answer shows an abnormal finding, the Code Manager offers a button that fills a code search for you. You edit the words if you like and pick the code. Nothing is applied until you act.

**For the system administrator.** In Codes, an answer matching an abnormal-detection trigger shows a button in the Code Manager. It fills a SNOMED search with the field and value for the right specimen. No search runs and nothing is applied until the pathologist acts.

**For marketing.** Coding is faster, because flagged findings turn into a one-click SNOMED search that the pathologist stays in control of, available in demonstration.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). It stays pathologist driven, with no automatic search or coding. The body notes no server or real-terminology limits beyond that.

*Technical detail (for developers and Jira):*
When a synoptic answer matches an abnormal-detection trigger, the Code Manager shows that finding as a button. Pressing it fills a SNOMED search with the field and value for the right specimen; the pathologist edits the words if wanted and picks the code. No search runs and nothing is applied until the pathologist acts.

### Case search reporting (`Search → Report`) — Built (Demo), Batch 613

**For the practitioner.** Search on what synoptic reports say, then turn the search into a report with counts or a list. You can save it, export it as CSV and schedule it for chosen people.

**For the system administrator.** Under Search, Report, build counts by pathologist, month, diagnosis, facility, case type, status, priority or subspecialty, with share and median days to sign-out, or a list with chosen columns. CSV export is audited and has its own permission. Scheduled runs are Simulated.

**For marketing.** Turn any search on synoptic content into counts, lists, saved reports, CSV exports and scheduled deliveries, available in demonstration.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). Scheduled runs are Simulated until the API server runs schedules, which is not built yet.

*Technical detail (for developers and Jira):*
Search on what synoptic reports say (protocol, question, condition, value), then turn any search into a report: counts by pathologist, month, diagnosis, facility, case type, status, priority or subspecialty with share and median days to sign-out, or a list with chosen columns including synoptic answers. Save a report, export it as CSV (audited, own permission), and set it to run on a schedule for chosen users. Scheduled runs are Simulated until the API server runs schedules (`docs/architecture/SCHEDULED_REPORTS_API.md`).

### Related cases at sign-out and the Patient summary (sign-out view, Patient History) — Built (Demo), Batch 613

**For the practitioner.** At sign-out you see a notice listing the patient's other released cases you may open. Nothing is pre-ticked, so you decide what to include. Chosen reports print, export and go out exactly as seen. Patient History can print a labelled patient summary.

**For the system administrator.** Related cases appear in an inline notice in the sign-out view with ordering and copy-to physicians. Chosen reports are fixed at sign-out. A later amendment of a related case raises a flag without changing the section. The intraoperative diagnosis is part of the report output (PDF, text and outbound result). Patient History prints the summary.

**For marketing.** Pathologists can bring a patient's related cases into the report and print a patient summary, with every choice in their hands, available in demonstration.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). Server storage with the signed report version is Planned with the API server and not built.

*Technical detail (for developers and Jira):*
At sign-out an inline notice lists the patient's other released cases the signer may open, with ordering and copy-to physicians; none is pre-ticked and the pathologist decides. Chosen reports show inside the sign-out view, are fixed at sign-out, and print, export to PDF and go out in the result exactly as seen. A later amendment of a related case raises a flag without changing the section. The intraoperative diagnosis is now part of the report output (PDF, text and outbound result). Patient History prints a labelled patient summary of chosen released cases. Server storage with the signed report version is Planned with the API server (`docs/architecture/RELATED_CASES_API.md`).

### Access to a patient's other cases (Patient History, case workup) — Built (Demo), Batch 613

**For the practitioner.** If a patient has cases you cannot open, you see how many and can ask for access with a reason. The assigned pathologist or an administrator approves or declines, and you are told.

**For the system administrator.** Requests appear in a notice in Patient History and case workup. The assigned pathologist or an administrator approves or declines in that notice. An approval covers the patient and stays open until revoked with a reason. Every step is audited without patient identifiers.

**For marketing.** A simple in-context request and approval flow lets pathologists see more of a patient's story while keeping access controlled and audited, available in demonstration.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). Server enforcement of the grant on the case API is server work and not built. The browser filters against the mock services.

*Technical detail (for developers and Jira):*
A pathologist who finds the patient has cases they cannot open sees how many, asks for access with a reason, and the assigned pathologist or an administrator approves or declines in the same notice; the requester is told. An approval covers the patient and stays open until revoked (with a reason). Every step is audited without patient identifiers. Server enforcement of the grant on the case API is **server work** (the browser filters against the mock services).

### Reporting feed for Power BI (`Configuration → System`) — Built (Demo), Batch 613

**For the practitioner.** This lets reporting tools such as Power BI read PathScribe data. It is set up by administrators.

**For the system administrator.** In Configuration, System, choose datasets and facilities, then issue and revoke tokens (shown once, stored as a hash). Data is de-identified by default, and identified data needs a named-approver approval. A field catalogue and a Simulated pull test are provided.

**For marketing.** Power BI and other reporting tools can be fed from PathScribe with de-identified data by default and controlled approvals, available in demonstration.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). The reporting API is server work (PS-787) and is not built. The pull test is Simulated.

*Technical detail (for developers and Jira):*
Let Power BI and other reporting tools read PathScribe data through the API server: choose datasets and facilities, issue and revoke tokens (shown once, stored as a hash), de-identified by default with a named-approver approval for identified data, a field catalogue and a Simulated pull test. The reporting API is server work (PS-787, `docs/architecture/BI_FEED_API.md`).

## Batch 612: Interface Dictionary (Message Mapper)

**For the practitioner.** This is a behind-the-scenes tool used by ForMedrixAI support to map outside system messages to extra fields on a case. A Vendor fields panel appears on the case.

**For the system administrator.** Available to ForMedrixAI support only (three platform-only capabilities). Vendor profiles for HL7 v2 (Z-segments), JSON and FHIR map to extension fields only, and the scope guard refuses core structure. Draft, test, publish, roll back or switch off. Audited without message content.

**For marketing.** Interface Dictionary lets ForMedrixAI support map vendor message fields safely into extension fields, with a draft, test, publish and rollback lifecycle, available in demonstration.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). NOT built here: applying published profiles to live messages in the interface engine, and durable storage of extension values. Both are server work.

*Technical detail (for developers and Jira):*

- **Built (Demo):** vendor profiles for HL7 v2 (Z-segments), JSON and FHIR; mappings to extension fields only (scope guard refuses core structure); draft, test, publish, roll back, switch off; Vendor fields panel on the case. ForMedrixAI support only (three platform-only capabilities). Audited without message content.
- **Server work (not built here):** applying published profiles to live messages in the interface engine; durable storage of extension values.

### Server versions of quality, digital pathology, image, grossing, dictionary, reagent, cold-chain, label and intraoperative services — Built (Demo), Batch 616 (PS-501, PS-502, PS-506, PS-508, PS-510)

**For the practitioner.** Nothing changes on screen. This is behind-the-scenes preparation so the product can later use a real server instead of the demonstration.

**For the system administrator.** 35 services have an API-server version beside their mock. With an API server address configured the browser uses it, otherwise it uses the mock. No patient text goes in a web address, and the ADT lookup by MRN is a POST body.

**For marketing.** The product is being prepared for real server connections, with 35 services already having a server-ready version beside the demonstration one.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). The endpoints themselves are not built and are the India team's. Also not built: peer review, CAPA recommendations, QA trend policy, label reprint runs, intraoperative critical results (no interface yet) and equipment (PS-514).

*Technical detail (for developers and Jira):*
- What it does: 35 services have an API-server version beside their mock. With an API server address configured the browser uses it; without one it uses the mock (the demonstration). The calls are written up in `docs/architecture/QUALITY_API.md`, `DIGITAL_PATHOLOGY_API.md`, `GROSSING_ROUTING_API.md`, `REAGENTS_LABELS_API.md` and `INTRAOP_OPS_API.md`.
- Privacy: no patient text in a web address; the ADT lookup by MRN is a POST body.
- Not built: peer review, CAPA recommendations, QA trend policy, label reprint runs, intraoperative critical results (no interface yet), equipment (PS-514). Server side not built: the endpoints themselves (India team).

### Server versions of report, accessioning, patient and encounter services — Built (Demo), Batch 616 (PS-483, PS-503, PS-505)

**For the practitioner.** Nothing changes on screen. This is behind-the-scenes preparation for connecting to a real server later.

**For the system administrator.** 14 services (amendments, informal reviews, LIS amendment notices, report release buffer, report change log, report parts, incoming-order intake, drafts, patient index, encounters, patient history and the outbound queues) use the API server when an address is configured, and the mock otherwise. Nothing that identifies a person is placed in a web address. Batch 654: the Release Hold Print Policy (allow, warn, supervisor override, block) is a setting of the report release buffer. Batch 655 and 656: failed Quality saves say so, the Delegate dialog lists refused people, low-confidence critical findings are set aside only when Abnormal, and the Codes window verifies suggested codes by the code itself and counts those it left out. Batch 657: the User Guide opens at the page for the screen you are on (Help button and Alt+V), with search, a workflow trail and previous and next steps; thirteen first pages are drafted.

**For marketing.** Report, accessioning and patient services now have server-ready versions, while the demonstration continues to work unchanged.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). The endpoints are the India team's and not built here. Follow-up tracking has no server version yet because the browser store and the contract differ in shape.

*Technical detail (for developers and Jira):*

- What it does: 14 services (amendments, informal reviews, LIS amendment notices, report release buffer, report change log, report parts, incoming-order intake, drafts, patient index, encounters, patient history and the outbound queues) have an API-server version beside the mock. With an API server address configured the browser uses it; without one it uses the mock, so the demonstration is unchanged. Nothing that identifies a person is placed in a web address.
- Status: Built (Demo). The endpoints themselves are the India team's (contracts: `docs/architecture/REPORTS_API.md`, `ACCESSIONING_API.md`, `PATIENTS_API.md`). Follow-up tracking has no server version yet (the browser store and the contract differ in shape).

### Server versions of billing, cytology, molecular and registry services — Built (Demo), Batch 616

**For the practitioner.** Nothing changes on screen. This is behind-the-scenes preparation for connecting to a real server later.

**For the system administrator.** 52 services (billing and charge capture, cytology and cytology QC, molecular batches, racks, control rules and the order queue, registry reporting) use the API server when an address is configured, and the mock otherwise.

**For marketing.** Billing, cytology, molecular and registry services now have 52 server-ready versions, while the demonstration continues to work unchanged.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). The endpoints themselves are the India team's and are not built here.

*Technical detail (for developers and Jira):*

- What it does: 52 services (billing and charge capture, cytology and cytology QC, molecular batches, racks, control rules and the order queue, registry reporting) have an API-server version beside the mock. With an API server address configured the browser uses it; without one it uses the mock, so the demonstration is unchanged.
- Status: Built (Demo). The endpoints themselves are the India team's (contracts: `docs/architecture/BILLING_API.md`, `CYTOLOGY_API.md`, `MOLECULAR_API.md`, `REGISTRY_API.md`).

### Follow-up tracking by commands, and biometric signing through one flow — Built (Demo), Batch 616 (PS-483, PS-512)

**For the practitioner.** Follow-up tracking can mark a follow-up expected, record an outcome, reopen it and e-mail the clinician. Biometric sign-in and signing checks go through one process, which is simulated in the demonstration.

**For the system administrator.** Follow-up tracking has a server version that works by commands. The server works out the window, status and who acted, while the demo does this locally. Biometric enrolment, sign-out check, policy card and the invitation after sign-in all use one flow, a browser-only Simulated check in the demo and challenge-and-verify with an address on the API server (no simulated fallback there).

**For marketing.** Follow-up tracking and biometric signing are unified into clean command and verification flows, available in demonstration.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). The biometric check is Simulated in the demo. Needs the server side, which is not built.

*Technical detail (for developers and Jira):*

Follow-up tracking now has a server version that works by commands (mark expected, record an outcome, reopen, email the clinician): the browser says what the user did and the server works out the window, the status and who did it. The demo works the status out locally as before. Biometric enrolment, the sign-out check, the policy card and the invitation after sign-in all go through one flow that is the browser-only Simulated check in the demo and the API server's challenge-and-verify with an address (no simulated fallback there). Contracts: `docs/architecture/FOLLOW_UP_API.md` (Browser commands) and `ACCESS_SESSION_API.md` (3a). Needs the server side.

### Server versions of staff, access and lab dictionary services — Built (Demo), Batch 616 (PS-484, PS-507, PS-512)

**For the practitioner.** Nothing changes on screen. This is behind-the-scenes preparation for connecting to a real server later.

**For the system administrator.** Audit, authorization, staff, roles, facilities, screening-registry settings, access requests, session time-out and seven lab dictionaries each have a server version, used when an API server address is configured. The demo keeps the mock. Authorization fails closed. The screens still use the browser-side biometric functions.

**For marketing.** Staff, access and lab dictionary services now have server-ready versions, with authorization that fails closed, while the demonstration stays unchanged.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). The biometric server version is built but the screens still use the browser-side functions. The body does not describe any live server deployment.

*Technical detail (for developers and Jira):*

Audit, authorization, staff, roles, facilities, screening-registry settings, access requests, session time-out and seven lab dictionaries each have a server version built from the shared pattern, with contracts in `docs/architecture/STAFF_ADMIN_API.md`, `ACCESS_SESSION_API.md` and `LAB_DICTIONARIES_API.md`. Used when an API server address is configured; the demo keeps the mock. Authorization fails closed. The biometric server version is built but the screens still use the browser-side functions.


### Server versions of interface, model, protocol, template, routing, macro, flag, message and AI-policy services — Built (Demo), Batch 616 (PS-509, PS-511, PS-513, PS-515)

**For the practitioner.** Nothing changes on screen. This is behind-the-scenes preparation, plus a safety check that keeps demo screens and AI calls away from outside hosts in a server build.

**For the system administrator.** Twenty more services have an API-server version chosen by configuration. A guard fails the build if a demo screen or demo account becomes reachable in a server build, or if AI or terminology-search code calls an outside host. With the API server configured, ICD-10-CM, ICD-11 and LOINC searches go through it. A deployment can turn biometric sign-in off for everyone with VITE_BIOMETRIC_SIGN_IN=false.

**For marketing.** Twenty more services are server-ready, with built-in guards that keep demo content and outside calls out of server builds.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). The endpoints are the India team's, and HTTP_SERVICES_REMAINING.md lists what is still the mock. The demonstration still calls NLM directly for terminology look-ups.

*Technical detail (for developers and Jira):*

Twenty more services have an API-server version chosen by configuration, built from the shared pattern with contracts in `docs/architecture/` (`INTERFACE_EXCEPTIONS_API.md`, `INTERFACE_ENGINE_API.md`, `LIS_INGESTION_API.md`, `MODELS_API.md`, `PROTOCOLS_API.md`, `TEMPLATE_SIGNALS_API.md`, `REPORT_TEMPLATES_API.md`, `ROUTING_API.md`, `MACROS_API.md`, `FLAGS_AND_MESSAGES_API.md`, `AI_VENDOR_POLICY_API.md`). A guard now fails the build if a demo screen or demo account becomes reachable in a server build, or if AI or terminology-search code calls an outside host. The endpoints are the India team's; `docs/architecture/HTTP_SERVICES_REMAINING.md` lists what is still the mock.

- **Terminology look-ups (Batch 617, Built (Demo)):** with the API server configured, ICD-10-CM, ICD-11 and LOINC searches go through it (`TERMINOLOGY_PROXY_API.md`); the demonstration still calls NLM directly. A deployment can also turn biometric sign-in off for everyone (`VITE_BIOMETRIC_SIGN_IN=false`).

### One route style for every server version — Built (Demo), Batch 617

**For the practitioner.** Nothing changes on screen. This is internal tidying.

**For the system administrator.** All services that can talk to the API server do so in one style (/api/<area>/<service>/<method>), where a plain read is a GET and everything else a POST. An automated test checks it. About 85 services were converted from REST resources.

**For marketing.** One consistent route style across every server-ready service makes the platform cleaner and easier to connect, with no change to the screens.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). The endpoints themselves are the India team's and are not built here.

*Technical detail (for developers and Jira):*

- What it does: all services that can talk to the API server do so in one way (`/api/<area>/<service>/<method>`; a plain read is a GET, everything else a POST), checked by an automated test. About 85 services written earlier as REST resources were converted. No screen changes.
- Status: Built (Demo). The endpoints themselves are the India team's (`docs/architecture/HTTP_SERVICES_PATTERN.md` §7, `HTTP_ROUTE_MAPPING.md`).

### Server versions of delivery, print, delegation, dictionary, equipment and migration services — Built (Demo), Batch 617

**For the practitioner.** Nothing changes on screen. This is behind-the-scenes preparation for connecting to a real server later.

**For the system administrator.** 26 more services (delivery rules and retries, print settings and print queue, label reprint runs, delegations, equipment, data migration, LIS sync, margin extraction, intraoperative critical results and others) have an API-server version beside the mock. With an API server address the browser uses it, otherwise the mock.

**For marketing.** 26 more services, from delivery and printing to data migration, are now server-ready while the demonstration continues unchanged.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). The endpoints themselves are the India team's and are not built here.

*Technical detail (for developers and Jira):*

- What it does: 26 more services have an API-server version beside the mock (delivery rules and retries; print settings and the print queue; label reprint runs; delegations; participation types; internal notes; display access; diagnosis codes; external resources; feedback settings; fonts; governing bodies; performance targets; priorities; equipment; data migration; LIS sync; margin extraction; intraoperative critical results). With an API server address the browser uses it; without one it uses the mock, so the demonstration is unchanged.
- Status: Built (Demo). The endpoints themselves are the India team's (contracts: `docs/architecture/DELIVERY_PRINTING_API.md`, `DELEGATIONS_NOTES_API.md`, `CONFIG_DICTIONARIES_API.md`, `EQUIPMENT_MIGRATION_API.md`).

### Server versions of settings, dictionaries, case workflows and critical results services — Built (Demo), Batch 617

**For the practitioner.** Nothing changes on screen. This is behind-the-scenes preparation for connecting to a real server later.

**For the system administrator.** 29 more services (including abnormal-finding rules, case search, countersign, critical result notifications, alert tokens and dispatch, mismatch rules, codes, code system policy and delegation types) have an API-server version. With an API server address configured the browser uses them, otherwise the mock.

**For marketing.** 29 more settings, dictionary and case workflow services are now server-ready while the demonstration continues unchanged.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). The endpoints are the India team's and are not built here.

*Technical detail (for developers and Jira):*

- What it does: 29 more services have an API-server version beside the mock (abnormal-finding rules and signals, action groups, AI behaviour, asset locations, assist polling, batches, BI feed admin, bulk code import, NCCI edits, billing release triggers, case masks, case search, case view tracking, countersign, on-demand case fetch, client SLAs, critical result notifications, alert tokens and dispatch, mismatch rules, clinical history dictionary, codes, code system policy, consult tokens, cytology proficiency panels, pathology lexicon, cytology compliance features, delegation types). With an API server address configured the browser uses them; without one it uses the mock, so the demonstration is unchanged.
- Status: Built (Demo). The endpoints are the India team's (contracts in `docs/architecture/`).

### Server versions of quality, referral, search, signature, dictionary, tumor board and workstation services — Built (Demo), Batch 617

**For the practitioner.** Nothing changes on screen. This is behind-the-scenes preparation for connecting to a real server later.

**For the system administrator.** 28 more services (peer review, CAPA, QA trend policy, referral tracking, saved searches, scheduled reports, signature records, smart capture, tumor board and rules, TAT targets, workstation groups and registry and others) have an API-server version. With an API server address configured the browser uses them, otherwise the mock.

**For marketing.** 28 more quality, referral, search and signature services are now server-ready while the demonstration continues unchanged.

**For FormedrixAI and partners (the plain reality).** Status: Built (Demo). The endpoints themselves are the India team's and are not built here.

*Technical detail (for developers and Jira):*

- What it does: 28 more services have an API-server version beside the mock (peer review, CAPA, QA trend policy, referral tracking, saved searches, scheduled reports, signature records, smart capture, tumor board and rules, dictionaries, subspecialties, system configuration, TAT targets, workstation groups and registry). With an API server address configured the browser uses it; without one it uses the mock, so the demonstration is unchanged.
- Status: Built (Demo). The endpoints themselves are the India team's (contracts in `docs/architecture/`).

### Server version of case material — Built (Demo), Batch 618

**For the practitioner.** When you change how a specimen was decanted on the Material tab, the change is saved in one step along with any billing lines it affects. Today this runs against the demonstration only.

**For the system administrator.** No setting is described for this item. A decant change on the Material tab is saved by one atomic server call, using the same service the demonstration uses. The server side is not built, so there is nothing to configure against a real server yet.

**For marketing.** Decant changes on the Material tab save in a single, all-or-nothing step, with the affected billing lines kept in step. It is available in demonstration today.

**For FormedrixAI and partners (the plain reality).** Built (Demo): it works against the demonstration services. The server side is not built, and nothing was tried against a real server.

*Technical detail (for developers and Jira):*
- What it does: a decant change on the Material tab is saved by one atomic server call (tree and affected billing lines back), through the same service the demonstration uses.
- Status: Built (Demo): works against the demonstration services; the server side is not built, and nothing was tried against a real server.
- Sources: services/material/httpCaseMaterialService.ts; docs/architecture/CASE_MATERIAL_API.md.

### Partial nephrectomy drawing (PS-492)

**For the practitioner.** For a partial nephrectomy, the kidney map on the Report screen draws only the structures that match your answers, such as Gerota's fascia only when you report extent beyond it. A radical nephrectomy shows all of them.

**For the system administrator.** No setting or permission applies, because it is a drawing. It appears on the Report screen under Anatomical map (PathScribe) after the extent question is answered.

**For marketing.** The kidney resection map now follows what you report, so a partial nephrectomy shows only the anatomy that is relevant. It is available in demonstration.

**For FormedrixAI and partners (the plain reality).** Built (Demo) (Batch 618). Layout is checked by tests for every combination and both sides, but a look by eye is still wanted.

*Technical detail (for developers and Jira):*
- What it does: The kidney resection map draws, for a partial nephrectomy, the perinephric fat always, Gerota's fascia only when the extent is "Beyond Gerota's fascia" and the adrenal gland only when it is "Ipsilateral adrenal gland, by direct (contiguous) spread"; the renal vein, vena cava and ureter only when reported (Batch 466c). A radical nephrectomy draws all of it.
- Workflow: Report screen, Anatomical map (PathScribe), after the extent question is answered.
- Roles/permissions: none (a drawing).
- Settings: none.
- Status: Built (Demo) (Batch 618). Layout checked by tests for every combination and both sides; a look by eye is still wanted.
- Sources: services/organMapping/renalAnatomy.ts; services/organMapping/renalGeometry.ts; services/organMapping/resolveRenalMap.ts.

### Second facility for the technical component (PS-336)

**For the practitioner.** A consultation or outside case can name the lab that did the technical work. The technical charge goes out at grossing under that lab, the professional charge waits for sign-out, and the signed-out report names the technical lab with its name and address.

**For the system administrator.** Set it on the Accession screen (consultation or outside material), or later in the Case team window, which uses its existing permission. The accession field needs nothing beyond accessioning, and the technical lab needs the performing lab role.

**For marketing.** Cases that involve a second laboratory can now credit the lab that did the technical work, with charges and the signed-out report reflecting it. It is available in demonstration.

**For FormedrixAI and partners (the plain reality).** Built (Demo) (Batch 618). The report line is tested in Python. The claim fields are in the JSON charge message only, and the HL7 DFT message is unchanged. Nothing was tried against a real server.

*Technical detail (for developers and Jira):*
- What it does: A consultation or outside case can name the lab that did the technical work. The technical charge is released at grossing and attributed to that lab; the professional -26 line waits for sign-out and stays with the reporting lab; the signed-out report adds one line naming the technical lab (name and address only).
- Workflow: Accession screen (consultation or outside material), or Case team window afterwards; then billing at grossing and sign-out; then the signed-out report.
- Roles/permissions: the Case team window's existing permission; the accession field needs none beyond accessioning.
- Settings: none (the lab needs the performing lab role).
- Status: Built (Demo) (Batch 618). The renderer line is tested in Python; the claim fields are in the JSON charge message only (the HL7 DFT message is unchanged); nothing was tried against a real server.
- Sources: services/accessioning/resolveTechnicalFacilityOffer.ts; services/billing/resolveChargeFacilities.ts; services/billing/jsonWebhookBuilder.ts; services/facilities/resolveSplitReportBranding.ts; services/facilities/technicalFacilityAudit.ts; pages/AccessionPage/AccessionTechnicalFacilityField.tsx; functions/main.py.

### Delivery schedules — Built (Demo), Batch 619

**For the practitioner.** Each outgoing feed and registry can follow its own timing, such as sending at once, in set hours, in daily, weekly or monthly batches, after sign-out, or after a review hold. Today this is shown in the demonstration.

**For the system administrator.** Set in the System configuration, in the Delivery Schedules section, at the enterprise level and overridden for each performing facility. Registries also carry a reporting deadline and an amendment re-queue flag. The outbound queue that uses the schedules is a separate screen.

**For marketing.** Delivery timing can be tailored for every feed and registry, from immediate to batched or held until sign-out, with facility-level overrides. It is available in demonstration.

**For FormedrixAI and partners (the plain reality).** Built (Demo): it works against the demonstration services. The server side is not built (contract DELIVERY_SCHEDULES_API.md).

*Technical detail (for developers and Jira):*
- What it does: for each feed (and each registry) a schedule says when items leave the queue: immediately, in set hours, in daily/weekly/monthly batches with a cutoff, held until sign-out, or a review hold after sign-out. Set at the enterprise, overridden per performing facility. Registries also carry a reporting deadline and an amendment re-queue flag.
- Status: Built (Demo): works against the demonstration services; the server side is not built (contract `DELIVERY_SCHEDULES_API.md`). The outbound queue that uses the schedules is a separate screen.
- Sources: services/deliverySchedules/; components/Config/System/DeliverySchedulesSection.tsx.

### Billing release rules — Built (Demo), Batch 619

**For the practitioner.** The laboratory decides when each charge goes to billing: at once, after a review hold, in a batch, or only when a person releases it. Charges with a problem, such as an unmapped CPT code, wait for review. Today this is shown in the demonstration.

**For the system administrator.** Set in the System configuration, in the Billing Release section, per billing type (TC, -26, Global), as an enterprise default with performing-facility overrides. Unmapped CPT, a missing technical-component facility and amendment delta charges go to review, and amended or retracted cases cancel their unsent charges. Results show in the Outbound Queue billing feed.

**For marketing.** Billing release can be matched to how each lab works, with clear rules for when charges go out and automatic review for anything unusual. It is available in demonstration.

**For FormedrixAI and partners (the plain reality).** Built (Demo): it works against the demonstration services. The server side is not built (contract BILLING_RELEASE_API.md). Which facts the rules read from a case (case type, pathologist, amendment) is best effort in the demo.

*Technical detail (for developers and Jira):*
- What it does: the performing laboratory sets, per billing type (TC, -26, Global), when a generated charge is released to billing: at once, after a review hold, in a batch, or only by a person. Enterprise default with performing-facility overrides; unmapped CPT, a missing technical-component facility and amendment delta charges go to review; amended or retracted cases cancel their unsent charges.
- Status: Built (Demo): works against the demonstration services; the server side is not built (contract `BILLING_RELEASE_API.md`). Shown in the Outbound Queue's billing feed. Which facts the rules read from a case (case type, pathologist, amendment) is best effort in the demo.
- Sources: services/billingRelease/; components/Config/System/BillingReleaseSection.tsx.

### Outbound Queue — Built (Demo), Batch 619

**For the practitioner.** One screen shows every outgoing message, where you can hold, release or retry items, fix and resubmit registry rejections, and see deadline flags. Billing items can be marked for review, retracted or released now. Today this is shown in the demonstration.

**For the system administrator.** The Outbound Queue is a single screen for ten feeds, including billing charges and registry submissions, with hold, release and retry. Registry rejections can be fixed and resubmitted or marked not reportable, and deadline flags come from the delivery schedules. Interface queues show no Acknowledged state in the demo.

**For marketing.** Every outbound message is visible in one place, with the controls to hold, release, retry and correct. It is available in demonstration.

**For FormedrixAI and partners (the plain reality).** Built (Demo): it works against the demonstration queues. The server side is not built (contract OUTBOUND_QUEUE_API.md). Interface queues have no engine acknowledgement field yet, so they never show Acknowledged in the demo.

*Technical detail (for developers and Jira):*
- What it does: one screen for every outbound message (ten feeds, including billing charges and registry submissions) with hold, release and retry, registry rejections (fix and resubmit, or mark not reportable), reporting-deadline flags from the delivery schedules, amended-report links, and for billing: needs-review, retract and release now.
- Status: Built (Demo): works against the demonstration queues; the server side is not built (contract `OUTBOUND_QUEUE_API.md`). Interface queues have no engine acknowledgement field yet, so they never show Acknowledged in the demo.
- Sources: services/outboundQueue/; pages/OutboundQueuePage/.

### UK cancer registry (COSD) — Built (Demo), Batch 620 part C

**For the practitioner.** PathScribe can prepare a UK cancer registry submission, check it and show a simplified preview. A rejected submission comes back with a correction due date, 5 working days by default. Today this is shown in the demonstration.

**For the system administrator.** Set in the System configuration, in the COSD destination section, with an enterprise default and performing-facility overrides, including the correction window (5 working days by default). Rejected submissions return to the Outbound Queue. The real file and transport belong to the interface engine.

**For marketing.** UK cancer registry submissions have their own settings, built-in checks and a correction window to keep rejections on track. It is available in demonstration.

**For FormedrixAI and partners (the plain reality).** Built (Demo): it works against the demonstration services. The server side is not built (contract UK_COSD_API.md). The preview is not the official COSD schema, and the rules still needing the published specification are listed in the contract. The real file and transport are the interface engine's.

*Technical detail (for developers and Jira):*
- What it does: the destination settings and correction window for the UK cancer registry feed (enterprise default, performing-facility overrides), PathScribe's own checks on a UK submission, and a labelled simplified preview. A rejected submission returns to the Outbound Queue with a correction due date counted in working days (5 by default).
- Status: Built (Demo): works against the demonstration services; the server side is not built (contract `UK_COSD_API.md`). The preview is not the official COSD schema; the rules still needing the published specification are listed in the contract. The real file and transport are the interface engine's.
- Sources: services/cosd/; components/Config/System/CosdDestinationSection.tsx.

### AI extraction of historical reports — Built (Demo), Batch 621

**For the practitioner.** When you open an older case in the patient history, the AI can show the template and fields it read from the final diagnosis and microscopic text, labelled "AI-extracted, not verified". You can use "flag as wrong" to report errors. It is for information only and is off by default.

**For the system administrator.** Turn it on under Configuration > System > AI history extraction, as an enterprise setting with performing-facility overrides, then use Patient history > a historical case. Permissions are config:history-extraction:manage (Admin, Lab Director), and ai:history-extraction:run and ai:history-extraction:flag (Pathologist, Fellow, Resident). The AI vendor rules (PS-558) apply to every call.

**For marketing.** Older reports become easier to read at a glance, with the AI showing the matching template and fields beside the original text, clearly labelled and open to feedback. It is available in demonstration, and it is advisory only.

**For FormedrixAI and partners (the plain reality).** Built (Demo): it works against the demonstration services. The server side is not built (contract HISTORY_AI_EXTRACTION_API.md). Not built is extraction when an Assist-mode LIS summary arrives, because no user is there to authorise it. Results are advisory and never read by reports, printing, registries, billing, rules or exports.

*Technical detail (for developers and Jira):*
- What it does: when a historical case is opened in the patient history, the AI reads its Final Diagnosis and Microscopic text through the existing synoptic capability and shows the matched template and its fields beside the text, labelled "AI-extracted, not verified", with "flag as wrong" for accuracy measurement. Cached by a hash of the text (no second call unless the text changes). Advisory only: never read by reports, printing, registries, billing, rules or exports (a guard test enforces it). Off by default; enterprise setting with performing-facility overrides.
- Workflow: Configuration > System > AI history extraction to turn it on; then Patient history > a historical case.
- Roles/permissions: `config:history-extraction:manage` (Admin, Lab Director); `ai:history-extraction:run` and `ai:history-extraction:flag` (Pathologist, Fellow, Resident).
- Settings: the on/off setting (enterprise and facility); the AI vendor rules (PS-558) apply to every call.
- Status: Built (Demo): works against the demonstration services; the server side is not built (contract `HISTORY_AI_EXTRACTION_API.md`). Not built: extraction when an Assist-mode LIS summary arrives (no user to authorise it).
- Sources: services/historyExtraction/; services/aiIntegration/synopticFieldsPrompt.ts; components/PatientHistory/HistoryExtractionPanel.tsx; components/Config/System/HistoryExtractionSection.tsx.

### US ePath (state cancer registries) — Built (Demo), Batch 620 (part E)

**For the practitioner.** PathScribe can prepare electronic pathology reports for US state cancer registries, check them, and hold back reports that fail the checks for review. Today this is shown in the demonstration.

**For the system administrator.** Set in the System configuration, in the US ePath section. It uses one base HL7 v2.5.1 message and a profile per state, with routing by the performing facility's state, and failed reports go to review and the registry feed queue. Only a labelled example profile ships, and the interface engine owns the real transport.

**For marketing.** State cancer registry reporting is built around one base message with a profile per state, plus review of reports before they go. It is available in demonstration.

**For FormedrixAI and partners (the plain reality).** Built (Demo): it works against the demonstration services. The server side is not built (contract US_EPATH_API.md). Only a labelled example profile ships. Each state's real profile and the message identifiers must be confirmed against the NPCR guide and that state's specification (Planned), and the interface engine owns the real transport.

*Technical detail (for developers and Jira):*
- What it does: HL7 v2.5.1 electronic pathology reports to US state cancer registries: one base message, a profile per state (required fields, transport, checks, state codes), routing by the performing facility's state, review of reports that fail the checks, queue entries on the registry feed.
- Status: Built (Demo): works against the demonstration services; the server side is not built (contract `US_EPATH_API.md`). Only a labelled example profile ships; each state's real profile and the message identifiers must be confirmed against the NPCR guide and that state's specification (Planned). The interface engine owns the real transport.
- Sources: services/usEpath/; services/hl7/epathBuilder.ts; components/Config/System/UsEpathSection.tsx.

### Registry batch files — Built (Demo), Batch 620 (part S)

**For the practitioner.** For screening programmes and registries that take a file, PathScribe collects results and sends them in the next file, holding back records that miss a required field. Today this is shown in the demonstration.

**For the system administrator.** Set in the System configuration, in the Batch Registry Feed section, with a profile per programme or registry for format (CSV or XML), columns and file name. Each file is recorded by name, count and checksum. A labelled example profile is included, and the NAACCR XML feed cannot be turned on yet.

**For marketing.** Registry file submissions can follow each registry's own schedule, with incomplete records caught first and every file tracked. It is available in demonstration.

**For FormedrixAI and partners (the plain reality).** Built (Demo): it works against the demonstration services. The server side is not built (contract BATCH_REGISTRY_FEED_API.md). The NAACCR XML (abstract-level) feed is a slot that cannot be turned on yet (Planned). No real programme's layout is shipped, and each must be checked against its published specification.

*Technical detail (for developers and Jira):*
- What it does: a screening programme or registry that takes a CSV or XML file has a profile (format, columns, file name); results wait and go in the next file on the registry's own schedule, or on demand; records missing a required field are held back; each file is recorded by name, count and checksum; the registry's answer to a file reaches each record. Includes a labelled example profile.
- Status: Built (Demo): works against the demonstration services; the server side is not built (contract `BATCH_REGISTRY_FEED_API.md`). The NAACCR XML (abstract-level) feed is a slot that cannot be turned on yet (Planned). No real programme's layout is shipped: each must be checked against its published specification.
- Sources: services/batchRegistryFeed/; components/Config/System/BatchRegistryFeedSection.tsx.

### Spain and Spanish (es-ES) — Partial, Batch 622

**For the practitioner.** Spain and Castilian Spanish are partly available, including the interface, report language, dictation, spell-check, and the DNI/NIE identifier format. The translation still needs review by a native-speaker clinician.

**For the system administrator.** Spain is available as a jurisdiction and Castilian Spanish as the sixth language, covering interface, report language, voice profile with spoken punctuation, dictation refinement, spell-check dictionary and a starter pathology word list. The DNI/NIE identifier format and CIE-10-ES label are included. Screening, regional registries, e-invoicing and other items listed as Planned are not available.

**For marketing.** PathScribe is taking its first steps into Spain with Castilian Spanish for the interface, reports, dictation and spell-check. More is on the roadmap.

**For FormedrixAI and partners (the plain reality).** Partial (Batch 622). The translation is AI-produced and needs native-speaker clinical review. Not built (Planned): screening intervals and programmes, regional registry profiles, e-invoicing, SNOMED CT Spanish edition, CIE-10-ES tables, Catalan / Basque / Galician. The DNI / NIE identifier is a format check only: the control letter is not validated, so Spain has no identifier check rule (the check-digit table `services/patientIdentifiers/checkDigits.ts` has no Spanish row; Planned, Batch 652 audit).

*Technical detail (for developers and Jira):*
- What it does: Spain as a jurisdiction and Castilian Spanish as the sixth language: interface, report language, voice profile with spoken punctuation, dictation refinement, Spanish spell-check dictionary and a starter pathology word list, DNI/NIE identifier format (pattern only; the control letter is not validated, no `mrn_dni_nie` rule in `checkDigits.ts`), CIE-10-ES label.
- Status: Partial. The translation is AI-produced and needs native-speaker clinical review. Not built (Planned): screening intervals and programmes, regional registry profiles, e-invoicing, SNOMED CT Spanish edition, CIE-10-ES tables, Catalan / Basque / Galician.
- Sources: i18n/locales/es.json; types/systemConfig.ts; constants/voiceProfiles.ts; contexts/punctuationMaps.ts; services/spellcheck/; spellcheck-data/es/; docs/product/SPAIN_RESEARCH.md.

## Batch 646: Administrator Guide and the Help button

**For the practitioner.** Nothing changes in your screens. Administrators get a guide and a **Help** button on Configuration screens.

**For the system administrator.** Nine chapters in setup order, a Setup order checklist, a Setup sequence box on every screen, field tables, permissions, and a glossary and error code index. **Help** opens the open screen's section in a new tab. Find it under Configuration (top right).

**For marketing.** A complete, searchable Administrator Guide with real screenshots, written from the product itself, with a Help button that goes straight to the right page.

**For FormedrixAI and partners (the plain reality).** Status: Built. Six languages (en, fr, de, nl, ko, es) since Batch 647; the five translations are machine made and need native-speaker review. All screenshots captured, of the demo, in the English interface. Help opens the guide in the interface language, and floats on the non-Configuration screens that have a guide page. The synoptic editor and reviewer pages have no Help button.

*Technical detail (for developers and Jira):*

- **Built:** `docs/admin-guide/` (chapters, builder `scripts/admin-guide/build.py`, captures `capture.mjs`), published to `public/help/admin-guide/`; `components/Config/help/AdminGuideHelpButton`, `services/help/adminGuideLinks`; guard `adminGuideAnchors.guard.test.ts` (every Configuration tab and section has a guide section).
- **Not built:** native-speaker review of the five translations (Batch 647 added them, machine made); a Help button on the synoptic editor and reviewer pages. (Batch 647 captured the pictures of windows that open on a click and added Help to the Audit Log and the other non-Configuration screens.)
- **Sources:** docs/admin-guide/README.md; docs/admin-guide/AUTHORING.md; docs/admin-guide/OWNERSHIP.md.

## Batch 650: Screen handlers for registered voice and keyboard commands

**For the practitioner.** Commands that were listed but did nothing now work: Sign Out Case, History, Codes, Accept and Pass in the pool window, the pool and countersign tiles, Execute and Clear search, and the Contribution trend tiles. Each does what its button does and is ignored when the button is greyed out or another window is open.

**For the system administrator.** No new setting or capability. A command is greyed by the same capability as its button. Commands that still have no screen handler are listed in `docs/product/KNOWN_GAPS.md`.

**For marketing.** Keyboard and voice reach the frequent report actions with the same checks as the mouse.

**For FormedrixAI and partners (the plain reality).** Status: Partial. 29 registered commands still have no handler (listed with reasons); Sign Out and Next works only for Assist cases; no command can confirm a signature.

*Technical detail (for developers and Jira):*

- **Built:** `services/reports/bottomBarActions.ts` (one decision draws the report bar's buttons and answers their commands), `pages/SynopticReportPage/hooks/useBottomBarActionEvents.ts`, `utils/modalFocus.ts` (ignore while a window is open), `services/cases/poolClaimWindow.ts` and `PoolClaimModal` (Accept / Pass take the registry's context while open, act only when ready and permitted), `services/quality/tatTileActions.ts` (the tab listened for an event nothing sent), listeners in `PatientHistoryModal`, `PreFinalisationModal`, `WorklistPage`, `SearchPage`. Guard: `services/actionRegistry/actionListeners.guard.test.ts` with the reasoned list in `unwiredActions.ts`.
- **Not built:** the 29 in `unwiredActions.ts`; an Orchestration Sign Out and Next; Accept from a selected Worklist row with the window closed.
- **Sources:** docs/product/HOTKEY_DECISIONS.md; docs/product/KNOWN_GAPS.md.

## Batch 652: Specimen pipeline gaps (triage gate, intraoperative findings, reconciliation, pool routing, Lockbox link, repeatable PDFs)

**For the practitioner.** Frozen-section diagnoses and photos from the intraoperative session follow the specimen onto the case, labelled intraoperative and never replacing the final diagnosis. At sign-out each frozen specimen is checked against its final category in turn. Finishing grossing on the Grossing screen sends the case to its pool, as Gross Complete does. A lockbox receipt is closed for you when the case is accessioned from its order.

**For the system administrator.** Settings: Concordance review ("Enable Automatic Category Comparison" needs the review-screen switch on to show anything) and Case pool assignment (Assignment Timeout, now used to sweep unassigned, unpooled grossed cases). No new permission; the receipt link uses `lockbox:folder:review`. Three new audit entries.

**For marketing.** Fewer things fall between steps: intraoperative findings are kept with the case, every frozen specimen is reconciled, cases reach a pool from either grossing screen, lockbox drops close automatically, and report PDFs can be reproduced exactly.

**For FormedrixAI and partners (the plain reality).** Status: Partial (Demo). Triage and pool-timeout rules run in the browser and need the API server to repeat them; the pool timer is an interim browser timer. No screen shows the carried intraoperative findings yet. The reconciliation comparison is a category rule, not AI. Report PDFs repeat byte for byte only for the same request; the browser does not yet send the signing time.

*Technical detail (for developers and Jira):*
- Triage: `services/grossing/triageReleaseGate.ts` (`isTriagePending`, `checkTriageReleaseGate`), used by `useSpecimenBlockManagement`, `GrossingReleasePanel`, the worklist tile.
- Intraop: `services/intraop/carryIntraopFindingsToCase.ts`, `types/intraop/CaseIntraoperativeFinding.ts`, `Case.intraoperativeFindings`; called from the mock `merge()`. Idempotent per session.
- Reconciliation: `services/quality/frozenReconciliationPlan.ts` (plan and queue), `useSignOutWorkflow` (`finalizeSignOut` hands out the next specimen), modal keyed by specimen.
- Pool: `services/grossing/routeCaseAfterGrossing.ts` (report page and Grossing screen); `services/cases/poolAssignmentTimeout.ts` (`assignmentWaitExpired`, `expireUnassignedCases`, `startAssignmentTimeoutSweep`) and `pages/WorklistPage/hooks/usePoolAssignmentTimeout.ts`.
- Lockbox: `ILockboxService.accessionReceiptForCase`, `services/accessioning/linkLockboxReceipt.ts`, `docs/architecture/LOCKBOX_API.md`.
- PDF: `functions/main.py` (`signing_time`, invariant mode), `functions/cytology_report.py` (`fix_timestamp`), `services/supportAccess/supportAuditPdf.ts`.
