# PathScribe handover: what is finished, and what remains for a code-complete first release

*Written October 26, 2026 (Batch 698), for the development team and the technical writers. Plain language; no programming needed to follow the status tables.*

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
| Latest batch | 698 (this note) | Batch changelog, `src/i18n/README.md` |
| Automated tests (Batch 696 run) | 1,840 files passed, 4 skipped; 15,370 tests passed, 11 skipped | Full vitest run |
| Jira work items open (not Done) | 164 | Jira, Oct 26 (Tests and Test Executions excluded) |
| of those: In Review | 93 (7 bugs, 53 stories, 33 tasks) | Waiting for Pete to verify and close |
| of those: To Do | 70 (12 epics, 24 stories, 34 tasks) | See the work list |
| of those: In Progress | 1 (PS-136, deprioritised) | |
| Xray Test issues not Done | about 438; Test Executions not Done about 136 | Backfill is planned for the later testing phase |
| User Guide | 70 articles, 1 picture still to capture (autopsy authorization), status Draft until clinical review | `scripts/user-guide/build.py` |
| Administrator Guide | 12 chapters, 154 screens, English master plus fr, de, nl, ko, es (machine-translated; chapters 5, 10 and 11 not yet translated) | `scripts/admin-guide/build.py` |
| Regulatory Compliance Guide | 8 chapters, readiness matrix at Batch 678 | `docs/compliance-guide/` |
| Intended Use Statement | Final Version with Coding Policy; rated against the code in the patent disclosure v3 | `docs/ip-and-legal/` and the disclosure |

The Jira counts were read directly on October 26; they will have moved by the time you read this. Re-run the saved filter `project = PS AND statusCategory != Done` to refresh.

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

## 8. What this note does not claim

- Jira statuses were read, not re-verified: an In Review ticket may be fully done or may have open items in its comments.
- The workstream and "not first release" labels in the work list are proposals for Pete to confirm.
- The Batch 696 and 697 changes have not been click-tested in a browser beyond the screenshots taken for the patent disclosure.
- Server contracts exist for each area but have not been implemented, so they have not been proven against a real server.
- Counts of capabilities, screens and translations elsewhere in the docs were not re-counted here.
