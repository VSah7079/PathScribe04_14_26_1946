- **Batch 617 (part R):** `HTTP_SERVICES_PATTERN.md` section 7 is now the single route rule for every server version (`/api/<area>/<service>/<method-kebab>`, `GET` for plain-value reads, `POST` otherwise); `HTTP_ROUTE_MAPPING.md` (new) lists the earlier and current path of every converted call; the `*_API.md` tables carry the current paths.

## Batch 616 (part F) — follow-up tracking by commands, and biometric signing through one flow (PS-483, PS-512)

Follow-up tracking now has a server version that works by commands (`IFollowUpService`): the browser says what the user did and the server works out the window, the status and who did it; the demo works it out locally as before. Biometric enrolment, the sign-out check, the policy card and the invitation after sign-in go through one flow (`biometricFlow`): the labelled Simulated check in the demo, the API server's challenge and verification with an address (no simulated fallback). Contracts: `docs/architecture/FOLLOW_UP_API.md` (Browser commands) and `ACCESS_SESSION_API.md` (3a). Folders: `src/services/followUp/`, `src/services/biometric/`.

## Batch 613 (part A) — case search reporting

- `SCHEDULED_REPORTS_API.md` (new): scheduling a saved case-search report: the schedule, the endpoints, how the server runs one as its owner and whether a recipient may see every case in the file (open decision for Pete: narrow or skip), audit and acceptance tests. The browser side runs Simulated.
- `CASE_SEARCH_API.md`: Reports and synoptic answers (`/api/cases/search/report`, `/export`, the nine answer conditions). `ASYNC_EXPORT_API.md`: export kind `search.case-report` (29 kinds). `AUTHORIZATION_API.md`: the two capabilities.

## Batch 613 (part B)

- `RELATED_CASES_API.md` (new): related cases attached at sign-out (frozen with the signed report version), the intraoperative diagnosis as part of the report, and the Patient summary print: demo behaviour, snapshot shape, and the server calls.

## Batch 611 (part H)

- `MFA.md` (new): multi-factor sign-in. How the identity provider's second factor is read (`amr` / `acr`), the per-organisation policy, the Simulated authenticator for demo accounts, the ten acceptance criteria with the tests that prove each, and what the API server must do instead in production. `AUTHORIZATION_API.md`: one new capability, `auth:mfa-enrolment:reset`.

## Batch 594

- **`DIAGNOSIS_CODING.md`:** one code shape and a per-jurisdiction policy for ICD-10, ICD-11, ICD-O and SNOMED CT side by side. Built in `src/services/coding/`; not wired in yet.

## Batch 591

- `VENDOR_NEUTRAL_EVENTS.md`: why the front end does not wait for Roche (Vantage) and Leica (Cerebro) specifications: one neutral event, the engine maps it; what is open.

## Batch 588

New `BLOCK_DELETION_API.md`: deleting a block in process (soft delete, 409 on a stale version) and the `BLOCK_DELETED` billing deficiency it raises. `AUTHORIZATION_API.md` gains `material:block:delete-in-process`.

## Batch 444

`AI_PROXY.md` (new): the AI, Gemini, OpenAI, managed, custom, Bedrock and UMLS routes the API server must provide, with the key it adds for each. The browser holds no key.

## Batch 446

- `AUTHENTICATION_OIDC.md`: Pete's decision (PS-345) that the API server holds the sign-in tokens and the browser gets only a session cookie scripts can't read.
- Case pages are addressed by support reference (`src/services/caseAddresses/`). The API server must issue and resolve references (`ISupportReferenceService.forRecord` / `recordIdFor`).

## Batch 452 — Closing the review gaps (PS-131, PS-105, PS-133/PS-323, PS-57), PS-156 correlation window, decant ↔ billing sync, Phase 1 fixes

New `CASE_MATERIAL_API.md`: the atomic decant change. It returns the tree and the affected billing lines, with a 409 on a stale `rowVersion`. `AUTHORIZATION_API.md` gains `config:cytology-histology-correlation:manage` and `case:decant:delete`.

## Batch 453 — The Batch 452 open items, and the native-speaker review register

`AUTHORIZATION_API.md` gains `config:biopsy-resection-correlation:manage`. The Cytology Workspace and Microtomy workstation now call the atomic decant change in `CASE_MATERIAL_API.md`.

## Batch 454 — Follow-up not received: report, alerts and clinician email

- New `FOLLOW_UP_API.md`: tables, endpoints, the daily alert job and the email-transport gap.
- `AUTHORIZATION_API.md` gains the five follow-up capabilities.

## Batch 456 — Sign-in lockout, password screening, demo seeds

`AUTHENTICATION_OIDC.md` §4a: the sign-in lockout and password screening, with what the API server must enforce, and the `VITE_PWNED_CHECK` setting.

## Batch 458 — PS-71: every case save carries its version

PS-71 (Pete's optimistic-locking spec, Oct 4): a save made from an old copy of a case no longer overwrites someone else's newer save. See `services/cases/caseWrite.ts` and `docs/architecture/CASE_API.md`.

New `CASE_API.md`: `row_version`, `If-Match`, 409 on a stale save, system retries, the Edit Conflict overwrite, pool claims.

## Batch 460

`AUTHORIZATION_API.md`: `billing:applied-code:review` in the catalog and both endpoint tables.

## Batch 461

- `ORGAN_MAPPING_API.md` (new): the organ-map contract for the API server: colour layers, bindings, the report figure (snapshot, stale, locked, hashed), SQL tables and SignalR events. Its first rule: the map's data comes from the synoptic answers.
- `AUTHORIZATION_API.md`: `report:organ-map:insert`, `config:organ-map-scheme:manage`, `config:organ-map-bindings:manage`, and an "Anatomical maps" section.

## Batch 462

`ORGAN_MAPPING_API.md`: breast (geometry, resolver, bindings, the colours, the close-margin threshold and its table). `AUTHORIZATION_API.md`: `config:organ-map-scheme:manage` also covers the thresholds.

## Batch 463

`ORGAN_MAPPING_API.md`: the Mohs binding, the stage question's answer keys and server tables, voice, maps that are always in the report, and the server PDF options. `SYNOPTIC_RESULT_API.md`: Mohs observations. New `REPORT_RENDERING_SERVICE.md`: the production report PDF service (Pete's decision: Microsoft.Playwright / headless Chromium) and its controls.

## Batch 463b

`ORGAN_MAPPING_API.md`: the Mohs block rule (no automatic letter; sign-out stops on a missing or uncut block, enforced by the server too) and the voice additions.

## Batch 464

`ORGAN_MAPPING_API.md`: colorectal bindings and maps; the involved-margin rules (Pete's parameter, operator enum, site-level only, the one rule every consumer calls). `AUTHORIZATION_API.md`: `config:organ-map-scheme:manage` covers those rules.

## Batch 465

`ORGAN_MAPPING_API.md`: the oral cavity margin rules and validation with what a layer inherits (§3); head and neck bindings and maps, and what "copyable mapping" covers (§4). `AUTHORIZATION_API.md`: `config:organ-map-scheme:manage` covers the oral rules.

## Batch 465b

`ORGAN_MAPPING_API.md`:
- Conflicts and the fallback guardrail (§3).
- The two-layer halo.
- Copying a map between blocks: Phase 1 as built, Phase 2 "Clone Layout to Block…" on the roadmap.
- Neck counts and totals (§4).

`AUTHORIZATION_API.md`: the strict rule, and conflicts warned and audited.

## Batch 466

- `ORGAN_MAPPING_API.md`: the kidney margin rules (§3), the renal binding and map (§4), and Batch 470 structured inking as planned (§7).
- `AUTHORIZATION_API.md`: `config:organ-map-scheme:manage` covers the kidney rules.

## Batch 466b

- `ORGAN_MAPPING_API.md`: partial nephrectomy margins; generic margin questions derived from the map (§4).
- `AUTHORIZATION_API.md`: `config:organ-map-bindings:manage` covers the derived questions.

## Batch 466c

- `ORGAN_MAPPING_API.md`:
  - partial nephrectomy anatomy (variant anatomy letters);
  - adenoma at the polyp margin counts as involved (lab option); (Replaced in Batch 466d by margins per component.)
  - the editor builds "unless" / "or also when" conditions and the checked hand-entered total.

## Batch 466d

`ORGAN_MAPPING_API.md`: margins per component, and how existing bindings are handled (brought up to date, or held for review).

## Batch 466e

`ORGAN_MAPPING_API.md`: oral dysplasia margins count as involved only when the dysplasia is high-grade.

## Batch 467

New `MOLECULAR_ORDERS_API.md`: the in-house molecular order engine — endpoints, state machine, well binding, result hydration, audit events, server tables. `AUTHORIZATION_API.md`: `molecular:order:assign-plate`, `molecular:order:cancel`.

## Batch 467b — Molecular orders: send-out results, plate, sign-out, instrument

- `MOLECULAR_ORDERS_API.md` §7–9: send-out orders, the instrument and interface engine, and what remains for the server.
- `INTERFACE_TRANSACTIONS.md`: molecular worklists and results through the API server, with order ids.

## Batch 468 — Autopsy: consent-scope enforcement, forensic chain-of-custody

`AUTHORIZATION_API.md`: new `autopsy:custody:transfer` capability (220 → 221; Autopsy section now 2); its status line corrected from "220 as of Batch 467b" to "221 as of Batch 468." No new API doc file — see `src/services/autopsy/README.md` for the consent-scope and chain-of-custody detail; the server-side interface-engine gap (§8/§9 of `MOLECULAR_ORDERS_API.md`) is unrelated and still open from Batch 467b.

## Batch 469 — Autopsy: toxicology, organ-retention disposal, consent narrowing/revocation (PS-261 follow-up)

`AUTHORIZATION_API.md`: four new capabilities — `autopsy:toxicology:order`, `autopsy:toxicology:result`, `autopsy:retention-disposal:record`, `autopsy:consent:manage` (221 → 225; Autopsy section now 6); status line corrected to "225 as of Batch 469." No new API doc file — see `src/services/autopsy/README.md`.

## Batch 471 — Autopsy: toxicology cancellation, organ-retention detail, consent reinstatement (PS-261 follow-up)

`AUTHORIZATION_API.md`: three new capabilities — `autopsy:toxicology:cancel`, `autopsy:retention-detail:record`, `autopsy:consent:reinstate` (225 → 228; Autopsy section now 9); status line corrected to "228 as of Batch 471." Also corrected a pre-existing inaccuracy in the same table: `autopsy:consent:manage`'s "Checked in" column pointed to `autopsy/applyAutopsyConsentStatusChange.ts` (the pure merge function) rather than the actual orchestration/enforcement site, `autopsy/recordAutopsyConsentStatusChange.ts`. No new API doc file — see `src/services/autopsy/README.md`.

## Batch 495

`AUTHORIZATION_API.md`: new `report:case-report:print` row; corrected the stale capability total (232 "as of Batch 480" → 244) and three section counts that had fallen behind their tables.

## Batch 498

`REPORT_RENDERING_SERVICE.md`: new §5 — the content rules the in-repo renderer (`functions/main.py`) now enforces and the production service must carry over: revision banner, pending-release watermark on every page, pre-analytic disclaimer, footer barcode and document reference.

## Batch 499

`AUTHORIZATION_API.md`: new `autopsy:retention-tier:record` row (245 capabilities; Autopsy 12). `AI_PROXY.md`: no browser key exceptions remain — `VITE_NCBI_API_KEY` is gone (PS-476).

## Batch 500

`CASE_API.md` §7 "Sanitise on save": the browser sanitises HTML when it displays it; the API server must also sanitise report HTML and comments on save, with the allow-list given there (PS-473).

## Batch 501

New `CYTOLOGY_QC_API.md`: one open QC assignment per specimen (ROSE, then the QC Rules engine; peer-review selection stays a flag), the upgrade rules, rule sampling counters in the same transaction, and the consultation exclusion.

## Batch 515

`AUTHORIZATION_API.md` lists six new capabilities: the Print Queue actions (`print:job:hold`, `:cancel`, `:redirect`, `:retry`; PS-283) and outside consult links (`case:consult-link:issue`, `:revoke`; PS-290).

## Batch 516

`AUTHORIZATION_API.md`: `report:restricted-case:print` (PS-283), and the `report:case-report:print` row no longer says VIP printing is unrestricted.

## Batch 517

`AUTHORIZATION_API.md` changes:
- a new row for `config:secure-messaging:manage`;
- `config:print-settings:manage` now also covers `facilities/mockFacilityService.ts` → `setPrintSettings`;
- a new service row for `secureMessaging/mockSecureMessagingConfigService.ts` → `save`.

## Batch 518

- **`INTERFACE_TRANSACTIONS.md`:** adds `ACCESSION_EVENT`, `REFERRAL_MANIFEST` and `MOLECULAR_ORDER`.
- **`AUTHORIZATION_API.md`:** adds `interface:outbound:resend` and `label:batch:reprint`, and the service rows that check them.

## Batch 519

- **`ORGAN_MAPPING_API.md`:** free-text node counts (PS-494): what they accept, the checks, and the server requirement to run the same checks on save and sign-out.

## Batch 520

- **`REPORT_DELIVERY_API.md` (new):** report delivery by e-fax (email-to-fax gateway) and file drop (folder or SFTP), including the request, validation, responses, server settings, and what a serverless deployment needs (SFTP from the cloud, a fixed outbound IP, retries as a scheduled queue).
- **`INTERFACE_TRANSACTIONS.md`:** adds `REPORT_DELIVERY`.

## Batch 521

- **`REPORT_DELIVERY_API.md`:** retries, dead-letter, fallback and fax transmission reports (PS-281).
- **`LIVE_UPDATES_SIGNALR.md`:** §12, `ReportDeliveryStatus`.

## Batch 522

**`CONSULT_ACCESS_API.md` (new):** outside consult links (PS-290). It covers:
- tokens (256-bit, stored as SHA-256, carried after `#`, never logged);
- lifespan, revocation and the expiry job;
- the staff and consultant endpoints, and the minimum-necessary consult view;
- uniform refusals and abuse limits;
- audit events, security headers and the slide-image proxy;
- the SQL Server tables, residency and Pete's open decisions.

The requirements are numbered CA-1 to CA-24 for the India team.

`AUTHORIZATION_API.md` gains `audit:consult-links:view`.

## Batch 526

`AUTHORIZATION_API.md`: a new section, "Planned: clinical-pathologic mismatch rules and governed AI instructions" (PS-554). It covers three planned capabilities and their default roles, the separation-of-duties rule (one person can't both change the rules and approve the AI instructions), the assignment history the server keeps, and the planned audit events. These capabilities are not in the enforced catalog until they are built.

## Batch 529

`AUTHORIZATION_API.md`: `config:clinical-mismatch-rules:manage` and `…:view` join the catalog, with the rules endpoints for the API server. The approval capability and separation of duties stay planned (Batch 531).

## Batch 530

`AUTHORIZATION_API.md`: the decision endpoint with the resolution status, the `DEFER_HIGH_RISK` refusal, the secondary review list, and the `CLINICAL_MISMATCH_DEFERRED` / `…_LOGGED` events.

## Batch 536

`AUTHORIZATION_API.md`: the AI instruction capabilities, endpoints and separation of duties (built); `AI_PROXY.md`: the AI vendor policy, the proxy's check, the `AI_VENDOR_NOT_ALLOWED` refusal and the per-call audit fields (PS-558, with PS-539).

## Batch 537

`DEPLOYMENT_READINESS_REVIEW.md` (new, PS-539 phase 2a): every server-side component rated serverless-ready, needs changes, always-on or on-site; the latency budget for a 1-second refresh; the markets and their hosting rules; cost drivers; diagrams for public cloud and the portable package; the required changes ranked; Pete's decisions D1 to D7; and findings F1 to F7 in the code. Cloud-agnostic, per Pete's Oct 10 direction. Its file citations are kept honest by `src/services/deploymentReadiness/deploymentReadinessReview.guard.test.ts`.

## Batch 538

- `REPORT_DOCUMENT_STORE_API.md` (new): one immutable report document per release, with its SHA-256, sent by every channel and retry; the endpoints, integrity check and status.
- `REPORT_RENDERING_SERVICE.md` §6: preview and release from one payload.
- `DEPLOYMENT_READINESS_REVIEW.md`:
  - D2 is decided;
  - finding F6 is corrected: surgical and autopsy reports had the same storage gap, and the PDF problems found are listed;
  - row 21 now names the new contract.

## Batch 539

- `REPORT_RENDERING_SERVICE.md` §7 (new): the cytology template, its request and the template marker.
- `REPORT_DOCUMENT_STORE_API.md`: cytology is rendered by the server (built); the browser-cytology producer is history.
- `DEPLOYMENT_READINESS_REVIEW.md`: F6 marked fixed.
- `ORGAN_MAPPING_API.md`: the continuation-header reference points to the server template.

## Batch 541

`DEPLOYMENT_READINESS_REVIEW.md` §13: Pete decided all seven phase 2b decisions (Oct 12–13): D1 SQL Server tables behind `IMessageBus`; D2 server-made PDFs (done); D3 agent v1 printers and shares; D4 pipeline-applied scripts, tool with the India team; D5 hosting by compliance; D6 BridgeLink cloud or on site from one image; D7 asynchronous exports contract in 2c. Each row now has Pete's verification check.

## Batch 542 (PS-539 phase 2c)

- `MESSAGE_BUS_API.md` (new, decision D1): the API server's events and jobs in SQL Server tables behind `IMessageBus`: the interface, the tables, claiming without blocking (RCSI, `READPAST`), leases with fencing, retries and dead letters, cooperative cancellation, the job kinds and recurring jobs that replace the browser stand-ins, monitoring, and the contract tests every implementation must pass (Pete's check), with what a RabbitMQ adapter would really involve.
- `ASYNC_EXPORT_API.md` (new, decision D7): request, notify, download. 26 export kinds (one per export capability), endpoints, the build job, CSV formula-injection protection, notification without extra clicks, blob storage and signed links, acceptance tests (Pete's check first). Wire contract: `src/services/exports/asyncExportContract.ts`.
- `LIVE_UPDATES_SIGNALR.md`: `eventId` is the outbox `MessageId`; §13 `ExportStatus`.
- `DEPLOYMENT_READINESS_REVIEW.md`: D1 and D7 link their contracts; findings F8 (CSV formula injection in the browser's writer) and F9 (the disposal export isn't audited); §9 items 9 and 10.
- An independent check found 3 high, 9 medium and 6 low issues in the first drafts, all corrected before delivery.

## Batch 543

- `BLOB_STORAGE_API.md` (new, PS-539 phase 2c): file storage behind `IBlobStore` (Azure Blob, S3, or S3-compatible on site):
  - every place a file lives today and its server container;
  - per-blob locks, set after the record commits (version-level immutability on Azure, Object Lock in governance mode on S3 and MinIO);
  - uploads through a staging container with a malware scan;
  - retention, legal hold and disposal;
  - read links, integrity checks and contract tests.
- `REPORT_DOCUMENT_STORE_API.md`: the order of writing bytes, record and lock.
- `ASYNC_EXPORT_API.md`, `DEPLOYMENT_READINESS_REVIEW.md`: F8 and F9 fixed. Row 21 corrected: photos are not kept as base64 in the browser; they go to the lab's imaging system.
- An independent check found 3 high, 7 medium and 5 low issues in the first draft, all corrected. The main ones:
  - a container-wide lock would have blocked the orphan sweep and per-blob holds;
  - an upload into an immutable container couldn't be deleted after a failed scan;
  - organ-map PNGs and held PDFs were misdescribed.

## Batch 544

- `BLOB_STORAGE_API.md` rewritten for Pete's rule (Oct 13, 2026): PathScribe stores no images or attachments, only links. **Correction to Batch 543:**
  - the planned `images`, `attachments`, `signatures`, `branding` and `uploads-staging` containers are removed, with the upload flow and malware scan;
  - new §6 says what a link is, and how the renderer may fetch one: allowed domains, no private addresses, bytes and hash kept in the PDF;
  - new §7 states there are no uploads to keep;
  - organ-map PNGs stay, as PathScribe's own output.
- `ASYNC_EXPORT_API.md` §2: QA reports with facility rows can be exported for one facility; three stay "all", with reasons.
- `DEPLOYMENT_READINESS_REVIEW.md`: row 21, §11 and the diagram corrected.

## Batch 545

- `INTERFACE_ENGINE_EDGE.md` (new, PS-539 phase 2c, decision D6) is the contract between BridgeLink and the API server. It covers:
  - one image, hosted or on site; an on-site engine pulls its outbound work over its own connection;
  - per-tenant system credentials;
  - the inbound envelope (normalised JSON, MSH-10/11/12, an event time with an offset) and the answer table, with what the engine does with each status;
  - applying each message exactly once, in one transaction;
  - order per key, and stale updates;
  - ACK modes, accept or application, following MSH-15/16;
  - outbound hand-over settled by the HL7 ACK, with engine-owned resends, dead letters and alerts;
  - running on site;
  - raw messages, health endpoints and heartbeat;
  - acceptance tests, Pete's D6 check first.
- `DEPLOYMENT_READINESS_REVIEW.md`:
  - §6.2 now points to the contract, and its items 3, 4, 7 and 8 are corrected;
  - findings F10 (fixed), F11 and F12 are added;
  - §14's heading no longer says "not fixed".
- `INTERFACE_TRANSACTIONS.md` points to the contract.

## Batch 546

- `SITE_AGENT_API.md` (new, PS-539 phase 2c, decision D3): the site agent contract. Version 1 covers report and label printers and Windows file shares. It specifies:
  - enrolment with a one-time code, a CSR and mutual TLS on the agent's own host;
  - a local allow-list set by the hospital;
  - jobs over an outbound connection, with claim, lease, renew, and printing at most once (`started`, `IN_DOUBT`);
  - expiry on the server's clock;
  - "Sent to printer" versus "Printed";
  - which failures are retried (labels manual only);
  - store and forward;
  - share write and pickup, with de-duplication and data only;
  - signed updates, heartbeat and status;
  - acceptance tests, Pete's D3 check first.
- **Corrections:**
  - `INTERFACE_TRANSACTIONS.md`: `PRINT_JOB` is a report PDF, not a label.
  - `REPORT_DELIVERY_API.md`: print confirmation, and file drop to a Windows share.
  - `MESSAGE_BUS_API.md`: the `print.dispatch` row.
  - `DEPLOYMENT_READINESS_REVIEW.md`: §6.3 points to the contract; F3 is corrected and fixed; F4 is fixed; the stale CSP lines are updated.
  - `LIVE_UPDATES_SIGNALR.md`: the agent's own hub.

## Batch 547

- `RUNTIME_CONFIG.md` (new, phase 2d): one build serves every deployment. It covers:
  - `config.json` read at start-up, and the 36 settings (37 since Batch 555, with `VITE_SERVER_JOBS`);
  - the rules: addresses as the services take them; a server build needs an API server and SSO; a demo build refuses server addresses;
  - the error screen;
  - server and demo builds;
  - serving config.json, and the CSP from it.
- Corrected:
  - `AUTHENTICATION_OIDC.md` and `LIVE_UPDATES_SIGNALR.md` (settings no longer build-time);
  - `DEPLOYMENT_READINESS_REVIEW.md` §9.1 and §12 item 5 (done).

## Batch 548

`DEPLOYMENT_READINESS_REVIEW.md` §8 and §9 item 2: the connection banner and the waiting states are built (Batch 548). What's still open is listed there.

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- Updated for the carried-over items: `RUNTIME_CONFIG.md` (preload done), `BLOB_STORAGE_API.md` (logo and imaging address checks done), `LIVE_UPDATES_SIGNALR.md` (`retryNow`), `INTERFACE_ENGINE_EDGE.md` (F10 fixed for all four webhooks), `ASYNC_EXPORT_API.md` (organisation scope), `REPORT_DOCUMENT_STORE_API.md` (one storage entry per document), `DEPLOYMENT_READINESS_REVIEW.md` (F1, F3, F10, §9 items 1 and 2; two references corrected).

## Batch 550 (PS-539 phase 2d: exports through the server)

- `ASYNC_EXPORT_API.md`: §2a (the parameters the browser sends), §3 (response statuses, `ExportErrorBody`, `ExportDownloadLink`), §5 (as built; "the bell" corrected), §7 (done), §8 (parameters can name a patient, so they are treated as PHI), §10. `LIVE_UPDATES_SIGNALR.md` (`ExportStatus` in the browser). `DEPLOYMENT_READINESS_REVIEW.md` (§9 item 9, row 23).

## Batch 551 (PS-539 phase 2d: the Server jobs view)

- `MESSAGE_BUS_API.md`: §4a (the Server jobs view and `/api/jobs`), §4 corrected (dead-lettered deliveries are requeued from Server jobs), §9. `AUTHORIZATION_API.md`: the two capabilities. `DEPLOYMENT_READINESS_REVIEW.md` §9 item 10.

## Batch 552 (PS-539 phase 2d: site agent screens)

- `SITE_AGENT_API.md`: §11a (managing agents from the browser), §13. `AUTHORIZATION_API.md`: the two capabilities. `DEPLOYMENT_READINESS_REVIEW.md` §9 item 6.

## Batch 553 (PS-539 phase 2d: site agent printers in routing)

- Batch 553: `SITE_AGENT_API.md` §3 (routing to agent printers, done; the server's checks), §11a (`/agent-printers`, coded revoke reasons, update window, import kinds), §13; `AUTHORIZATION_API.md` (the three capabilities that also list a site's printers); `DEPLOYMENT_READINESS_REVIEW.md` §9 item 6.

## Batch 554 (PS-539 phase 2d: interface monitoring)

- Batch 554: `INTERFACE_ENGINE_EDGE.md` §8 (a stopped channel is degraded), §9a (new: `/api/interface/engines` and the Engines view), §12; `AUTHORIZATION_API.md` (`interface:engine-status:view`); `DEPLOYMENT_READINESS_REVIEW.md` §5 (the 60-second polls) and §9 item 4.

## Batch 555 (PS-539 phase 2d: browser stand-ins for server jobs)

- Batch 555: `DEPLOYMENT_READINESS_REVIEW.md` §7 and §9 item 3 (the stand-ins, done); `MESSAGE_BUS_API.md` §6 and §9; `RUNTIME_CONFIG.md` (`VITE_SERVER_JOBS`, 37 settings).

## Batch 556 (PS-539 phase 2d: report documents through the API)

- Batch 556: `REPORT_DOCUMENT_STORE_API.md` §2 (the record's headers, CORS, `?purpose=`, system retries) and §5; `BLOB_STORAGE_API.md` §11 (the browser and the files API, browser side built for report documents).

## Batch 557 (PS-539 phase 2d: /api/config and hosting regions)

- Batch 557: `RUNTIME_CONFIG.md` §5a (new: `/api/config`) and §6; `DEPLOYMENT_READINESS_REVIEW.md` §9 items 1 and 7.

## Batch 558 (PS-539 phase 2d: report versions through the API)

- Batch 558: `BLOB_STORAGE_API.md` §1 and §11 (report versions through the API; held releases need no browser endpoint; `pdfSha256` is the bytes' hash); `REPORT_DOCUMENT_STORE_API.md` (`saved-version` read through the checked reader); `ORGAN_MAPPING_API.md` (the `pdfSha256` correction); `AUTHORIZATION_API.md` (`report:case-report:print` on the two version endpoints).

## Batch 559 (PS-539 phase 2d: data topics)

- Batch 559: `LIVE_UPDATES_SIGNALR.md` §14 (new: data topics, `SetDataTopics`, `DataChanged`); `DEPLOYMENT_READINESS_REVIEW.md` §5; `REGISTRY_ACKNOWLEDGEMENT_API.md` (the proposal); `REPORT_DOCUMENT_STORE_API.md` §3 and `BLOB_STORAGE_API.md` §11 (Batch 558's open items).

## Batch 560 (PS-539 phase 2d: push instead of polling)

- Batch 560: `LIVE_UPDATES_SIGNALR.md` §14 (the screens, how they read, signed-in users only, one connection per window); `DEPLOYMENT_READINESS_REVIEW.md` §5.

## Batch 561 (PS-539 phase 2d)

- Batch 561: `MESSAGE_BUS_API.md` §5 (a held result is a temporary failure for `interface.dispatch`; later messages for the case wait behind it).

## Batch 562 (PS-539 phase 2d)

- Batch 562: `LIVE_UPDATES_SIGNALR.md` §14 (`molecularQueue`; the agent line; organ-map events still proposed); `DEPLOYMENT_READINESS_REVIEW.md` §5 and §9 items 3 and 8; `MOLECULAR_ORDERS_API.md` §6; `ORGAN_MAPPING_API.md` §6.

## Batch 563 (PS-622)

- Batch 563: `DEPLOYMENT_READINESS_REVIEW.md` §9 item 2 (the browser check done; what is left for a person).

## Batch 570

- `DEPLOYMENT_READINESS_REVIEW.md`: a new section 0, the status after phases 2a to 2d (Oct 14, 2026): each phase, section 9's ten browser items, section 12's blockers and the findings F1 to F12, now; accessibility readiness; the decisions still open for Pete; the test figures. Provider facts not re-checked (as of Oct 12).

## Batch 571

- Decided (Pete, Oct 14, 2026): live updates use one general event, `DataChanged` with topics, on `/hubs/live`, not per-screen events; future live screens get a topic. Recorded in `REGISTRY_ACKNOWLEDGEMENT_API.md`, `LIVE_UPDATES_SIGNALR.md` §14 and `DEPLOYMENT_READINESS_REVIEW.md`.

## Batch 572

- `LIVE_UPDATES_SIGNALR.md` §14: the `caseReport` topic (the support reference, issued and resolved by the server; existence not revealed; the writer's own connections too) and its screen row. `ORGAN_MAPPING_API.md` §6: `organMapFigureChanged` covered by `caseReport`. `CYTOLOGY_QC_API.md` §5 (new): screening time from server events and an end-of-day sign-off. `DEPLOYMENT_READINESS_REVIEW.md`: F7 decided (option C); the organ-map item decided. `AUTHORIZATION_API.md`: the new capability.

## Batch 573

- `LIVE_UPDATES_SIGNALR.md` §15 (new): who else has a case open: methods, the viewer record, identity from the token, the server's own presence ids, lifetime, limits, ordering, scale-out, the demo, acceptance tests; §3's method table. `CASE_API.md` §8 (new): a case's support reference from the server. `DEPLOYMENT_READINESS_REVIEW.md` §0.6 item 2 updated.

## Batch 574

- `CYTOLOGY_QC_API.md` §5: the start of the screening day and its history, today/yesterday sign-off, `dateNotAllowed`, the note limit, the workload-summary endpoint, edits counted once. `AUTHORIZATION_API.md`: the sign-off capability's wording.

## Batch 575

- `LIVE_UPDATES_SIGNALR.md` §14 note: the notice's Show their changes takes the newer case up in place.

## Batch 576

- `CYTOLOGY_QC_API.md` §5: caps 1–100; `AUTHORIZATION_API.md`: the personal cap guarded.

## Batch 577

- `CASE_API.md` §4: the Edit Conflict dialog's "Use their version" (in place; the server needs nothing new: the case is read with its version).

## Batch 583

- `TEMPLATE_NOTIFICATIONS_API.md` (new): the server contract for template lifecycle e-mails.
- `AUTHENTICATION_OIDC.md`: the Oct 15 decisions (server-held tokens, user sync now, group mapping rules).
- `LIVE_UPDATES_SIGNALR.md` §7: the deployment matrix.

## Batch 612 (part A)

- `INTERFACE_DICTIONARY_API.md` (new): vendor profiles, the scope guard, endpoints and what the server must repeat; three new platform-only capabilities in `AUTHORIZATION_API.md`.

- `HTTP_SERVICES_PATTERN.md` (Batch 615, PS-481): how a service gets its server version: the kit, the selection rule and the rules every server version follows.
- `BILLING_API.md`, `CYTOLOGY_API.md`, `MOLECULAR_API.md`, `REGISTRY_API.md` (Batch 616, PS-498 to PS-504): the API server's calls for the billing, cytology, molecular and registry services, one route per interface method.

- `QUALITY_API.md`, `DIGITAL_PATHOLOGY_API.md`, `GROSSING_ROUTING_API.md`, `REAGENTS_LABELS_API.md`, `INTRAOP_OPS_API.md` (Batch 616 part D, PS-501, PS-502, PS-506, PS-508, PS-510): the API server's calls for 35 services, one table per service (method, verb and path, body, notes). `HTTP_SERVICES_PATTERN.md` §6 lists what is still the mock.
- Batch 616 (part B): new `STAFF_ADMIN_API.md` (audit, authorization, staff, roles, facilities, registry settings; authorization fails closed), `ACCESS_SESSION_API.md` (access requests, session time-out, biometric sign) and `LAB_DICTIONARIES_API.md` (departments, locations, container types, ink and cassette colours, physicians, reasons).

- Batch 616 (part E): new `INTERFACE_EXCEPTIONS_API.md`, `INTERFACE_ENGINE_API.md`, `LIS_INGESTION_API.md`, `MODELS_API.md`, `PROTOCOLS_API.md`, `TEMPLATE_SIGNALS_API.md`, `REPORT_TEMPLATES_API.md`, `ROUTING_API.md`, `MACROS_API.md`, `FLAGS_AND_MESSAGES_API.md`, `AI_VENDOR_POLICY_API.md` (PS-509, PS-511, PS-513, PS-515: the API server's calls for 20 services), and `HTTP_SERVICES_REMAINING.md` (PS-514: what is still the mock, and why four services can't be a plain server version).

- Batch 616 (part A): new `REPORTS_API.md` (amendments, informal reviews, LIS notices, release buffer, report parts, report-side queues), `ACCESSIONING_API.md` (incoming orders, crosswalk, drafts, accession queue) and `PATIENTS_API.md` (patient index, encounters, patient history, ADT queue; nothing identifying in a URL).

- `TERMINOLOGY_PROXY_API.md` (Batch 617, PS-488): the server routes for the ICD-10-CM, ICD-11 and LOINC look-ups.
- `DELIVERY_PRINTING_API.md`, `DELEGATIONS_NOTES_API.md`, `CONFIG_DICTIONARIES_API.md`, `EQUIPMENT_MIGRATION_API.md` (Batch 617, PS-514): the API server's calls for 26 more services, one route per interface method.
- `CONFIG_SERVICES_API.md`, `CASE_WORKFLOWS_API.md`, `CRITICAL_RESULTS_API.md` (Batch 617, PS-514): the API server's calls for 29 more services (settings, dictionaries, case workflows, critical results). `BILLING_API.md`, `CYTOLOGY_API.md`, `CASE_SEARCH_API.md` and `BI_FEED_API.md` gained a Batch 617 section.
- `QUALITY_SETTINGS_API.md`, `REFERRAL_RESEARCH_API.md`, `SEARCH_REPORTING_API.md`, `SIGNATURES_SMART_CAPTURE_API.md`, `DICTIONARIES_CONFIG_API.md`, `TUMOR_BOARD_API.md`, `LABEL_REPRINT_API.md`, `INTRAOP_CRITICAL_RESULTS_API.md` (Batch 617, PS-514): the API server's calls for those services, one route per interface method.
