**Batch 668:** the Help buttons moved from floating buttons over the screen into the top bar, beside the microphone; see `docs/product/GUIDE_UPDATES.md`.

**Batch 666:** the User Guide now covers every screen (61 articles, including a Voice and Keyboard reference of all 286 commands; the build fails when a screen has no article); the Administrator Guide carries the Batch 653 to 665 settings and permissions in all six languages; the language review workbooks (now including Korean) and the voice phrase list are regenerated from the live text and commands. 126 oddities found in the screens while writing are listed in `docs/user-guide/FINDINGS_666_*.md` for Pete to rule on.

**Batch 667:** the User Guide covers every control on the user-facing screens, checked by `scripts/user-guide/coverage.py` and a test; see `docs/user-guide/README.md` and `docs/product/GUIDE_UPDATES.md`.

**Batch 651 (audit gaps):** pool claim, pass and the 30-second claim hold, delegations, case team changes, case and specimen comments (never the text), personal dictionary words, screen-language changes and the Quality and Compliance deficiency actions are now written to the audit log by the services that do them. The general clinical audit log is still append-only by interface only, not tamper-evident; server-side tamper-evidence is Planned. See `src/services/auditlog/README.md` and `docs/product/GUIDE_UPDATES.md`.

**Batch 651:** AI answers are checked in code, not only in the prompt: one 0 to 100 confidence scale, a 30% minimum and listed-options-only answers for live-case suggestions, the real model recorded on AI codes, the rule-based mismatch fallback shown (low risk), the mismatch instruction version stored with the decision, an OPCS-4 Simulated demonstration lookup, and a confidence and source quote on AI-written narrative sections. The Save Draft background template re-check remains Planned. See `docs/product/GUIDE_UPDATES.md`.

**Batch 650:** voice and keyboard commands that were registered but answered by no screen now work for Sign Out Case (opens the sign-out window, never signs), Sign Out and Next (Assist), History, Codes, Accept / Pass in the pool window, the Worklist pool and countersign tiles, Search, Finalise and the Contribution trend tiles; 29 others are listed with reasons in `docs/product/KNOWN_GAPS.md`, and a build test fails on a new one. No new text, so no translation rows.

**Batch 649:** safety and access bugs. Screenshots for support tickets now hide every patient identifier, including diagnosis and finding text; the barcode listener ignores keystrokes sent by scripts; **Sign Out Case** now runs the same checks as Finalize (hold, microscopic documentation, critical findings, required fields, unverified AI); a sign-out that fails part way puts the case back; each signature is linked to the exact report version and PDF; an addendum released from the amendment window is now sent; the cancer registry gets the FINAL after the release delay, not at signature; 17 new permissions (338 in all); the administrative override on signing is removed, and residents do not issue preliminary releases (Pete, Oct 22, 2026). Known remaining items are in `docs/product/KNOWN_GAPS.md`. See `src/i18n/README.md`.

**Batch 648:** Lockbox Drop-Off opens in the demonstration with six seeded after-hours receipts, restored by Demo Reset; the Demo Guide, Guide Updates and Feature Overview describe it.

**Batch 657:** the online **User Guide** (`docs/user-guide/`, published to `public/help/user-guide/`, shown in the app at `/help`): a Help button (and F1) opens the page for the screen you are on, with search, a workflow trail and previous and next steps. Thirteen first pages are drafted.
**Batch 661 and 662:** sex never defaults at Accession; sex at birth in words (with Indeterminate) on the banner, report header, Accession and Search; NHS number with a status badge on the banner; four more report voice commands; signing time sent with the surgical report.
**Batch 660:** Worklist Collaborating Cases tile (Ctrl+Alt+F), Bench Contributions daily accessioning chart. The release-sweep server job (every minute; a missed window releases late and is flagged) is decided but not built.

**Batch 659:** late frozen diagnosis on the Intraop log, grossing piece descriptions and matrix blocks, Lockbox opens Accession with the order, Search and Worklist handlers fixed, Tumor Board and Quality now say why a change was not saved (new capability `qa:management-review:submit`). Still open: Worklist "Filter My Cases" (needs a definition) and finding 14 (`docs/user-guide/FINDINGS.md`).

**Batch 658:** Orchestration Sign Out Case reachable, Downtime Reason enforced at Accession, View Help is F1, one shared peer-average rule, role labels fixed. Findings 6 to 12 and 14 remain open (`docs/user-guide/FINDINGS.md`).

**Batch 647:** the Administrator Guide is now in English, French, German, Dutch, Korean and Spanish (machine translated; native-speaker review pending), all screenshots are captured, and **Help** opens the guide in the interface language and floats on the non-Configuration screens that have a guide page.

**Batch 646:** the Administrator Guide (`docs/admin-guide/`, published to `public/help/admin-guide/`) and a **Help** button on every Configuration screen that opens that screen's section of it.

## Batch 618 (part C) — server version of case material (PS-482)

`caseMaterialService` is now a service with a demo version and an API-server version (`services/material/`, `docs/architecture/CASE_MATERIAL_API.md`): one `POST /api/material/case-material/apply-decant-change` returns the whole updated material tree and the affected billing lines. Exported from `@/services`; `applyDecantChangeLive` calls the chosen version. The optimistic store and selection state stay in the browser. Nothing was tried against a real server.

## Batch 617 (part R) — one route style for every server version of a service (PS-488 dev notes, Pete)

- **One route style.** Every server (HTTP) version now uses `/api/<area>/<service>/<method-kebab>`; a read whose arguments are all plain values is `GET` (arguments in the query string), everything else is `POST`; `PUT`, `PATCH` and `DELETE` are no longer used and no id or text is in the path. About 85 services written as REST resources were converted (code, fake-fetch tests, contract docs); the earlier-to-current path of every call is in `docs/architecture/HTTP_ROUTE_MAPPING.md`.
- **Why method routes:** the interface already has one method per action, so the server's route table is the interface's method list; the kit generates the path, so it cannot be misspelt; commands carry what they change in a body, which keeps patient text out of URLs and logs.
- **Guard:** `src/services/apiServer/httpRoutes.guard.test.ts` fails on any other verb or path shape. Three files keep their own contracts (job polling and binary downloads): `exports/httpExportApi.ts`, `reportDocuments/httpReportDocumentService.ts`, `reports/httpReportVersionService.ts`.
- **Wire changes the server author must know:** an id that was in the path is now in the query string or the body (`update(id, changes)` sends `{ id, changes }`); `deny` and `revoke` still send only the reason (plus `id`); the audit log and error log filters are sent as a body (the value `all` is still left out); a case list sends its filters as a body and ignores a cursor with no page size, as before; the follow-up commands send only the key and the choice.
- Screens are unchanged. No new permissions, no new strings. Not built: the endpoints themselves (India team).

## Batch 617 (part C) — server versions of the quality, referral, search, signature, dictionary, tumor board and workstation services (PS-514, PS-501)

- **28 services now have an API-server version** (`http<Name>Service.ts` beside each mock, with a fake-fetch test): peer review, peer-review settings, CAPA recommendations, the QA trend policy, concordance review settings; referral tracking and the research feed settings; saved searches and scheduled reports; signature records and smart capture (and its settings); specimen categories, custom spelling dictionaries, stain types, sectioning protocols, molecular targets, subspecialties, support references, system configuration, TAT targets, workstation groups and the workstation registry; the tumor board and its four rule services. Each is chosen by `<name>ServiceInstance.ts`: the server version with an API server address, the mock without one (the demo is unchanged).
- Interfaces moved out of mock files into `I<Name>Service.ts` (peer-review settings, QA trend policy, system configuration, intraoperative critical results) and written out for smart capture and its settings, so the mock and the server version share one interface. The old mock files re-export the names, so no import changes.
- **One convention:** one route per interface method, `/api/<area>/<service>/<method-name>` (`HTTP_SERVICES_PATTERN.md` §7). Contracts: `docs/architecture/QUALITY_SETTINGS_API.md`, `REFERRAL_RESEARCH_API.md`, `SEARCH_REPORTING_API.md`, `SIGNATURES_SMART_CAPTURE_API.md`, `DICTIONARIES_CONFIG_API.md`, `TUMOR_BOARD_API.md`.
- **Kept in the browser on purpose:** the research feed's `getDefaults`, `getHealth` and `recordHealth` answer from memory (no server call). The spelling dictionary's refusals keep their `code`. A failed peer-review gate check leaves the gate on (fail closed); a failed research-feed settings save throws instead of pretending to save.
- Screens are unchanged. No new permissions, no new strings. Not built: the endpoints themselves (India team). `demoReset.ts` still names the mocks on purpose (it resets demo data).

## Batch 617 (part A) — server versions of 29 more services (PS-514)

- **29 services now have an API-server version** (`http<Name>Service.ts` beside each mock, with a fake-fetch test; 509 tests): settings and dictionaries, case workflows, critical results, bulk code import, case search and the BI feed admin calls. Each is chosen by `<name>ServiceInstance.ts` (the server version with an API server address, the mock without one), so the demo is unchanged. 13 workflow files that imported a mock directly now import the instance.
- Contracts: `docs/architecture/CONFIG_SERVICES_API.md`, `CASE_WORKFLOWS_API.md`, `CRITICAL_RESULTS_API.md`, and Batch 617 sections in `BILLING_API.md`, `CYTOLOGY_API.md`, `CASE_SEARCH_API.md`, `BI_FEED_API.md`. Screens are unchanged. No new permissions, no new strings. Not built: the endpoints themselves (India team).
- Not given a server version, on purpose: the voice and hotkey registry (synchronous, in memory) and the AI instruction service (rules run in the browser).

## Batch 617 (part B) — server versions of the delivery, print, delegation, dictionary, equipment, migration and related services (PS-514)

- **26 more services have an API-server version** (`http<Name>Service.ts` beside each mock, with a fake-fetch test of every method): delivery rules, delivery retry settings and retries; print settings, facility print settings and the print queue; batch label reprint runs; delegations; participation types; internal notes; display access (tokens); diagnosis codes; external resources; feedback settings; fonts; governing bodies; performance targets; priorities; equipment and its log; data migration jobs, record results and field mappings; LIS sync; margin extraction; intraoperative critical results.
- **Wiring:** each has an `<name>ServiceInstance.ts` (mock without an API server address, server version with one). `services/index.ts` and the workflow files that imported a mock directly (print dispatch, retries, label printing, scan batches, margin rules, retention, migration) now use the instance. The save of country signing rules keeps the demo's unguarded store because it checks the permission itself; with a server the server decides.
- **Three interfaces were missing** and are now written: `ILabelReprintRunService`, `ILisSyncService`, `IFeedbackSettingsService` (it lived inside the mock). The mocks now declare them; behaviour is unchanged.
- **Privacy and safety:** one route per method (`/api/<area>/<service>/<method-name>`, `HTTP_SERVICES_PATTERN.md` section 7). Searches and accession numbers (`diagnosisCodes.search`, `internalNotes.getForCase`) and display tokens (`verify`, issue) travel in a POST body, never a URL. `displayAccess.verify` fails closed: any failure is `invalid`. A plain list is `{ items }`; a method that returns nothing throws a fixed code on refusal.
- **Contracts:** `docs/architecture/DELIVERY_PRINTING_API.md`, `DELEGATIONS_NOTES_API.md`, `CONFIG_DICTIONARIES_API.md`, `EQUIPMENT_MIGRATION_API.md`. The routes are proposals for the India team.
- **Not a plain server version:** `interfaceDictionary` (composed in the browser over injected storage; its storage travels through the configuration calls).
- Screens are unchanged. No new permissions, no new strings. Server side not built: the endpoints themselves.

## Batch 616 (part F) — follow-up tracking by commands, and biometric signing through one flow (PS-483, PS-512)

Follow-up tracking now has a server version that works by commands (`IFollowUpService`): the browser says what the user did and the server works out the window, the status and who did it; the demo works it out locally as before. Biometric enrolment, the sign-out check, the policy card and the invitation after sign-in go through one flow (`biometricFlow`): the labelled Simulated check in the demo, the API server's challenge and verification with an address (no simulated fallback). Contracts: `docs/architecture/FOLLOW_UP_API.md` (Browser commands) and `ACCESS_SESSION_API.md` (3a). Folders: `src/services/followUp/`, `src/services/biometric/`.

## Batch 616 (part D) — server versions of the quality, digital pathology, image, grossing, dictionary, reagent, cold-chain, label and intraoperative services (PS-501, PS-502, PS-506, PS-508, PS-510)

- **35 services now have an API-server version** (`http<Name>Service.ts` beside each mock, with a fake-fetch test that checks verb, path and body of every method): QA activity records and types, supervision assignments and types, reconciliations, surgical peer-review risk weights, validation studies, deficiency and resolution types, specimen deficiencies, management reviews; AI screening results and settings, digital pathology, viewer, gross imaging and image management vendors, scan batches, image upload; grossing hardware profiles, grossing routing overrides, cassette routing rules, the specimen dictionary, hardware containers, scan stations; reagent lots, storage condition types and units, telemetry readings, label layouts, printer profiles; intraoperative entries, the OR event log, OR suite terminals and display profiles. With an API server address configured the browser uses them; without one it uses the mock, so the demonstration is unchanged.
- **Wiring:** each service has an `<name>ServiceInstance.ts` (mock or server by configuration). `services/index.ts` and the 20 workflow files that imported a mock directly (sign-out, print dispatch, inbound events, registry, retention and label code) now import the instance, so a server build no longer falls back to a mock behind the screens. Mocks that call other mocks stay as they are (demonstration internals).
- **Privacy:** no patient text in a URL (the ADT lookup by MRN is a POST); the browser-sent actor names are advisory and the server records the token's user.
- **Contracts:** `docs/architecture/QUALITY_API.md`, `DIGITAL_PATHOLOGY_API.md`, `GROSSING_ROUTING_API.md`, `REAGENTS_LABELS_API.md`, `INTRAOP_OPS_API.md`.
- **Not done, and why:** peer review, peer-review settings, CAPA recommendations, QA trend policy, label reprint runs and intraoperative critical results have no interface file (the screens call the mock directly); equipment and the equipment log are PS-514. Firebase stays in place (PS-487). The two demo-only intraoperative methods (seed and advance demo data) answer `NOT_SUPPORTED` on a server. No new permissions, no new strings. Server side not built: the endpoints themselves (India team).

## Batch 616 (part E) — server versions of the interface, model, protocol, template, routing, macro, flag, message and AI-policy services; production-build and same-origin guards (PS-509, PS-511, PS-513, PS-515, PS-486, PS-488)

- **20 services now have an API-server version** (`http<Name>Service.ts` beside each mock, with a fake-fetch test and an `<name>ServiceInstance.ts` that picks it): interface exceptions, interface engine (order-created events), LIS staging queue, AI models, model store, protocols, fixative and processing-format dictionaries, template suggestion signals, narrative edit signals, report templates, routing rules, print routing rules, text macros, voice macros, stain order macros, case flags, secure messaging settings, internal messages, AI vendor policy. With an API address in `config.json` the server version is used; without one (the demo) nothing changes.
- **Contracts:** `INTERFACE_EXCEPTIONS_API.md`, `INTERFACE_ENGINE_API.md`, `LIS_INGESTION_API.md`, `MODELS_API.md`, `PROTOCOLS_API.md`, `TEMPLATE_SIGNALS_API.md`, `REPORT_TEMPLATES_API.md`, `ROUTING_API.md`, `MACROS_API.md`, `FLAGS_AND_MESSAGES_API.md`, `AI_VENDOR_POLICY_API.md` in `docs/architecture/`. `HTTP_SERVICES_REMAINING.md` lists what is still the mock (PS-514) and why four services can't be a plain server version.
- **Guards (PS-486, PS-488):** `services/apiServer/productionBuild.guard.test.ts` fails if a demo screen, demo account or the Simulated authenticator is reachable without `__DEMO_TOOLS__`, if AI or terminology-search code names an outside host, or if the UMLS and AI routes leave `/api`. Finding: the keyless public NLM look-up (SNOMED, ICD-10-CM, ICD-11, LOINC) is still called directly from the browser, allowed by the security headers on purpose; routing it through the API server is Pete's decision.
- **Known gap (PS-486):** a server build still bundles the mock services, because each service module names its mock when it picks a version. Removing them needs lazy loading per service and is its own piece of work.
- **Not done, and why:** the voice and hotkey action registry (synchronous and in memory), the interface dictionary and AI instruction services (rules run in the browser over injected storage), live updates (SignalR already), Firebase removal (PS-487: waits on the remaining server versions).
- **Privacy rule kept:** no patient text in a URL or an error; failures are fixed codes.

## Batch 616 (part A) — server versions of the report, accessioning, patient and encounter services (PS-483, PS-503, PS-505)

- **14 services now have an API-server version** (`http<Name>Service.ts` beside each mock, with a fake-fetch test): amendments, informal reviews, LIS amendment notices, the LIS sync and result queues, the report change log, report parts, the report release buffer, incoming-order intake, drafts, the accession queue, the master patient index, encounters, the patient ADT queue, and patient history (cache and lookup). With an API server address configured the browser uses them; without one it uses the mock, so the demonstration is unchanged (`serverVersions616.guard.test.ts`).
- **New in the kit:** `required()` (a record that must come back, or a thrown fixed code, for merges and other writes where a quiet default would hide a refusal), `replyShapes.ts` (`{ items }` lists), `outboundQueueRoutes.ts` (the six calls every outbound queue shares) and `httpTestHelpers.ts` (the route-table test).
- **Privacy rule kept:** nothing that identifies a person (search terms, identifiers, MRNs, encounter numbers) is in a URL; it goes in the POST body.
- **Contracts:** `docs/architecture/REPORTS_API.md`, `ACCESSIONING_API.md`, `PATIENTS_API.md` (the change log follows the existing `REPORT_CHANGE_LOG_API.md`).
- **Not done, and why:** follow-up tracking (the browser store saves whole records, the contract is command-based: needs a decision), report versions and documents (already server-backed), synoptic models (PS-511), the inbound HL7 processing and dispatchers (they run on the server in production), clinical-history dictionary (PS-507's group). No new permissions, no new strings. Server side not built: the endpoints themselves (India team).

## Batch 616 (part B) — server versions of audit, authorization, staff, roles, facilities, access, session, biometric and the lab dictionaries (PS-484, PS-507, PS-512)

- **16 services now have an API-server version** (`http<Name>Service.ts` beside each mock, with a fake-fetch test): audit, authorization, users, roles, facilities, screening-registry settings and override, access requests, session time-out, biometric, departments, locations, container types, ink colours, cassette colours, physicians and the reason dictionary. Contracts: `docs/architecture/STAFF_ADMIN_API.md`, `ACCESS_SESSION_API.md`, `LAB_DICTIONARIES_API.md`.
- **Authorization fails closed:** with a server, each access decision is put to the server; no answer is a refusal. Access requests are resolved by the signed-in user only; the browser no longer sends who.
- Biometric: server version built; the screens still use the browser-side functions. No new permissions, no new strings. Server side not built: the endpoints themselves (India team).

## Batch 616 (part C) — server versions of the billing, cytology, molecular and registry services (PS-498, PS-499, PS-500, PS-504)

- **52 services now have an API-server version** (`http<Name>Service.ts` beside each mock, with a fake-fetch test): billing and charge capture (10), cytology and cytology QC (33), molecular batches, racks, control rules and the order queue (4), and registry reporting (5). Each is chosen by `<name>ServiceInstance.ts`: with an API server address the server version, without one the mock, so the demo is unchanged.
- **One convention for wide interfaces:** one route per interface method, `/api/<area>/<service>/<method-name>`; reads are `GET` with the arguments in the query string, writes carry a body. Contract tables: `docs/architecture/BILLING_API.md`, `CYTOLOGY_API.md`, `MOLECULAR_API.md`, `REGISTRY_API.md`; the convention is `HTTP_SERVICES_PATTERN.md` §7.
- Screens are unchanged. No new permissions, no new strings. Server side not built: the endpoints themselves (India team).

## Batch 615 (part D) — vial and rack labels, CI workflow, right-to-left groundwork (PS-360, PS-471, PS-293)

- **Vial and rack/batch labels** print through the interface engine like slide and cassette labels (`utils/labels/vialRackZplTemplates.ts`, `printVialRackLabel.ts`): Code 128 of the vial or rack id, sized to the label stock and printer resolution.
- **CI:** `.github/workflows/ci.yml` runs type check, lint, tests, build and the Python report tests on every push to `main` and every pull request. It starts working once the repository is on GitHub (PS-468).
- **Right to left:** `<html lang dir>` follows the language (`i18n/direction.ts`), and `pathscribe.css` now uses logical properties throughout, so a right-to-left language mirrors the layout. Identifiers and physical layouts (organ map, plates, label canvas) stay left to right. No right-to-left language is enabled yet (needs translations and Pete's go-ahead).

## Batch 613 (part A) — case search reporting

Search can find cases by what a synoptic report says (protocol, question, condition, value) and turn any search into a report: counts by pathologist, month, diagnosis, facility, case type, status, priority or subspecialty with share and median days to sign-out, or a list with chosen columns. Reports can be saved, exported as CSV (`search:case-report:export`, audited) and scheduled for chosen users (`search:report-schedule:manage`); scheduled runs are Simulated until the API server runs them. See [src/services/caseSearch/README.md](src/services/caseSearch/README.md), [src/services/scheduledReports/README.md](src/services/scheduledReports/README.md), [docs/architecture/CASE_SEARCH_API.md](docs/architecture/CASE_SEARCH_API.md) and [docs/architecture/SCHEDULED_REPORTS_API.md](docs/architecture/SCHEDULED_REPORTS_API.md).

## Batch 613 (part B) — patient summary print and related cases at sign-out

Sign-out lists the patient's other released cases the signer may open (none pre-ticked, with ordering and copy-to physicians); chosen reports show in the sign-out view, are fixed at sign-out and print and send exactly as seen. The intraoperative diagnosis is now part of the report output. Patient History prints a labelled summary. See `docs/architecture/RELATED_CASES_API.md`.

## Batch 613 (part D) — reporting feed for Power BI

Configuration > System gains Reporting feed (Power BI): choose the datasets and facilities the feed offers, issue and revoke tokens (shown once, stored as a hash), de-identified by default, a named-approver approval for identified data, a field catalogue and a Simulated pull test. The reporting API is server work (PS-787). See [src/services/biFeed/README.md](src/services/biFeed/README.md) and [docs/architecture/BI_FEED_API.md](docs/architecture/BI_FEED_API.md).

## Batch 612 (part B) — workstation registry and scope reference

Configuration > System gains Workstations (named computers with revocable tokens shown once and stored as a hash, rotate, revoke, last seen, audited, and a context binding used for print routing) and Scope reference (enterprise versus facility scope by setting area). The token check is Simulated until the API server and site agent exist. See [src/services/workstationRegistry/README.md](src/services/workstationRegistry/README.md) and [docs/architecture/WORKSTATION_REGISTRY.md](docs/architecture/WORKSTATION_REGISTRY.md).

## Batch 612 (part C) — report font sizes in points

Font sizes in report styles are points (the printed size; a 10 prints at 10 pt, floor 8 pt). Styles saved before carry `units: legacy_px` and print as they did until an author uses **Convert to points** (Document Style for the lab, Template Assembly for a template). New: `services/reportAppearance/fontUnits.ts`, `convertToPoints.ts`, `previewPage.ts`; `components/Common/FontSizeField.tsx`, `ConvertToPointsPanel.tsx`. Python: `functions/report_layout.py` (`font_units`, `font_size_pt`, `label_size_pt`). Details: [src/i18n/README.md](src/i18n/README.md).

## Batch 611 (part G) — Smart Capture charge suggestions, prototype

A labelled prototype drawer in the case Billing panel suggests charge lines from a fixed rule set. A person accepts or rejects each line, a pathologist confirms, and only approved lines can be exported (Simulated in the demo; a six-item production checklist gates a real engine). Settings in Configuration → System → Smart Capture. See `docs/product/SMART_CAPTURE.md`.

## Batch 610 (part B) — Performance targets, client service levels and the jurisdiction overview

Targets for cases and RVUs and per-client service levels are now saved in Configuration, System. The Productivity dashboard shows a Targets tile, the Quality tab and dashboard show each client's service level results, and the worklist badges open cases already past their client's target. A read-only Jurisdiction Overview gathers each country's setup with links to change it. Details in `docs/product/GUIDE_UPDATES.md`.

## Batch 620 (part S) — Registry batch files

Configuration > System > Registry Batch Files sets up a screening programme or registry that takes a CSV or XML file instead of a message: the columns, the file name and when it goes (the registry's own delivery schedule, or on demand). Records missing a required field are held back, each file is recorded by checksum, and the registry's answer reaches each record. An example profile ships, labelled; the NAACCR XML feed is not built yet.

## Batch 620 (part C) — UK cancer registry (COSD)

Configuration > System > UK Cancer Registry (COSD) sets how the UK registry submission is sent and how many working days a rejected one has to be corrected (5 by default), for the enterprise and per performing facility. A sample check shows what PathScribe would hold back, with a labelled simplified preview (not the official COSD file). The real file and transport are the interface engine's; nothing was tried against a real registry.

## Batch 645 — Lockbox Drop-Off

A new Lockbox Drop-Off screen (Home, after Intraop Queue) is a scan-first kiosk for specimens dropped in a lockbox after hours: scan the container, and a permanent "Received in Lockbox" receipt is written with the server's time and your name. A barcode with a pending order shows only its accession number and ordering facility; an unknown barcode takes a quick placeholder (client and physician from the lists, or free text; no accession number is made); Urgent, with an optional callback number, puts a drop first. With the folder permission, an Overnight folder lists what is waiting (urgent first, then oldest) with waiting times, and lets the team mark a specimen accessioned or link a placeholder to its real order, with time-to-receipt figures for QA. Seeded to Accessioner (Admin sees the folder only). Demonstration only until the API server and a device-bound kiosk sign-in exist. Details: `docs/architecture/LOCKBOX_API.md`.

## Batch 637 — Review workbooks; roles list names the newer actions

A script builds an Excel review workbook per language (French, Dutch, German, Spanish) from the live text for native-speaker reviewers (`scripts/translation-review-workbook.py`). The Role Dictionary now names 8 more actions from Batches 620 to 636 (manual hrHPV entry and its approval, CSMS eligibility answers, the AI history reading, registry batch files); 385 entries in all. See `src/i18n/README.md` and `docs/product/ACTIONS_COVERAGE.md`.

## Batch 621 — AI extraction of historical reports (advisory only)

When a historical case is opened in the patient history, the AI can read its Final Diagnosis and Microscopic text and show the synoptic fields it finds beside it, labelled "AI-extracted, not verified", with "flag as wrong" to measure accuracy. It is cached by a hash of the text, off by default (Configuration > System > AI history extraction, enterprise with facility overrides), follows the AI vendor rules, and is never used by reports, printing, registries, billing, rules or exports (a test enforces it). Contract: `docs/architecture/HISTORY_AI_EXTRACTION_API.md`.

## Batch 619 (part Q) — Outbound Queue

A new Outbound Queue screen (Quality & Compliance) lists every outbound message in one place: results, admissions, accession, LIS sync, billing charges, report delivery, referrals, molecular orders and registry submissions. Hold, release and retry them; fix and resubmit what a registry rejected or mark it not reportable; see which are close to or past their reporting deadline; retract a queued charge or release it now. Details: `docs/architecture/OUTBOUND_QUEUE_API.md` and `docs/product/GUIDE_UPDATES.md`.

## Batch 610 (part A) — Autopsy turnaround and dashboards, frozen section targets

The autopsy worklist and report page now show whether the PAD and FAD are on track, due soon, overdue or met, using the jurisdiction target or a configured Autopsy PAD/FAD rule. A new Autopsy Dashboards screen (Quality & Compliance) shows turnaround, consent, organ retention and cause of death by case, department and enterprise. The Intraop board uses the configured frozen section target and warning time, with a STAT/Routine switch on each specimen. Simulated cases are labelled Simulated. Details: `docs/product/GUIDE_UPDATES.md`.

## Batch 609 (part A)

The report renderer (`functions/`) draws the lab's page setup, Document Style and header/footer parts; images linked to a report print after its pages (PathScribe stores only the link). Redeploy `functions/` for the layout settings to print.

## Batch 609 (part B) — Mismatch check after sign-out, Final Diagnosis rule, template audit and Upload Protocol check

The clinical-pathologic mismatch check also runs on an unlocked amendment or correction and on an addendum's text before release; a lab setting decides whether a high-risk mismatch holds the release. A Final template with more than one Final Diagnosis field cannot be published. Every protocol lifecycle step writes an Audit Log entry. Upload Protocol checks JSON, XML and Excel files, labels the result unverified against CAP and RCPath, and imports a PathScribe JSON protocol as a draft. Details in [src/i18n/README.md](src/i18n/README.md).

## Batch 609 (part C) — AI model settings, dictation languages, German/French/Dutch medical spell check

Each adopted AI model has organisation-only settings (longest answer, confidence threshold) that the AI path reads. Dictation refinement follows the lab's spelling (US, UK/IE, AU/NZ, CA) and keeps French, German, Dutch, Spanish and Korean text in that language; an admin switch stops mis-heard non-English phrases from fuzzy-matching English commands. German, French, Dutch and Spanish have starter pathology word lists. Batch 622 adds Spain: a Spain jurisdiction and Castilian Spanish as the sixth language (AI-translated, native review pending); screening, registries, e-invoicing and SNOMED for Spain are Planned (`docs/product/SPAIN_RESEARCH.md`). Batch 623 adds a Licensed terminologies card (Configuration > System > Code Systems): the customer records the SNOMED CT / ICD-O-3 licences it holds, and real codes entered on abnormal-result rules replace the test codes only while that licence is on and unexpired. Details: `docs/product/GUIDE_UPDATES.md`, `src/services/spellcheck/README.md`.

## Batch 604 — Simulated mail, alerts and notices

With no mail service connected, every e-mail the product would send is kept in a Simulated mail outbox (Configuration, System), labelled Simulated, with a notice and an audit entry. Critical-alert channels, secure e-mail, support tickets and the support-access approver notice use it and say so on screen. Support tickets also warn about the open case's patient name and an attached screenshot. Support access gains a PDF audit export, a Simulated "Ticket closed" action and a record of the support agent's own exports and configuration changes. Real delivery is the API server's mail service.

## Batch 603 — Wall display binding, break-glass permission, MRN-free QA export

Wall displays (`/facility-ops-dashboard`, `/or-suite-dashboard`) start only with an administrator-issued, revocable Display Token and blank within a minute of revocation or expiry. The OR board shows case ID and room, never a patient name or MRN; the Facility Ops display shows no patient identifiers. Rebinding a downtime patient identity is its own permission (`patient:break-glass:rebind`). The cytology-histology correlation export no longer has an MRN column. Server-side 401 check is Planned (`docs/architecture/DISPLAY_ACCESS_API.md`). Capability and inventory documents: `docs/product/CAPABILITIES.md`, `docs/product/CAPABILITY_INVENTORY.md`.

## Batch 602 — Screen-wins hotkeys and voice, Alt+J "Go to" prefix

The screen in focus decides what a hotkey or phrase means. Always-on commands a screen shadows are reached with Alt+J then their key. Six always-on hotkey clashes remapped; nine duplicate voice phrases removed. See `docs/product/ACTIONS_COVERAGE.md`.

## Batch 601 — Every voice and hotkey command in the Role Dictionary

All 245 voice and shortcut commands can now be assigned by role; a guard lists the 98 permission-only entries and the 67 known hotkey clashes (fix awaiting a decision).

## Batch 600 — Role Dictionary: 60 more commands and default grants

The 60 record-changing commands found in Batch 599 are now in the Role Dictionary with default grants for every built-in role; stored roles are offered them once.

## Batch 599 — Actions list accounting

Every voice and shortcut action is now classified against the roles list (guard test and `docs/product/ACTIONS_COVERAGE.md`); 60 record-changing actions need a role entry (decision pending).

## Batch 597 — Unused CSS, the rest (PS-520)

All 530 remaining dead CSS classes removed (30,494 → 28,146 lines); the guard now requires zero.

## Batch 596 — Unused CSS, first slice (PS-520)

146 dead CSS classes removed; `scripts/css-unused-audit.mjs` and a guard so the count only goes down.

## Batch 595 — Code Systems setting

Configuration → System → Code Systems: per jurisdiction, which code systems (ICD-10, ICD-11, ICD-O, SNOMED CT) are off, optional or required, from a date. Saved and audited; nothing reads it yet.

## Batch 594 — One code shape for ICD-10, ICD-11, ICD-O and SNOMED CT

New `src/services/coding/` (not wired in yet). `docs/architecture/DIAGNOSIS_CODING.md`.

## Batch 593 — Jurisdiction setup chapter and known-gaps tracker

Documentation only (PS-334, PS-338): `docs/product/ADMIN_GUIDE_JURISDICTIONS.md` and `docs/product/KNOWN_GAPS.md`.

## Batch 592 — Shared HTTP client (PS-481)

One client for calls to the API server (`src/services/apiServer/apiHttpClient.ts`); the new HTTP services are built on it. No screen changes.

## Batch 590 — Error monitoring (PS-469)

Built to the plan approved on PS-469: Sentry as a fail-closed sink of the existing scrubbing reporter, configured from `config.json`, off by default. `docs/architecture/ERROR_MONITORING.md`.

## Batch 589 — Nine app bugs fixed

The nine bugs reported in Batches 583 and 584 are fixed (PS-55, 66, 147, 245, 262, 323, 344/477, 472, 478). New guide: `docs/product/QZ_TRAY_CERTIFICATE_GUIDE.md`. See `src/i18n/README.md`.

## Batch 588 — Deleting a block in process

The Delete this block control in the block editor: a soft delete of an in-process block, the "Block deleted" billing deficiency billing staff resolve in Financials, and one permission. See `src/i18n/README.md` and `docs/product/BLOCK_DELETION.md`.

## Batch 587 — Review tests for the "Can automate" tickets, first six

Review tests for duplicating a facility, code import, revision reasons and CAPA, signing-authority unit tests, country signing rules and lint settings. See `src/i18n/README.md`.



## Batch 586 — Review tests for the "Mixed" tickets, last four

Review tests for the Template Review settings, report branding settings, the restricted-printing flag and medical spell check. See `src/i18n/README.md`.

## Batch 585 — Review tests for the "Mixed" tickets, first five

Review tests for the sign-in page and SSO, the Korean and French screens, Release as Preliminary and the delivery rules, the security header files and one-language-at-a-time loading. Four "Mixed" tickets are still to do (Batch 586). See `src/i18n/README.md`.

## Batch 584 — Review tests, second ten

Review tests for QZ Tray label printing, model store scoping, Assist inbound data, the OR board, print routing and queue, finding highlights, the dependency upgrades, HTML sanitising and strict type fixes; ten more real app bugs found and listed, not fixed. See `src/i18n/README.md`.

## Batch 583 — Template e-mails are the server's job; three small fixes; review tests

The browser sends only the template event (the server chooses recipients and language); dialogs close on Discard; the case breadcrumb names Search; specimen-level billing changes after sign-out ask for a reason; ten review tests; the dev review's decisions recorded. See `src/i18n/README.md` and `docs/architecture/TEMPLATE_NOTIFICATIONS_API.md`.

## Batch 582 — More review tests

Review tests for organ maps, staff passwords, cytology nomenclature and facility printing. See `src/i18n/README.md`.

## Batch 581 — Review tests with Playwright

Tests that follow In Review tickets' review steps in a real browser, so a pass is the review done; Firefox runs on request; a beginner's guide in `docs/quality/PLAYWRIGHT_REVIEW_GUIDE.md`. See `src/i18n/README.md`.

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

Batch 611 (part F): Migration Jobs can import a legacy CSV/JSON file as draft cases (Simulated bulk import), and biometric signing uses the device prompt, labelled Simulated. See [src/i18n/README.md](src/i18n/README.md).

- Batch 612 (part A): Interface Dictionary (Message Mapper) for ForMedrixAI support: vendor field profiles with test, publish and rollback, and a read-only Vendor fields panel on the case. See `docs/architecture/INTERFACE_DICTIONARY_API.md`.

**Batch 617:** ICD-10-CM, ICD-11 and LOINC searches go through the API server when one is configured (`docs/architecture/TERMINOLOGY_PROXY_API.md`); a deployment can turn biometric sign-in off (`VITE_BIOMETRIC_SIGN_IN=false`).

**Batch 618 (part B):** the partial nephrectomy drawing shows Gerota's fascia and the adrenal only when the extent reports them (PS-492); a size guard stops source files over 1,000 lines from growing (PS-497).


**Batch 618 (part A):** a consultation or outside case can name the lab that did the technical component (PS-336): the technical charge goes to that lab at grossing, the professional line waits for sign-out, and the signed-out report names the technical lab.

## Batch 630 — Manual hrHPV result entry, controlled (PS-174)

Record Positive / Negative on the Cytology Worklist's HPV Triage tile now need a permission, a required Result Source (paper report, interface downtime, telephoned result, back-entry), and are audited with who, when and the earlier result. An entry that would replace a result from the interface waits for a different authorised person to approve it. Details: `docs/architecture/HPV_RESULT_INBOUND.md` section 7, `docs/product/GUIDE_UPDATES.md`.

## Batch 636 — CSMS eligibility check

The CSMS QA tab can record the eligibility answer (verified, or not eligible with a reason): permission-controlled, clears the case's verification flag, audited. Details: `src/services/cytology/README.md`.

## Batch 635 — Workload reassignment to named colleagues

When the CLIA daily limit blocks a cytotechnologist, the rest of the queue goes to colleagues with room under their own cap (named, audited), and only the remainder to the pool. Details: `src/services/cytology/README.md`.

## Batch 634 — Surgical dispatch lookup and demo cytology patients

Surgical result messages use the same patient-index lookup and audit-on-skip as cytology; the demo's cytology patients are in the patient index. Details: `src/services/interfaceDispatch/README.md`, `src/services/patients/README.md`.

## Batch 633 — Cytology result dispatch (PS-171)

Cytology result messages now look the patient up in the patient index the app is using, and a result that cannot be queued leaves an audit entry instead of vanishing. Details: `src/services/cytology/README.md`.

## Batch 632 — Configurable recall windows and recommendation codes

The Australia/NZ self-collected recall windows are now a Configuration setting (Screening Strategy), the register payload carries six internal recommendation codes, and repeat collections use each country's own wording and timing. Details: `docs/architecture/HPV_RESULT_INBOUND.md` section 8.

## Batch 631 — Self-collected HPV recall, Australia and New Zealand

The Recall needed tile now shows an Urgent or Routine recall, target window and programme wording by genotype in Australian and New Zealand facilities; an Invalid self-collected result asks for a repeat collection; a recall closes when the clinician-collected sample arrives. Codes, windows and wording await programme sign-off; register feeds are interface-engine work. Details: `docs/architecture/HPV_RESULT_INBOUND.md` section 8.

## Batch 638

Batch 638 (Oct 20, 2026): CSMS messages wait for the eligibility check; Belgian Dutch dictation option; colleague reassignment room prorated by logged hours; surgical demo patients in the patient index. See `src/i18n/README.md` and `docs/product/GUIDE_UPDATES.md`.

## Batch 639

Batch 639 (Oct 20, 2026): hotkey decisions answered. Print Current Cassette moves to Alt+Shift+O; Discard Unsaved Changes asks for confirmation. See `docs/product/HOTKEY_DECISIONS.md`.

## Batch 640

Batch 640 (Oct 20, 2026): self-collected HPV recall windows and wording are set per country (Australia, New Zealand) by the laboratory's administrator, from a dropdown. See `docs/architecture/HPV_RESULT_INBOUND.md` section 8.

## Batch 641

Batch 641 (Oct 20, 2026): recall documentation corrected (no sign-off needed for windows or wording; codes belong to the interface engine); PS-539 readiness status refreshed; recall card loading fix.

## Batch 642

Batch 642 (Oct 20, 2026): sign-out authentication policy. An administrator sets, in Session Security, whether signing a case out asks for a password every time (default) or once per session, with an optional second factor, an enterprise default, per-performing-facility overrides and a lock; the Sign Out button shows "(Password Required)" when a password is needed; every policy change, authentication, in-session sign-out and expiry is audited with full context. Remote sign-out limits and workstation lock need the API server (phase 2e). See `docs/architecture/SIGN_OUT_AUTHENTICATION.md`.

## Batch 650a: voice engine

Report Draft voice phrases now register (they never did); Enter Gross / Micro / Diagnosis start dictation in their section; AI-refined dictation no longer lands twice in a report section; corrections are learned in the report editors as in Internal Notes; Delete Row, Delete Message, Delete All Selected, Recall Report, Release Case From Hold and Release Autopsy Body must be said twice; voice follows the same station eligibility as keys; each spoken command is audited (no speech, no case). Details: `src/services/voice/README.md`, `docs/product/GUIDE_UPDATES.md`.



## Batch 652 — Specimen pipeline gaps

Specimen pipeline gaps closed in the demonstration build; the server-side repeats (triage gate, pool timeout, Lockbox link) are still planned. See `docs/product/GAP_REGISTER.md` (A.8, A.10) and `docs/product/KNOWN_GAPS.md`.

## Batch 652 (defect fixes)

Defect fixes in My Contribution peer averages, microtomy scan labels, multi-recipient delegation, https-only External Resources and the report footer barcode. See `src/i18n/README.md` and `docs/product/GUIDE_UPDATES.md`.

**Batch 663:** report voice commands (Maximise, Minimise, Preview, Internal Note, Skip Field, Add Addendum), Worklist "go to row N" and "open accession X", macro access by capability, dead billing role check removed, four multi-row Worklist commands switched off.

**Batch 664:** Add Collaborator [name], Edit Field [section] and Cancel (dictation) voice commands, Sign Out and Next for Orchestration, template approve/publish/draft by capability only. My Cases phrases taken off Clear Filter (Pete). Disclosed: Assist "Finalise & Next" does not open the next case. See `docs/product/GUIDE_UPDATES.md`.

**Batch 665:** Assist Finalise & Next opens the next case; Sign Out and Next survives parked checks; Add Collaborator messages the collaborator; Edit Field reaches synoptic questions (focus only).
- Batch 669a: User Guide and Administrator Guide screenshots re-captured by script (`scripts/user-guide/capture.cjs`, `scripts/admin-guide/capture.mjs`); one User Guide picture (autopsy authorization) still missing.

- Batch 669b: the User Guide route (`/help/*`) moved into the no-top-bar shell in `SignedInApp.tsx`, so the guide window shows only the guide.

- Batch 669c: old embedded guide PDFs and the About-menu guide links removed; guides open only from the top-bar Help buttons.

- Batch 669d: the top-bar Help buttons now appear on Configuration (the page publishes its open tab and section through `services/help/helpAnchorStore.ts`, `hooks/usePublishHelpAnchor.ts`), the ? shows on every screen, and the Administrator Guide re-scrolls to the section as screenshots load (`scripts/admin-guide/guide.js`).

- Batch 669e: fixes for ws-8, ws-10, ws-11, ws-16, ws-17, everyday-17, everyday-22, access-1, access-11 (see `docs/product/GUIDE_UPDATES.md`).

- Batch 669f: second group of findings fixed (workstations, molecular, operations, messaging, cytology); three new capabilities (see `docs/product/CAPABILITIES.md`).

- Batch 669g: unrecognised secondary cytology code blocked with an inline message; a reply moves its conversation up; Mark as unread disabled when you wrote last.

- Batch 669h: Control Rules has its own view permission; External Consult is masked by default (audited opt-in for full identity); the Home footer status is real and the static compliance claims are removed.

- Batch 669i: External Consult links stop at 3 views or 48 hours after signature; Audit Log can preview identity; date of birth is fixed DD-MMM-YYYY.

Batch 670: audit writes (and the rest of the audit path) now go through the switched `auditService`; see `src/services/apiServer/README.md`.
