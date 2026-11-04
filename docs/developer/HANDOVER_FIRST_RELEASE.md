# PathScribe handover: what is finished, and what remains for a code-complete first release

*Written October 26, 2026 (Batch 698), for the development team and the technical writers. Plain language; no programming needed to follow the status tables.*

**Version 1.2, November 2, 2026 (after Batch 763).** What changed in each version is on the last page (section 12).

*Updated October 31, 2026 (Batches 752 to 754): section 3's figures, new rows in sections 4 and 7, section 9 (what changed in Batches 699 to 751) and section 10 (the demo's slide images, hosted in Cloudflare R2 since Oct 31). Rows added on Oct 31 are marked (Oct 31).*

*Updated November 2, 2026 (version 1.2): section 3's figures, new rows in section 9 (Batches 752 to 763), section 11 (how requisition ingestion works) and section 12 (version history). Rows added on Nov 2 are marked (Nov 2).*

This replaces nothing and extends the older notes. Read it first; it points to the detail:

| Older note | What it still covers |
|---|---|
| [`GETTING_STARTED.md`](GETTING_STARTED.md) | Conventions, testing discipline and gotchas for developers |
| [`../architecture/DEPLOYMENT_READINESS_REVIEW.md`](../architecture/DEPLOYMENT_READINESS_REVIEW.md) | The server and hosting plan; the six blockers in section 12 |
| [`../product/KNOWN_GAPS.md`](../product/KNOWN_GAPS.md) | The running release-scope list (PS-338) |
| [`../product/GAP_REGISTER.md`](../product/GAP_REGISTER.md) | The October code audit, row by row |
| [`../product/FRONTEND_COMPLETION_QUEUE.md`](../product/FRONTEND_COMPLETION_QUEUE.md) | The front-end queue (all batches delivered) |
| [`../quality/HANDOVER_REVIEW_TESTS.md`](../quality/HANDOVER_REVIEW_TESTS.md) | Playwright review tests and the native-language review procedure |
| [`../compliance-guide/IMPLEMENTATION_PLAN.md`](../compliance-guide/IMPLEMENTATION_PLAN.md) | The regulatory readiness plan |
| `PathScribe_FirstRelease_WorkList.xlsx` (sent with this note) | Every open Jira item, sorted by workstream |

## 1. The short version

- **The browser side is built.** Every capability in the front-end completion queue is either Built or a working Demonstration (browser side complete, running against a mock service or the dev proxy). The last full test run (Batch 696) passed: 1,840 test files, 15,370 tests, with the type check clean.
- **The server side is not built.** There is no API server, SQL Server schema, interface engine, jobs, live-update hub or site agent in this repository. **PathScribe cannot yet be deployed to production anywhere.** The India team builds these from the contracts in `docs/architecture/*_API.md`.
- **What is left for "code complete" is mostly not new front-end features.** It is (a) verifying and closing what is already In Review, (b) a short list of front-end items, (c) decisions that only Pete can make, (d) licences, vendor specifications and native-speaker reviews, (e) the server work, and (f) the release process (GitHub cutover, CI, penetration test, test evidence).

## 2. The release standard (Pete, Oct 17, 2026)

Nothing ships in **Partial**, **Stub** or **Planned** state. At minimum a feature is a **working Demonstration**: the front end is complete and labelled Simulated where it stands in for a real system, and it waits only on the server, a vendor specification, a licence, hardware or another team. Wording for the guides is "Planned for Initial Release" or "Planned for Subsequent Release".

Two related rules:

- A gap found and disclosed in one batch is fixed in the **next** batch, unless the fix is itself a new feature (standing policy, Oct 2026).
- Keep the front end simple. Complexity belongs on the back end; the front end plugs into the server by configuration alone (Oct 25).

**Code complete for the first release means:**

1. Every item in the work list is Built, Demonstration, or formally moved out of the first release by Pete (section 6).
2. Every In Review ticket is verified and closed, or reopened with a reason.
3. The three front-end exit checks pass: type check, full test run, lint at zero (PS-470).
4. The server contracts are complete enough for the India team to build against (they are; see section 4).
5. The code is on GitHub with CI running (PS-468, PS-471).

## 3. Where things stand, by number

| Measure | Value | Where it comes from |
|---|---|---|
| Latest batch | 763 (version 1.2; 752 for version 1.1, 698 when first written) | Batch changelog, `src/i18n/README.md` |
| (Nov 2) Automated tests (Batch 763 run, Nov 2) | 1,967 files: 1,953 passed, 10 failed, 4 skipped; 16,374 tests: 16,331 passed, 10 failed, 33 skipped; type check clean. The 10 failing files are the same kind as before: tests that read files kept outside Claude's working copy (`functions/`, `deploy/`, the CI files) and the Firestore emulator tests. Confirm they pass in the full repository | Full vitest run |
| Automated tests (Batch 751 run, Oct 31) | 1,939 files: 1,924 passed, 11 failed, 4 skipped; 16,156 tests: 16,112 passed, 11 failed, 33 skipped. The 11 failures are the same in every run since Batch 746: tests that read files kept outside Claude's working copy (`functions/`, `deploy/`, the CI and `e2e/` files) and the Firestore emulator tests. Confirm they pass in the full repository | Full vitest run |
| Automated tests (Batch 696 run, Oct 26) | 1,840 files passed, 4 skipped; 15,370 tests passed, 11 skipped | Full vitest run |
| Jira work items open (not Done) | 164 | Jira, Oct 26 (Tests and Test Executions excluded) |
| of those: In Review | 93 (7 bugs, 53 stories, 33 tasks) | Waiting for Pete to verify and close |
| of those: To Do | 70 (12 epics, 24 stories, 34 tasks) | See the work list |
| of those: In Progress | 1 (PS-136, deprioritised) | |
| Xray Test issues not Done | about 438; Test Executions not Done about 136 | Backfill is planned for the later testing phase |
| User Guide | 72 articles (Nov 2; 70 on Oct 26), 1 picture still to capture (autopsy authorization), status Draft until clinical review | `scripts/user-guide/build.py` |
| Administrator Guide | 12 chapters, 156 screens in the customer edition and 158 in the internal one (Nov 2; 154 on Oct 26), English master plus fr, de, nl, ko, es (machine-translated; chapters 5, 10 and 11 not yet translated) | `scripts/admin-guide/build.py` |
| Regulatory Compliance Guide | 8 chapters, readiness matrix at Batch 678 | `docs/compliance-guide/` |
| Intended Use Statement | Final Version with Coding Policy; rated against the code in the patent disclosure v3 | `docs/ip-and-legal/` and the disclosure |

The Jira counts were read directly on October 26 and were not re-read on October 31 (Jira updates are on hold); they will have moved by the time you read this. Re-run the saved filter `project = PS AND statusCategory != Done` to refresh.

## 4. Remaining work, by workstream

The work list holds every ticket. These tables show the shape. "Verify" means: open the demo, try the behaviour, close the ticket or reopen it.

### 4.1 Front end: finish or verify (Claude and Pete)

| Item | Jira | Status and what remains |
|---|---|---|
| Verify the In Review tickets | about 53 | Confirm on the demo, close in Jira. The list is in the work list, filter "Front end". |
| Production build without mock modules or demo data; first load at most 1 MB | PS-486 | To Do. The demo build keeps mocks; the server build must not (`npm run build:server` checks the bundle). |
| Remove Firebase from the front end | PS-487 | To Do. |
| Lint to zero errors and warnings | PS-470 | In Review. Three known errors in `serverJobsContract.ts`. |
| npm vulnerabilities (54: 8 high, 46 moderate) | PS-344 | In Review. Review and fix before release. |
| Autopsy module: PAD release and one User Guide picture | PS-261, PS-292 | In Review; PAD release open. |
| Review tests still to write | PS-273, PS-493 (PS-261 too) | Open. |
| Per-facility grant check in the Role Dictionary; role-name bypasses (`macroAccess`, `templatePublishingRules`, billing charge draft/approve) | PS-357 | Known gap; decision recorded in `GAP_REGISTER.md`. |
| Belgian Dutch voice profile, Belgian French, Netherlands date format | PS-347 | To Do. |
| i18n sweep of remaining pages | PS-269 | In Review; native review outstanding. |
| Structured inking, module 4 | PS-519 | To Do (needs clinical sign-off for PS-492). |
| 47 `src/` folders without a README | none | Open. |
| Mac Option / AltGr hotkeys tried on real hardware | none | Fixed in code and tested with simulated keys only (Batch 614). |
| Intraoperative and Verbal Report mic button waits for a dictation state nothing produces | `GAP_REGISTER.md` A.2 | Product decision: build or leave. |
| Background template re-check on Save Draft in Orchestration mode | `GAP_REGISTER.md` A.3 | Product decision: build or leave Gross Complete as the check. |
| Browser check of the omission rule for unconfirmed optional AI values (sign-out and Gross Complete) | none | Built in Batch 696 and earlier; not click-tested. Server contract in `docs/product/REGULATORY_PROFILE.md` is not built. |
| Batch 696 screens (code provenance in the Codes window) | none | Tested by unit tests and captured on the demo with a stand-in AI reply; not tried against a real model. |
| (Nov 1) Slide image addresses in the demo build | none | Open. Images uploaded and live at `https://slides-demo.formedrix.ai` (Nov 1). The two `VITE_SLIDE_*` variables still need setting on the demo project, which is not under Pete's Vercel login: the development team sets them (values in `docs/product/SLIDE_IMAGE_DEMO.md` section 10) and redeploys. |
| (Oct 31) Allow the demo slide host in the security policy | none | Open. Add `https://slides-demo.formedrix.ai` to `img-src` in `deploy/security-headers/` and regenerate `vercel.json`; until then the slide previews stay blank (section 10). |
| (Oct 31) Placeholder answers ("Option N") on the generic checklists | none | Colon (Batch 738) and the prostate needle biopsy and radical prostatectomy (Batch 753) now have PathScribe's own wording, not CAP or RCPath text. 16 other generic templates still have placeholders, and some older demo cases' descriptions use the scrubbed words ("Primary finding, usual type", "units"): S26-4412, MFT26-8802-PR-BX, MPA26-1003-PRO. |
| (Oct 31) Demonstration checklists kept out of customer areas | none | Batch 754: `npm run build:server` leaves the 19 demonstration checklists out and fails if one is in it; ForMedrixAI support removes them per organisation in the app. Server side: `POST /api/templates/remove-demo-checklists` (contract in `docs/architecture/DEMO_CHECKLISTS.md`, used by `scripts/remove-demo-checklists.mjs`) is not built. |
| (Oct 31) Demo checklist names, tag and copy refusal | none | Batch 755a: plain names with a "Demo wording" tag; no copy (Duplicate, New Version, Build from existing) may start from a tagged checklist, refused in `templateService.saveDraft` too; A26-4665/4666 carry the autopsy checklist; S26-4404, MFT26-8804 and MFT26-8802 findings reworded. Open (Batch 755b): rewording the other 16 checklists, breast invasive first; the server API must apply the same refusal when it saves a copy. |
| (Nov 1) Real people and places in the demo data | none | Batch 755b part 1: the Manchester demo pathologist PATH-UK-001 is the fictional Dr. Imogen Hartley; Paul Carter (UK workflow adviser, not a physician) signs in to his own record UK-ADV-001. Open for Pete: real hospital and trust names in the Manchester demo (Wythenshawe Hospital, Manchester Royal Infirmary, North Manchester General, `mft.nhs.uk`), and demo staff with clinical credentials who may be real people (Bronwyn Prior and Dr. Oliver Pemberton at Manchester, Amber Fehrs-Battey with an NPI and licence, Dr. J. Mark Tuthill, Dr. Mani Menon as a requesting surgeon). |
| (Oct 31) Slide image window on a real multi-monitor workstation | none | Batch 750 was tested in headless Chromium on one virtual screen only. |
| (Oct 31) Station screens on a real iPad with a keyboard-wedge scanner, with gloves | none | Batch 735 was checked in desktop Chromium; `STATION_TOUCH.md` requires this before any material calls a screen touch-ready. |
| (Oct 31) "Microtome" wording: screenshots and the other five languages | none | Batch 724 changed English only; the User Guide pictures and the Korean Admin Guide glossary still show "Microtomy". |

### 4.2 Server work (India team)

None of this exists in the repository. The browser side and the contract are done for each row unless noted.

| Area | Jira | Contract |
|---|---|---|
| API server (ASP.NET Core, SQL Server, SignalR): sign-in, tenant isolation, SCIM | PS-345 | `AUTHENTICATION_OIDC.md`, `LIVE_UPDATES_SIGNALR.md` |
| HTTP endpoints for the screens (34 stories, PS-482 to PS-515) | PS-482 to PS-515 | `HTTP_SERVICES_PATTERN.md`, `HTTP_ROUTE_MAPPING.md`, one `*_API.md` per area |
| Capabilities enforced on the server; client check becomes presentation only | PS-358 | `AUTHORIZATION_API.md` |
| Audit store, tamper proofing, in-transaction audit | PS-807 | `QUALITY_API.md`, `GAP_REGISTER.md` A.1 |
| Encryption at rest for each hosting option | PS-808 | `DEPLOYMENT_READINESS_REVIEW.md` |
| Background jobs: retention purges, schedule runs, queue dispatch | PS-809 | `RELEASE_SWEEP_SERVER_JOB.md`, `SCHEDULED_REPORTS_API.md` |
| Report rendering service, PDF/A, integrity fingerprint | PS-333, PS-354, PS-496, PS-276, PS-277, PS-283 | `REPORT_RENDERING_SERVICE.md` |
| Interface engine (BridgeLink): channels, HL7 v2 (MLLP), FHIR, ACK and retry | PS-239, PS-291, PS-331, PS-516, PS-517, PS-50, PS-53, PS-267 | `INTERFACE_ENGINE_API.md`, `INTERFACE_ENGINE_EDGE.md` |
| Outbound queues, delivery schedules, multi-channel delivery, retries | PS-280, PS-281, PS-800 | `DELIVERY_SCHEDULES_API.md`, `OUTBOUND_QUEUE_API.md` |
| Registry feeds (US ePath, UK COSD, screening programs) | PS-812 | `US_EPATH_API.md`, `UK_COSD_API.md`, `REGISTRY_API.md` |
| Inbound molecular HPV results | PS-831 | `HPV_RESULT_INBOUND.md` |
| Site agent (native application) and print bridges | PS-806, PS-54, PS-360 | `SITE_AGENT_API.md` |
| Real WebAuthn and server-issued consult and critical-alert tokens | PS-489, PS-290 | `ACCESS_SESSION_API.md`, `CONSULT_ACCESS_API.md` |
| Critical alert routing (SMS and secure e-mail) | PS-332 | `CRITICAL_RESULTS_API.md` |
| BI reporting API | PS-787 | `BI_FEED_API.md` |
| Live LIS fetch and legacy migration | PS-263, PS-264, PS-87 | `LIS_INGESTION_API.md` |
| Live-update hosting: managed SignalR service or event subscriptions | PS-539 | Open decision (`GAP_REGISTER.md` A.9) |
| (Oct 31) Station tracking: carriers, station scan events, the scan trail | none | `STATION_TRACKING_API.md`, `CASE_WORKFLOWS_API.md` (Batches 726 to 729) |
| (Oct 31) BI feed for the Lab Workflow Reports; build and test the Power BI template (.pbit) from the written queries | PS-787 | `BI_FEED_API.md`, `docs/product/powerbi/` (Batch 730) |
| (Oct 31) Server print routes honour each facility's direct-printing switch | none | Batch 734 notes |
| (Oct 31) Store and return the Reason Dictionary codes on add-on exceptions, batch aborts, overrides and cold-chain records | none | `LAB_DICTIONARIES_API.md` §7 (Batch 736) |
| (Oct 31) Accept the processor named in the instrument order, and run the HPV-aliquot data migration | none | `INTERFACE_TRANSACTIONS.md`, `CASE_WORKFLOWS_API.md` (Batch 739) |
| (Oct 31) Case attachments: the storage adapter and its three endpoints (pre-signed uploads) | none | `services/caseAttachments/`, Batch 742 notes |
| (Oct 31) Draw the organ map file on the server at release, and deliver it through the interface engine | none | `SYNOPTIC_RESULT_API.md` §4a, `ORGAN_MAPPING_API.md` (Batch 751). Today the browser draws it, so a release with no page open queues it as held |

The six blockers in section 12 of the deployment readiness review are all server work. Pete's rule for the order: finish the front-end tickets, then the serverless and deployment-readiness work (PS-539), then the Actions list (PS-357) last.

### 4.3 Decisions only Pete can make

| Decision | Jira or source | Effect if it waits |
|---|---|---|
| Billing unit for matrix blocks: cores or specimen | PS-322 | Matrix-block billing stays as built |
| CSV export headers: stay English or follow the language | PS-325 | Stays English |
| Charge Capture QA alerts: build as a demonstration, or move out of the first release | PS-84 | Conflicts with the release standard until decided |
| Specimen complexity auto-upgrade: build per-specimen microscopic text first, or move out | PS-95 | Same |
| Hosting and secrets (cloud-agnostic) | PS-361 | The India team cannot finish deployment |
| Error monitoring provider and patient-data agreement | PS-469 | Monitoring stays off |
| Store subscription tiers | PS-59 | Store stays undecided |
| Which comments print or travel as HL7 NTE | `GAP_REGISTER.md` A.10 | Comments stay internal |
| Specify AES-256 and TLS 1.3, or keep claims to what is specified | `GAP_REGISTER.md` A.1 | Claims stay limited |
| Whether to keep the numeric Confidence Threshold in AI Behavior and the "Strong match / Possible match" labels, given the Intended Use Statement says percentage scores are hidden | Patent disclosure A.11 | Statement and software disagree |
| The statement says suggested codes link to "source text evidence"; the software shows a checked origin line, not a highlighted quote. Change the statement or the software | Patent disclosure A.11 | Counsel to advise |
| Replacement name for "CoPilot" mode | Oct 17 decision | Marketing and guides use a working name |
| Seeded retention figures marked unverified (CAP, RCPA) | `GAP_REGISTER.md` A.9 | Flag stays |
| Whether a read-only "documentation author" role is worth building (the technical writers hold Admin and Pathologist today) | Batch 697 | Writers can sign out demo cases |
| (Oct 31) AI per slide from a digital pathology system: does a finished AI result open anything, and do its orders show in the discordance and stalled reports | Batch 750 | Questions raised on Oct 31; nothing built for them yet |
| (Oct 31) Delete the old mock WSI Viewer page, and retire the WSI vendor dictionary now that Slide images replaces it | Batch 750 | Both stay in the code |
| (Oct 31) "Approve Destructive Cutting" is still offered on a Block exhausted flag | Batch 733 | Stays offered |
| (Oct 31) The Pending Intake wall tile lists every unbatched block and slide, so it is long | Batch 747 | Stays long |
| (Oct 31) Organ map file formats for a real site | Batch 751 | Settle with the first customer (PNG or one-page PDF today) |

### 4.4 Outside parties: licences, vendors, people

| Item | Jira | Waits on |
|---|---|---|
| National SNOMED CT releases and licences; clinical vocabularies for medical spell check | PS-343, PS-342 | SNOMED International affiliate licence (MLDS no. 1845523) and national licences |
| ICD-10 to ICD-11 and full ICD-O-3 from WHO tables; OPCS-4 | PS-810 | WHO tables; NHS TRUD licence |
| Native-speaker review: French, German, Dutch, Korean (first), Belgian Dutch and French, Spanish | PS-348, PS-480, PS-495 | Reviewers; the review workbooks and procedure are ready |
| Cerebro and Vantage adapters | PS-88 | Vendor specifications |
| Real printer test through QZ Tray, certificate | PS-55 | A certificate and a printer |
| Governing-body synoptic content import | PS-330 | A licensed content path |
| Regulatory counsel (IVDR intended purpose), privacy counsel, ISO 15189 and CAP assessor, national experts, penetration test | `IMPLEMENTATION_PLAN.md` Track B | Pete engages them |
| Patent counsel review of the technical disclosure | n/a | Disclosure v3 sent |

### 4.5 Process, quality and release

| Item | Jira | Notes |
|---|---|---|
| **GitHub cutover**: trunk-based `main`, short-lived `feature/` and `bugfix/` branches, Vercel previews | PS-468 | End of October. Until then, delta zips, no commit and no push. |
| CI: type check, lint, tests, build on every change | PS-471 | Set up at the cutover |
| Penetration test with a modified client (stage 3 gate) | PS-490 | Needs the server |
| Screen-reader testing by a person; axe runs in a real browser | PS-687, PS-491 | Source checks done |
| Firefox verification (Chrome, Edge and Firefox are supported) | PS-722 | Playwright runs with Firefox added |
| Review tests (Playwright) for the In Review tickets | HANDOVER_REVIEW_TESTS.md | 49 written; PS-261, PS-273, PS-493 and others open |
| Xray: backfill missing Test issues, produce the traceability matrix, execution files per batch | n/a | Pete wants inspection-ready evidence |
| Regulatory readiness: the plan's batches (evidence review, expansion to about 150 requirements, national frameworks, gap-to-backlog, privacy tooling, validation pack, RFP generator) | `IMPLEMENTATION_PLAN.md` | **Not started after Batch 678**; the batch numbers in that plan have been used for other work. Renumber before starting. |
| Technical writers update the User and Administrator Guides | Batch 697 | Two demo sign-ins and a review guide exist; edits are recorded in the change log |
| Translate Admin Guide chapters 5, 10, 11 and the new User Guide sections | n/a | On hold until content freeze and native review |

## 5. Items that conflict with the release standard

These are open or In Review items whose current state is Planned or Stub, so under the Oct 17 rule each needs a decision: build the demonstration, move out of the first release, or drop.

- PS-84, PS-95 (decisions above).
- PS-177 (AU/NZ self-collection container tracking) and PS-136 (SMS/e-mail/EHR critical alerting, deprioritised).
- PS-265, PS-266, PS-267, PS-268 (legacy scan OCR, vendor image integrations, attachment decoding, render fidelity).
- PS-293 (right-to-left layout): decided deferred on Oct 18; record it as Planned for Subsequent Release.
- PS-270 (public self-service demo), PS-352 (support diagnostic bundle), PS-805 (digital pathology AI ingest).
- Vantage and Cerebro adapters (PS-88), block deletion tiers 2 and 3, terminology monitoring ("Coming Soon" on Governing Bodies).

The work list marks these "Not first release (confirm)" where the ticket text already says so, and "Decision needed" otherwise.

## 6. How to move to code complete: a suggested order

1. **Pete verifies and closes the In Review tickets** (about 93 non-test). Use the Playwright review tests where they exist.
2. **Pete answers the decisions in 4.3 and 5.** Most need one line each.
3. **Front-end items in 4.1**, starting with PS-486 and PS-487 (production build, no Firebase), lint and npm vulnerabilities.
4. **GitHub cutover** (below), then CI.
5. **India team builds the server** against the contracts, in the order: API server and sign-in, HTTP endpoints, audit store and encryption, jobs, render service, interface engine, registry feeds, site agent.
6. **Licences and reviews** run in parallel; none blocks the front end.
7. **Penetration test and screen-reader test** once the server exists.

### GitHub cutover steps (PS-468)

From `KNOWN_GAPS.md`: `api/`, `api.zip` and raw logo source art stay out of the first repository. Before cutover, list which `public/` files the app really uses, apply all delta zips to one copy, run `npm run cleanup:deleted`, create the repository, connect it, then set up CI (PS-471). After cutover the no-commit rule ends and work goes through pull requests into `main`.

## 7. How to run and check the work

- **Demo:** https://pathscribe-ai.vercel.app. Sign-ins, demo cases and **Full Reset** are in [`../product/DEMO_GUIDE.md`](../product/DEMO_GUIDE.md). Data lives in the browser; Full Reset clears every tester's changes in that browser.
- **Type check:** `npm run type-check` (or `npx tsc --noEmit -p .`). It needs about 6 GB of memory (`NODE_OPTIONS=--max-old-space-size=6000`).
- **Tests:** `npm test`. The full run takes about 25 minutes and 7 to 8 GB of memory. Run the type check and the tests one at a time.
- **Guides:** `python3 scripts/user-guide/build.py`; `python3 scripts/admin-guide/build.py --langs=en --publish`. Screenshots: `scripts/user-guide/capture.cjs` and `scripts/admin-guide/capture.mjs` (start the app with `npx vite --port 5179`).
- **Server build:** `npm run build:server` leaves the demo accounts and mocks out and fails if they remain.
- **Review tests:** [`../quality/PLAYWRIGHT_REVIEW_GUIDE.md`](../quality/PLAYWRIGHT_REVIEW_GUIDE.md).
- **(Oct 31) Demo slide images:** hosted at `https://slides-demo.formedrix.ai` (Cloudflare R2), set in Vercel Production as `VITE_SLIDE_VIEWER_URL_TEMPLATE` and `VITE_SLIDE_THUMBNAIL_URL_TEMPLATE`. Rebuilt with `scripts/Setup-PathScribeSlideDemo.ps1`. Section 10.
- **(Oct 31) Demo seed data for the videos:** rows S1 to S15 are in [`../product/DEMO_SEED_DATA.md`](../product/DEMO_SEED_DATA.md); an existing browser needs one **Full Reset** to load each new set.

## 8. What this note does not claim

- Jira statuses were read, not re-verified: an In Review ticket may be fully done or may have open items in its comments.
- The workstream and "not first release" labels in the work list are proposals for Pete to confirm.
- The Batch 696 and 697 changes have not been click-tested in a browser beyond the screenshots taken for the patent disclosure.
- Server contracts exist for each area but have not been implemented, so they have not been proven against a real server.
- Counts of capabilities, screens and translations elsewhere in the docs were not re-counted here.
- (Oct 31) Batches 699 to 751 were checked with automated tests and in a headless browser, not on real lab hardware (printers, scanners, touch screens, several monitors). Section 9 was written from the batch changelog and `docs/product/GUIDE_UPDATES.md`, not re-checked screen by screen.
- (Oct 31) The R2 upload and the Vercel settings in section 10 were done on Pete's computer with the script; Claude did not see the finished upload.

## 9. What changed since this note was written (Batches 699 to 763, Oct 27 to Nov 2)

Detail for each batch: the changelog in `src/i18n/README.md` and the four-voice entries in `docs/product/GUIDE_UPDATES.md` (whose "FormedrixAI and partners" paragraph lists what is not built). Everything below runs in the demo build against the browser's mock services; the server side of each is a written contract or not yet written.

| Area | Batches | What changed |
|---|---|---|
| AI wording and the Intended Use Statement | 699, 706 | The origin line under an AI-suggested code says "checked origin", never "verified". AI confidence percentages are removed from every clinical screen, with a guard test. |
| Oct 28 feedback round | 700, 703 to 718 | Guides caught up to Batch 699; Worklist context and columns; stain origin tags; plain birth and LMP dates; Margin Exception Review moved to Quality & Compliance; shorter tile text; password reset request; downtime reason required; stations limited to the user's facilities; Clinical Indication provenance; letters or numbers for specimens, blocks and slides; feedback destination. |
| Grossing and Accession | 720, 721 | A Grossing tile and bench tools, required marks, labels print on save; Accession in two columns on a wide window. |
| User Guide | 722, 723, 725 | Home article line and paste box documented; Home picture replaced; the in-app guide scrolls. |
| Wording | 724 | "Microtome", not "Microtomy", in English. |
| Lab Workflow and Batch Management spec | 726 to 737 | Carriers at the workstations and every station scan recorded; add-ons, one time limit and a Stations view on the wall displays; research cases and batch purposes; matrix blocks at every bench, scan history, stopped work; Lab Workflow Reports, the reporting feed and a Power BI kit; the exhausted-block rule, item end states and lineage; megablocks and multi-piece blocks with piece maps; ad-hoc carriers move without asking; direct browser printing off unless a facility allows it; station screens by touch; bench reasons in the Reason Dictionary; add-ons on a matrix block. |
| Cytology fluids and aliquots | 739 to 741 | Aliquots as their own type, ThinPrep and SurePath alike, a vendor-neutral processor, cytospin suggestions; a Cytology Preparation bench with a scanned cell block hand-off to histology; Divide specimen and aliquot tracking to Result back. |
| Case attachments | 742, 743 | PDF, JPG and PNG attachments, with images printed inside their report section; on an Assist case attachments are references only. The storage adapter's server endpoints are not built. |
| Demo seed data for the videos | 738, 744 to 749 | Seed rows S1 to S14 from Pete's "Demo Seed Data Requirements": a sign-out-ready colon case, surgical orders, simulated printers and preset stations, demo users per role, fluid and FNA cases, autopsy, molecular, wall display profiles, batches in every step, block types, GYN volume. |
| Slide images | 750 | A reference preview on each slide and an **Open slide** action that opens the lab's own digital pathology application in a remembered window (capability `case:slide-image:open`, audited). PathScribe has no slide viewer. Demo images: section 10. |
| Organ maps on Assist cases | 751 | On an Assist case the map is never placed in the report (the laboratory system writes it); a per-site setting (Off, Text only, Text and image file) sends the map to the laboratory system, with delivered and failed examples in the outbound queue. Seed row S15. |
| (Nov 2) Handover and slide hosting | 752 | This note brought up to Oct 31; the demo's slide images hosted in Cloudflare R2 (section 10). |
| (Nov 2) Demonstration checklists | 753 to 755b | Every demo checklist reworded in PathScribe's own words (no CAP or RCPath wording), with plain names and a "Demo wording" tag; no copy can start from a demo checklist; demo checklists are kept out of customer areas, and the five no demo case uses are off the case picker; the Manchester demo pathologist is fictional. |
| (Nov 2) Fixes found recording Video 1 | 756 | A case made on Accession reaches every bench (scans find it by the accession on its label); the scan field takes typed entry; no false "Unsaved Draft Found"; one print message per burst. |
| (Nov 2) Processor to staining, scan by scan | 757, 758 | Carrier item lists at each bench with check-off by hand; the Embedding-to-Microtome tray; the dual scan (block, then the new slide label) at the Microtome; a sealed staining rack; the Microtome's own print mode (on demand, by block, by batch), the block lockout, and rack first or rack last. |
| (Nov 2) Patient verification | 759 | No patient name, date of birth or MRN on the bench screens; a Foreign case ID for outside cases; a typed (not scanned) id is recorded as a Manual Entry on the audit trail without blocking. |
| (Nov 2) Cytology screening | 760 | The Cytology Worklist and Screening Case pages show the accession, vial and slides, not the patient's identity. |
| (Nov 2) Reusable staining racks | 761 | Scan, load, close, run after run, with a warning when the last run was never closed; a bug that reopened a rack's oldest run is fixed. |
| (Nov 2) Requisition ingestion | 762 | Batch-scanned requisition PDFs are filed on their case by barcode, never copied; the Requisition Inbox for scans with no case; several performing facilities; cases expected to have a requisition are flagged when none arrives. How it works: section 11. |
| (Nov 2) Stain and scanner QC gate | 763 | The Post-Stain / Pre-Distribution QC checkpoint on Slide Distribution, set per stainer and scanner: auto-accept, the instrument's own sign-off through the interface engine, or a PathScribe sign-off; scanned images can be held before the Pathologist sees them. Superadmin now receives every action in the Action list, including ones added later. |

## 10. Demo hosting: slide images (Oct 31, 2026)

Full steps and the record of what was set up: [`../product/SLIDE_IMAGE_DEMO.md`](../product/SLIDE_IMAGE_DEMO.md), sections "The quick way" and 10.

- **Where the images are:** Cloudflare R2 bucket `pathscribe-demo-slides`, public at `https://slides-demo.formedrix.ai`. Three slides (S26-5404-B1-L1, C1-L1, C1-L2), from CAMELYON16 (CC0), with a licence note beside each preview. The two breast slides are not uploaded.
- **How the demo finds them:** two Vercel environment variables, **Production only**: `VITE_SLIDE_VIEWER_URL_TEMPLATE` = `https://slides-demo.formedrix.ai/viewer/index.html?slide={{slideId}}` and `VITE_SLIDE_THUMBNAIL_URL_TEMPLATE` = `https://slides-demo.formedrix.ai/previews/{{slideId}}.jpg`.
- **When Vercel is updated:** nothing to redo. The variables stay in the project's settings for every deploy. Don't remove or rename them. Add them for **Preview** too if preview builds should show slide images. They are read at build time, so a change needs a redeploy.
- **Still to do:** add `https://slides-demo.formedrix.ai` to `img-src` in `deploy/security-headers/` and regenerate `vercel.json` (section 4.1); until then the previews are blank, though the demonstration page opens.
- **To rebuild or add slides:** `scripts/Setup-PathScribeSlideDemo.ps1` (Windows). It asks for an R2 API token's keys while it runs and stores none. The images are not in the repository.
- **For a customer:** the same two settings (or Configuration → WSI Viewers → Slide images) point at the site's own digital pathology application. The demo host is for demonstrations only.

## 11. Requisition ingestion: how it works (Nov 2, 2026)

Full detail: [`../product/REQUISITION_INGESTION.md`](../product/REQUISITION_INGESTION.md) and [`../architecture/REQUISITION_INGESTION_API.md`](../architecture/REQUISITION_INGESTION_API.md).

1. **The administrator sets up each source** in Configuration → System → Integrations → **Requisition ingestion**. A source is a folder on the hospital network (`\\server\share`, or an smb or https address), a third-party document system's https address, or a system that sends scans to PathScribe's API. Each source also has its performing facility (or all facilities), how often to look (1 to 1,440 minutes) and the separator-sheet barcode. There can be as many sources as needed, and PathScribe reads them all: where a scan came from does not matter for matching.
2. **On that schedule, PathScribe checks the source** for new PDFs. A file that is not a PDF is refused, named in the run's summary, and left where it is.
3. **It reads the barcode on each page** and splits the file into requisitions: a new barcode starts one, a page with no barcode belongs to the one before it, and a separator sheet ends it.
4. **It matches each barcode to a case and links it.** PathScribe does not copy the file. The case keeps a link to where the file already is, with the page range, the barcode, the time and the source; opening it from the case reads those pages from there and keeps nothing. If the hospital moves or deletes the file, it can no longer be opened from the case.
5. **A scan that matches no case goes to the Requisition Inbox** (Accession), where staff view it and link it by accession, by a patient search, or by creating the case from it, or discard it with a reason. A scan that arrived before its case existed is linked on the next run; reading the same file again adds nothing. Every step is on the audit trail.

**Built and planned.** Today this runs in the browser for the demonstration, when someone presses **Run ingestion now**. The timed server job (`requisition.ingest`) is planned. A folder on the hospital network cannot be reached from a cloud server, so the site agent on the hospital network will read it and send PathScribe only the file reference, pages and barcodes; the agent's requisition pickup is planned (`SITE_AGENT_API.md` §8). A hospital may instead use its own interface engine channel. A third-party system with an https address is read by the server directly.

## 12. Version history

| Version | Date | Batch | What changed in this note |
|---|---|---|---|
| 1.0 | October 26, 2026 | 698 | First written: status, remaining work by workstream, decisions, release standard, how to run and check the work. |
| 1.1 | October 31, 2026 | 752 to 754 | Section 3's figures; new rows in sections 4 and 7; section 9 (Batches 699 to 751); section 10 (the demo's slide images in Cloudflare R2). |
| 1.2 | November 2, 2026 | 763 | Version number and this history added. Section 3: latest batch 763, the Batch 763 test run, the guide counts. Section 9: rows for Batches 752 to 763 (checklist wording, the Video 1 fixes, processor-to-staining scanning, patient verification, cytology screening, reusable racks, requisition ingestion, the stain and scanner QC gate, every action on Superadmin). Section 11 (new): how requisition ingestion works, and what is built and planned. Not changed: the Jira counts (Jira updates are on hold) and sections 4 to 8. |
