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

`architecture/SCHEDULED_REPORTS_API.md` (new) and a Reports section in `architecture/CASE_SEARCH_API.md`.

## Batch 518

- **quality/evidence/**: new. The Xray execution file for each batch is kept here, starting with Batch 518.
- **architecture/**: new interface transaction types, and the new capabilities `interface:outbound:resend` and `label:batch:reprint`.

- **architecture/** (Batch 519): `ORGAN_MAPPING_API.md` specifies the free-text node count checks the API server must repeat (PS-494).
- **quality/evidence/** (Batch 519): `PathScribe-Batch519-xray.json`.

- **architecture/** (Batch 520): `REPORT_DELIVERY_API.md`, the e-fax and file-drop contract for the API server (PS-280).
- **quality/evidence/** (Batch 520): `PathScribe-Batch520-xray.json`.

- **architecture/** (Batch 521): retries and fax confirmations in `REPORT_DELIVERY_API.md`; `ReportDeliveryStatus` in `LIVE_UPDATES_SIGNALR.md` (PS-281).
- **quality/evidence/** (Batch 521): `PathScribe-Batch521-xray.json`.

- **architecture/** (Batch 522): `CONSULT_ACCESS_API.md` (PS-290).
- **quality/evidence/** (Batch 522): `PathScribe-Batch522-xray.json`.
- **quality/evidence/** (Batch 523): `PathScribe-Batch523-xray.json`.

## Batch 526

New `product/CLINICAL_MISMATCH_CHECK.md`: the mismatch check explained for customers and staff, including the approved redesign (PS-554). `architecture/AUTHORIZATION_API.md` has the planned capabilities and the separation-of-duties rule.

## Batch 527

New `product/GUIDE_UPDATES.md`: a per-batch log for the guide owners, training, marketing and RFP answers (Pete, Oct 11).

## Batch 529

The mismatch rules are built (PS-554, part 1): `product/CLINICAL_MISMATCH_CHECK.md`, `architecture/AUTHORIZATION_API.md`.

## Batch 530

The mismatch alert and gates are built (PS-554, part 2): `product/CLINICAL_MISMATCH_CHECK.md`, `architecture/AUTHORIZATION_API.md`.

## Batch 531

Mismatch check: re-run on change and cytology alert (`product/CLINICAL_MISMATCH_CHECK.md`).

## Batches 532–534

`product/REPORT_RELEASE_DELAY.md` (new, Batch 534): the release delay on every report output, and Recall. Cytology case report, urgent preliminary and release delay entries are in `product/GUIDE_UPDATES.md` and `product/FEATURE_OVERVIEW.md`. Quality evidence for each batch is in `quality/`.

## Batch 536

Governed AI instructions and separation of duties (`product/CLINICAL_MISMATCH_CHECK.md`, `architecture/AUTHORIZATION_API.md`); the AI vendor policy's server contract (`architecture/AI_PROXY.md`).

- **architecture/** (Batch 537): `DEPLOYMENT_READINESS_REVIEW.md`, the PS-539 deployment readiness review (serverless, private cloud, on site; markets and hosting rules; decisions for Pete).
- **quality/evidence/** (Batch 537): `PathScribe-Batch537-xray.json`.

## Batch 538

`architecture/REPORT_DOCUMENT_STORE_API.md` (new): released report documents. The review's D2 is decided and F6 corrected.

## Batch 539

`architecture/`: the cytology report template (`REPORT_RENDERING_SERVICE.md` §7); F6 fixed.

## Batch 540

`product/REPORT_RELEASE_DELAY.md`: no correction or addendum during the release delay.

## Batch 541

`architecture/DEPLOYMENT_READINESS_REVIEW.md`: phase 2b decided (D1–D7), with Pete's verification checks.

## Batch 542

`architecture/MESSAGE_BUS_API.md` and `architecture/ASYNC_EXPORT_API.md` (new, PS-539 phase 2c contracts for decisions D1 and D7); findings F8 and F9 added to the readiness review.

## Batch 543

`architecture/BLOB_STORAGE_API.md` (new): file storage contract. Findings F8 and F9 fixed.

## Batch 544

`architecture/BLOB_STORAGE_API.md`: links only for images and attachments (corrects Batch 543). `architecture/ASYNC_EXPORT_API.md`: single-facility QA exports. `product/`: guide and feature entries.

## Batch 545

`architecture/INTERFACE_ENGINE_EDGE.md` (new): the interface engine edge contract (D6). The readiness review §6.2 is corrected, and findings F10 to F12 are added.

## Batch 546

`architecture/SITE_AGENT_API.md` (new): the site agent contract (D3). F3 and F4 are fixed, and several printing claims are corrected across the contracts.

## Batch 547

`architecture/RUNTIME_CONFIG.md` (new): runtime configuration, so one build serves every deployment (phase 2d).

## Batch 548

Phase 2d item 2: the connection banner and the waiting states. See `architecture/DEPLOYMENT_READINESS_REVIEW.md` §9.

## Batch 553 (PS-539 phase 2d: site agent printers in routing)

- Batch 553: site agent printers in routing (`architecture/SITE_AGENT_API.md` §3). *(Batch 552's architecture notes weren't summarised here in Batch 552.)*

## Batch 554 (PS-539 phase 2d: interface monitoring)

- Batch 554: interface monitoring (`architecture/INTERFACE_ENGINE_EDGE.md` §9a).

## Batch 555 (PS-539 phase 2d: browser stand-ins for server jobs)

- Batch 555: the browser's stand-ins for server jobs (`architecture/DEPLOYMENT_READINESS_REVIEW.md` §7).

## Batch 556 (PS-539 phase 2d: report documents through the API)

- Batch 556: reading report documents through the API (`architecture/REPORT_DOCUMENT_STORE_API.md` §2).

## Batch 557 (PS-539 phase 2d: /api/config and hosting regions)

- Batch 557: the API server's `/api/config` and the hosting regions (`architecture/RUNTIME_CONFIG.md` §5a).

## Batch 558 (PS-539 phase 2d: report versions through the API)

- Batch 558: report versions through the API, and why held releases need no browser endpoint (`architecture/BLOB_STORAGE_API.md` §11).

## Batch 559 (PS-539 phase 2d: data topics)

- Batch 559: push instead of polling, the hub's data topics (`architecture/LIVE_UPDATES_SIGNALR.md` §14).

## Batch 560 (PS-539 phase 2d: push instead of polling)

- Batch 560: the screens that refreshed on a timer are updated by the live-update hub (`architecture/LIVE_UPDATES_SIGNALR.md` §14).

## Batch 561 (PS-539 phase 2d)

- Batch 561: how the server retries a held result message (`architecture/MESSAGE_BUS_API.md` §5).

## Batch 562 (PS-539 phase 2d)

- Batch 562: the last polling screens on live updates; readiness review §9 items 3 and 8 closed (`architecture/DEPLOYMENT_READINESS_REVIEW.md`).

## Batch 563 (PS-622)

- Batch 563: the connection banner and waiting states checked in a browser (`quality/evidence/PathScribe-Batch563-browser.txt`).

## Batch 564

- Batch 564: every screen checked for accessibility in a browser (`quality/evidence/PathScribe-Batch564-browser.txt`).

## Batch 565

- Batch 565: the rest of the faint text and the screens' other states (`quality/evidence/PathScribe-Batch565-browser.txt`).

## Batch 566

- Batch 566: rows that hold buttons and view tiles that say which is on (`quality/evidence/PathScribe-Batch566-browser.txt`).

## Batch 567

- Batch 567: no control inside another in the inbox and the report editor (`quality/evidence/PathScribe-Batch567-browser.txt`).

## Batch 568

- Batch 568: no control inside another, app-wide (`quality/evidence/PathScribe-Batch568-browser.txt`).

## Batch 569

- Batch 569: focus after a keyboard delete; the wider source check (`quality/evidence/PathScribe-Batch569-browser.txt`).

## Batch 570

- Batch 570: focus after deleting a saved search (`quality/evidence/PathScribe-Batch570-browser.txt`); `architecture/DEPLOYMENT_READINESS_REVIEW.md` section 0, the status after phases 2a to 2d.

## Batch 571

- Batch 571: the live-update decision (one general `DataChanged` event on `/hubs/live`), recorded in `architecture/`.

## Batch 572

- Batch 572: contracts for the `caseReport` live topic and the screening hours sign-off (`architecture/`); guide and feature entries (`product/`); quality evidence (`quality/`).

## Batch 573

- Batch 573: presence on an open case (`architecture/LIVE_UPDATES_SIGNALR.md` §15, `architecture/CASE_API.md` §8); guide and feature entries; quality evidence.

## Batch 574

- Batch 574: cytology workload counter and night-shift sign-off (`architecture/CYTOLOGY_QC_API.md` §5); guide and feature entries; quality evidence, and Batch 571's missing Xray file.

## Batch 575

- Batch 575: "Show their changes" in place; guide entry; quality evidence.

## Batch 576

- Batch 576: cap checks, presence "editing", theme colours; quality evidence.

## Batch 577

- Batch 577: "Use their version" in `architecture/CASE_API.md`; guide entry; quality evidence.

## Batch 578

- Batch 578: workload cap screen follow-ups; guide entry; quality evidence.

## Batch 579

- Batch 579: reviewer guide (PS-63); billing codes and the Sequencer saved; guide entry; quality evidence.

## Batch 580

- Batch 580: the styled dropdown list (PS-62); supported browsers in `product/FEATURE_OVERVIEW.md`; guide entry; quality evidence.

## Batch 583 and 584

- `architecture/TEMPLATE_NOTIFICATIONS_API.md` (new): the server contract for template lifecycle e-mails (event in; recipients, language and sending on the server), with the English wording to start from.
- `architecture/AUTHENTICATION_OIDC.md`: the Oct 15 decisions (server-held tokens, user sync now, group mapping later with its rules). `architecture/LIVE_UPDATES_SIGNALR.md`: the deployment matrix (Azure SignalR Service for shared SaaS, Redis backplane for private cloud).
- `quality/PLAYWRIGHT_REVIEW_GUIDE.md`: the ticket table now lists 34 tickets, and what a "known bug" test is.
- `product/GUIDE_UPDATES.md`, `product/FEATURE_OVERVIEW.md`, `quality/README.md`: Batches 583 to 588.

## Batch 581 and 582

- `quality/PLAYWRIGHT_REVIEW_GUIDE.md` (new): running the review tests, step by step, on Windows.
