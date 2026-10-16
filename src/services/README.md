# src/services/ — Master Index

This folder contains every data-access and business-logic service in
PathScribe. If you're new to this codebase, read this file first, then
drill into the specific subfolder's own `README.md` for detail.

**Maintenance rule:** when a subfolder's *contents* change, update that
subfolder's own `README.md`. Only touch *this* file if a subfolder's
*purpose* changes, gets added, removed, split, or merged — i.e. if the
one-line description in the index table below would need to change.
Run `node scripts/check-services-docs.cjs` any time you're unsure whether
this file and the per-folder READMEs are still in sync — don't rely on
memory.

**Real, standing UI convention (Sep 2026, per direct instruction) —
applies to `pages/`/`components/`, not this folder, but discoverable
from here since this is the most-read doc in the codebase**: any new
page or modal must not ship with hardcoded, user-facing strings —
translate from the start; updating an existing page or modal's own UI
text means converting it to the same real i18n framework as part of
that change. See `src/i18n/README.md` for the full account.

## First-load size (Batch 505, PS-475)

`loadSize/` holds the guard that keeps large things out of the first page load (locale files, guide PDFs, `pdf-lib`, seed templates) and documents what loads on demand. The real measure is `npm run measure:first-load` after a build: 1.87 MB gzipped now, from 6.69 MB; target 3 MB.

## Admin guide: label printing routes (Batch 321, PS-52)

[printerProfiles/README.md → "Admin guide: how a site prints labels"](./printerProfiles/README.md#admin-guide-how-a-site-prints-labels) is customer-facing material for the Admin Guide. It covers:
- which printing route a site should use;
- what IT must approve before the PathScribe Agent is installed on workstations;
- what to ask during onboarding;
- which routes are available today.

## AI models: global catalog + per-tenant adoption (Batch 320, PS-58)

Per Pete's decision on PS-58 (Option 2):
- **Catalog:** AI models are platform assets in one global catalog (`/modelCatalog`, vendor-staff write only).
- **Adoption:** each organisation keeps its own adoption records under its `organisationId` (`/organisations/{orgId}/adoptedModels/{modelId}`), holding status, its default, case counts and overrides.
- **Reads:** `modelService` returns the joined view scoped to the organisation in session, and fails closed without one.
- **Rules:** in `models/modelAdoption.ts`; see [models/README.md](./models/README.md).

## Assist-mode LIS polling (Batch 322, PS-87)

In Assist mode the external LIS owns the case and rarely pushes preliminary results, so PathScribe polls it.
- **Gross Complete:** the AI picks the synoptic templates and fills what the gross supports.
- **Microscopic/Diagnosis Complete:** the AI completes the draft.
- **Always a draft for pathologist review.**

Since Batch 323 the updates come through the vendor-agnostic ingestion layer, built to Pete's design: HL7 v2, JSON webhook and polling adapters all feed one staging queue, and the Assist worker reads only from that queue. See [lisIngestion/README.md](./lisIngestion/README.md).

Still open: the real LIS source, the server-side schedule, and the inbound endpoints. See [assistPolling/README.md](./assistPolling/README.md).

## PathScribe Agent printing (Batch 325, PS-52)

`printerProfiles/`: a printer with Bridge Type `pathscribe_agent` now prints through PathScribe's agent client (`utils/labels/pathscribeAgent/`). The Admin Guide availability table in [printerProfiles/README.md](./printerProfiles/README.md) now says so. Batch 346 added the optional **Agent Port** (`agentPort`) and moved the editor's save checks into `validatePrinterProfileDraft.ts`.

## Cytology signing authority, pathologist track (Batch 332, PS-327)

`cytology/resolveCytologySignOutAuthority.ts` applies per-lab and country signing authority to Cytology's pathologist track. The cytotechnologist track (the CLIA independent NILM GYN rule) is unchanged. With Surgical Pathology and Autopsy, every sign-out path now uses the same authority lookup.

## Autopsy signing authority and forensic appointments (Batch 331, PS-327)

- **`autopsy/signAutopsyReport.ts`:**
  - **Signing authority:** it now applies the same per-lab and country signing authority as Surgical Pathology, using the coroner jurisdiction for the country profile.
  - **Forensic cases:** these also need an active jurisdictional appointment, recorded as a staff credential. There's no admin override.
- **Shared authority context:** `auth/resolveFinalizeAuthorityContext.ts` (moved from the Surgical Pathology hook) is the lookup every sign-out path uses.
- **New folder:** [staff/README.md](./staff/README.md) documents the credential capabilities and the Staff editor's rules.

## Template review governance (Batch 328, PS-63)

`templates/`: Approve and Publish are enforced by the service. They need:
- an approver role;
- no self-approval, unless the site's setting allows it;
- the site's Required Reviewers;
- at least 80% SNOMED coverage for diagnostic templates.

The rules are pure, in `templatePublishingRules.ts`. See [templates/README.md](./templates/README.md).

**Batch 329:**
- **Drafting:** limited to Template Author, and Admin inherits it.
- **Built-in roles:** Template Author, Template Approver and Lab Director are built-in roles with fixed ids (`roles/systemRoles.ts`). Stored catalogs gain them on load, and a rename is carried over to staff records.
- **By id:** the checks use role ids, read live from the staff record. (Batch 328's `staffRoles` session field was removed.)

## Sign-in and single sign-on (Batch 343, PS-60)

[`auth/`](./auth/README.md) now also signs people in and out.
- **SSO:** OpenID Connect with the hospital's identity provider, via `oidc-client-ts` (authorization code + PKCE, no secret). Only provisioned, active staff can sign in, matched by the provider's permanent account id and linked by trusted email at first sign-in. `docs/architecture/AUTHENTICATION_OIDC.md` has the setup and the API server's part.
- **Demo accounts:** password sign-in only in demo builds, against PBKDF2 hashes. They're left out of `VITE_AUTH_MODE=sso` builds.
- **Barrel exports:** `@/services` exports `authSession` and `authConfig`. `AuthContext` uses them and is off the deployment baselines.
- **Hub token:** `liveUpdates/` gets the signed-in user's access token through `auth/accessTokenSource.ts`.
- **Signer confirmation (Batch 344):** `@/services` also exports `signerConfirmation`.
  - **What it does:** every signature confirms who is signing first, with the password again (demo) or the identity provider's sign-in popup (SSO). Five failures lock signing for 15 minutes, and everything is audited.
  - **Barrel addition:** `biometricService` (the simulated WebAuthn module) is exported too.
- **Spec:** `docs/architecture/AUTHENTICATION_OIDC.md` now has the token contract (§5) and SCIM provisioning (§6) for the API server.
- **Signature check at the save (Batch 345):** `@/services` exports `signatureGate` and `signatureRecordService`.
  - **What it does:** every signed state change checks the confirmation the way the API server will: signer, action, case, 5-minute age, one use, and for SSO the provider's ID token for the same account, freshly authenticated. It then stores a signature record ([`signatures/`](./signatures/README.md)).
  - **Also added:** `auth/linkedAccounts.ts`, for listing and unlinking a person's sign-in accounts.

## Case search (Batch 350)

`caseSearch/`: server-side case search for the Search page, with the user's access rules applied first, then matching, sorting, counting and one page per request. It also produces CSV export rows (up to 5,000, audited). `@/services` exports it as `caseSearchService`, along with its option lists and `actionRegistryService`. The Search-only filters left `cases/ICaseService.ts → CaseFilterParams`. Saved searches from the Search page now go through `savedSearches/`. Contract for the API server: `docs/architecture/CASE_SEARCH_API.md`. See [caseSearch/README.md](./caseSearch/README.md).

**Batch 351:** `caseSearch/` gained the section 3 filters: case type, sign-out and release dates, pathologist role, revisions, holds, result flag, pending work, TAT, subspecialty, performing lab, location, intake, payer, CPT and autopsy. Matching joins reference data (dictionaries, amendments, countersigns, delegations, TAT) loaded through one dependency. See [caseSearch/README.md](./caseSearch/README.md).

**Batch 352:** `facilities/` gained 11 ordering clients that the demo cases already referenced, each linked to its performing lab (Manchester Trust, Midwest, Henry Ford, Desert Valley). Searching by those labs now finds their cases. See [facilities/README.md](./facilities/README.md).

**Batch 361:** `equipment/equipmentLogRules.ts` gained `isServiceAlert` and `serviceStatesById`: which devices the screens show in red.

**Batch 360:** `equipment/` gained the service log: maintenance, calibration, function checks, repairs and malfunctions. It is append-only and audited, and computes due and overdue status from each device's schedule. `@/services` exports `equipmentLogService`.

**Batch 359:** `printerProfiles/` and `grossingHardware/` records name their physical device in `equipment/` (`equipmentId`, checked by kind). `grossingHardware/` gained its rules and a screen. `mockSeedMerge.ts` gained `withSeedFieldBackfill`. `@/services` exports `grossingHardwareProfileService`.

**Batch 358:** new `equipment/`: the equipment register. Pete chose to centralise equipment, as a hybrid:
- the register holds every device's identity, lab, station and status;
- workflow settings stay in their own folders and point at it.

It replaced Batch 356's `instruments/`; molecular target instruments are analysers in the register. `@/services` exports `equipmentService` (`instrumentService` is gone). See [equipment/README.md](./equipment/README.md).

**Batch 357:** new `mockSeedMerge.ts`: `withMissingSeedRecords` lets a demo list gain seed records added after a browser stored it, without Demo Reset and without touching stored edits. Used by `scanStations/` and `instruments/`.

**Batch 356:** new `instruments/`: the lab's analytical instruments, each with a performing lab and an optional scan station. Molecular batches pick their target instrument from it, and worklist dispatch checks the instrument's station (PS-326). `@/services` exports `instrumentService` and `scanStationService`. See [instruments/README.md](./instruments/README.md).

**Batch 355:** `delegations/`: `findPendingInformalReview` was removed with the orphaned informal-review banner (PS-346).

**Batch 354:** in `caseSearch/`, choosing an organisation now includes everything under it: an NHS Trust finds its sites' cases (`facilities/facilityHierarchy.ts`). The Manchester demo clients now sit under their hospital sites.

## TAT targets and delegations (Batch 353)

Two new services, so the API server can own this data (Pete: "They'll need to move to services the API server owns"). Contract: `docs/architecture/TAT_AND_DELEGATION_API.md`.
- **`tatConfig/`:** `tatTargetService` (`ITatTargetService`), the built-in targets, and the target resolver. The resolver moved from `components/Contribution/qualityCalculations.ts`. See [tatConfig/README.md](./tatConfig/README.md).
- **`delegations/`:** `delegationService` (`IDelegationService`), and the rules the screens used to apply. The records moved out of `cases/mockCaseService.ts`. See [delegations/README.md](./delegations/README.md).
- **Also exported:** `delegationTypeService`.
- **Readers switched:** Search, the facility and subspecialty reference check, and the quality inputs (`quality/qualityTatInputs.ts`) all read through these services.

## Macro permissions (Batch 349, PS-126)

`macros/macroAccess.ts`: administrators see every macro grouped by type and alone may create or change Enterprise macros. See [macros/README.md](./macros/README.md).

## Network print results (Batch 347, PS-54)

[`networkPrint/`](./networkPrint/README.md) tracks labels sent to *Direct via Interface Engine* printers.
- **Answers:** the engine's answer arrives over the live-update connection, and the user sees printed, or the reason it didn't print, with a manual **Retry**. A retry keeps the idempotency key, so an engine that enforces it prints the label once.
- **Audit:** results and retries are audited.
- **Barrel export:** `@/services` exports `networkPrintJobs`.
- **Server side:** specified in `docs/architecture/LIVE_UPDATES_SIGNALR.md` §10.

## Live updates (Batch 342, PS-262)

[`liveUpdates/`](./liveUpdates/README.md) keeps the OR Suite Live Boards and the Intraop Queue current across devices.
- **Production:** the SignalR hub on the ASP.NET Core API server, reached with `@microsoft/signalr`. `docs/architecture/LIVE_UPDATES_SIGNALR.md` is the hub spec.
- **Without a hub:** this browser's own windows update each other, fed by the mock services, and polling covers other devices.
- **Barrel exports:** `@/services` exports `liveUpdateService`, plus `orSuiteTerminalService` and `orEventLogService`, so the OR board no longer imports mocks.

## Medical spell checking (Batch 336, PS-342)

[`spellcheck/`](./spellcheck/README.md) is the spell-check engine. It runs real Hunspell (WebAssembly) in a Web Worker and checks each word through the tiers in order: personal → facility → the other-convention regional check → jurisdiction medical lexicon → clinical vocabularies → base language dictionary. Codes (SNOMED, LOINC, ICD, TNM, markers, measurements) are never flagged.
- **Language:** the case's choice → the assigned pathologist's preference → the facility default.
- **Dictionaries:** personal and facility dictionaries; facility words are admin-only, immediate and audited.
- **Coverage:** English (US, UK, Australian, Canadian), French, Dutch, Korean and (Batch 337) German, which is used under the GPL, shipped unmodified with its licence and source offer.
- **Licensed sources (Batch 339):** the build reads the SPECIALIST Lexicon, SNOMED CT releases and LOINC from `spellcheck-data/licensed/` into the medical and clinical tiers (tested on sample files; waiting on the licences, PS-343).
- **Screens (Batch 338):** the report editor and every report text box are checked (`components/SpellCheck/`, `hooks/useCaseSpellCheck.ts`); the AI spelling check in `aiIntegration/` is retired. The barrel now also exports `voiceMacroService`.

## Generic Code Engine (Batch 333, PS-89)

`billing/codeEngine/` holds storage-neutral rules for effective-dated code systems. `billing/mockCodeImportService.ts` stores bulk imports as jobs.
- **Import jobs:** per Pete, each import is **one PENDING_APPROVAL job** that a second person approves or rejects as a whole. An approved job can be rolled back.
- **Natural-sunset fix:** approving a future-dated rule no longer retires the current one early. The current rule stays in force until the new one starts.
- **Screens (Batch 334):** System → Code Import (Bulk) uploads, maps, checks and imports a CSV and lists every job with rollback; Pending Billing Rule Approvals decides a job as a whole. Every step is audited by the service. `services/index.ts` now exports the billing services the screens need (`codeImportService`, `billingRuleService`, `modifierDictionaryService`, `ncciEditService`, `rvuCodeMapService`).

See [billing/codeEngine/README.md](./billing/codeEngine/README.md).

## Deployment-readiness guard (Batch 330)

[`deploymentReadiness/`](./deploymentReadiness/README.md) keeps the UI deployment-neutral, for public or private cloud. UI code may not:
- import a mock service directly;
- use browser storage directly;
- import Firebase.

Existing files are baselined in a list that only shrinks. The same rule is in `CLAUDE.md` as standing rule 4.

## HTTPS only for back-end calls (Batch 327)

- **`interfaceDispatch/`:** the receiver URL now goes through `utils/serviceEndpoint.ts`. A production build needs `VITE_INTERFACE_RECEIVER_ENDPOINT` set to an `https://` URL. Without one, dispatch fails with a clear message and sends nothing, instead of posting to `http://localhost:8080/`.
- **`grossingHardware/`:** the scale agent's address must be `https://`. The service refuses plain HTTP, and the capture won't read over it.
- The report renderer (`pages/SynopticReportPage/`) follows the same rule. See [reports/README.md](./reports/README.md).

## Template editor address fix (Batch 326, PS-63)

`templates/protocolLifecycle.ts → editorUrlAfterSave`: after a new template or a copy is saved, the editor points at that saved protocol, so a refresh no longer starts another copy. See [templates/README.md](./templates/README.md).

---

## The core pattern: interface / mock / firestore

Most folders here follow the same three-file shape:

- **`I<Name>Service.ts`** — the contract (TypeScript interface + shared types).
- **`mock<Name>Service.ts`** — the real, currently-active implementation.
  Despite the name "mock," this is what the running app actually uses
  today — it's `localStorage`-backed rather than a placeholder.
- **`firestore<Name>Service.ts`** — a forward-looking stub, written when
  Firestore was the planned backend. **That has changed:** the production
  database is Microsoft SQL Server (Pete, Sep 2026). SQL Server can't be
  reached from the browser, so the real services will call a PathScribe
  API server, which talks to the database. The interfaces (`I<Name>Service`)
  are what carry over. The Firestore stubs, `firestore.rules`, the Firebase
  emulator tests and the Engine webhook's Firebase Admin backend will be
  replaced. **The API server is ASP.NET Core, with SignalR for live
  updates** (Pete, Sep 26, 2026; `liveUpdates/` below and
  `docs/architecture/LIVE_UPDATES_SIGNALR.md`). Still to decide: the
  data-access library, and how database migrations are run.
  Swapping the real services in is still meant to be a change in
  `services/index.ts`.

Where a folder deviates from this pattern, its own `README.md` explains
why (e.g. `services/ai/` is a provider-abstraction layer, not a CRUD
service; `services/grossing/` started as types-only, with its real
logic in `services/cases/mockCaseService.ts`, and since Batches 480–484
also holds the grossing-completion and structured-inking rules
(`grossingCompletion.ts`, `evaluateInkingGate.ts` and others); `services/hl7/` is a
larger, multi-file scaffolded subsystem; `services/session/` is a small
resolution module, not a CRUD service — see its own README for why it
still follows the interface/mock/firestore split despite that).

*Corrected in the Batch 496 README audit (Oct 9, 2026): `grossing/` was described as types-only; it has held grossing-completion and inking rules since Batches 480–484.*

## Root-level files (not in a subfolder)

- **`index.ts`** — the barrel file. Re-exports every real mock service
  under its clean public name (e.g. `mockUserService` → `userService`).
  Most of the app imports services from here, not from individual folders.
- **`types.ts`** — shared types used by every service interface in the
  app: `ServiceResult<T>` (the `{ ok: true, data } | { ok: false, error }`
  result shape every service method returns) and `ID`. Since Batch 348 (PS-67) it is the only result shape: the older `{ success, data, error }` in `types/serviceResult.ts` is gone. **Extended (Aug
  2026)** with an optional `meta?: ServiceResultMeta` on the success
  branch (`hasMore`/`nextCursor`) for real, cursor-based pagination —
  currently used by `cases/ICaseService.ts`'s `getAll()`. Deliberately
  optional and additive: every existing caller across the app that
  destructures just `{ ok, data }` is completely unaffected; only a
  caller that explicitly opts in (`SearchPage.tsx`'s Load More) reads
  `result.meta`. Verified non-breaking directly (`tsc --noEmit` clean
  across the whole app) before building anything on top of it.
  **Real gotcha, confirmed directly (Sep 2026) while building the
  Protocol-Driven Workflow Infrastructure story**: with this project's
  own `tsconfig.json` (`strictNullChecks: false`), TypeScript does
  **not** narrow `ServiceResult<T>` on `if (!res.ok) { ...res.error }`
  or `if (res.ok) {...} else { ...res.error }` — `res.error` still
  type-errors as if `res` were the whole union.
  *Since Batch 511 (PS-478) the app type-checks in full strict mode (`"strict": true`, `strictNullChecks` included), so ordinary `if (res.ok) … else …` narrowing works; the workaround described here is no longer needed.* The real, already-
  established workaround elsewhere in this codebase (`services/hl7/
  processInboundWsiScanStatusUpdateEvent.ts`, `NewContainerModal.tsx`'s
  own `if ('error' in res)`) is the one that actually narrows:
  `if ('error' in res) { ...res.error }`, or `if (res.ok === false)`.
  Use one of those two forms — never bare `!res.ok` — anywhere the
  branch needs `res.error`.
- **`mockStorage.ts`** — thin typed `localStorage` wrapper used by nearly
  every mock service. Becomes unused once services that call the
  PathScribe API server (SQL Server) replace the mocks.
- **`enhancementRequestService.ts`** — routes user-submitted enhancement
  requests (Email or Portal/webhook mode). Mock phase logs to console.
- **`phiSelectors.ts`** — central registry of DOM selectors marking PHI/PII
  elements, used by `useScreenCapture` to redact sensitive data before a
  screenshot is attached to an Enhancement Request or QA Feedback
  submission. **Tag new PHI-bearing UI with `data-phi="<kind>"` (standing
  rule 5 in `CLAUDE.md`, enforced by `phi/phiTagging.guard.test.ts`).**
- **`mockSeedMerge.ts`** — `withMissingSeedRecords` / `withSeedFieldBackfill`
  for demo lists (Batches 357 and 359, below).
- **`delegationTypeMapper.ts`** — maps a delegation type that doesn't
  transfer ownership (second opinion, tumor board, teaching and others)
  to the participation type the delegate gets on the case.

*Corrected in the Batch 496 README audit (Oct 9, 2026): `data-phi="true"` became `data-phi="<kind>"`, `mockStorage.ts`'s replacement is the API server rather than Firestore, and the two unlisted root files were added.*

**REMOVED (July 2026):** `synopticNotificationService.ts` (root-level) —
this was the item listed here as "STUB, deliberately... Logs to console
until a real backend exists." Deleted after being found to be a genuine,
active bug rather than an intentional stub: `hooks/useSynopticAudit.ts`
was importing from *this* file instead of the real, complete
implementation at `services/communications/synopticNotificationService.ts`
(recipient resolution, real email templates — correctly exported via its
own barrel, just never actually wired to the hook). Real protocol
lifecycle notifications (approve/reject/publish) were silently never
sent, with no visible error anywhere. Fixed the import, confirmed zero
other consumers of the root-level file, deleted it. Full detail in
`PRIORITY_FIXES.md` #15.

## Folder index

| Folder | What it is |
|---|---|
| [lisIngestion/](./lisIngestion/README.md) | **NEW (Batch 323, PS-87)**: vendor-agnostic LIS ingestion. HL7 v2, JSON webhook and polling adapters feed one staging queue that workers read from |
| [assistPolling/](./assistPolling/README.md) | **NEW (Batch 322, PS-87)**: the Assist worker. Staged LIS updates for Gross Complete or Microscopic/Diagnosis Complete become AI synoptic drafts for review |
| [abnormalDetection/](./abnormalDetection/README.md) | **NEW (Sep 2026)** — PS-105/PS-129: real, admin-configurable discrete trigger-rule dictionary (synoptic field/value → Abnormal/Critical/Malignant severity); PS-137 agreement signals, tagged with the covering Validation Study since Batch 318 |
| [access/](./access/README.md) | **NEW (August 2026)** — real, tracked AccessRequest tickets (Pediatric, Pool, Orchestration) — replaces message-only requests with a real status lifecycle and quality-metric turnaround time |
| [accessioning/](./accessioning/README.md) | **NEW (Sep 2026)** — Structured Clinical History Dictionary spec's own User Story 5: real, accession-wide validation combining case + specimen clinical history, order-level `accessionStatus`, and the outbound `order.accessioned`/`order.deficiency.created` queue |
| [actionRegistry/](./actionRegistry/README.md) | Voice/shortcut action catalog |
| [ai/](./ai/README.md) | Core AI provider abstraction (Claude/GPT/Bedrock swap layer) |
| [aiBehavior/](./aiBehavior/README.md) | Admin AI behavior settings (confidence thresholds etc.) |
| [aiIntegration/](./aiIntegration/README.md) | Higher-level AI features: transcript refine, suggestions (the AI spelling check was retired in Batch 338; see `spellcheck/`) |
| [assetLocation/](./assetLocation/README.md) | **NEW (Sep 2026)** — governed physical/asset location dictionary (mortuary storage, workstations, archive shelves), following the exact Department/Physician `findOrCreateByName` governance pattern; built to address `MaterialLocation.location`'s own free-text drift risk without losing its real external-system tolerance |
| [authorization/](./authorization/README.md) | **Batch 369 (PS-355)**: capabilities and the permission check. The catalog, `can()` with the granting role, audit of every high-risk check, day-one grants, dependency planning for the Role Dictionary. No bypass for any role |
| [auditlog/](./auditlog/README.md) | System-wide audit log (incl. signing-authority facility-override events, Sep 2026) |
| [auth/](./auth/README.md) | Case access control + institution/session resolution; `canFinalizeCase()` / countersign resolution are lab- **and** jurisdiction-scoped (Sep 2026). Since Batch 343 also sign-in: demo password accounts and SSO (PS-60) |
| [signatures/](./signatures/README.md) | Signature records, one per signature applied to a case, with how the signer was confirmed. Append-only (Batch 345, PS-60) |
| [autopsy/](./autopsy/README.md) | **NEW (Sep 2026)** — Autopsy Pathology Module (PS-261, RFP-APLIS-2026-GLOBAL §3.1.C): case authority (forensic/hospital-consented), the real legal hard-stop gross-examination gate, temporary accession, mortuary storage occupancy (via `Specimen.locationHistory`, not a parallel mechanism), and jurisdiction-specific consent/HTA rules |
| [batches/](./batches/README.md) | **NEW (August 2026)** — cassette/slide chain-of-custody through histology processing nodes via container barcode scanning, plus the real, computed pending-batch-load queue |
| [billing/](./billing/README.md) | **NEW (August 2026)** — real CPT-to-work-RVU mapping table and calculation, workload/productivity tracking only (not a billing system) |
| [biometric/](./biometric/README.md) | WebAuthn e-signature |
| [caseRegistry/](./caseRegistry/README.md) | **NEW (August 2026)** — real accession-number generation/masking per organisation, with real facility-timezone-aware `{YEAR}` and annual sequence reset |
| [cancerRegistry/](./cancerRegistry/README.md) | **NEW (Sep 2026)** — RFP-APLIS-2026-GLOBAL Broader Cancer Registry Exports gap (NAACCR, CPAC, COSD, INCa, ADT/GEKID, AIHW, NZCR, KCCR) for surgical pathology broadly — genuinely distinct from `cytology/`'s own screening-registry dispatch; found and fixed a real, previously-unconfirmed gap (no ICD-O-3 behavior-code capture existed anywhere) before this could be built honestly |
| [cases/](./cases/README.md) | **Central folder** — case data access, LIS/Orchestration routing, production migration plan |
| [cassetteColors/](./cassetteColors/README.md) | **NEW (August 2026)** — admin-manageable cassette color dictionary (White/Blue/Red/Pink/Green-Mesh/Yellow + custom), fallback policy lives per-color |
| [cassetteRouting/](./cassetteRouting/README.md) | **NEW (August 2026)** — admin-manageable rules resolving which cassette color an order routes to (protocol/priority/station/facility/case type) |
| [clientSLA/](./clientSLA/README.md) | Per-client SLA/TAT targets |
| clients/ | Removed: replaced by `facilities/` (see below); the folder no longer exists |
| [clinical/](./clinical/README.md) | **NEW (Sep 2026)** — PS-105: negation-aware AI detection of critical/abnormal narrative findings at sign-out, plus the real, append-only record of how a pathologist actually communicated one |
| [clinicalHistory/](./clinicalHistory/README.md) | **NEW (Sep 2026)** — Structured Clinical History Dictionary spec's own User Stories 1–2: the real, admin-editable six-category history dictionary and its inbound accession-payload validation/ingestion |
| [codes/](./codes/README.md) | Terminology system CONFIG (which SNOMED/ICD variants are enabled) |
| [coldChain/](./coldChain/README.md) | **NEW (Sep 2026)** — RFP-APLIS-2026-GLOBAL Reference Laboratory Sensor & Cold-Chain Integration gap: real telemetry ingestion, excursion detection against an admin-editable threshold dictionary, and a real workflow hold on `batches/`'s own Batch entity |
| [communications/](./communications/README.md) | Email/notification transport |
| [consultAccess/](./consultAccess/README.md) | **NEW (Sep 2026)** — PS-290, External Consult / Second-Opinion Access — scoped, revocable opaque access tokens and Phase 1 Hybrid opinion capture. NOT real token security; read the folder's own README/`IConsultTokenService.ts` header before touching this |
| [containerTypes/](./containerTypes/README.md) | Specimen container-type dictionary |
| [cytology/](./cytology/README.md) | **NEW (Sep 2026)** — the Cytology & Cervical Screening module: began (Phase 1) as the 2014 Bethesda System category dictionary; now also screening and review records, QC/rescreen, sign-out and countersign, QA reports and the registry payload builders (about 200 source files) |
| [deficiencies/](./deficiencies/README.md) | Specimen/requisition deficiency tracking |
| [delegationTypes/](./delegationTypes/README.md) | Case delegation type dictionary |
| [diagnosisCodes/](./diagnosisCodes/README.md) | Referring physician's order-time diagnosis code |
| [digitalPathology/](./digitalPathology/README.md) | **NEW (Sep 2026)** — shared computational-pathology/AI vendor integration (Paige, Ibex, PathAI, Proscia, Hologic) and WSI scan-batch infrastructure, relocated out of `cytology/` since surgical pathology needs it equally |
| [drafts/](./drafts/README.md) | **NEW (July 2026)** — local caching of in-progress unsaved work (Inactivity Timeout & Draft Recovery Phase 2) |
| [duplication/](./duplication/README.md) | **NEW (Sep 2026, PS-73)**: which admin screens offer Duplicate and why (policy registry + guard test), and the per-entity copy rules: what a copy keeps, deep-copies and clears |
| [encounters/](./encounters/README.md) | **NEW (August 2026)** — Patient/Encounter Management Subsystem: real encounter tracking, sibling to `patients/`'s identifier crosswalk |
| [events/](./events/README.md) | **NEW (August 2026)** — real-time event distribution layer for critical patient state changes (Patient/Encounter Management Subsystem Phase 4) |
| [externalResources/](./externalResources/README.md) | **NEW (July 2026)** — admin-managed reference links (CAP protocols, WHO classification, lab systems), org-scoped with real per-viewer relevance filtering |
| [facilities/](./facilities/README.md) | **NEW (August 2026)** — canonical `Facility` entity, replaces the old `clients/` (`Client`) entirely; `resolveCasePerformingLabScope()` (Sep 2026) resolves a case's performing lab + its jurisdiction |
| [facilityOpsDashboard/](./facilityOpsDashboard/README.md) | **NEW (Sep 2026)** — PS-288, fifth of the PS-284→285→286→287→288 workstation-build sequence: the Display Profile/device registry plus five real, pure aggregation functions (one per department dashboard view) over `batches/`, `referral/`, and `digitalPathology/`'s own existing data — no new parallel data model |
| [flags/](./flags/README.md) | Case/specimen flag dictionary |
| [fonts/](./fonts/README.md) | Editor font dictionary |
| [governingBodies/](./governingBodies/README.md) | **NEW (August 2026)** — real persistence for the Governing Bodies list (CAP, RCPath, ICCR, RCPA, + custom) |
| [grossing/](./grossing/README.md) | Grossing template routing types, Complete grossing, and structured inking: margin ink records, severity rules and the inking gates (Batches 480–484) |
| [grossingRoutingOverrides/](./grossingRoutingOverrides/README.md) | Per-client grossing route exceptions |
| [grossingHardware/](./grossingHardware/README.md) | **NEW (Sep 2026)** — RFP-APLIS-2026-GLOBAL Story 9 (Grossing Station Hardware Integration): real camera capture via `getUserMedia()`, digital scale bridge architecture, confirmation that speech-to-text gross dictation was already built |
| [hardware/](./hardware/README.md) | **NEW (August 2026)** — `ModeAInterfaceService`: dispatches hardware/LIS orders through the existing HL7 seam |
| [hardwareContainers/](./hardwareContainers/README.md) | **NEW (August 2026)** — check-in/check-out registry for semi-permanent, laser-engraved reusable racks/baskets |
| [hl7/](./hl7/README.md) | HL7 v2: the ORM^O01 and DFT builders, ADT/patient-management parsing, and the inbound event processors (block exceptions, material location, instrument, HPV, molecular and WSI status) |
| [inkColors/](./inkColors/README.md) | **NEW (Oct 2026)** — Structured Inking Module 3 (PS-359 follow-up): the margin ink-colour admin palette, needed for `resolveInkingValidationSeverity.ts`'s Severity 3 `margin_ink_color_unmapped` check to ever trigger |
| [interfaceEngine/](./interfaceEngine/README.md) | **NEW (August 2026)** — Category E (Order Creation) dispatch for the JSON/REST interface spec, sent through the generic interface dispatcher; since Batch 318 each send's outcome is stored and listed in the Audit Log's Outbound Dispatches trail (PS-86) |
| [interfaceExceptions/](./interfaceExceptions/README.md) | **NEW (August 2026)** — real holding queue for inbound ADT/patient-management messages that can't be safely auto-processed (unresolved identity, missing MRG-5) |
| [internalNotes/](./internalNotes/README.md) | Lab-internal case notes + management reviews |
| [intraop/](./intraop/README.md) | Intraoperative Pre-Check queue |
| [intraopDashboard/](./intraopDashboard/README.md) | **NEW (Sep 2026)** — RFP-APLIS-2026-GLOBAL Intraoperative/Frozen Section Dashboard: Location-First "Station Identity" terminal binding, quick-auth PIN, real live-timer/stat-threshold logic, and the real-time OR-facing view over `intraop/`'s own existing data |
| [labelDesigner/](./labelDesigner/README.md) | **NEW (Sep 2026)** — real, drag-and-drop label layout designer spanning nine label types, with Enterprise/facility hierarchy and per-group lockdown |
| [lisSync/](./lisSync/README.md) | Narrow mock for one UI sync-freshness indicator |
| [locations/](./locations/README.md) | **NEW (August 2026)** — real Location dictionary (wards/rooms/beds, facility-scoped), for HL7 PV1 |
| [macros/](./macros/README.md) | Text-expansion macro dictionary |
| [messages/](./messages/README.md) | Internal staff messaging |
| [migration/](./migration/README.md) | **NEW (Sep 2026)** — RFP-APLIS-2026-GLOBAL Historical Data Migration Engine: real field-mapping pipeline, MPI dedup reuse, and cross-validation reporting for legacy LIS import — deliberately not the full Case-creation transform, confirmed to be a genuine backend-heavy piece |
| [mockInterfaceEngine/](./mockInterfaceEngine/README.md) | **NEW (Sep 2026)** — dev/demo-only MSW mock for PS-239's own real, not-yet-built backend endpoint, double-gated (dev-only build + explicit opt-in) |
| [models/](./models/README.md) | AI models: global ForMedrixAI catalog + per-organisation adoption records (PS-58) |
| [molecular/](./molecular/README.md) | **NEW (Sep 2026)** — the Full Molecular Testing Execution Module, 21 real phases (see this folder's own README for the full account) |
| [molecularOrders/](./molecularOrders/README.md) | **NEW (Sep 2026)** — Protocol-Driven Workflow Infrastructure story Part 2b: outbound queue for real assay orders (`order.molecular`) and instrument orders (`order.instrument`), fed by an accession trigger, an HPV-positive reflex trigger, and a cytology batch-creation trigger |
| [narrativeSignals/](./narrativeSignals/README.md) | AI-vs-pathologist edit-diff capture + PHI de-identification |
| [orderIntake/](./orderIntake/README.md) | Pending-orders queue + Client/Department resolution |
| [organisation/](./organisation/README.md) | Organization/Site/Lab hierarchy (Enterprise + participating hospitals) |
| [patients/](./patients/README.md) | **NEW (July 2026)** — real Master Patient Index (MPI), org-scoped identity resolution with a genuine ambiguous-match review workflow |
| [participationTypes/](./participationTypes/README.md) | Case Team role dictionary — **and (Sep 2026) the source of jurisdiction-bound signing authority**: per-country profiles, country-scoped regional roles (UK/EU BMS), three-tier resolution, facility-override provenance + audit, and the editor/save services behind the admin UI. See "Signing authority" below |
| [performanceTargets/](./performanceTargets/README.md) | Admin productivity targets |
| [physicians/](./physicians/README.md) | Physician directory |
| [priority/](./priority/README.md) | Display metadata for the 3 fixed priority tiers |
| [printerProfiles/](./printerProfiles/README.md) | **NEW (August 2026)** — real printer capability registry (ZPL/DPI/DataMatrix size) for correct label template selection |
| [printSettings/](./printSettings/README.md) | **NEW (August 2026)** — real, admin-configurable, lab-wide default label-printing behavior (on-demand vs. batch, guardrails, scan verification, container label size) — Tier 1 only, per direct follow-up on the hierarchical print-settings architecture |
| [protocols/](./protocols/README.md) | Standalone processing-protocol dictionary |
| [quality/](./quality/README.md) | Discordance tracking (Frozen-to-Permanent gate) |
| [qualityAssurance/](./qualityAssurance/README.md) | **NEW (Sep 2026)** — real `QaScope` (referring-source dimension) plus the RFP-APLIS-2026-GLOBAL Enterprise BI Rollup gap's own `resolveJurisdictionRollup` (performing-lab jurisdiction dimension) — local-aggregate-first, enterprise-wide-rollup-second data-residency logic |
| [referenceCheck/](./referenceCheck/README.md) | **NEW (August 2026)** — checks whether a foundational config entity (Client, Subspecialty, Department) is still referenced before deactivation |
| [referral/](./referral/README.md) | **NEW (Sep 2026)** — RFP-APLIS-2026-GLOBAL Inter-Laboratory Specimen Referral gap: outbound manifest + inbound result/transit-status tracking, built as a real, additive layer on `batches/`'s own manifest architecture and `facilities/`'s own multi-role Facility, not a new, parallel entity for either |
| [reportParts/](./reportParts/README.md) | Atomic report-building-block library |
| [reportRelease/](./reportRelease/README.md) | **NEW (August 2026)** — Post-Sign-Out Release Buffer: a real, configurable hold window between sign-out and genuine external release, with recall |
| [reportTemplates/](./reportTemplates/README.md) | Report template assembly + routing resolution chain |
| [reports/](./reports/README.md) | **Active work (2026)** — amendment/versioning system |
| [research/](./research/README.md) | **NEW (August 2026)** — external PubMed literature feed for the dashboard ticker (live NCBI eUtils, no firestore stub — see its README) |
| [retentionPolicy/](./retentionPolicy/README.md) | **NEW (August 2026)** — retention-eligibility resolution + computed disposal/pending-hold queues + real scan-to-dispose action |
| [roles/](./roles/README.md) | Staff role/permission dictionary |
| [routingRules/](./routingRules/README.md) | Admin template routing rule overrides |
| [savedSearches/](./savedSearches/README.md) | Saved search/filter presets |
| [scanStations/](./scanStations/README.md) | **NEW (August 2026)** — registry of physical scan/work stations (where a tech scans at the bench), facility-scoped |
| [session/](./session/README.md) | **NEW (July 2026)** — idle-session-timeout resolution (org default + per-performing-lab override) + same-browser session-supersede detection |
| [departments/](./departments/README.md) | Coarse-grained specimen classification |
| [specimenDictionary/](./specimenDictionary/README.md) | Fine-grained Specimen Dictionary (SpecimenEntry) — the real backend |
| [stains/](./stains/README.md) | Stain catalog (3 sub-concepts: type/sectioning/order macro) |
| [subspecialties/](./subspecialties/README.md) | Subspecialty/pool/workgroup dictionary |
| [systemConfig/](./systemConfig/README.md) | Lab-wide system configuration |
| [tatConfig/](./tatConfig/README.md) | **NEW (Sep 2026, Batch 317)**: TAT/escalation editor rules (scope-conflict check, add-vs-edit by mode, role scope kept) |
| [templateSuggestions/](./templateSuggestions/README.md) | AI-driven synoptic template suggestion (split from templates/ 2026) |
| [templates/](./templates/README.md) | Synoptic template library management; protocol lifecycle rules (Duplicate, New Version, Archive/Restore, Export JSON), Batch 317 |
| [terminologySearch/](./terminologySearch/README.md) | Live REST API terminology search (SNOMED/ICD/LOINC/CPT) |
| [users/](./users/README.md) | Staff user directory |
| [validationStudies/](./validationStudies/README.md) | Validation Study governance workflow; `resolveActiveStudyId` (shared by both AI-learning signal captures) |
| [voice/](./voice/README.md) | Voice commands offered to the screen first (Batch 463: the Mohs stage question) |
| [voicemacro/](./voicemacro/README.md) | Voice-triggered macro dictionary |

**Folders not in the table above** (added after it was last rebuilt; each has its own README except `caseViewTracking/`): [actionGroups/](./actionGroups/README.md) (workstation action groups), [addOnOrders/](./addOnOrders/README.md), [aiConfig/](./aiConfig/README.md), [browserCleanup/](./browserCleanup/README.md), [caseAddresses/](./caseAddresses/README.md) (case references in page addresses), [caseSearch/](./caseSearch/README.md), `caseViewTracking/` (no README), [configDirty/](./configDirty/README.md), [cytologyQc/](./cytologyQc/README.md), [delegations/](./delegations/README.md), [delivery/](./delivery/README.md), [demoReset/](./demoReset/README.md), [deployment/](./deployment/README.md), [deploymentReadiness/](./deploymentReadiness/README.md), [documentRendering/](./documentRendering/README.md), [engravers/](./engravers/README.md), [equipment/](./equipment/README.md), [feedback/](./feedback/README.md), [fieldRequirements/](./fieldRequirements/README.md), [followUp/](./followUp/README.md), [imageAssociation/](./imageAssociation/README.md), [import/](./import/README.md), [interfaceDispatch/](./interfaceDispatch/README.md), [interfacePreview/](./interfacePreview/README.md), [labSettings/](./labSettings/README.md), [liveUpdates/](./liveUpdates/README.md), [marginExtraction/](./marginExtraction/README.md), [material/](./material/README.md), [networkPrint/](./networkPrint/README.md), [organMapping/](./organMapping/README.md), [patientHistory/](./patientHistory/README.md), [patientIdentifiers/](./patientIdentifiers/README.md), [phi/](./phi/README.md), [printRouting/](./printRouting/README.md), [printing/](./printing/README.md), [privacy/](./privacy/README.md), [qualitySettings/](./qualitySettings/README.md), [reagentLots/](./reagentLots/README.md), [reasons/](./reasons/README.md), [registryConsent/](./registryConsent/README.md), [registryGoLive/](./registryGoLive/README.md), [registrySubmission/](./registrySubmission/README.md), [reportAppearance/](./reportAppearance/README.md), [reportChangeLog/](./reportChangeLog/README.md), [reportEditing/](./reportEditing/README.md), [retention/](./retention/README.md), [screeningRegistry/](./screeningRegistry/README.md), [screens/](./screens/README.md), [security/](./security/README.md), [signoutGates/](./signoutGates/README.md), [siteSettings/](./siteSettings/README.md), [specimenCategories/](./specimenCategories/README.md), [spellcheck/](./spellcheck/README.md), [staff/](./staff/README.md), [staffPasswords/](./staffPasswords/README.md), [styleRules/](./styleRules/README.md), [supportAccess/](./supportAccess/README.md), [supportReferences/](./supportReferences/README.md), [tumorBoard/](./tumorBoard/README.md), [tumorBoardRules/](./tumorBoardRules/README.md), [userSettings/](./userSettings/README.md), [worklist/](./worklist/README.md), [workstationGroups/](./workstationGroups/README.md).

*Corrected in the Batch 496 README audit (Oct 9, 2026): `clients/` marked removed; the `aiIntegration/`, `cytology/`, `grossing/` and `hl7/` rows updated to what the folders hold now; the 64 folders missing from the table listed. `src/services/` has 170 folders.*

## Known issues (as of this review — see PRIORITY_FIXES.md in project root)

*`PRIORITY_FIXES.md` was retired on 2026-08-19; its open items became Jira PS-57 to PS-71 (`docs/ARCHIVE.md`), so the `PRIORITY_FIXES.md #N` references in this section are historical. The two items below are still present as of Oct 9, 2026. (Batch 496 README audit.)*

- `services/stains/firestoreStainService.ts`'s auto-generated stub comment
  names only one of its three real mocks as "the active implementation" —
  should name all three. Cosmetic, not yet fixed.
- `services/aiBehavior/IAIBehaviorService.ts`'s own header comment has a
  stale file path. Cosmetic, not yet fixed.

**RESOLVED, removed from this list (July 2026):**
- ~~`src/templates/mockDcisTemplate.ts` needs relocating~~ — resolved by
  elimination, not relocation. Deleted as fully dead once
  `TemplateRenderer.tsx` was rewritten (see next item) — it was typed
  against a schema (`types/templateTypes.ts`) that no longer exists.
  `src/templates/` is now an empty folder. See `PRIORITY_FIXES.md` #3.
- ~~`TemplateRenderer.tsx` ignores `templateId`~~ — fixed. Rewritten to
  consume `templateService.ts`'s real `getTemplate()`/`EditorTemplate`
  directly; 19 real seeded templates now display correctly. See
  `PRIORITY_FIXES.md` #2.
- ~~stale header path comments~~ (5 files: `aiIntegration/PathScribeAIService.ts`,
  `cases/casePoolAssignmentService.ts`, `templates/templateService.ts`,
  `templateSuggestions/{ISynopticTemplateSuggestionService,ITemplateSuggestionSignalService}.ts`) —
  all confirmed benign (matching the documented renames below) and fixed.
  Found via `scripts/check-organization.cjs`, which now reports zero
  findings across `pages/`, `services/`, `hooks/`, and `contexts/`. See
  `PRIORITY_FIXES.md` #16.

## Renames executed July 2026 (for anyone using old references/bookmarks)

- `services/aiIntegration/GeminiAIIntegrationService.ts` → `PathScribeAIService.ts`
- `services/voicemacro/mockVoiceService.ts` → `mockVoiceMacroService.ts`
- `services/cases/caseRoutingService.ts` → `casePoolAssignmentService.ts`
- `services/cases/firestoreCaseService.ts` → `FirestoreCaseService.ts` (casing fix)
- `services/templates/{ISynopticTemplateSuggestionService,ITemplateSuggestionSignalService,mockTemplateSuggestionSignalService,synopticTemplateSuggestionService}.ts` → moved to new `services/templateSuggestions/`
- `pages/Synoptic/Codes/codeSearchService.ts` → `services/terminologySearch/codeSearchService.ts`
- `services/internalNotes/{ICaseNoteService,firestoreCaseNoteService}.ts` — deleted (dead legacy lineage, superseded by `IInternalNoteService`/`mockInternalNoteService`)

## New folders added July 2026

- **`session/`** — built for the Inactivity Timeout & Draft Recovery
  feature (`PRIORITY_FIXES.md` #13), Phase 1. Worth its own callout: the
  first version of this folder was a single, non-conforming file with
  bare exported functions instead of a proper service object — caught
  and restructured into the standard interface/mock/firestore-stub
  pattern before it became a second precedent for future folders to copy
  incorrectly. See its own README for the full correction.
- **`drafts/`** — built for the same feature's Phase 2. Followed the
  standard pattern correctly from the start (learned from `session/`'s
  correction above).

## New folders added August 2026

- **`billing/`** — real, minimal CPT-to-work-RVU mapping and calculation
  infrastructure, built because `ProductivityTab.tsx`'s and
  `ContributionDashboardPage.tsx`'s RVU tiles had both been entirely
  hardcoded with nothing real to compute from. Not the interface/mock/
  firestore pattern — a pure static reference table plus pure
  calculation functions, no service, nothing to mock. See its own
  README for real, important scope limits (not a billing system; a
  small curated code subset with values verified against current CMS
  data, not the full CPT file; its rule-based CPT default is honestly
  not physician-entered coding and must never be presented as
  billing-ready).
- **`research/`** — external peer-reviewed literature feed powering the
  PubMed ticker on the Home dashboard, replacing a static line of marketing
  copy ("The AI models are updated and synchronized with the latest CAP
  protocols"). Deviates from interface/mock/firestore: the real backend is
  NCBI and external, so a Firestore stub would be misleading rather than
  forward-looking — interface and mock only. See its own README for the two
  things that matter beyond the code: the feed is **uncurated** (`sort=pub_date`,
  `retmax=1`, no quality filter or retraction check, behind a badge reading
  "Latest Research"), and the 24-hour `localStorage` cache **does not survive
  non-persistent VDI**, where the profile is discarded at logoff — so the
  rate-limit protection it was built for silently does not apply in exactly
  the estates it was designed for.

## New folders added September 2026

- **`cytology/`** — Phase 1 of the real Cytology & Cervical Screening
  module (a genuinely new, real requirements doc, distinct from the
  existing surgical-pathology-oriented PS-105 abnormal-detection work).
  Real, per direct guidance: any configuration for this module lives as
  a new subtab under System — same interface/mock pattern as every
  other admin dictionary, not a new, separate configuration surface.
  This phase covers only the real, standard 2014 Bethesda System
  category vocabulary (specimen adequacy, general categorization,
  interpretation/result) — verified against IARC's own published
  Bethesda reference before building the seed data, not improvised.
  Later phases (the cytologist-specific worklist, workload/QC tracking,
  HPV integration, multi-region compliance, patient follow-up,
  Cyto-Histo correlation) are real, separate, sequenced work — not
  built here.

- **`molecular/`** — the real Full Molecular Testing Execution Module
  (a genuinely new, real requirements doc — HPV/CT-NG/respiratory PCR
  and NGS workflows), spanning 19 real phases: foundational entities
  and real barcode/UUID generation matching every format the given
  specification names; the plate/well layout UI with real scan-to-well
  and drag-fallback auto-population; bidirectional JSON payload
  processing; real hardware-bridge printing (the same real QZ Tray path
  cassette/slide labels already use); a mathematically-verified
  multi-zone requisition ZPL layout (later found to have real bugs a
  visual check — not math alone — caught, see `README.md`'s own Phase
  11-18 account); the real audit trail (lifecycle tracking + backwards
  traceability); scan-to-verify dispatch gating; the extraction-rack
  workflow step; a full, direct spec re-read that closed four real
  gaps (aliquot volume capture, control lot validation, Dynamic Control
  Rules, Position Enforcements) plus real, expanded ANSI/SLAS plate
  format support (6/12/48/1536-well, strip formats) and a real, latent
  row-labeling bug that surfaced; real commercial Positive/Negative
  Control lot tracking, per direct CLIA/CAP guidance; and finally the
  real interface-engine HTTP client itself
  (`dispatchMolecularWorklist.ts`), built against the architecture
  settled in the real Interface Engine Integration epic (PS-239,
  tracked in Jira, not a file in this repo). See this folder's own
  `README.md` for the full, phase-by-phase account —
  it is long, and deliberately so, since several real bugs were only
  found by directly re-reading the given specification or by a real,
  human visual check this environment cannot perform itself.

- **`labelDesigner/`** — a real, drag-and-drop label layout designer
  spanning nine real label types (requisition, specimen, block, slide,
  decant, and four molecular asset labels), per direct follow-up.
  Real, deliberate architectural decision, confirmed by directly
  reading `components/TemplateBuilder/`'s own real code first: that
  system's report-oriented `TemplateNode`/`BaseNode` is built around a
  12-column *flowing* grid, genuinely wrong for a label's own fixed,
  physical x/y layout — a new, parallel data model was built instead,
  while genuinely reusing the same real UI pattern (palette → canvas →
  inspector) and the same real native-HTML5 drag-and-drop mechanic.
  Real Enterprise/facility hierarchy, mirroring
  `FacilityInterfaceEngineConnection`/`FacilityLisRouting`'s own
  already-established pattern exactly: every label type has a real
  Enterprise-level default; only the "Specimen & Processing" group
  (requisition/specimen/decant) allows a real, per-facility override,
  per direct guidance's own explicit configuration-strategy table —
  "Histology Assets" (block/slide) and every "Molecular Asset" type are
  deliberately locked to the Enterprise default, genuinely enforced in
  the service layer (a facility-scoped save attempt is refused
  outright), since hardware compatibility (cassette/slide printers,
  automated stainers, slide scanners, liquid handlers) depends on every
  real facility producing an identical physical format. **Real, honest
  limit, stated plainly**: does not yet touch actual print output for
  any label type — see this folder's own `README.md` for the full,
  named list of every real print entry point this would need wiring
  into, and every other real, explicitly-deferred idea (dynamic,
  parametric field visibility; a centralized, version-controlled
  template store; a printer-agnostic ZPL/EPL/DPL abstraction layer).
  **Real, direct correction**: first surfaced as its own home-page
  tile/route; per direct follow-up ("Label Designer isn't a tile, its
  a tab in configuration"), moved to a real tab under
  `components/Config/System/` instead — see that folder's own
  `README.md` for the account of that move, including a flagged,
  not-yet-reconciled inline-CSS convention mismatch found in the same
  pass.

- **`clinicalHistory/`** and **`accessioning/`** — the Structured
  Clinical History Dictionary & Accessioning Integration specification
  (five user stories): a real, admin-editable six-category history
  dictionary (`clinicalHistory/`), and the real, accession-wide
  validation/deficiency/outbound-event logic built on top of it
  (`accessioning/`). Deliberately shared, app-wide homes, not
  `cytology/` — the spec's own PRIOR_PATH example and its own
  "Accessioning Integration" title both confirm this is captured for
  any specimen type. See `cytology/README.md`'s own Phase 76 for the
  full build narrative, including a genuine mid-build data-model
  correction (case-level history stays the real, primary default;
  additive, specimen-level history was added for genuinely
  multi-specimen cases) and the real, explicit scope boundary this
  phase drew (an "inherited" combined view during actual cytotech/
  pathologist review is separate, later work).

- **`digitalPathology/`** — shared computational-pathology/AI vendor
  integration (a real, admin-editable dictionary seeded with five
  real, named, FDA-cleared products — Paige Prostate, Ibex Prostate
  Detect, PathAI AISight Dx, Proscia Concentriq AP-Dx, Hologic Genius
  Digital Diagnostics), the canonical `AiScreeningResult` schema, and
  a real CAPA-design decision applied throughout: a genuine
  "discordant" human judgment raises an `open` `SpecimenDeficiency` —
  never auto-CAPA, always a human decision from there. Also the new
  home for `IWsiScanBatchService.ts`, relocated out of `cytology/`
  since whole-slide scanning is domain-agnostic — surgical pathology
  needs it equally, not just cytology.

- **`referral/`** — the RFP-APLIS-2026-GLOBAL Inter-Laboratory
  Specimen Referral gap, closed by direct instruction to "review the
  Batch operations as this is the logical place to host this
  functionality. Reuse existing configurations if possible." Real,
  additive layer on two already-existing pieces rather than new,
  parallel ones: a seventh `BatchProcessingNode`
  (`'External Referral'`, `batches/`) reuses that folder's own real
  scan/manifest/reconciliation architecture for an outgoing referral
  shipment; a new `reference_lab` `FacilityRole` (`facilities/`) makes
  an external lab a real, selectable destination. Dispatch is
  automatic — completing a real referral batch (either real
  completion path) enqueues the manifest and creates the tracking
  record on its own, no separate manual trigger. **A real,
  pre-existing gap found and fixed along the way**: two separate,
  parallel Facility-editing modals
  (`components/FacilityDictionary/FacilityEditorModal.tsx` and
  `components/ClientDictionary/ClientEditorModal.tsx`) each maintain
  their own, hand-written `FacilityRole[]` order array, neither
  derived from the real `FacilityRole` type — both had to be updated
  by hand for the new role, and neither the compiler nor anything
  else would have caught only one being updated. See `facilities/README.md`'s
  own note for the full account; not fixed structurally here, since
  that's a real, separate refactor of its own. *(Since changed:
  `components/ClientDictionary/` no longer exists, so
  `FacilityEditorModal.tsx` is the only Facility editor left — checked
  in the Batch 496 README audit.)*

- **`coldChain/`** — the RFP-APLIS-2026-GLOBAL Reference Laboratory
  Sensor & Cold-Chain Integration gap. A real, admin-editable
  temperature-threshold dictionary, seeded directly from the RFP's
  own two stated examples (Frozen Tissue: max -20°C; Fresh Tissue:
  max 8°C) rather than invented values; a genuinely new `StorageUnit`
  entity for fixed equipment (freezers/refrigerators — confirmed
  nothing like it existed before); and a real, pure excursion-
  detection function reused by the real inbound processor. Real,
  additive extensions to two existing folders rather than new,
  parallel entities: `hardwareContainers/`'s own `HardwareContainer`
  gained smart-container fields (and a previously-missing `update()`
  method, found and fixed while wiring this in), and `batches/`'s own
  `Batch` gained a `coldChainExcursion` hold, gated into
  `completeReconciliation()` the same real way missing/unexpected
  items already are. **Real, honest scope**: a workflow hold and a
  case-scoped CAPA deficiency both require a real, active batch to
  attach to — a `StorageUnit` excursion, or a smart container with no
  active batch, is a real, genuine equipment-level issue surfaced
  only via the reading's own flag, never a fabricated case
  association.

- **`intraopDashboard/`** — the RFP-APLIS-2026-GLOBAL Intraoperative/
  Frozen Section Dashboard, built against a direct, detailed design
  brief for Location-First terminal authentication with quick-switch
  user attribution ("badge tap or PIN"). Genuinely separate from
  `intraop/` (bench-side pre-check capture) — this is the real-time,
  OR-facing view over that same, existing data. A real "Station
  Identity" terminal (`OrSuiteTerminal`) bound to one specific,
  already-facility-scoped `Location` — a customer with many
  institutions each having their own "OR 1" was already structurally
  safe before this folder existed. Live per-specimen timers mirror
  `batches/DecalBatch.ts`'s own proven client-side-tick-against-an-
  absolute-timestamp pattern exactly, for the same real resilience
  reason (a dropped connection never freezes a STAT clock). **Two
  real, direct corrections made along the way**: the dashboard page
  was initially wired inside this app's normal authenticated route
  wrapper, which would have defeated the entire point of a kiosk
  display that must never hit a session timeout — caught and moved to
  a genuinely public route before shipping; and a **third**,
  previously-unknown, locally-redeclared `StaffUser` type was found
  inside `components/Config/Staff/StaffTab.tsx` (on top of the two
  already known — see `referral/`'s own entry above for context on
  this app's `FacilityRole[]`-style duplication risk pattern) while
  wiring the new `quickAuthPin` field through. **Real, honest scope**:
  the actual real-time push channel is a real backend need, filed on
  the Backend Needs Log; and the RFP's own fourth sub-requirement for
  this gap, automatic frozen/final correlation flagging, is
  confirmed genuinely manual today (a pathologist opens a
  reconciliation modal themselves) — not addressed here.

- **`migration/`** — the RFP-APLIS-2026-GLOBAL Historical Data
  Migration Engine gap, whose own Backend Needs Log entry is explicit
  that it is "fundamentally a backend-heavy story; the frontend piece
  is comparatively small." Real, working field-mapping pipeline
  (admin-editable, scoped per legacy source system), real reuse of
  this app's own, already-existing MPI dedup
  (`services/patients/resolveOrCreatePatient()`) — confirmed directly
  that a genuine ambiguous match found during migration lands in the
  exact same review queue a live accession's own ambiguous match
  would, no new review surface needed — and real, pure cross-
  validation reporting against a source system's own claimed record
  count. **Real, honest scope boundary, confirmed before building
  further**: `caseService.createCase()` requires a full, complete
  `Case` object with real specimen/block/slide structure a flat
  legacy record's minimal fields cannot honestly populate — building
  that transform is itself the real, substantial backend-heavy piece
  this gap's own Backend Needs Log already names, not something
  faked here. This pipeline's own real scope stops at mapping,
  validation, and MPI resolution.

- **`cancerRegistry/`** — the RFP-APLIS-2026-GLOBAL Broader Cancer
  Registry Exports gap (NAACCR, CPAC, COSD, INCa, ADT/GEKID, AIHW, NZ
  Cancer Registry, KCCR), for surgical pathology broadly. Before
  writing any code, `services/facilities/IRegistrySettingsService.ts`'s
  own header was found to already defer this exact work, pointing to
  a real, already-researched document
  (`src/FHIR_DISPATCH_ARCHITECTURE_PLAN.md`) with a critical finding:
  NAACCR explicitly excludes cervical carcinoma in situ/CIN III from
  reportability, and this dispatch must never be triggered from
  cytology sign-out — only from a real, confirmed surgical pathology
  diagnosis. That document also flagged a genuinely unconfirmed
  question: does this app capture an ICD-O-3 code's own real behavior
  digit (the /2 vs /3 that rule depends on)? **Confirmed directly: it
  did not** — `MedicalCode.system` had no `'ICD-O'` value, no
  `Specimen.coding` field existed for it, and `SynopticReportPage.tsx`'s
  own `handleAddCodesToSpecimens` was silently dropping any ICD-O-
  tagged code entirely. All three fixed as real, necessary
  prerequisites before any registry logic could be honest. The real
  dispatch trigger (`dispatchCancerRegistryReportIfApplicable.ts`) is
  wired into `useSignOutWorkflow.ts`'s real surgical pathology sign-out
  and nowhere else. **A second, real, honest gap — not fixed here**:
  there is still no way for a pathologist to actually *enter* an
  ICD-O code in this app (live search is a "coming soon" placeholder,
  same as ICD-11's neighboring one) — this module's own pipeline is
  real and fully tested against a `Case` with populated ICD-O data,
  but won't receive real data until that separate capture-path gap is
  closed. See `cancerRegistry/README.md` for the full account.

- **`qualityAssurance/`** — the RFP-APLIS-2026-GLOBAL Enterprise
  Business Intelligence Rollup Dashboard gap. The existing `QaScope`
  system (enterprise/organisation/client) describes the *referring*
  source, not the *performing lab* — the dimension this gap's own
  data-residency requirement actually depends on ("respecting local
  data-residency rules at the performing-lab tier while rolling up
  anonymized/aggregated metrics enterprise-wide"). Confirmed directly
  before building: the app already had every real building block —
  `Facility.jurisdiction`, a real `isEnterprise`/`parentId` enterprise
  hierarchy (seeded across US/GB_EW/GB_SCT), `resolveTenantFacility()`
  (resolves a case's `originHospitalId` to its real, jurisdiction-
  bearing Enterprise Facility), and `contributionDashboardCalculations.ts`'s
  own real `computeOrgWideTatPerformance`/`realWorkRvuForCase`/
  `wasAiAssisted` (newly exported for reuse, previously private to
  that file) — just not yet connected. `resolveJurisdictionRollup()`
  groups cases by performing-lab jurisdiction first, computes each
  jurisdiction's own aggregate numbers with those same, already-tested
  functions, and only ever combines the resulting AGGREGATE rows
  enterprise-wide — raw case data never itself crosses a jurisdiction
  boundary. New UI: `EnterpriseRollupTab.tsx`, a new, fifth QA pillar
  (didn't belong to Operations, Financials, CAPA, or Cytology, being
  genuinely cross-cutting), reusing this module's own established
  cross-tenant audit-logging and PHI-safe export conventions exactly.
  **Real, honest scope boundary**: real, tested local-aggregation
  logic built against this app's own single-instance data as a stand-
  in for true multi-facility federation — genuine, physically-separate
  per-facility data hosting across jurisdictions is real, separate
  backend work this app doesn't have, per the RFP's own note. See
  `qualityAssurance/README.md` for the full account.

- **`grossingHardware/`** — RFP-APLIS-2026-GLOBAL Story 9 (Grossing
  Station Hardware Integration). Confirmed directly before building:
  real speech-to-text gross dictation already existed (the same real
  `VoiceProvider.tsx` dictation mode used for micro/diagnosis), so
  only camera and scale integration were real, open gaps. Built a
  real hardware-profile service reusing the established
  `PrinterBridgeType` pattern (including its own real, named
  `pathscribe_agent` local-agent concept, PS-52), a real, working
  camera capture component using the browser's standard
  `getUserMedia()` (no bridge required — most grossing cameras are
  standard USB/UVC devices), and a real, tested HTTP contract for a
  future scale bridge, with an honest `stable`/`unstable` reading
  distinction. Camera capture is genuinely functional and wired into
  `BlockStainEditorModal.tsx`'s block cards; the scale path is real,
  tested architecture whose connection to an actual physical scale is
  unverifiable from this sandbox, per the RFP's own note. See
  `grossingHardware/README.md` for the full account.

- **Comment-field parity across material types** (Sep 2026, prompted
  directly): confirmed `Specimen.comments` existed but
  `HistologyBlock`, `StainOrder`, `Decant`, and `MatrixBlock` did not
  have a comparable field. First pass reused `CaseComment` (rich
  text/HTML, backed by the full TipTap-based `PathScribeEditor`)
  directly — a real, direct follow-up caught this as genuine overkill
  for a short, operational block/stain/decant-level note, and worse,
  a real bug: the actual composer was a plain `<input type="text">`,
  never routed through `PathScribeEditor`, yet rendered via
  `dangerouslySetInnerHTML` as if it had been — any HTML-significant
  character a user typed would have been interpreted as markup.
  Fixed with a new, dedicated `MaterialComment` type
  (`types/case/MaterialComment.ts`) — genuinely plain text, same real
  author/timestamp shape as `CaseComment`, never rendered via
  `dangerouslySetInnerHTML`. Added to all four material types
  (`types/case/Specimen.ts`, `types/case/Material.ts`,
  `types/case/MatrixBlock.ts`). Real, working UI in
  `BlockStainEditorModal.tsx` for block, decant, and stain comments,
  reusing that modal's own existing generic `onUpdateBlock`/
  `onUpdateDecant` patch callbacks rather than a new persistence path.
  `MatrixBlock`'s own comment UI was not wired in this pass — the
  data-model field is real and ready, matrix-block editing is a
  separate, not-yet-explored surface.

## Duplication policy (Sep 2026, PS-73)

Pete's framework decides which admin records can be duplicated:

- **Yes:** complex configuration (facilities, stain/lab protocol templates, routing rulesets, escalation paths), template entities (specimen categories, test panels, document templates, alert profiles) and multi-site variants (printer profiles, workstation groups).
- **No:** real people or entities (physicians, users, patients), flat lookups of a few fields (cassette colours, container types, delegation types, code-map rows), and transactional or audit-logged records.

The decisions and their reasons live in [`duplication/duplicatePolicy.ts`](./duplication/README.md). Its guard test fails the build if a screen offers Duplicate without being registered, or if any source file stores an English "(Copy)" marker. Copy names come from `t('common.copyOfName')` in the user's language. Each entity's copy rules (what is cleared, what is deep-copied) are in `duplication/duplicateEntities.ts`.

## Signing authority — jurisdiction-bound, human-in-the-loop (Sep 2026, PS-327 / PS-341)

Who may sign out, and whose work needs a countersign, is decided across
five folders. Read them in this order:

1. **`participationTypes/`** holds the rules. Each role type has
   platform-default flags (`canFinalize`, `requiresCountersign`,
   `canViewWholeCase`), per-country `jurisdictionProfiles` (the local
   title, the regulatory citation, and the flags), optional
   `scopedJurisdictions` for roles that only exist in some countries,
   and facility-level `authorityOverrides` that carry who/when/why.
   Resolution is facility override → jurisdiction default → platform
   default. The seeded data is Pete's own AU/NZ/EU/UK/IE/CA/KR role
   hierarchy.
2. **`facilities/`** holds `resolveCasePerformingLabScope()`, which
   works out which lab and jurisdiction govern a given case. It is
   always the performing lab, never the ordering site.
3. **`auth/`** is where the rules are enforced: `canFinalizeCase()`
   and `resolveCountersignRequiredTypeIds()`.
4. **`cases/`** holds `resolveResidentCountersignRequired()`, which
   routes a sign-out that needs a countersign into release-for-
   countersign.
5. **`auditlog/`** receives an entry for every facility override that
   is added, changed, reverted, or re-justified, and (Batch 335) for
   every change to a country profile.

Wired today:
- **Sign-out:** Surg Path sign-out and Assist-mode finalize (`useSignOutWorkflow.ts`), plus Autopsy and Cytology's pathologist track (Batches 331–332, through `auth/resolveFinalizeAuthorityContext.ts`).
- **Screens:** the case-team editor, the Participation Types admin screen (lab exceptions), and System → **Country Signing Rules** (Batch 335). Country Signing Rules is the platform-level editor for the country profiles and country scope; only a platform administrator can change them.

Not yet wired, and disclosed: `deriveEligibleFinalizerIds()`. The repo-root `firestore.rules` has no finalize-eligibility rule, and production will use SQL Server behind an API server, so that function has no server-side consumer yet.

(Corrected in Batch 335: this section said Cytology and Autopsy weren't wired, which stopped being true in Batches 331–332.)

**Batch 335 cache fix:** `utils/participationTypeLookup.ts` used to cache participation types for the whole session. A saved rule change (country profile or lab override) therefore didn't reach the sign-out check until a reload. Every save now clears the cache.

## Batch 363 (PS-72): patient data tagged for screenshot redaction

**`phi/`** (new): `phiRenderAudit.ts` finds patient data the UI shows outside a redacted element, and `phiTagging.guard.test.ts` runs it over all of `src/` (no exceptions; the app passes with none). `phiToast.ts` gives services a redacted toast message. `hl7/` notifications use it and are now translated. `deploymentReadiness/`: seven files came off the mock-import baseline.

## Batch 364 (PS-349, PS-350): support references

**`supportReferences/`** (new): non-identifying support references (`SR-7K2Q-9MXD`) for cases, audit entries, errors and interface exceptions. They are random, stored, and audited when resolved, and `@/services` exports `supportReferenceService`. `enhancementRequestService.ts` no longer sends the page address, which carried the case number: it sends the route pattern and the case's reference. `communications/emailTemplates/` shows the reference.

## Batch 365 (PS-347): Belgian French, Netherlands dates

`@/services` exports `patientIndexService`, so `OrderLookupModal.tsx` no longer imports the mock directly. `deploymentReadiness/deploymentBaseline.ts` loses that file.

## Batch 366 (PS-68)

`cytology/`: comments that pointed to the removed `ReportSnapshot` type now name `ReportVersionRecord`. No code changed.

## Batch 367 (PS-74): no inline CSS

**`styleRules/`** (new): `inlineStyleAudit.ts` and the app-wide guard `inlineCss.guard.test.ts`, which enforces standing rule 1 with no exception list. See its README.

## Batch 368 (PS-353): report change log

**`reportChangeLog/`** (new): one entry per case save, recording who, when, the workstation, and every field changed old → new. `cases/mockCaseService.ts` and `cases/mockOrchestratorCaseService.ts` call `recordCaseChange` on every write. `@/services` exports `reportChangeLogService` and `REPORT_CHANGE_LOGGED_EVENT`. See its README and `docs/architecture/REPORT_CHANGE_LOG_API.md`.

`@/services` also exports ten services and helpers that screens used to import straight from their mock files (deployment-readiness rule 4): `cytologyCategoryService`, `placeOfServiceCodeService`, `cytologyQaReportService`, `referralTrackingService`, `cassetteColorService`, `molecularBatchService`, `reportPartService` / `onReportPartsChanged`, `labelLayoutService`, `getAiFeedbackLog`, and `FROZEN_FINAL_ACTIVITY_TYPE_ID`.

## Batch 369 (PS-355): capabilities

- **`authorization/`** (new): the capability catalog, the check, and its audit. `@/services` exports:
  - `authorizationService` and `createAuthorizationService`;
  - the catalog helpers and dependency plans;
  - `roleCapabilityProblem` / `roleCapabilityChangeAudit`.
- **`qualityAssurance/qaExport.ts`** (new): the checked path for every QA report export.
- **`reportChangeLog/exportChangeLog`** checks `report:change-history:export`.
- **`roles/`** has two new built-in roles (QA Reviewer, Superadmin), seeds capabilities on load, and refuses inconsistent grants.
- **`auth/sessionRole`** ignores roles that can't be assigned.
- **New `@/services` exports for the QA page:** `billingDeficiencyService`, `outboundChargeQueueService`, `codeReviewPoolService`, `reasonDictionaryService`.

## Batch 370 (PS-356): phase 2 of capabilities

- **The self-escalation path is closed:**
  - `roles/roleAdministration.ts` (`config:roles:manage`, with the lockout guard);
  - `staff/staffAdministration.ts` (`config:staff:edit`, plus `config:staff-access:assign` for roles, facilities, access flags and credentials);
  - `demoReset/` (new; `config:demo-data:reset`).
- **Facility scope:** `users/IUserService` has `StaffUser.facilityIds`, and `authorization/evaluateCapability` applies it.
- **Retired:** the role-level pediatric, orchestration and facility switches are removed from `roles/`.

## Batch 371: Superadmin reserved for ForMedrixAI support

- **`authorization/`:** platform-only capabilities (`platform:cross-tenant-cases:view`, `platform:governing-bodies:manage`), and `lockPlatformRoles`.
- **`roles/`:** Superadmin can't be edited.
- **`cases/CaseRouter`:** support opening another organisation's case is checked and audited.
- **`governingBodies/`:** the settings save is checked.
- **`auth/demo`:** only ForMedrixAI people sign in as superadmin.
- **`users/`:** Sarah Johnson has a staff record.

## Batch 372: ForMedrixAI support access

- **`supportAccess/` (new):** each organisation's support access policy (Disabled / Approval required, the default / Always allowed) and access window (default 2 hours); support's requests per ticket and the hospital's approvals; the organisation's own hash-chained support audit stream, with CSV/JSON export. See [supportAccess/README.md](./supportAccess/README.md).
- **`authorization/`:** `config:support-access:policy`, `config:support-access:approve`, `config:support-audit:view`, seeded to Admin.
- **`cases/CaseRouter`:** support's opens, lists and edits of another organisation's cases go through the policy gate.
- **`caseSearch/`:** support's searches are recorded (criteria names only).
- **`demoReset/`:** the Full Reset now keeps the audit trails it always claimed to keep (it had been clearing them).

## Batch 373: every hospital id linked to its organisation

- **`facilities/`:** `linkFacilitiesToOrganisations` links each facility's id to its organisation, and the ten international screening labs are their own organisations. All 99 demo cases now have an owner.
- **`supportAccess/`:** demo starting policies. Organisations with an approver start at Approval required; the others start at Always allowed.

## Batch 374: screens by role

- **`screens/` (new):** each screen reached from Home has a capability. Home, the hubs and the routes show or open only what the user's roles grant.
- **`authorization/`:** 17 screen capabilities, with starting grants per role.
- **`roles/`:** four bench roles (Accessioner, Histotechnologist, Cytotechnologist, Molecular Technologist).
- **`auth/demo`, `users/`:** bench demo users, and a staff record for Michelle Nimmo.

## Batch 375: fewer Home tiles

- **`screens/`:** `TILE_SCREENS` (a tile opens when any of its screens may be opened), and the Worklist's views.
- **`index.ts`:** exports `externalResourceService`, `wsiScanBatchService`, `aiScreeningResultService` and the lis-sync state types, so the Worklist and report header no longer import mock files.
- **`deploymentReadiness/`:** `HeaderBar.tsx` off both baselines, and `WorklistPage.tsx` off the mock-import one.

## Batch 376: field requirements (PS-359)

- **`fieldRequirements/` (new):** which fields each page requires before saving, per organisation. Locked fields are always required. Accession is the first page.
- **`authorization/`:** `config:field-requirements:manage`, seeded to Admin.
- **`index.ts`:** exports for the services the Accession page used by mock path, so it came off the mock-import baseline.

## Batch 377

- **`accessioning/patientIdGeneration.ts`:** the generated Patient ID, and whether a required one can be supplied.
- **`fieldRequirements/`:** `autoFilled` fields (a blank value is filled in when saving).

## Batch 378: Complete grossing (PS-359)

- **`grossing/grossingCompletion.ts`:** checks the Grossing field requirements and `case:grossing:complete`, moves the case to Gross Complete, and audits it.
- **`fieldRequirements/`:** the Grossing page (blocks, piece count, fixation).
- **`actionRegistry/`:** the `GROSSING_COMPLETE` voice and keyboard command.

## Batch 379: the protocol rule for grossing, switchable per organisation (PS-359)

- **`fieldRequirements/`:** Grossing's new `protocol` requirement (required by default). "At least one block" moved from locked to required by default, applying to specimens with a protocol that aren't cytology preparations.
- **`grossing/grossingCompletion.ts`:** with the protocol rule off, completion asks for confirmation. It then routes each protocol-less specimen for secondary review with an open deficiency, and audits it.
- **`deficiencies/`:** the `def-grossed-without-protocol` type. Stored type lists now gain new built-in types without a version bump.
- **`actionRegistry/`:** voice and keyboard answers to the confirmation.

## Batch 380: Field Requirements for the case report page, group 1 (PS-359)

- **`fieldRequirements/`:** new page `report` (Add/Edit specimen, amendments and addenda, critical findings) and `reportPageChecks.ts`.
- **`reports/`:** `changeDraftType`, which fixes minor amendments and addenda that couldn't be saved from a new draft.
- **`actionRegistry/`:** voice and keyboard save commands for the three modals.
- **`deploymentReadiness/`:** `AmendmentModal.tsx` and `useAmendmentWorkflow.ts` came off the mock-import baseline.
- **`index.ts`:** exports the report checks, `generateAiSuggestionsForReport` and `generateGrossingFieldSuggestionsFromDictation`.

## Batch 381: Field Requirements for the case report page, group 2 (PS-359)

- **`fieldRequirements/`:** holds, comments, delegation, biopsy arrays, block cancellation and restains. All locked except "Note on every delegation".
- **`cases/caseHolds.ts`:** placing and releasing case and retention holds, with the capability check and an audit entry. Fixes the report page's next save being refused after a hold.
- **`authorization/`:** five capabilities for holds and delegation, seeded to every role with case access.
- **`delegations/`:** `delegate()` checks `case:delegation:create`.
- **`actionRegistry/`:** voice commands for placing and releasing holds, posting comments and saving biopsy arrays.
- **`index.ts`:** exports `serviceChargeService`, `molecularTargetService` and the group 2 checks.

## Batch 382: Field Requirements for the case report page, group 3 part 1 (PS-359)

- **`fieldRequirements/`:** the Case report page gains Frozen-final reconciliation and Billing changes after sign-out (all locked), with `discordanceMissing`, `billingChangeMissing` and `correctedCodeCheck`.
- **`quality/discordanceRecord.ts`:** builds the reconciliation record the modal saves.
- **`billing/correctServiceCharge.ts`:** `enforceAppliedCodeCorrection`; correcting an applied code needs `billing:applied-code:correct`.
- **`authorization/`:** that capability, in a new Billing group, seeded to today's users.
- **`actionRegistry/`:** voice commands for the three modals' buttons.
- **`deploymentReadiness/`:** three modals came off the mock-import baseline.

## Batch 383: Field Requirements for the case report page, group 3 part 2 (PS-359)

- **`fieldRequirements/`:** two more groups on the Case report page, Autopsy forms and Sign-out gates, with `autopsyAuthorizationMissing` and `autopsyReleaseMissing`.
- **`signoutGates/` (new):** the decisions behind the fixation-time and collection/receipt-date gates (what is resolved, what is still required, the resolutions saved).
- **`autopsy/`:** `releaseAutopsyBody` needs `autopsy:body:release`; the authorization completion validation reads Field Requirements.
- **`authorization/`:** that capability, in a new Autopsy group, seeded to the roles with case access.
- **`actionRegistry/`:** voice commands for the four buttons.

## Batch 384: Field Requirements for messaging (PS-359)

- **`fieldRequirements/`:** a Messaging page (new message, secure email, reply) with `newMessageMissing`, `secureEmailMissing` and `replyMissing`.
- **`actionRegistry/`:** a voice command for sending a secure email.
- **`deploymentReadiness/`:** `AppShell.tsx` came off the mock-import baseline.

## Batch 385: messaging recipients, secure-email send and permissions (PS-359 follow-up)

- **`messages/`:** the recipient list and its search moved out of `AppShell`; `sendSecureEmail` is the service's; sending needs `message:internal:send` and `message:secure-email:send`.
- **`authorization/`:** those two capabilities, in a new Messaging group, seeded to every role.

## Batch 386: Cytology screening Field Requirements

`fieldRequirements/` gains the `cytology` page and `cytologyChecks.ts` (exported from `services/index.ts`); `cytology/` gains `cisoeADraft.ts`; `actionRegistry/` gains four voice/keyboard actions. See those READMEs.

## Batch 388: Microtomy workstation Field Requirements

`fieldRequirements/` gains the `microtomy` page and `microtomyChecks.ts` (exported from `services/index.ts`); `actionRegistry/` gains two actions. `deploymentReadiness/deploymentBaseline.ts` loses `useMicrotomyWorkstation.ts` (its scan-station read now goes through `@/services`).

## Batch 390: Cytology correction and addendum (PS-340)

`cytology/` gains `resolveCytologyRevisionInputs.ts`, and its two release services take a mandatory reason and check a permission each; `authorization/` gains `cytology:report:correct` and `cytology:report:addend`; `fieldRequirements/` gains the Correction / addendum group and its two checks. See those READMEs.

## Batch 391: report language

`reports/reportLanguage.ts` (a report is in the performing lab's language; `Facility.reportLanguage` with a jurisdiction default); `documentRendering/printFonts.ts` (Pretendard for Korean PDFs; removed in Batch 539, the report renderer picks the font: `functions/cytology_report.py`); `cytology/` stores the language at sign-out and words its PDF in it. See those READMEs.

## Batch 392: report PDFs to the interface engine

`reports/` gains `resolveOruReportPdf.ts`, `prepareOruR01Dispatch.ts`, `releasedReportPdfStore.ts`, `resolveReportLocale.ts` and `surgicalReportLabels.ts`: every surgical, preliminary and autopsy ORU^R01 now carries its report PDF or is held for retry. See its README.

## Batch 393: autopsy results and Korean in every report PDF

`reports/resultInstances.ts` (an autopsy report is one result); `documentRendering/printFonts.ts` (`printFontLanguageFor`: Korean or any Hangul uses Pretendard; removed in Batch 539, the same rule now lives in the report renderer). See those READMEs.

## Batch 395

`cytologyQc/` gains demo QC assignments and `cases/` flags three demo cases for surgical post-sign-out peer review, so both QA queues have work for Pete Nimmo. See those READMEs.

## Batch 396: case privacy model

Pete's four rules for anything that names, links to or opens a case are in `docs/architecture/CASE_PRIVACY_MODEL.md`, enforced by `services/privacy/casePrivacy.guard.test.ts`. See `cases/`, `messages/`, `cytologyQc/` and `quality/`.

## Batch 397

Field Requirements now cover the Intraop page, Add Orders → Blocks / Recut and matrix blocks (`fieldRequirements/`, `grossing/`). See `i18n/README.md` → Batch 397.

## Batch 398

The case report page's Gross Complete applies the Grossing field requirements and permission (`grossing/reportGrossComplete.ts`).

## Batch 399

The Intraop verbal report is a structured record with a critical-results dictionary and "Surgeon unavailable" reasons (`intraop/`, `reasons/`, `clinical/`).

## Batch 400

Dictating the Intraop verbal report, with AI (patient identifiers removed first) or keyword rules filling in the fields (`intraop/parseVerbalReportDictation.ts`).

## Batch 401

`fieldRequirements/` gains the `embedding` page and `embeddingChecks.ts` (exported from `services/index.ts`); `actionRegistry/` gains two `EMBEDDING` actions. `deploymentReadiness/deploymentBaseline.ts` loses `useEmbeddingStation.ts` (its scan-station read now goes through `@/services`).

## Batch 402

`fieldRequirements/` gains the `slideDistribution` page and `slideDistributionChecks.ts` (exported from `services/index.ts`); `actionRegistry/` gains two `SLIDE_DISTRIBUTION` actions. `deploymentReadiness/deploymentBaseline.ts` loses `useSlideDistributionStation.ts`.

## Batch 403

- New `addOnOrders/` folder: the Add-On Orders actions, with two new permissions in `authorization/`.
- `fieldRequirements/` gains the `addOnOrder` page.
- `stains/` links reference labs to molecular tests (`referenceLabLink.ts`).
- `facilities/` seeds three demo reference labs, and `cases/` seeds demo add-on orders.
- `actionRegistry/` gains two `ADD_ON_ORDER` actions.
- `deploymentBaseline.ts` loses `useAddOnOrderStation.ts` and `StainDictionarySection.tsx`.

## Batch 404

- `fieldRequirements/` gains the `batchManagement` page.
- `batches/`:
  - The service checks three new permissions from `authorization/`, and an abort now needs a reason.
  - Demo batches, one per override.
  - `batchFormHelpers.ts`.
- `actionRegistry/` gains `BATCH_CREATE_CONTAINER`.
- `deploymentBaseline.ts` loses `NewContainerModal.tsx`.

## Batch 405

- `fieldRequirements/` gains the `molecularBatch` page.
- `molecular/`:
  - Refuses a patient well that names no specimen.
  - Checks `molecular:batch:supersede`, a new permission in `authorization/`.
- `actionRegistry/` gains `MOLECULAR_CREATE_PLATE`.
- The molecular control-rule and extraction-rack services are exported from `index.ts`.
- `deploymentBaseline.ts` loses `MolecularPlateBuilderPage.tsx`.

## Batch 406

- `authorization/`:
  - New `config:molecular-control-rules:manage` (Admin by default, assignable).
  - `capabilityDocs.guard.test.ts` keeps the capability catalog in `docs/architecture/AUTHORIZATION_API.md` in step with the code.
- `equipment/`: analysers have deck layouts (`deckSlots`).
- `molecular/`:
  - Deck-slot rules (`deckSlots.ts`).
  - Control rules name their sample rack's slots.
  - Racks take a physical barcode, an accession per tube and a placement (`placeOnDeck`).
  - A plate must go in a plate slot.
- `fieldRequirements/` gains the `molecularRack` page.
- `cytology/` and `molecularOrders/`: the QC-run and order-queue pages' logic moved into services.
- `actionRegistry/` gains `MOLECULAR_PLACE_RACK`.
- `deploymentBaseline.ts` loses five molecular pages.

## Batch 407

- `authorization/`: `retention:material:dispose` and `retention:disposal-report:export`.
- `retentionPolicy/`: disposal refusals are codes, and the report export checks its permission (`exportDisposalReport.ts`).
- `batches/` and `hardwareContainers/`: refusals are codes the screens translate, and the Pending Batch Load search moved in.
- `deploymentBaseline.ts` loses the last three Batch Management pages.

## Batch 408

`batches/batchListView.ts`: the Batch Management list's filtering, and one completion rule shared by the service and the Complete button.

## Batch 409

- `cytology/signOutCytologyCase.ts`: cytology sign-out as a tested service with a new permission (`cytology:report:sign-out`).
- `index.ts` exports the Cytology Workspace's 22 remaining services and the pool-claim actions.
- `deploymentBaseline.ts` loses the Cytology Workspace.

## Batch 410

`cytology/`: the Cytology Workspace's loading, review saving, other actions and display decisions moved out of the page into `loadCytologyWorkspace.ts`, `saveCytologyReview.ts`, `cytologyCaseActions.ts` and `cytologyWorkspaceView.ts`, with five new permissions (`authorization/`). Each review after the initial screen stores its level of agreement with it (`resolveCytologyReviewAgreement.ts`), and the QA agreement report reads the stored level.

## Batch 411

`cytology/`: multi-specimen cases are signed out specimen by specimen, and the case is final when every cytology specimen is (`cytologyCaseFinalization.ts`), or early with `cytology:case:finalize` (`authorization/`).

## Batch 412

`cytology/`: pre-sign-out review without delays. That covers notes on part of someone's review, and "Requires revision" (`cytology:revision:request`), which stops a cytotechnologist but never a pathologist. It also covers review version history and a pathologist's one-step "Revise and sign out".

## Batch 413

`cytology/signOutCytologyCase.ts`: only GYN specimens go to cervical screening registries, and the CSMS eligibility flag is added once per case (a country check of Batches 409–412).

## Batch 414

`screeningRegistry/` (new): the cervical screening registry engine, with twelve programmes as definitions and the lab's code mappings as configuration. Sign-out's registry step and the Configuration screen use it. `index.ts` exports its config service and permissioned saves.

## Batch 415

`cytology/`: the CLIA workload cap and CAP 5-year lookback are switchable features (automatically on for US labs only), and a cytotechnologist's sign-out needs its own permission (`authorization/`).

## Batch 417: national patient identifiers

`patientIdentifiers/` (new): the national identifiers the registries key on (NHS number, BSN, IHI…), separate from the MRN, with their check digits run and the result stored. The screening registry engine uses the verified identifier first and holds a submission whose identifier failed or is missing; the cancer registry payload carries the list; HL7 ADT intake records them from PID-3. One capability, `patient:national-identifier:record`.

## Batch 418: registry consent

`registryConsent/` (new): the patient's registry opt-outs. A screening opt-out excludes the cytology registry submission (audited, `EXCLUDED_BY_CONSENT` in the transmission audit, never retried); a cancer registry opt-out is overridden by statute unless the enterprise cancer registry settings honour it. One capability, `patient:registry-consent:record`.

## Batch 419: registry payload header

`registrySubmission/` (new): every registry payload carries a deterministic submission id, a version, a master transaction id linking every version of the result, `NEW` / `CORRECTION` / `AMENDMENT`, and `test` / `production`. A resend keeps the id and is marked a duplicate. Cytology corrections and addenda now reach the screening registry (they never did before).

## Batch 420: registry acknowledgements

`registrySubmission/` reads the registry's answer (HL7 ACK, FHIR OperationOutcome, status JSON; since Batch 425 only the interface engine's normalised JSON, the engine reading the other two), moves each submission through awaiting → accepted / accepted with warnings / rejected fixable / rejected outright, keeps the raw message, and escalates after 72 hours of silence or failed delivery. Cancer registry reports are now actually sent to the interface engine (before, they were queued and never dispatched). Endpoint contract: `docs/architecture/REGISTRY_ACKNOWLEDGEMENT_API.md`.

## Batch 421: Registry Exceptions

`registrySubmission/` drives a new worklist (Quality & Compliance → Registry Exceptions): every held, undelivered, rejected, unanswered or conflicting registry submission, latest version only, with the registry's findings and raw acknowledgement, and "Re-validate and resend" (`registry:submission:resend`): the same submission again when nothing changed, a new linked version when the data did, refused when the registry rejected exactly that. The screening and cancer registry submissions each split into prepare (validate and build) and commit, so a resend can re-validate without queuing.

## Batch 422: five more cancer registries

`cancerRegistry/` has thirteen registries as definitions (added: NCRI Ireland, Public Health Scotland, NICR Northern Ireland, NKR/IKNL Netherlands, Belgian Cancer Registry), each with its national identifier and wire format, carried on the payload. Its Configuration saves now need `config:cancer-registry:manage`. Step 6 of the Registry Engine SRS v2.1 order.

## Batch 423: registryGoLive/

`registryGoLive/` is the test-to-live gate for screening and cancer registries:
- versioned registry templates (`vYYYY.Q.X`);
- pre-checks and test evidence;
- an approval with re-entered credentials, under Template Review-style settings (one person by default);
- a permanent dual-role statement;
- live results held, not dropped to test, when the approval lapses.

`@/services` exports the service functions and `registryGoLiveDeps`. Also: Capture as CAPA on the Registry Exceptions worklist (`registrySubmission/captureRegistryExceptionAsCapa.ts`).

## Batch 424: deployment/ and registryGoLive/ (two instances)

- `deployment/` is new. `deploymentInstance.ts` holds the instance role from `VITE_APP_ENV`: production, or else validation (fails closed).
- `registryGoLive/` adds:
  - the send gate (every registry path asks it first);
  - the synthetic test suite;
  - the validation record carried from validation to production;
  - the local overlay, with template change lists, baseline stamps and review;
  - the catch-up resend on go-live.
- `interfaceDispatch/registryPayloadBoundary.ts` refuses a registry payload that crosses lanes: real data to a test system, or synthetic data to a live register.
- Corrected: the interface engine is ForMedrixAI's and ships with PathScribe. A site's own engine is used only when the site insists. Earlier notes said "the hospital's engine".

## Batch 425 — registry: JSON only, revisions, mandatory-data hold, patient details

- `registrySubmission/` reads only the interface engine's normalised JSON; the HL7 and FHIR readers moved to the engine. It also:
  - takes a registry's revision of accepted data, raising a CAPA deficiency;
  - builds the screening and cancer transmission audit;
  - scopes the worklist and its badge count to the user's organisation.
- `cancerRegistry/` holds a report missing its registry's mandatory data (`HOLD_MISSING_MANDATORY_DATA`), never the sign-out.
- `patients/patientRegistryDetails.ts` takes national identifiers and registry consent from the hospital's system (JSON, newest wins), and prefills accessioning.
- `patientIdentifiers/` sends an A08 for a change made after accessioning.
- `templates/` checks `config:template-governance:manage` on save.

See `i18n/README.md` → Batch 425.

## Batch 426 — synoptic results to the LIS (both modes), one PDF per workup, keep-or-update

- `reports/` builds the v1.0.0 structured synoptic result. An Assist case now sends its workups to the LIS on Finalize and on each correction and addendum, each with its own PDF; before, Finalize sent nothing. An Orchestration result carries the same block.
- `assistPolling/` asks "keep or update?" instead of dropping a new suggestion for a field the pathologist set, and no longer resets a confirmed field.
- `lisIngestion/` keeps the LIS's order numbers.

See `docs/architecture/SYNOPTIC_RESULT_API.md`.

## Batch 427 — combined PDF per testing facility; workups across parts

- `reports/` sends one combined case PDF when the performing lab's LIS takes one PDF per accession (a facility setting).
- A draft synoptic workup can cover several parts (`reports/workupParts.ts`). The AI respects that when proposing templates and is told the parts.
- `screens/`: the pages opened from Configuration (template editor and review, Part Builder, Template Assembly, Migration Jobs, Molecular Order Queue, mock interface engine) now need Configuration access; typing the address no longer gets round it. `screens/routeGating.guard.test.ts` fails the build on any new ungated route.

## Batch 428: Configuration permissions

Every Configuration section's service now checks its own capability (84 new ones, one per section, Pete's choice, Oct 1, 2026), plus `platform:signing-rules:manage`:
- `authorization/guardConfigWrites.ts` (new) wraps a service so each listed method is checked (audited) and refused changes do nothing; system paths that aren't a person's change use the `…Unchecked` object.
- New: `aiConfig/`, `interfacePreview/`, `reportAppearance/`, `retention/`, `systemConfig/systemConfigChangeChecks.ts`, `quality/standardQaTypeRules.ts`, `departments/auditRetentionOverride.ts`, `flags/resolveLisFlagDefinition.ts`.
- Synoptic protocols (`templates/`): draft, review, publish and retire are capabilities; an app-level "admin" no longer stands in for roles.
- Seeds: Admin all; Lab Director all but drafting synoptic protocols; Template Author and Template Approver only the protocol and template ones; a hospital's own roles none.
- Fixed with the scan: new billing rule versions always start as drafts; standard QA types can't be switched off; departments' below-floor audit entry and validation study approvals name the signed-in person.

## Batch 429: view-only sections, equipment log for the bench

- `screens/configSectionAccess.ts`: which capabilities make each Configuration section editable, for the view-only screens.
- `equipment:maintenance:record`: recording equipment maintenance is its own capability, for the bench roles too.
- `docs/architecture/AUTHORIZATION_API.md` lists every Configuration write and its capability for the API server (PS-345).

## Batch 430: personal settings per person; view-only fields

- `userSettings/personalSettings.ts` (new): the voice accent, dictation's learned corrections and the personal AI override are kept per person, not per browser.
- `voicemacro/`: owner and capability checks like report macros; the Voice settings screen adds the person's own macros.
- `retention/`: reads a policy saved before Batch 428.

## Batch 431

New: `browserCleanup/` (removes retired browser copies at start-up) and `labSettings/` (where lab-wide settings are kept). Also new: `access/closeGrantedAccessRequests.ts`, `reportAppearance/pageSetup.ts`, `systemConfig/systemConfigStore.ts`, `templates/templateReviewWork.ts` and `userSettings/personalLanguage.ts`.

## Batch 432

Actions nothing called are now wired (see `src/i18n/README.md` → Batch 432); three new capabilities.

## Batch 433

- `billing/`: one billing correction engine (`billingCorrection.ts`, `billingCorrectionCase.ts`) and charge approval (`chargeApproval.ts`). See `billing/README.md`.
- `biometric/`: the lab's biometric signing policy; enrolment is self-only. See `biometric/README.md`.
- `index.ts` exports the `BiometricCadence` and `BiometricPolicy` types, so screens don't import the mock file.

## Batch 434

- `digitalPathology/`: WSI scan batches have a workflow (`wsiScanQueue.ts`, `wsiScanBatchWorkflow.ts`), and the unload bug is fixed.
- `billing/`: charge approval finds the lab for legacy tenant ids; a correction updates the case's own coding.
- `facilities/resolveCasePerformingLab.ts`: new.
- `cytologyQc/`: the QC review buttons follow the permission.
- `equipment/`: slide scanners are seeded.
- `interfaceDispatch/`: `WSI_SCAN_MANIFEST`.

## Batch 435

- `liveUpdates/`: `WsiScanBatchChanged`.
- `interfaceDispatch/`: a guard keeps the transaction types, the engine's routing list and the development receiver in step.
- `mockInterfaceEngine/`: answers every interface message and can play the slide scanner (developer tool).
- `authorization/`: Admin opens Batch Management.

## Batch 436

- `caseSearch/`: search results show their flags (PS-101).
- `qualityAssurance/`: a QA scope limited to a client finds its cases (PS-356).
- `styleRules/`: a guard against identical duplicate rules in `pathscribe.css` (PS-294).
- `auth/`, `organisation/`, `session/`: citations of a backend document that was never written now point at the real ones (PS-40).
- `cases/`: demo data fixes (Manchester orders' facility; one invalid case status).

## Batch 437

- `configDirty/` (new): unsaved changes on the Configuration page (PS-128).
- `printing/`: one audit entry for every print, reprint, preview print and export; an export capability check (PS-282, PS-357).
- `templates/`: the AI badge counts Must Have fields only (PS-329); `isVisible` moved here.
- `authorization/`: 8 export capabilities; configuration saves are announced.
- `printSettings/`: an optional reason for report reprints.
- `caseSearch/`, `reportChangeLog/`: export check and the shared audit entry.

## Batch 438

The CAPA recommendation engine (`quality/`): PathScribe recommends, a QA lead confirms or dismisses. Revision reasons carry a "clinically significant" switch (`reasons/`). Billing audit times read as UTC (`billing/`). Configuration dialogs ask before closing from outside (`configDirty/`).

## Batch 439

Peer review before sign-out (`quality/peerReview*`), the clinical-pathologic mismatch check (`clinical/`), and assessing outside consult opinions (`consultAccess/`). Every CAPA they lead to is a recommendation.

## Batch 440

`cytology/cytologyQueues.ts` and `cytologyQueuesLive.ts`: the shared GYN QC rescreen queue, the Cytology Review tray for positive GYN cases, and taking a case for pathologist review. Exported from `@/services` (`loadQcRescreenQueue`, `loadCytologyReviewTray`, `takeCytologyReview`). New capability `cytology:pathologist-review:take`.

## Batch 441

- `participationTypes/cytotechParticipationRules.ts`: cytotechnologists never hold a pathologist slot (case team, delegation, pool claim, role catalog).
- `cases/saveCaseTeam.ts`: the Case Team save, with `case:team:manage`.
- `cytology/cytologyWorklist*.ts`: the Cytology Workspace worklist, moved out of its page.
- `quality/capaTriggerSummary.ts`.

## Batch 442

`quality/qaTrendRules.ts`, `qaTrendService.ts`, `qaTrendServiceLive.ts`, `mockQaTrendPolicyService.ts`: discordance patterns over time, set per site (PS-147). `demoReset`: four keys that survived Full Reset are now cleared.

## Batch 443

`users/mockUserService.ts`: the demo Lab Director, Dr. Rachel Okafor (`LD-001`); staff record only, no sign-in yet.

## Batch 444

- `security/` (new): the guard that keeps keys and passwords out of the browser bundle.
- `aiIntegration/aiProxyStatus.ts`: the AI status check asks the proxy.
- AI providers and `aiProviderService` lost their direct-to-vendor key paths.
- `auth`, `liveUpdates`, `deployment`, `reports`, `interfaceDispatch` and `research` read environment settings by name.
- `scanStations/scanStationList.ts`: the Scan Stations list decisions.

## Batch 445

`reportEditing/dirtySections.ts` (new): the report page's unsaved-change sections, as ids the dialog translates.

## Batch 446

- `caseAddresses/` (new): case pages are addressed by support reference, never accession number.
- `supportReferences`: `recordIdFor`.
- `registrySubmission`: `registryExceptionCaseView`.

## Batch 447

`feedback/` (new): the QA feedback button and recipients, set in Configuration → System → Feedback. `enhancementRequestService.loadEnhancementConfigForSubmit` sends with them. `deploymentInstance` is exported.

## Batch 448

`staffPasswords/` (new): sign-in passwords set from the Staff screen, checked first at sign-in.

## Batch 450 — test evidence for Priority 1 and 2 tickets

Test evidence for the Priority 1 and 2 tickets from the closed-ticket survey. New service modules: `tatConfig/tatEntryActions`, `worklist/worklistTileCounts`, `codes/codeManagerCoding`, `reportEditing/orchestratorSections`, `reports/fullPatientReportRows`, `molecular/plateWellScan`, `molecular/molecularDispatchPanel`, `flags/applyLisSyncFlags`, `abnormalDetection/abnormalTriggerRuleEditing`. Three bugs fixed: cytology sign-out steps erasing each other's results, the Code Manager erasing ICD-O codes, QA exports not recorded as exports. `enhancementRequestService.ts` gained the support-ticket replace step.

## Batch 451 — screen-level test evidence for Priority 2 tickets

New: `accessioning/resolveAccessionSpecimenCytologyScreening`, `aiIntegration/aiReportTools`, `authorization/capabilityToggle`, `billing/billingMaterialSync`, `molecular/plateBuilderWells`, `printSettings/printSettingsForm`, `printing/reportPrintAudit`, `reportChangeLog` `changeHistoryView`.

## Batch 452 — Closing the review gaps (PS-131, PS-105, PS-133/PS-323, PS-57), PS-156 correlation window, decant ↔ billing sync, Phase 1 fixes

New:
- `material/`: the case material store, events and atomic decant save;
- `clinical/negatedFindingCheck`, `clinical/findingHighlight`, `clinical/narrativePlainText`;
- `cytology/` correlation window settings, resolver and sweep;
- `flags/caseFlagView`.

`index.ts` exports `cytologyHistologyCorrelationSettingsService` and `facilityCytologyHistologyCorrelationOverrideService`.

## Batch 453 — The Batch 452 open items, and the native-speaker review register

- `cytology/`: backfill of correlation windows; Cytology Workspace decants through the atomic save.
- `quality/`: a configurable biopsy-to-resection window.
- `material/`: `decantOnlyUpdates` for the Microtomy workstation.
- `authorization/`: `config:biopsy-resection-correlation:manage`.
- `index.ts` exports `biopsyResectionCorrelationSettingsService` and `facilityBiopsyResectionCorrelationOverrideService`.

## Batch 454 — Follow-up not received: report, alerts and clinician email

- New `followUp/`: expected follow-ups (cytology → histology; biopsy → resection), their status, internal alerts, outcomes, the clinician email and the settings. Exported through `index.ts`.
- `worklist/` and `cytology/`: the Follow-up tiles.
- `quality/`: `resolveSiteMatchStatus` exported.
- `authorization/`: five capabilities.

## Batch 455 — Demo baseline: people, pools, cases and the reset

- `cases/demoBaselineCases.ts`: 19 seeded cases.
- `auth/demo`: seven sign-ins.
- `users/`: new staff.
- `subspecialties/`: pool members.
- `cytology/`, `delegations/`, `reports/`, `followUp/`: their seeds.
- `billing/` and `demoReset/`: the Full Reset restores the seeded approvals; the per-user reset is removed.

## Batch 456 — Sign-in lockout, password screening, demo seeds

- `auth/signInLockout.ts`: password sign-in locks for 15 minutes after 5 failures, audited.
- `staffPasswords/passwordScreening.ts`: common, patterned, service-named and breached passwords are refused.
- Demo seeds in `autopsy` (via cases), `molecular`, `material`, `cancerRegistry`, `clinical`, `supportAccess`, `consultAccess`; seeded names corrected in `cytology` and `quality`.

## Batch 457 — Metro General cancer registry, Molecular Order Queue seed

Metro General reports to the US cancer registry (`cancerRegistry`), two cases carry their ICD-O data (`cases`), and the Molecular Order Queue has seeded HPV orders (`molecularOrders`).

## Batch 458 — PS-71: every case save carries its version

PS-71 (Pete's optimistic-locking spec, Oct 4): a save made from an old copy of a case no longer overwrites someone else's newer save. See `services/cases/caseWrite.ts` and `docs/architecture/CASE_API.md`.

New `cases/caseWrite.ts` (versioned saves) and a guard that every case save carries its version; 39 files converted.

## Batch 459 — PS-152 discordance report, follow-up after sign-out

- Quality Assurance → Cytology has a "Primary vs Final Diagnosis" report: each case's primary screen compared with the review chosen as its Final Diagnosis (PS-152).
- A signed-out surgical case can be marked "follow-up expected" from the report page's action bar, not only in the sign-out modal.
- Stale README notes corrected (cytology correction and addendum, autopsy authorization form).

## Batch 460 — Billing review in the Workspace and at Microtomy, matrix blocks at Microtomy, slide levels, Label Designer resize

- **`billing/`:** `caseBillingCoding.ts`, `caseBillingCharges.ts` (moved from the report page and shared), `materialChargePreview.ts`, and the new permission `billing:applied-code:review`.
- **`material/`:** `slideLevels.ts` (a slide's level is the printed one) and `materialBillingWrites.ts`.
- **Slide lookups:** `hl7/`, `retentionPolicy/` and `batches/` now look slides up by printed level.
- **`cytology/`:** billing saves for the Workspace drawer.
- **`labelDesigner/`:** `labelFieldGeometry.ts` and the save's edge check.
- **`index.ts`:** exports for all of the above.

## Batch 461: organ mapping

New folder `organMapping/`: the anatomical maps beside the synoptic (prostate first). **The map's cancer data comes from the synoptic report**: a map is worked out from the synoptic answers every time it is drawn and stores nothing of its own. Also `templates/partGrid.ts` (the results grid question), `documentRendering/svgToPng.ts`, three capabilities (`report:organ-map:insert`, `config:organ-map-scheme:manage`, `config:organ-map-bindings:manage`), and the API contract `docs/architecture/ORGAN_MAPPING_API.md`.

## Batch 462: breast maps

`organMapping/` gains the breast map (clock face, quadrants, foci, six-face margins) and the per-site close-margin threshold; `templates/partGrid.ts` grids with the template's own rows. **The map's cancer data comes from the synoptic report**: the breast map is worked out from the synoptic answers every time it is drawn and stores nothing of its own.

## Batch 463

Mohs: `organMapping/` (Mohs stage maps, maps that are always in the report), `templates/mohsStages.ts` (the stage question), new `voice/` (screen voice commands), `reports/` (stage maps in the signed version; payload observations).

## Batch 463b

`templates/` (Mohs block rules, voice additions, template submit/publish refuse a broken default-histology source), `organMapping/organMapLive.ts` (`findMohsBlockGaps`).

## Batch 464

`organMapping/`: colorectal polyp and rectal resection maps; the malignant-polyp and rectal CRM involved-margin rules (site settings, distance and operator).

## Batch 465

`organMapping/`: oral cavity and neck dissection maps; the oral involved- and close-margin rules (site settings, validated with what a layer inherits). `templates/`: PathScribe's Oral Cavity Resection and Neck Dissection synoptics registered. `reportTemplates/`: both route to the gold-standard report template. `cases/`: composite demo case S26-4466.

## Batch 465b

`templates/`: grid count limits (`notMoreThan`), totals from a grid (`sumOf`), and `synopticEntryChecks.ts` (draft save and sign-out). `organMapping/`: oral rules strictly involved < close; conflicts left in lower layers are warned and audited; maps fall back to the default close rule; a two-layer outline halo.

## Batch 466

`organMapping/`: the renal resection map and the kidney margin rules. `templates/`: whole-number node counts. `cases/`: demo case S26-4467.

## Batch 466b

- `organMapping/`: partial nephrectomy margins, and generic margin questions derived from the map.
- `templates/`: OR / NOT visibility, question-level "can't exceed", and editor count settings.

## Batch 466c

- `templates/`: the editor's "unless" / "or also when" conditions (`conditionEdits.ts`), and the checked hand-entered total.
- `organMapping/`:
  - the partial nephrectomy drawing leaves out vein, vena cava and ureter unless reported;
  - adenoma at the polyp margin counts as involved. (Replaced in Batch 466d by margins per component.)

## Batch 466d

- `organMapping/`: margins per component (the invasive carcinoma apart from adenoma, DCIS or dysplasia); existing bindings brought up to date or held for review; a sign-out warning for invasive carcinoma with margins unreported.
- `cases/`: S26-4465 and MFT26-8803 seeds follow the rebuilt Colorectal Local Excision margins (`MOCK_VERSION` 58).

## Batch 466e

`organMapping/`: oral dysplasia margins count as involved only when the dysplasia is high-grade.

## Batch 467 — In-house molecular orders

New engine in `molecularOrders/` (in-house order queue, plate binding, results into the synoptic); `templates/molecularResultBinding.ts`; routing per test and lab in `stains/`; add-on orders feed the engine. The barrel exports `molecularOrderEngine`, `simulateMolecularRunResults`, `molecularRoutingChoices`, `MOLECULAR_ORDER_STATUS_HUE`, `activePerformingLabs`, `normalizeInHouseLabs`.

## Batch 467b — Molecular orders: send-out results, plate, sign-out, instrument

- `molecularOrders/`: send-out orders and results, choosing a lab, and the sign-out check.
- `mockInterfaceEngine/`: the simulated molecular instrument.

## Batch 468 — Autopsy: consent-scope enforcement, forensic chain-of-custody

`autopsy/`: `resolveAutopsyConsentScopeViolation.ts` (new — the first real reader of consent scope) and `recordAutopsyCustodyTransfer.ts` (new — the forensic chain-of-custody log). `authorization/`: new `autopsy:custody:transfer` capability. See `autopsy/README.md`.
- `referral/` and `batches/`: link referral batches and results to molecular orders.
- `stains/`: KRAS, NRAS and BRAF tests.

## Batch 469 — Autopsy: toxicology, organ-retention disposal, consent narrowing/revocation (PS-261 follow-up)

`autopsy/`: `orderAutopsyToxicology.ts` / `recordAutopsyToxicologyResult.ts` (new — ordering and result recording, sharing the case's single `ancillaryHold`), `recordAutopsyOrganRetentionDisposal.ts` (new — disposal recording, gated on `resolveHtaApplicability`), `applyAutopsyConsentStatusChange.ts` (new — the narrow/revoke write site this folder had been missing). `authorization/`: new `autopsy:toxicology:order`, `autopsy:toxicology:result`, `autopsy:retention-disposal:record`, `autopsy:consent:manage` capabilities. See `autopsy/README.md`.

## Batch 471 — Autopsy: toxicology cancellation, organ-retention detail, consent reinstatement (PS-261 follow-up)

`autopsy/`: `cancelAutopsyToxicologyOrder.ts` (new — cancels an open toxicology order, clearing the ancillary hold only if it's still the exact hold that order set), `recordAutopsyOrganRetentionDetail.ts` (new — recipient/location while retention is ongoing, a single overwritable record distinct from disposal), `applyAutopsyConsentReinstatement.ts` / `recordAutopsyConsentReinstatement.ts` (new — a deliberately separate pure-function/orchestration pair that's allowed to widen consent back, never sharing a file or capability with the narrow-only write site). `authorization/`: new `autopsy:toxicology:cancel`, `autopsy:retention-detail:record`, `autopsy:consent:reinstate` capabilities. See `autopsy/README.md`.

## Batch 472 — Autopsy: capability-greying, retention-tier reason, punctuation sweep (PS-261 follow-up)

No new service files. `authorization/`: no new capabilities — this batch wires the existing eight autopsy capabilities into `CapabilityButton` on the report page, it doesn't add new protected actions. `types/autopsy/AutopsyCaseDetails.ts`: new `organRetentionTierReason`, saved through the existing `organRetentionTier` write site in `SynopticReportPage.tsx` (disclosed: that write site itself still has no capability check and isn't in this folder — see `autopsy/README.md`'s Batch 472 entry).

## Batch 473 — Autopsy case-type key migration (PS-261 follow-up)

`autopsy/`'s forensic-path case-authority value renamed, `'medicolegal_forensic'` → `'statutory_judicial'`, across every gate/orchestration function that compares against it. Also touches `caseSearch/` (`CaseSearchAutopsyAuthority`), `cases/` (demo seed data), `demoReset/` (its assertion test), and `fieldRequirements/` (`reportPageChecks.ts`'s forensic-path check) — each has its own README note. No new capabilities, no behavior change. See `autopsy/README.md`.

## Batch 475 — Autopsy Module 3: toxicology specimen barcode & chain-of-custody link (PS-261 follow-up)

`autopsy/`'s `orderAutopsyToxicology.ts` gains a required specimen barcode; `recordAutopsyCustodyTransfer.ts` gains an optional `toxicologyOrderId` link field and a new pure selector, `custodyEventsForToxicologyOrder()`. No new capability — reuses `autopsy:toxicology:order` and the existing, deliberately forensic-only `autopsy:custody:transfer`. See `autopsy/README.md`.

## Batch 480 — Structured Inking, Module 1: Margin and Ink Application data model (PS-359 follow-up)

Two new folders: `siteSettings/` (new — the per-site analog of `labSettings/`, built ahead of the not-yet-existing Organisation/Site admin UI). `grossing/`: `recordMarginInkApplication.ts`, `resolveInkingValidationSeverity.ts`, `inkingSiteSettings.ts` (all new — margin/ink recording, the severity engine, and the site's `inking_validation_mode` setting). `authorization/`: two new capabilities, `grossing:margin-ink:record` and `config:inking-validation-mode:manage` (the latter granted to Admin/Lab Director by default via `CONFIG_SECTIONS`, same as its config*:manage siblings). Data model + severity engine + site setting only this batch — no grossing-screen UI, no ink-colour admin palette yet. See `grossing/README.md` and `siteSettings/README.md`.

## Batch 481 — Structured Inking, Module 2: grossing-screen UI (PS-359 follow-up)

No new service files — `grossing/recordMarginInkApplication.ts` (Batch 480) now has its first real caller. `pages/GrossingScreenPage/hooks/useGrossingScreen.ts` gains `handleRecordMarginInk`, which calls that service and, on success, re-reads the case (the service doesn't hand back the updated case itself). See `grossing/README.md` and `pages/GrossingScreenPage/README.md`.

## Batch 483 — Cytology gaps + signature viewer (PS-359 tracker follow-up)

Three fixes, one addition, all in `cytology/` and `cases/`: (1) a multi-specimen bug where a case's second cytology/FNA specimen could silently never surface its own QC/review requirement; (2) a data-loss bug where a cytology case's second specimen countersign release destroyed the first's still-pending record (`CountersignRecord` gains `specimenId`); (3) the CYT-QA-03 vs CYT-QA-04 report asymmetry, closed with a new `getFiveYearRetrospectiveLookbackReport`; and the signature-record viewer finally reading back what `signatures/` has recorded since Batch 345. See `cytology/README.md` and `cases/README.md`.

## Batch 484 — Inking sign-out/grossing gate engine + Organisation/Site admin UI (PS-519 follow-up)

New `grossing/evaluateInkingGate.ts` (the gate engine — Gate A/Gate B decision logic, fail-closed on an unavailable ink-colour palette, jurisdiction-specific blocking messages across 6 regulatory profiles mapped onto the existing `Jurisdiction` type) and `grossing/recordInkingGateOverride.ts` (the Administrative Override audit path; new capability `case:inking-gate:override`, seeded to Admin and Lab Director only). `grossing/inkingSiteSettings.ts` gains the audit logging its capability description already promised but never implemented. `authorization/capabilityCatalog.ts`/`capabilitySeeds.ts` gain the new capability (234 total now, 54 in the Case work group). Also closes the Organisation/Site admin UI gap down to its one real missing piece, a settings screen for `inking_validation_mode` — see `components/Config/System/README.md`. The genuinely backend-only half of Pete's fuller spec — real `/inking/validate`/`/inking/override` REST endpoints, server-side RBAC on them, and the real `dbo.InkOverrideAuditLog` SQL table — remains open pending the ASP.NET Core/SQL Server API server. See `grossing/README.md` and `authorization/README.md`.

## Batch 485 — completing a cytology specimen's own countersign (PS-359 tracker follow-up)

Closes the deeper gap Batch 483 disclosed but didn't build: `cases/ICountersignService.countersign()`/`.reject()` gain the same `specimenId` scoping `release()` got in Batch 483, plus a new `getForSpecimen()`; `cytology/signOutCytologyCase.ts` now actually calls `countersign()` to close a specimen's own pending record when its sign-out completes, and `Case.status` no longer stays stuck at `pending-countersign` once nothing on the case is genuinely still pending. Also re-verified (and confirmed already built, not missing) a detailed CT-trainee-vs-qualified-CT RBAC question — `resolveResidentCountersignRequired.ts` and `resolveCytologySignOutGate.ts` already handle this status-driven, not by role id. See `cases/README.md` and `cytology/README.md`.

## Batch 486 — My Contribution gap review (PS-359 tracker follow-up)

Investigated Pete's question "did we build a page for Cytotech/Cytotech trainees?" — confirmed no bench role (Accessioner, Histotechnologist, Cytotechnologist, Molecular Technologist) has ever had `my-contributions` screen access, and that 4 of its 5 tabs are built entirely around a signing pathologist's own diagnostic/RVU activity regardless. Fixed the one genuinely applicable piece: a Cytotech Competency Assessment supervisor's Mentor tab was always showing an empty case-mix breakdown for their CT trainee, because cytology sign-out creates a `CountersignRecord`, never the `QaActivityRecord` the breakdown read from. `index.ts` now also exports `CYTOTECH_COMPETENCY_ACTIVITY_TYPE_ID` (from `quality/mockQaSupervisionAssignmentService.ts`) so UI code can branch on it without a direct mock-service import. See `components/Contribution/README.md` for the fix and the bench-screen-access option that was built, then explicitly reverted by Pete in favor of a dedicated bench-contribution page (next batch).

Also re-verified a "we track all case events for regulatory audit, don't we?" pushback — correcting an earlier, too-narrow answer in this same conversation. Real, structured, per-item data does exist beyond what was first checked: `Case.accessionedAt`/`accessionedBy` (real accessioning-rate basis), `BatchItem.addedAt`/`addedByUserName` on every item of an Embedding/Microtomy/Staining/Molecular batch (real per-item, per-user throughput and stage-to-stage TAT, not just whole-batch `Batch.createdAt`/`completedAt`), `AuditLog` (`auditlog/`, every batch item add/remove/move/complete event, with real timestamp/user/caseId), and `MolecularBatch.cloneAndSupersede()` (a real, user-triggered rerun record with its own reason). The one genuine remaining gap: `StainOrderStatus` already declares `'Recut Requested'`/`'QC Failed'`, and `facilityOpsDashboard/computeStainingIhcSummary.ts` already counts them — but no real action anywhere in the app ever sets a stain to either state, so that particular rework signal is a real, unbuilt workflow gap, not a missing field.

## Batch 488 — screens/authorization wiring for the new Bench Contributions page (PS-359 follow-up)

`screens/screenAccess.ts`: new `ScreenId`/`HomeTileId` `benchContributions`, its own `screen:bench-contributions:open` capability (never reusing `myContributions`'s own — the two screens show genuinely different, role-appropriate metrics), and its own `checks` entry. `authorization/capabilityCatalog.ts`: the matching catalog entry, standard risk, `screens` group. `authorization/capabilitySeeds.ts`: seeded to all four bench roles (Accessioner, Histotechnologist, Cytotechnologist, Molecular Technologist) alongside each role's existing screens — the real next step from Batch 486's reverted `myContributions` grant. `docs/architecture/AUTHORIZATION_API.md` and `supportReferences/supportTicketRules.ts`'s route-pattern list both updated to match (two of this app's own consistency guards — `capabilityDocs.guard.test.ts` and `supportTicketRules.test.ts` — caught both before delivery). The real calculation/page work lives in `pages/` — see `pages/README.md`.

## Batch 489 — Tumor Board / MDT Workspace Module 1 (PS-359 follow-up)

New `tumorBoard/`: `ITumorBoardService`/`mockTumorBoardService` — the real board-nomination record (board, meeting date, status, presenter, full audit fields) Pete's spec asks for, built new rather than forced onto the existing generic Flag system or `IDelegationService` (see `tumorBoard/README.md` for the full reasoning). `create()` enforces a new protected action, `case:tumor-board:flag`, seeded only to the grossing roles (Pathologist, Fellow, Resident, PA) — see `authorization/README.md`. `screens/screenAccess.ts` gains the matching `tumorBoard` screen/tile (see `screens/README.md`). `demoReset/demoReset.ts`'s `CASE_KEYS` gains `tumor_board_listings` (caught by its own coverage guard, `DemoResetTab.coverage.test.ts`). The workspace page and "Flag for MDT" modal live in `pages/` and `components/TumorBoard/` — see their own READMEs.

## Batch 490 — margin-distance extraction layer + all ~20 generic templates' clinical content (PS-359 follow-up)

New `marginExtraction/`: `extractMarginDistanceMm` — a pure regex/token parser that reads a free-text margin-distance answer and either confidently normalizes it to millimetres or flags it — plus `IMarginExtractionService`/`mockMarginExtractionService`, which persists a confident parse as a hidden `MarginShadowAttribute` or an unconfident one as a `MarginExtractionException` on a review queue (`resolveException`/`dismissException`). Applies to any `type: 'text'` template field whose id ends in `_mm`/`_cm`; a structured `type: 'numeric'` field with a declared `unit` never needs it. See `marginExtraction/README.md` for the full confidence rules and what's deliberately deferred (no call site wired in yet; that's Batch 491's rule-evaluator work). *(Since closed: Batch 491 — `tumorBoardRules/runMarginRuleEvaluation.ts` calls `extractAndStore()` from sign-out — checked in the Batch 496 README audit.)*

New protected action `case:margin-exception:resolve`, seeded the same way as `case:tumor-board:flag` — see `authorization/README.md`. `demoReset/demoReset.ts`'s `CASE_KEYS` gains `margin_shadow_attributes`/`margin_extraction_exceptions`.

Also this batch: every generic synoptic template (`data/templates/generic/`) had its placeholder dropdown options replaced with real clinical content and `reportingRole` tagging completed — see `data/templates/generic/README.md`'s own Batch 490 entry for the full breakdown; no change to any file in `services/` for that part.

## Batch 491 — Tumor Board Hybrid Inheritance Model; rule evaluator wired at sign-out; margin-exception review queue; three disclosed gaps closed (PS-359 follow-up)

New `tumorBoardRules/`: the two-tier (enterprise/facility) auto-flagging rule config for Tumor Board (`ITumorBoardRuleService`/`mockTumorBoardRuleService`), a pure evaluator (`tumorBoardRuleEvaluation.ts`), and the impure orchestrator wired at sign-out (`runMarginRuleEvaluation.ts`) that finally calls `marginExtraction`'s `extractAndStore()` and, on a rule match, creates a Tumor Board listing with `source: 'Rule'`. See `tumorBoardRules/README.md` for the full design and its deliberate scope narrowing (margin-distance only).

`tumorBoard/`: the Coordinator/Clinical capability split — `case:tumor-board:manage` (broad queue management, `CASE_ACCESS_ROLES`) vs. the new, narrower `case:tumor-board:dismiss` (clinical override with a mandatory reason, GROSSERS only); `update()` refuses a `Dismissed` status transition at the type level and at runtime. Also a real shape-vs-comment correction: `TumorBoardListing`'s `source`/`triggerReason`/dismiss fields, previously only described in a Batch 489 comment as "already there," are now real fields. See `tumorBoard/README.md`.

New protected action `config:tumor-board-rules:manage`, new screen capability `screen:margin-exception-review:open` — see `authorization/README.md`.

**The deferred Batch 490 review-queue UI is built:** `MarginExceptionReviewPage.tsx` (`/margin-exception-review`), in the Pathology Workspace hub. See `marginExtraction/README.md`'s own Batch 491 entry.

**Three disclosed, pre-existing gaps closed, all found while auditing this batch's own additions against established patterns:**
- `services/index.ts` never exported `mockMarginExtractionService` since Batch 490 — no UI code could reach it without violating CLAUDE.md rule 4. Fixed now that it has real callers.
- `api/caseFlagsApi.ts`'s hardcoded `appliedBy`/`deletedBy: 'current-user'` (since Batch 452) — now the real signed-in user's name, with the same fallback for callers with no session. See `api/README.md`.
- `demoReset/demoReset.ts`'s `SETTINGS_KEYS` never had `cytologyHistologyCorrelationSettings`/`facilityCytologyHistologyCorrelationOverrides`/`biopsyResectionCorrelationSettings`/`facilityBiopsyResectionCorrelationOverrides` (since Batch 452/453) — this admin config silently survived every Full Reset. Fixed, alongside the two new real keys this batch adds (`tumor_board_auto_flag_rules`, `facility_tumor_board_rule_overrides`). See `demoReset/README.md`.

Also: `delegationTypes/mockDelegationTypeService.ts`'s `'TUMOR_BOARD'` seed deactivated (`active: false`, not deleted) — the real path is `tumorBoard/` now, not `DelegateModal.tsx`'s generic flow. See `delegationTypes/README.md`.

## Batch 495

- **`printing/`:** `reportPrintGate.ts` (`beginReportPrint`, checks `report:case-report:print`) and `buildReportDocumentReference.ts` (footer Code 128 of the accession + record version). Barrel exports `beginReportPrint`.
- **`reports/`:** `resolveReportRevisionStatus.ts` — revision status for printed reports (original sign-out vs latest revision).
- **`authorization/`:** new capability `report:case-report:print`, seeded to case-access roles; `AUTHORIZATION_API.md` totals corrected.
- **Index:** also exports `migrationJobService` / `migrationRecordResultService` (MigrationJobsPage leaves the deployment baseline; so does ReportPreviewPage). `screens/routeGating.guard.test.ts` and `supportReferences/supportTicketRules.ts` know the new `/report-preview/:caseId` route.
- **`autopsy/`:** body-release gate reasons are reason codes (translated); `releaseAutopsyBody` returns a `reasonCode`. The folder's "not yet built" list was rewritten — four of its six items had already been built.

## Batch 498

- **`reports/`:** new `buildReportRenderRevision.ts` — the `revision` object sent to the report renderer (type, count, original and latest dates formatted in the report's locale). `surgicalReportLabels.ts` sends seven more `surgicalReportPdf.*` labels (revision banner and footer document reference).
- **`printing/`, `billing/`, `documentRendering/`, `reportRelease/`:** comments and READMEs corrected — the renderer (`functions/main.py`) now draws the revision banner, the pending-release watermark, the pre-analytic disclaimer and the footer barcode.

## Batch 499

- **`autopsy/`:** new `recordAutopsyOrganRetentionTier.ts` — the tier and its reason, behind new capability `autopsy:retention-tier:record` (the report page used to write it with no check).
- **`authorization/`:** the new capability, its seeds and `AUTHORIZATION_API.md` row; catalog total 245.
- **`auditlog/`:** new `auditLogLinks.ts` (the QA page's Failed Dispatches link, and reading `view=` on the Financial tab).
- **`research/`:** the PubMed feed no longer reads or sends an NCBI key (PS-476).
- **`security/`:** `envExposure.guard.test.ts` allows no secret-looking `VITE_` name at all, and fails on an NCBI key or an `api_key` parameter in browser code.
- **`ai/providers/`:** the dead `ClaudeProvider.ts` is removed (listed in `DELETED_FILES.txt`).

## Batch 500

- **`security/`:** new `sanitizeHtml.ts` (DOMPurify): `sanitizeRichHtml`, `sanitizeSvgMarkup`, `escapeHtml`, `cssString`; new `htmlSanitising.guard.test.ts`; XSS payload tests under jsdom (PS-473).

## Batch 501

- **`cytologyQc/`:** the QC Rules engine runs at sign-out; ROSE and rules create or upgrade one open assignment per specimen (`resolveQcAssignmentUpsert.ts`), with selection reasons, history and reviewer pool; `resolveCaseInFormalConsultation.ts`; sampling counters (`mockCytologyQcSamplingStateService.ts`); queue labels (`qcSelectionReasonLabels.ts`). Corrects the Batch 496 finding that the engine was never called.
- **`cytology/`:** `signOutCytologyCase.ts` wires it in (peer review, then ROSE, then rules).
- **Index:** exports `cytologyQcRuleService`.

## Batch 502

- **New `errorReporting/`** (PS-472): crash reports scrubbed of patient data, sent to the console and the in-app Error Log, with flood control; global `error` / `unhandledrejection` handlers; QA crash tests. See [errorReporting/README.md](./errorReporting/README.md).

## Batch 503

- **`security/`:** `securityHeaders.guard.test.ts` — the browser security headers (policy in `deploy/security-headers/`).

## Batch 504

- **`quality/`:** `facilityMonthlyTrend.ts` — QA trend charts by facility month (six copies bucketed by the device's time zone).
- **New `typeSafety/`:** no new explicit `any` (ratchet guard, baseline of 1,710).
- **`cytology/`, `retentionPolicy/`:** age and date windows corrected (see their READMEs).
- **`research/`, `batches/`, `molecular/`, `molecularOrders/`, `consultAccess/`:** the date rule's remaining exceptions are explained at the line (bench-printed identifiers, "today" checks).

## Batch 508

`demoReset/`: Full Reset clears every `ps_ui_` display preference. The reset-key check is now an automated guard test.

## Batch 509

`demoReset/`: a test pins which workstation settings Full Reset clears and which it keeps (guide-window positions only).

## Batch 511 (PS-478): full strict type-checking

Services pass full strict type-checking; see the folder notes below and `typeSafety/README.md`.

## Batch 512

New `specimens/` (specimen LIS sync state). `cytology/describeQcOverrideRates.ts` (QC override display).

## Batch 513 (PS-269)

`roles/builtInRoleText.ts`: built-in role descriptions are shown translated until a lab edits them.

## Batch 514 (PS-269)

`validationStudies/`: the printed validation report is built in `buildValidationReportHtml.ts` and printed in the reader's language.

## Batch 515

- **FPPE moved onto the QA supervision service** (PS-124). The legacy `fppeAssignmentService` is deleted, and the supervision service now checks the right permission for each activity.
- **New permission checks:** Print Queue actions (PS-283) and consult links (PS-290).
- `qaTrendService.pendingCount()` (PS-147).

## Batch 516

- **Reports:** PRELIMINARY watermark (`reports/resolveReportWatermark.ts`).
- **Printing:** restricted-case print check (`printing/reportPrintGate.ts`, `flags/`).
- **QA:** field-schema rules (`quality/qaFieldSchemaRules.ts`).
- **PHI:** attribute checks (`phi/`).
- **Demo data:** Tumor Board / MDT (`tumorBoard/tumorBoardDemoSeed.ts`).

## Batch 517

- **New `secureMessaging/`:** each lab's secure messaging gateways and agreements, and the send rules (PS-143).
- **printing:** `facilityReportPrinting.ts` (PS-337).
- **facilities:** `setPrintSettings` (PS-337).
- **messages:** `sendSecureEmail` checks the gateway (PS-143).
- **clinical:** `criticalFindingEmail.ts` (PS-143).
- **organisation:** the unused `secureEmailGateway` field is removed.
- **fieldRequirements:** read-back no longer applies to email.
- **authorization:** new capability `config:secure-messaging:manage`.
- **demoReset:** clears `pathscribe_secure_messaging`.
- **styleRules:** notes on the PS-294 CSS cleanup.

## Batch 518

- **interfaceDispatch:** all seven outbound queues can be sent and resent, with `interface:outbound:resend` checked (PS-122).
- **New `labels/`:** batch label reprint (PS-123).
- **quality:** `qaActivityBoard.ts`, the generic QA activity board (PS-120).
- **authorization:** two new capabilities.
- **demoReset:** clears the label reprint run log.
- **supportReferences:** knows the new label reprint route.

## Batch 519

- **templates:** several answers and "unless" in visibility conditions (PS-493); free-text node counts with "cannot be determined" / "at least N" and Breast's sum check (PS-494); `normalizeSynopticTemplate.ts` and `narrativeAuthoring.ts` (PS-273).
- **cytology:** the synoptic templates come from the Synoptic Library; sign-out reads the review's template before its translation check (PS-273).

## Batch 520

- **delivery:** delivery rules set channels by role (primary, secondary, fallback) over electronic, print, e-fax and file drop; e-fax and file drop are sent through the interface server, which delivers them (PS-280).
- **interfaceDispatch:** `REPORT_DELIVERY`; the Outbound view's eighth queue.
- **reports:** the release event runs the channel plan, including fallback.
- **demoReset:** clears the report delivery queue.

## Batch 521

- **delivery:** automatic retries (default 1, 5, 15 minutes), dead-letter to a delivery exception queue with Admin and Lab Director told, fallback after the retries, fax transmission confirmations (PS-281).
- **liveUpdates:** the `ReportDeliveryStatus` event.
- **printing:** automatic print retries.

## Batch 522

- **consultAccess:** cryptographic tokens stored as fingerprints, a consult view limited to the link's scope, opinions bound to the token, expiry recorded, and the cross-case list (PS-290).
- **authorization:** `audit:consult-links:view`.
- **screens, supportReferences:** the `/consult` route.

## Batch 523

- **clinical:** the mismatch check by discipline (surgical, cytology, autopsy), with a new kind, `cause-of-death` (PS-145).
- **cytology:** `cytologyClinicalMismatch.ts`.

## Batch 524 (PS-491): accessibility

New folder `accessibility/` (the app-wide accessibility guard). `clinical/clinicalMismatchInputs.test.ts` type fix (see there).

## Batch 526

Test files here no longer set their own time limit below the suite's 60 s (`vitest.config.ts`); on a busy Windows machine those shorter limits caused false timeouts.

## Batch 527 (PS-486): a lean first load

New `signIn.ts`: what the sign-in path needs (`authSession`, `authConfig`, the staff password service and rules, the lockout notice), without the barrel. The barrel re-exports the staff password service from it, so the choice of implementation stays in one place. `IS_MOCK_BACKEND` is now `__DEMO_TOOLS__`: true in the demo build, false in a server build.

## Batch 528 (PS-359): Staff, Facility editor and Clinical history requirements

Three more Field Requirements pages (`fieldRequirements/`), with their checks in `staff/staffFormChecks.ts`, `facilities/facilityFormChecks.ts` and `clinicalHistory/clinicalHistoryRequirementChecks.ts`, all exported from the barrel.

## Batch 529 (PS-554): the mismatch risk rules

`clinical/clinicalMismatchRules.ts` and `clinical/clinicalMismatchRuleService.ts` (exported from the barrel as `clinicalMismatchRuleService`). Two new capabilities: `config:clinical-mismatch-rules:manage` (no built-in role; kept out of the Configuration sweep by `CONFIG_NO_DEFAULT_GRANT`) and `…:view` (Pathologist, QA Reviewer, Lab Director).

## Batch 530 (PS-554): the mismatch gates

`clinical/clinicalMismatchService.ts` (`assess`, `atSignOut`, `secondaryReviewQueue`) and the resolution statuses in `clinical/clinicalMismatchDecision.ts`. See `clinical/README.md`.

Batch 530 also: `clinicalHistory/recordClinicalHistoryAfterAccession.ts` (new capability `case:clinical-history:record`), and `clinical/clinicalMismatchInputs.mismatchCheckDeferred` (no clinical information → the check is deferred and audited at sign-out).

## Batch 531

The mismatch check re-runs when the compared text changes (`clinical/`); cytology re-send fix (`cytology/dispatchCytologyCaseInstances.ts`).

## Batch 532

Cytology publishes once per accession, when the case closes: one consolidated case report PDF, one ORU message, registry per sample together (`cytology/`, Batch 532). Print/fax/file-drop delivery (`delivery/reportDeliveryDeps.ts`) and the outbound-queue retry (`interfaceDispatch/outboundQueueAdapters.ts`) use the case report. `documentRendering/registerEmbeddedPrintFont.toWinAnsiText`: dashes and curly quotes print in the embedded font.

## Batch 533

Urgent cytology preliminary per specimen (`cytology/releaseCytologyPreliminary.ts`, `dispatchCytologyPreliminary.ts`; capability `cytology:preliminary:release`, no default role; signature configurable). New signing action `cytology-preliminary` (`auth/signerConfirmation.ts`, `signatures/ISignatureRecordService.ts`). `reports/publishReportReleasedEvent.ts` routes a cytology PRELIMINARY; `interfaceDispatch/outboundQueueAdapters.ts` retries it.

## Batch 534

Every report output follows the laboratory's release delay. The exceptions are a resend after a failure, and STAT cases when the STAT bypass is on (Pete, Oct 12). The person who released a report can recall it, which reopens what was released (`reportRelease/`). The cytology releases, surgical preliminaries, corrections and addenda, and autopsy PAD/FAD go through `releaseReport`. A background sweep sends what is due from any open screen, including surgical sign-outs whose page nobody has open.

## Batch 535

Recall reopens surgical corrections and addenda (`reports/IAmendmentService.reopen`) and autopsy PAD/FAD (`reportRelease/heldReleaseActions.ts`). Recalling a sign-out takes back the corrections still held on it. Fix: a correction released at an Orchestration re-sign-out is now sent (`reports/publishReleasedRevision.ts`).

## Batch 536 — governed AI instructions and separation of duties (PS-554); AI vendor policy (PS-558)

- `clinical/aiInstructions.ts`, `aiInstructionService.ts`: the mismatch check's AI instructions as approved versions (`config:ai-prompt:view|edit|approve`).
- `authorization/`: `SEPARATION_OF_DUTIES`; Superadmin doesn't hold `config:ai-prompt:approve`; role and staff saves refuse both duties together.
- `aiIntegration/aiVendorPolicy.ts`, `aiVendorPolicyService.ts`, `aiCallPolicy.ts`: allowed AI services and regions per jurisdiction, checked before every `callAi()` and streaming generation, recorded with every call (`config:ai-vendor-policy:manage`).

## Batch 537 — deployment readiness review (PS-539)

`deploymentReadiness/deploymentReadinessReview.guard.test.ts`: every file cited by `docs/architecture/DEPLOYMENT_READINESS_REVIEW.md` must exist.

## Batch 538 — one stored document per release (PS-539 D2)

`reportDocuments/` (new): each released report is stored once with its SHA-256, and every channel and retry sends those bytes. Wired through `reports/`, `cytology/`, `delivery/`, `printing/`, `reportRelease/` and `interfaceDispatch/`.

## Batch 539 — cytology PDFs from the report renderer (PS-539 D2)

`cytology/`: the browser composes a cytology report's lines (`cytologyRenderPayload.ts`) and the report renderer draws them (`functions/cytology_report.py`); preview and release use the same builder. The jsPDF renderer and most of `documentRendering/` are removed. `reports/reportRenderer.ts` shares the renderer's address.

## Batch 540 — no correction or addendum during the release delay

`reportRelease/revisionDuringDelay.ts` (new), enforced by `reports/mockAmendmentService.startDraft` and the cytology correction and addendum services. A released PDF never carries the release-buffer watermark (`reports/resolveReportWatermark.ts`).

## Batch 542 — phase 2c contracts (PS-539)

`exports/` (new): `asyncExportContract.ts`, the wire contract for asynchronous exports (`docs/architecture/ASYNC_EXPORT_API.md`). `deploymentReadiness/phase2cContracts.guard.test.ts` keeps it and `MESSAGE_BUS_API.md` true to the code.

## Batch 543 — CSV formula injection (F8), disposal export audit (F9), file storage contract

`retentionPolicy/exportDisposalReport.ts` now audits the export; `actionRegistry/parseActionRegistryImportCsv.ts` parses lines as CSV. `utils/csv.ts` (outside services) neutralizes formula cells in every CSV the app writes. Contract `docs/architecture/BLOB_STORAGE_API.md`.

## Batch 544 — Images and attachments are links only; single-facility QA exports

`qualityAssurance/qaScopeRows.ts` (new) scopes six more QA reports to one facility; `staff/staffFormChecks.ts` checks the signature link; `quality/resolveQaEvidenceBinder.ts` names the scope in its file; `exports/asyncExportContract.ts` comment; `deploymentReadiness/phase2cContracts.guard.test.ts` guards links only.

## Batch 545 — Interface engine edge contract (D6)

`interfaceEngine/engineEdgeContract.ts` (new): the engine ↔ API contract (`docs/architecture/INTERFACE_ENGINE_EDGE.md`). `deploymentReadiness/` guards it. Outside services, `api/webhooks/engine/` fixes finding F10.

## Batch 546 — Site agent contract (D3); F3 and F4 fixed

`siteAgent/siteAgentContract.ts` (new) is the site agent ↔ API contract (`docs/architecture/SITE_AGENT_API.md`).
- `printing/`: a network print from the browser fails cleanly, and goes straight to the fallback (F3).
- `delivery/` and `reports/` pass the "not retriable" flag.
- `security/` guards the workstation print bridges in the CSP (F4).
- `deploymentReadiness/` guards the contract.

## Batch 547 — Runtime configuration (phase 2d)

- `runtimeConfig/` (new): a deployment's settings come from its `config.json` at start-up, through `appEnv()`. Every `import.meta.env.VITE_*` read in `services/` now goes through it.
- `auth/authSessionInstance.ts` and `staffPasswords/mockStaffPasswordService.ts` load the demo accounts only in the demo build (`__DEMO_TOOLS__`), so a server build has none.
- `loadSize/`: the first-screen check starts from `main.tsx` and `startApp.tsx`.

## Batch 548 — Waiting states and the connection banner (phase 2d)

`connectivity/latencyStates.ts` (new): the rules for loading phases and the connection banner (readiness review §8, §9 item 2).

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- `links/` (new): the shared https link check (`externalLink.ts`).
- `reportDocuments/`: one storage entry per document. `reports/`: Assist results carry the sign-out time. `printing/`: translated site-agent failure reason. `liveUpdates/`: `retryNow`.
- `engravers/fetchNewEngineNotifications.ts` removed (F1).

## Batch 550 (PS-539 phase 2d: exports through the server)

- `exports/`: the browser's export service (`exportService` in the barrel), its HTTP client and `runExport`. `liveUpdates/`: `ExportStatus`. `auth/sessionEndHooks.ts`. `qualityAssurance/runQaExport.ts`.

## Batch 551 (PS-539 phase 2d: the Server jobs view)

- `serverJobs/` (new): the Server jobs view's contract and service (`serverJobsService` in the barrel). `apiServer/apiServerUrl.ts` (new): the API server's address, checked as sign-in checks it, shared by exports and server jobs.
- `registrySubmission/`: with exports through the server, the registry audit no longer reads its queues in the browser (carried over from Batch 550).

## Batch 552 (PS-539 phase 2d: site agent screens)

- `siteAgent/`: the Site agents administration (`siteAgentAdminService` in the barrel). `printing/printJobFailureReason.ts`: `printJobStatusKey` ("Sent to printer").

## Batch 553 (PS-539 phase 2d: site agent printers in routing)

- Batch 553: `printRouting/printDestinationRules.ts` (site agent printers in routing rules, the facility default and Redirect); `siteAgent` `reportPrinters`, coded revoke reasons, update window.

## Batch 554 (PS-539 phase 2d: interface monitoring)

- Batch 554: `interfaceMonitoring/` (new): the interface engines' listeners and queues (`interfaceMonitoringService` in the barrel); `interface:engine-status:view` in `authorization/` (Admin).

## Batch 555 (PS-539 phase 2d: browser stand-ins for server jobs)

- Batch 555: `serverJobs/browserStandIns.ts`; each stand-in for a server job stops once the deployment lists it in `VITE_SERVER_JOBS`.

## Batch 556 (PS-539 phase 2d: report documents through the API)

- Batch 556: `reportDocuments/`: with the API server, released documents are read through it (`reportDocumentService` in the barrel; `sentDocumentProblem`). `types.ts`: `ServiceResultMeta.partial`.

## Batch 557 (PS-539 phase 2d: /api/config and hosting regions)

- Batch 557: `runtimeConfig/` reads the API server's `/api/config` (a few settings, and the hosting regions).

## Batch 558 (PS-539 phase 2d: report versions through the API)

- Batch 558: `reports/`: with the API server, report versions are listed through it and their PDFs read through it, checked (`reportVersionService`, `reportVersionPdfReader`, `versionHasPdf`, `versionPdfProblem` in the barrel).

## Batch 559 (PS-539 phase 2d: data topics; Batch 558's open items)

- Batch 559: `liveUpdates/` (data topics for push instead of polling, contract and client); `reports/` (a result held when its workup version isn't known; the PDF hash on the queue entry and in the message); `interfaceDispatch/`.

## Batch 560 (PS-539 phase 2d: push instead of polling)

- Batch 560: `liveUpdates/` (whether a topic was taken; read pacing); `engravers/engraverStatusCounts.ts`.

## Batch 561 (PS-539 phase 2d)

- Batch 561: tests for `reports/` and `interfaceDispatch/` (Batch 559's changes).

## Batch 562 (PS-539 phase 2d)

- Batch 562: `liveUpdates/` (`molecularQueue`), `molecularOrders/molecularQueueSelection.ts`, `siteAgent/siteAgentAdmin.ts` (`agentSiteIds`).

## Batch 563 (PS-622)

- Batch 563: `connectivity/pageWaitClock.ts`.

## Batch 566 (PS-539 phase 2d)

- Batch 566: `accessibility/a11yAudit.ts` (`container-without-button`: a `clickableContainer` row must hold a real button).

## Batch 567 (PS-539 phase 2d)

- Batch 567: `accessibility/a11yAudit.ts` (`nestedInteractive`: no control inside another).

## Batch 568 (PS-539 phase 2d)

- Batch 568: `accessibility/a11y.guard.test.ts`: no control inside another, app-wide.

## Batch 569 (PS-539 phase 2d)

- Batch 569: `accessibility/a11yAudit.ts`: comments set aside by the TypeScript parser; "no control inside another" also covers `<button>` and hand-made control roles.

## Batch 571 (PS-539)

- Batch 571: `liveUpdates/dataTopics.ts` header: the live-update decision.

## Batch 572 (PS-539)

- Batch 572: `liveUpdates/` topic `caseReport`; `cases/caseUpdateNotice.ts` and `subscribeCasesChangedElsewhere`; `cytology/` screening hours sign-off, the report's hours columns and the 8-hour cap correction; `authorization/` `cytology:screening-hours:sign-off`.

## Batch 573 (PS-539)

- Batch 573: `liveUpdates/casePresence.ts` and `joinCasePresence` on both transports; `supportReferences/caseSupportReference.ts` (the reference from the API server); `cases/caseEditingSignal.ts`.

## Batch 574

- Batch 574: `cytology/` workload counter figures, the start of the screening day (history, audited save), yesterday's sign-off, correction reasons on the report, edits counted once.

## Batch 575

- Batch 575: `cases/caseWrite.ts` `takeUpNewerCase`: the case report takes another user's save up in place.

## Batch 576

- Batch 576: `cytology/` cap checks and a test clock; `cases/caseEditingSignal.ts` the person's own edits.

## Batch 577

- Batch 577: `cases/caseWrite.ts` `takeTheirVersion`, `selectionAfterTakeUp`.

## Batch 578

- Batch 578: `cytology/cytologyWorkloadCapRules.ts` `cytologyWorkloadCapError`, `withoutCapOverride`; `createMockCytologyWorkloadCapSettingsService(clock)`.

## Batch 579

- Batch 579: `templates/templateReviewWork.ts` `addTemplateQuestionComment`, `toggleTemplateQuestionComment`; `reportEditing/reportSequence.ts` (new) `sequenceCaseReports`.
