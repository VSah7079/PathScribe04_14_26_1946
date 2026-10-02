# PathScribe

PathScribe (`pathscribe-ai`, v0.9.0) is ForMedrixAI LLC's AI-assisted clinical pathology reporting and laboratory information platform. It covers surgical pathology, cytology and cervical screening, and autopsy, and it is built for multi-region enterprises: the US, UK (England & Wales, Scotland, Northern Ireland), Ireland, the EU (Belgium, Netherlands, Germany, France), Canada, Australia, New Zealand, and South Korea.

The stack is React 18 + TypeScript on Vite, with vitest and Testing Library for tests, i18next for the UI in five languages. Most services are localStorage-backed mocks today, behind `I<Domain>Service` interfaces.

**Production database: Microsoft SQL Server** (decided Sep 2026). The browser can't reach SQL Server directly, so production needs a PathScribe API server between the app and the database. The existing Firebase/Firestore code (Firestore service stubs, `firestore.rules`, the emulator tests, and the Engine webhook's Firebase Admin backend) predates that decision and will be replaced. **The API server is ASP.NET Core, and live updates use SignalR** (decided Sep 26, 2026; see [docs/architecture/LIVE_UPDATES_SIGNALR.md](docs/architecture/LIVE_UPDATES_SIGNALR.md)). Still open: its data-access library and how database migrations run. See [src/services/README.md](src/services/README.md#the-core-pattern-interface--mock--firestore).

---

## Getting started

Requires **Node.js 24 (LTS)** and npm 11, which ships with Node 24. `package.json` pins `engines.node` to `24.x`, and `.nvmrc` says `24` for nvm/fnm users (Batch 341, PS-344). Why 24:
- it is what the development machine runs;
- the spell checker's Hunspell package (`@farscrl/hunspell-wasm`) declares Node 24;
- Vercel supports it for builds and functions;
- React Router 7 (≥ 20) and firebase-admin 14 (≥ 22) are both satisfied.

```bash
npm install
npm run dev          # Vite dev server
npm run build        # production build → dist/
npm run preview      # serve the production build locally
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` / `preview` | Production build, then serve it |
| `npm run type-check` | `tsc --noEmit` across the project |
| `npm run lint` | ESLint, zero warnings allowed. **Currently non-functional:** the repo has no ESLint config file, so the script errors out. Needs a decision on which rules to adopt |
| `npm test` | Full vitest suite (excludes the Firestore rules suite) |
| `npm run test:watch` | vitest in watch mode |
| `npm run test:rules` | `firestore.rules` tests (`firestore.rules.test.ts`) |
| `npm run test:integration` | Engine webhook integration tests against the Firestore emulator (`firebase emulators:exec`) |
| `npm run seed:engravers` | Seed engraver devices (`scripts/seedEngraverDevices.ts`) |
| `npm run spellcheck:build` | Rebuild the spell-check dictionaries in `public/spellcheck/` from `spellcheck-data/` (including any licensed releases in `spellcheck-data/licensed/`) and the `dictionary-*` packages (PS-342). The output is committed; rerun it after editing the word lists or adding a release |

**Dependency security (PS-344, Sep 2026):** `npm audit` went from 54 findings (8 high) to 2 moderate, with none high or critical; the 2 left are in legacy Firebase tooling and documented in PS-344. React Router is on version 7 (Batch 341), imported from `react-router`; `react-router-dom` is no longer used. `package.json` carries one `overrides` entry, which lifts `minimatch` under `@typescript-eslint/typescript-estree` 6 to a patched 9.0.x. Use **npm 11** (bundled with Node 24): npm 10.9 crashes resolving this project's dependency tree ("Cannot read properties of null (reading 'edgesOut')"). Run `npm audit` before each release; the aim is no high or critical findings.

Conventions, testing discipline, and non-obvious gotchas (such as the deliberate `"strict": false` in `tsconfig.json`) are in **[docs/developer/GETTING_STARTED.md](docs/developer/GETTING_STARTED.md)**.

---

## Development rules

Every change must meet three standing rules. The full text, with examples and the pre-delivery checklist, is in **[CLAUDE.md](CLAUDE.md)**.

1. **No inline CSS.** Styling lives in CSS classes (`src/pathscribe.css`). A `style` prop may set only CSS custom properties (e.g. `--ps-hue`), which real CSS rules consume.
2. **No business logic in components.** Components render and dispatch; decisions live in `src/services/` or `src/utils/`, tested directly.
3. **International support.** Every user-facing string goes through `t()`, and every key goes into all five locale files in the same change.

Two further working rules: verify claims against the actual source (search the whole repo, not just `src/`), and update the README of every folder you touch, up to this one.

---

## Internationalization

- **Languages:** English, French, German, Dutch, and Korean (`src/i18n/locales/{en,fr,de,nl,ko}.json`, about 10,000 keys each), plus Belgian Dutch (`nl-BE.json`, Batch 362): a regional variant holding only the Belgian wording, falling back to Dutch, with Belgian date formats. Language is detected from the browser, persisted per user, and switchable from the nav bar.
- **Enforcement:** `src/i18n/localeParity.test.ts` checks every key in every language. It verifies presence, non-empty values, identical `{{placeholders}}` and markup, sorted keys, and that `SUPPORTED_LANGUAGES` matches the files. It runs in `npm test`.
- **Region-specific formats:** dates, national IDs, and addresses are handled by `JURISDICTION_LOCALE`, `IDENTIFIER_FORMAT_LIBRARY` (`src/types/systemConfig.ts`), and `src/utils/formatAddress.ts`.
- **Report language (Batch 391):** a report is written in the performing lab's language, not the viewer's: each performing lab has a Report language (its jurisdiction's by default), stored on the report at sign-out. Korean text, on screen and in report PDFs, uses the Pretendard font (SIL OFL 1.1), shipped with the app in `public/fonts/pretendard/` and `functions/fonts/`; no package to install (Batch 394). See [src/services/reports/](src/services/reports/README.md) and [src/services/documentRendering/embeddedFonts/LICENSE_NOTICE.md](src/services/documentRendering/embeddedFonts/LICENSE_NOTICE.md).
- **Full reference:** [src/i18n/README.md](src/i18n/README.md). The same file also serves as the master build changelog (`## Batch N` entries).

---

## Project structure

```
.
├── CLAUDE.md                 working rules + delivery routine
├── README.md                 this file
├── docs/                     architecture, developer, product, quality, IP/legal, public docs (+ ARCHIVE.md)
├── scripts/                  maintenance/audit scripts (see scripts/README.md)
├── firestore.rules           Firestore security rules (tested by npm run test:rules)
├── firebase.json             emulator config (Firestore :8085, UI :4000)
├── public/                   static assets
└── src/                      the application — every folder has its own README (index: src/README.md)
    ├── pages/                top-level route pages
    ├── components/           shared and feature components (Config/ = every admin screen)
    ├── services/             data access + business logic (I*/mock*/firestore* pattern)
    ├── hooks/, contexts/     reusable stateful logic, app-wide React state
    ├── types/                pure type definitions
    ├── utils/                pure helpers
    ├── i18n/                 i18next setup, locale files, master build changelog
    ├── data/                 synoptic protocol JSON
    ├── api/, audit/, loaders/, firebase/, theme/, constants/, mock/
    └── mocks/, orchestrator/, protocols/, styles/   (no README yet)
```

Start at **[src/README.md](src/README.md)**, which indexes every folder README. The largest indexes are [src/services/README.md](src/services/README.md), [src/components/README.md](src/components/README.md), and [src/pages/README.md](src/pages/README.md).

Two root-level documents under `src/` are worth reading before backend work: [FRONTEND_AS_SPEC_CAVEATS.md](src/FRONTEND_AS_SPEC_CAVEATS.md) (where the mock front end must not be read as literal backend spec) and [FHIR_DISPATCH_ARCHITECTURE_PLAN.md](src/FHIR_DISPATCH_ARCHITECTURE_PLAN.md).

---

## Documentation map

| Where | What |
|---|---|
| [docs/architecture/](docs/architecture/) | `SYSTEM_ARCHITECTURE.md`, `ACCESS_CONTROL_PLAN.md`, `AUTHENTICATION_OIDC.md` (sign-in), `LIVE_UPDATES_SIGNALR.md`, `CASE_SEARCH_API.md` (server-side case search), `AUTHORIZATION_API.md` (capabilities), `TAT_AND_DELEGATION_API.md` (TAT targets and delegations), `CASE_PRIVACY_MODEL.md` (who may learn that a case exists), `REGISTRY_ACKNOWLEDGEMENT_API.md` (registry answers coming back), `REGISTRY_GO_LIVE_API.md` (the registry test-to-live gate), the interface specification |
| [docs/developer/GETTING_STARTED.md](docs/developer/GETTING_STARTED.md) | Conventions, testing discipline, gotchas |
| [docs/product/](docs/product/) | Feature overview, workload & charge-capture scope |
| [docs/quality/QA_AND_TESTING.md](docs/quality/QA_AND_TESTING.md) | QA and testing approach |
| [docs/ARCHIVE.md](docs/ARCHIVE.md) | What was retired and why. `PRIORITY_FIXES.md` was retired on 2026-08-19 and its open items became Jira PS-57 to PS-71; `PRIORITY_FIXES.md #N` citations in older READMEs are historical |
| [src/i18n/README.md](src/i18n/README.md) | i18n reference + the batch-by-batch build changelog |
| [src/services/printerProfiles/README.md](src/services/printerProfiles/README.md#admin-guide-how-a-site-prints-labels) | Admin Guide material: how a site prints labels, and what IT must approve before the PathScribe Agent is installed |
| [src/components/Config/Protocols/README.md](src/components/Config/Protocols/README.md#admin-guide-building-and-publishing-a-synoptic-template) | Admin Guide material: building, reviewing and publishing a synoptic template |

---

## Notable subsystems (recent)

- **Equipment register** (Sep 2026, Batches 356 and 358, PS-326). Every device in the lab is in one register (Configuration → System → Equipment): code, name, kind, make, model, serial number, performing lab, scan station and status.
  - Pete chose a hybrid: workflow-specific settings stay on their own screens (Printer Profiles, Grossing Hardware) and point at a register entry. The links went in in Batch 359, which also built the Grossing Hardware screen (the service existed, but it had no screen before).
  - Molecular batches pick their target instrument from the active analysers; it used to be free text. Worklist dispatch checks the analyser's station.
  - **Maintenance and calibration** (Batch 360). Each device can have schedules and a service log (maintenance, calibration, function checks, repairs, malfunctions). The log can't be edited or deleted, and every entry is audited. The register flags due-soon, overdue and open-malfunction devices, the equipment record ISO 15189 and CAP expect.
  - **Shown in red** (Batch 361). A device with an open malfunction or past due is red in the register and in the molecular batch instrument picker, with a warning when chosen. Pete's decision: flag it, don't block it.
  - See [src/services/equipment/](src/services/equipment/README.md).
- **Support references** (Sep 2026, Batch 364, PS-349/PS-350). Support staff quote a non-identifying reference such as `SR-7K2Q-9MXD` instead of a case number. The lab looks it up in the Audit Log or the case search box, and each lookup is audited. References are random, never derived from the case number. Support tickets now send the page type and the case's reference instead of the page address, and warn when typed text contains a case number or MRN. See [src/services/supportReferences/](src/services/supportReferences/README.md).
- **Belgian French and Netherlands dates** (Sep 2026, Batch 365, PS-347). Belgian French (fr-BE) is a regional variant of French, like Belgian Dutch. The Netherlands date format is DD-MM-YYYY. The order lookup now shows and finds dates of birth in every jurisdiction's own format; before, German dates of birth were shown month first.
- **No inline CSS** (Sep 2026, Batch 367, PS-74). PS-74 measured 2,740 inline styles; the last ~120 are gone. Every `style` prop now sets only CSS custom properties, and no colour is built in code. A structure-aware check (`src/services/styleRules/`) keeps it that way across the whole app.
- **Capabilities: roles that are enforced** (Sep 2026, Batch 369, PS-355). The 189 actions in the Role Dictionary were never enforced; they are voice and keyboard commands, and the tab is now called Commands. Access is now granted as capabilities (`domain:object:verb`, e.g. `qa:fppe-tracking:export`):
  - **Checked in the service** that does the work, and every check of an audited capability is logged with the role that allowed it.
  - **No bypass**, even for Superadmin, which is a role like any other.
  - **Phase 1** covers the report change-history export and the 14 Quality Assurance report exports, one capability each. Admin and the new QA Reviewer role hold them; Pathologist doesn't by default.
  - **The Role Dictionary** groups capabilities, and offers to turn on anything a capability needs (or turn off what depends on one).
  - **Phase 2** (Batch 370, PS-356) closed a self-escalation gap: any signed-in user could edit roles and staff role assignments. That now needs its own capabilities; changing roles and access is split from editing a staff record.
    - Staff have a facility assignment that limits case actions and QA exports.
    - The role-level switches that were never enforced are gone.
  - **Superadmin** is reserved for ForMedrixAI support staff (Batch 371). It holds every capability, including platform-only ones such as the governing-body content settings, and hospital administrators can see it but not change or assign it. Support opening another organisation's case is audited.
  - **Support access is the hospital's decision** (Batch 372). Each organisation sets a policy: Disabled, Approval required (the default) or Always allowed. Under approval, support asks per ticket with a reason, a hospital approver approves or rejects, and access lasts the organisation's window (default 2 hours). Everything support does there goes into the organisation's own hash-chained support audit, exportable as CSV or JSON. See [src/services/supportAccess/](src/services/supportAccess/README.md). Every demo case belongs to an organisation (Batch 373), so the policies cover all of them.
  - **Screens by role** (Batch 374). The Home page, its two hubs and the routes show or open only the screens a user's roles grant (`screen:<name>:open`). Pete chose the starting matrix, and there are four new bench roles. See [src/services/screens/](src/services/screens/README.md). Batch 375 folded the two peer-review queues into the Worklist, made Add-On Orders a case action, and moved Batch Management into the Pathology Workspace.
  - **Phase 3 is under way, screen by screen.** Batches 378–422 added permissions for grossing, holds, delegation, billing corrections, autopsy release, messaging, cytology corrections and addenda, peer-review verdicts, the intraop critical-results dictionary, add-on orders, Batch Management overrides, molecular supersede, (Batch 406) molecular control rules, which Admin holds by default and can be assigned to any role, (Batch 407) disposing of retained material and exporting the disposal report, (Batch 409) cytology sign-out, and (Batch 410) the rest of the Cytology Workspace: recording a review, choosing the final diagnosis, removing a QC flag, the 5-year lookback outcome and cyto-histo correlation, and (Batch 411) finalizing a cytology case before every specimen is signed out, (Batch 412) requesting a revision of someone's cytology review, (Batch 414) managing screening registry reporting, (Batch 415) a cytotechnologist's own sign-out and switching the US-only cytology rules, (Batch 417) recording a patient's national identifier, (Batch 418) a patient's registry opt-out, (Batch 421) the Registry Exceptions worklist and resending a registry submission, and (Batch 422) managing cancer registry reporting. As of Batch 422 there are 82 capabilities.
  - **The full list** (System Capabilities), with each capability's risk, default roles and the service that checks it, is the "Capability catalog" section of `docs/architecture/AUTHORIZATION_API.md`. A test fails when it disagrees with the code.
  - See [src/services/authorization/](src/services/authorization/README.md) and `docs/architecture/AUTHORIZATION_API.md`; phases 3–4 are PS-357 and PS-358.
- **Field requirements** (Sep 2026, Batch 376, PS-359). Configuration → System → Field Requirements lets each organisation choose which fields a page requires before saving. Patient identification, the client, the requesting provider and a described specimen are locked as always required. Accession is the first page and Grossing the second, where the Grossing screen gained Complete grossing (Batch 378, button, voice or keyboard). Requiring a protocol on every specimen is on by default and switchable per organisation; switched off, protocol-less specimens are confirmed and routed for secondary review (Batch 379). The case report page's modals follow (Batch 380: Add/Edit specimen, amendments and addenda, critical findings; Batch 381: holds, comments, delegation, biopsy arrays, block cancellation and restains, with permission checks for holds and delegation; Batch 382: frozen-final reconciliation and the billing modals, with a permission for correcting an applied billing code; Batch 383: the two autopsy forms and the fixation-time and collection/receipt-date sign-out gates, with a permission for releasing an autopsy body, which completes the case report page; Batch 384: the message drawer, reply box and Secure email window on a new Messaging page; Batch 385: permissions for sending messages and secure email; Batch 386: the five forms on the Cytology screening page, with four voice commands; Batch 387: the rest of that page translated; Batch 388: the Microtomy workstation's comment drawer and slide grid; Batch 389: the rest of that page's text; Batch 390: correcting or adding to a signed-out cytology report, with a mandatory reason and a permission for each; Batch 391: reports in the performing lab's language; Batch 392: the report PDF with every result sent to the interface engine; Batch 393: Korean in the surgical and autopsy PDFs, and autopsy reports sent as one result; Batch 397: the Intraop page; Batch 401: the Embedding station; Batch 402: the Slide distribution station; Batch 403: Add-On Orders, with reference labs linked to tests; Batch 404: Batch Management; Batch 405: the molecular plate builder; Batch 406: molecular rack loading, with the instrument and deck slot checked against each analyser's deck layout; Batch 407: the rest of Batch Management, with a two-column New Container form; Batch 408: Batch Management closed out; Batch 409: the Cytology Workspace, with cytology sign-out as a service and its own permission; Batch 410: the rest of the workspace moved into services, with each later review storing its agreement with the initial screen; Batch 411: a tab per cytology specimen, signed out one by one, the case final when all are; Batch 412: notes on parts of a review, revision requests that stop a cytotechnologist but never a pathologist, review version history, and a pathologist's one-step Revise and sign out); see [src/services/fieldRequirements/](src/services/fieldRequirements/README.md).
- **Registry reporting engine** (Sep–Oct 2026, Batches 414–422, PS-359; spec: the Registry Engine SRS v2.1 Claude Doc). PathScribe builds and validates a canonical JSON payload per registry submission and hands it to the interface engine, which owns wire formats and transport. The engine is ForMedrixAI's and ships with PathScribe; a site's own engine is used only when the site insists, with ForMedrixAI's adapter code deployed into it (Batch 424 corrected earlier wording that called it the hospital's engine).
  - **Cervical screening** (Batch 414): twelve programmes as data definitions, lab code mappings, results held rather than sent half-coded.
  - **National patient identifiers** (Batch 417): NHS number, BSN, IHI and ten more, stored apart from the MRN with their check digits run.
  - **Consent** (Batch 418): a screening opt-out excludes the submission; a cancer registry opt-out is overridden by statute unless the lab's jurisdiction honours it.
  - **Payload header** (Batch 419): a stable submission id, versions linked by a master id, NEW / CORRECTION / AMENDMENT, test vs production. Cytology corrections and addenda now reach the registry.
  - **Acknowledgements** (Batch 420): the registry's answer moves each submission to accepted, rejected fixable or rejected outright; 72 hours of silence escalates. Since Batch 425 PathScribe reads only the interface engine's normalised JSON; the engine reads HL7 ACKs and FHIR OperationOutcomes. Cancer registry reports are now actually sent (before Batch 420 they were queued and never dispatched).
  - **Registry Exceptions worklist** (Batch 421, Quality & Compliance): every submission that needs a person, with the registry's findings, and re-validate and resend.
  - **Cancer registries** (Batch 422): thirteen as definitions, five added (NCRI Ireland, Public Health Scotland, NICR Northern Ireland, NKR/IKNL Netherlands, Belgian Cancer Registry), each with its national identifier and wire format; Configuration saves need `config:cancer-registry:manage`.
  - **Go-live gate** (Batch 423): a registry reaches its live register only through an approval:
    - pre-checks and test evidence;
    - re-entered credentials, with the approver's capacities stamped on a permanent statement;
    - Template Review-style settings, with one person by default.

    Registry templates are versioned `vYYYY.Q.X`. A newer minor or breaking version holds live results until go-live is re-approved; results are never dropped to test. The Registry Exceptions worklist can raise a row as a CAPA. See `docs/architecture/REGISTRY_GO_LIVE_API.md`.
  - **Validation and production instances** (Batch 424):
    - A validation instance sends only synthetic test cases (fictitious patients whose identifiers pass their check digits), and only to registries' test systems.
    - Production sends real results only to live registers. Until go-live is approved they're held, then resent in a catch-up.
    - Go-live needs the validation record from the validation instance, for the same release.
    - Local customisations (code mappings, the engine adapter's local rules) are stamped with their template version and flagged for review when a release touches them.
  - **Batch 425** (with Pete's developer):
    - A registry's revision of data it had accepted raises a CAPA deficiency and shows on the worklist until reviewed.
    - A live badge on the top nav and the Quality & Compliance tiles counts exceptions for the user's own organisation.
    - One transmission audit download serves screening and cancer, with registry status and response code.
    - National identifiers and registry opt-outs come from the hospital's system as JSON (newest wins) and are prefilled at accessioning. A change made after accessioning sends an A08.
    - A cancer report missing its registry's mandatory data is held, never the sign-out.
    - The template review settings need a permission to change.
  - Server contract: `docs/architecture/REGISTRY_ACKNOWLEDGEMENT_API.md`, `REGISTRY_GO_LIVE_API.md`. See [src/services/registrySubmission/](src/services/registrySubmission/README.md).
- **Synoptic results to the LIS** (Oct 2026, Batch 426). Each synoptic workup goes out as a structured result (v1.0.0) with its own PDF, in both modes:
  - **Assist:** sent to the LIS on Finalize and on each correction and addendum, for the LIS to put into its own report. Before Batch 426, Finalize sent nothing.
  - **Orchestration:** the same block alongside the result.
  - **Contents:**
    - codes with system and version;
    - staging, from template fields tagged in the editor;
    - suggested CPT without modifiers (Assist);
    - the LIS order numbers echoed back.

  A field the AI re-evaluates after new narrative asks "keep or update?" instead of changing what the pathologist set. Spec: `docs/architecture/SYNOPTIC_RESULT_API.md`; renderer: `functions/main.py` (`workup`).
  - **Batch 427:**
    - A testing facility can be set to receive one combined PDF per case, for an LIS that takes one PDF per accession.
    - A workup can cover several parts (Independent / Combined).
    - Pages opened from Configuration (template editor, Part Builder, Template Assembly and others) can no longer be opened by typing their address without Configuration access.
- **Configuration permissions** (Oct 2026, Batch 428). Every Configuration section checks its own capability in its service, 84 in all (Pete chose one per section), so opening Configuration no longer means being able to change everything in it. Admin and Lab Director start with them; Template Author and Template Approver keep only the protocol and template ones; a hospital's own roles get none until granted. A refused change saves nothing and names the missing permission. See [docs/architecture/AUTHORIZATION_API.md](docs/architecture/AUTHORIZATION_API.md).
  - **Batch 429:** a section the person can't change shows view only, naming the permission; bench staff record equipment maintenance from Batch Management → Equipment log.
  - **Batch 430:** voice accent and dictation learning are per person; voice macros follow the same owner rule as report macros; view-only fields don't take changes.
- **Intraoperative verbal report** (Sep 2026, Batch 399). The frozen result's verbal report records who received it, their role and the mandatory read-back; a configurable critical results dictionary flags critical results, and one given to anyone but the operating surgeon needs a "Surgeon unavailable" reason. Since Batch 400 the report can be dictated, with AI filling in the fields for the pathologist to check.
- **Case privacy model** (Sep 2026, Batch 396). A case the reader can't open looks exactly like one that doesn't exist: one neutral "no access" screen, and message links only for cases the reader can open. See `docs/architecture/CASE_PRIVACY_MODEL.md`.
- **Report change history** (Sep 2026, Batch 368, PS-353). Every save of a case is logged, one entry per save: who, when, which workstation, and each field changed old → new, with word-level diffs for long text. The report page shows it. Anyone holding the change-history export capability (Batch 369) can export it to CSV, and exports are audited. The server contract is in `docs/architecture/REPORT_CHANGE_LOG_API.md`.
- **Patient data kept out of support screenshots** (Sep 2026, Batch 363, PS-72). Every patient identifier the UI shows (name, date of birth, MRN, accession or case number) sits inside an element the Enhancement Request screenshot redacts. A test reads the code's structure and fails the build if one is shown untagged; see [src/services/phi/](src/services/phi/README.md).
- **TAT targets and delegations as services** (Sep 2026, Batch 353). The turnaround targets and case delegations now sit behind `tatTargetService` and `delegationService`, so the .NET API server can take them over without screen changes. Until then, the demo versions keep the app demoable.
  - **What changed:** before, the TAT settings screen kept targets in browser storage that five other places read directly, and delegations lived inside the demo case service.
  - **Endpoints** are specified in [docs/architecture/TAT_AND_DELEGATION_API.md](docs/architecture/TAT_AND_DELEGATION_API.md).
  - See [src/services/tatConfig/](src/services/tatConfig/README.md) and [src/services/delegations/](src/services/delegations/README.md).
- **Case search, paged on the server** (Sep 2026, Batch 350). Search sends its filters to a case search service. The service applies the user's access rules first, then matches, sorts, counts and returns one page; the page shows the total, a pager, a page size and a sort.
  - **Repairs:** filters that never matched now work: diagnosis, requisition / order numbers, the signing pathologist, ICD-11 and ICD-O, synoptic protocols, and older flag records.
  - **Export** covers every match (up to 5,000), translated and audited.
  - **Saved searches** go through a service instead of the browser.
  - **New case data (Batch 351):** case type, sign-out and release dates, the pathologist's role on the case, revisions, holds, result flag, pending work, past-TAT, subspecialty, performing lab, location, intake, payer, CPT codes and autopsy details.
  - **Demo data (Batch 352):** the Manchester, Midwest, Henry Ford and outreach demo cases now have facility records linked to their performing labs, so searching by those labs finds them.
  - **Organisations (Batch 354):** choosing an NHS Trust (or any parent organisation) as the submitting facility or performing lab includes every site under it.
  - **For the .NET API server:** the endpoint, matching rules, SQL paging and audit are specified in [docs/architecture/CASE_SEARCH_API.md](docs/architecture/CASE_SEARCH_API.md).
  - See [src/services/caseSearch/](src/services/caseSearch/README.md).
- **Single sign-on** (Sep 2026, Jira PS-60, Batch 343).
  - **How:** staff sign in with their hospital's identity provider (OpenID Connect, authorization code + PKCE): Microsoft Entra ID first, Okta, Ping and Keycloak generically. The browser needs no client secret; the API server validates the tokens.
  - **Who:** only staff who are already provisioned and active. The first sign-in links the account by trusted email, and later sign-ins match on the provider's permanent account id.
  - **Passwords:** password sign-in is for demo builds only. The demo accounts' plain-text passwords, which used to ship in every bundle, are replaced by PBKDF2 hashes, and a `VITE_AUTH_MODE=sso` build leaves them out entirely.
  - **More:** configuration, the Entra ID registration steps and the API server's part are in [docs/architecture/AUTHENTICATION_OIDC.md](docs/architecture/AUTHENTICATION_OIDC.md). See [src/services/auth/](src/services/auth/README.md).
  - **Signatures (Batch 344):** every sign-out, countersignature, finalisation and autopsy PAD/FAD now confirms who is signing, with the password again or, for SSO, the hospital's own sign-in page again. Before, the password typed there was never checked. Five failed attempts lock signing for 15 minutes, and every attempt is audited.
  - **Server plan:** the spec now also covers the broker (Entra External ID for shared SaaS, direct Entra ID for dedicated installs), the token contract, row-level security and SCIM provisioning.
  - **Signature records (Batch 345):** each signature is checked again when the signed change is saved: right person, case and action, used once, and for SSO a fresh sign-in token for the same account. It is then stored as a signature record. The API server will repeat the check and add the token's cryptographic signature. Staff → edit shows each person's linked sign-in accounts, with Unlink.
- **Live updates for the OR boards and Intraop Queue** (Sep 2026, Jira PS-262, Batch 342). A dismissal, new frozen section or diagnosis on any device reaches every OR Suite Live Board showing that theatre, and the Intraop Queue, through a SignalR hub on the API server (`@microsoft/signalr` client). Clients reconnect on their own and fall back to 15-second polling when the hub is unreachable; a badge shows the connection state. Without a hub configured (development, demo) the browser's own windows still update each other instantly. Tested end to end with the real SignalR client against a protocol-compatible test hub: under 210 ms from change to the other screen in the browser. The hub itself is specified in [docs/architecture/LIVE_UPDATES_SIGNALR.md](docs/architecture/LIVE_UPDATES_SIGNALR.md) for the .NET API server. See [src/services/liveUpdates/](src/services/liveUpdates/README.md).
- **Medical spell checking** (Sep 2026, Jira PS-342; Batch 336 engine, Batch 337 German, Batch 338 report screens, Batch 339 licensed-vocabulary build step). Real Hunspell runs in a Web Worker and checks each word through tiers: personal and facility dictionaries → a regional US/UK check → a jurisdiction medical lexicon → clinical vocabularies → the base dictionary. Clinical codes are never flagged. The dictionaries are built with `npm run spellcheck:build` and served by PathScribe itself. German is used under the GPL: it is shipped unmodified with the full licence texts, and the source-offer contact must be set before release (see `spellcheck-data/README.md`). The SPECIALIST Lexicon, SNOMED CT editions and LOINC are built in from `spellcheck-data/licensed/` once they are licensed and downloaded (PS-343); the release files themselves never ship. The report editor and every report text box are checked in the case's language (case choice → assigned pathologist's preference → ordering facility's default), with a right-click menu for suggestions and dictionaries; the old AI spelling check is retired. See [src/services/spellcheck/](src/services/spellcheck/README.md) and [src/components/SpellCheck/](src/components/SpellCheck/README.md).
- **Jurisdiction-bound signing authority** (Sep 2026, Jira PS-327 / PS-341) decides who may sign out and whose work needs a countersign. Resolution runs facility override → the country's regulatory default → platform default, with country-specific roles (e.g. UK Biomedical Scientist), seeded rules for AU/NZ/EU/UK/IE/CA/KR, and an audited human override at facility level. Since Batch 335, a platform administrator edits the country rules in System → **Country Signing Rules**, with a reason and an audit entry for each change. Overview: [src/services/README.md → "Signing authority"](src/services/README.md#signing-authority--jurisdiction-bound-human-in-the-loop-sep-2026-ps-327--ps-341).
- **Duplication policy** (Sep 2026, Jira PS-73) decides which admin records can be duplicated. Complex configuration, templates and multi-site variants can be; real people, flat lookups and audit records can't. The copy rules, localized copy names, and a guard test that enforces the policy are in [src/services/duplication/](src/services/duplication/README.md).
- **Synoptic protocol lifecycle actions** (Sep 2026, PS-73): Duplicate, New Version (publishing it archives the old version), Export JSON, and Archive/Restore. Rules in [src/services/templates/protocolLifecycle.ts](src/services/templates/README.md).
- **AI model catalog and tenant adoption** (Sep 2026, Jira PS-58). AI models are published once in a global ForMedrixAI catalog. Each organisation adopts, validates and activates them through its own adoption records, keyed by `organisationId`, and `firestore.rules` enforces the split. See [src/services/models/](src/services/models/README.md).
- **Template review governance** (Sep 2026, Jira PS-63). Drafting needs the Template Author role (Admin inherits it). Template Author, Template Approver and Lab Director are built-in roles, identified by fixed ids so they can be renamed safely ([src/services/roles/systemRoles.ts](src/services/roles/README.md)). Publishing a synoptic template needs an independent approval by a Template Approver, Lab Director or Admin. Self-approval is off by default; the number of required reviewers is a site setting. Diagnostic templates also need at least 80% SNOMED coverage. Admin Guide: [src/components/Config/Protocols/README.md → "Who may approve and publish"](src/components/Config/Protocols/README.md).
- **Generic Code Engine** (Sep 2026, Jira PS-89, Batch 333). The Billing Dictionary has one shared engine for effective-dated code systems (CPT, HCPCS, NHS OPCS-4, local): each rule has a vocabulary and a country, bulk CSV imports are single four-eyes approval jobs with rollback, and a superseded rule stays in force until its replacement starts ("natural sunset"). Batch 334 added the screens: System → **Code Import (Bulk)** to upload, match columns, check and import a file and to roll back a job, with approval of the whole job under Pending Billing Rule Approvals. See [src/services/billing/codeEngine/](src/services/billing/codeEngine/README.md).
- **One signing-authority rule for every sign-out** (Sep 2026, Jira PS-327, Batches 331–332). Surgical Pathology, Autopsy and Cytology's pathologist track all apply the same per-lab and country signing rules through `src/services/auth/resolveFinalizeAuthorityContext.ts`. Cytotechnologists keep their CLIA rules.
- **Autopsy signing authority** (Sep 2026, Jira PS-327, Batch 331). Signing an autopsy's PAD/FAD now needs signing authority under the same per-lab and country rules as Surgical Pathology, with the case's coroner jurisdiction choosing the country profile. Forensic (medicolegal) cases also need the signer's active medicolegal appointment for that jurisdiction; there is no admin override. Appointments are recorded in Staff → edit → **Jurisdictional credentials & appointments**. See [src/services/autopsy/](src/services/autopsy/README.md) and [src/services/staff/](src/services/staff/README.md).
- **Deployment-neutral UI** (Sep 2026, Batch 330). PathScribe must deploy to public or private cloud, so a guard test stops the UI from importing mock services, browser storage or Firebase directly. Existing cases are baselined in a list that only shrinks. See [src/services/deploymentReadiness/](src/services/deploymentReadiness/README.md) and standing rule 4 in `CLAUDE.md`.
- **HTTPS only** (Sep 2026, Batch 327). The deployed app is served over HTTPS by Vercel, which redirects any HTTP request and sends HSTS. Every other connection PathScribe makes is now encrypted too:
  - **Back-end services:** a production build requires `https://` for `VITE_REPORT_PDF_ENDPOINT` and `VITE_INTERFACE_RECEIVER_ENDPOINT`, and sends nothing if either is missing or plain HTTP ([src/utils/serviceEndpoint.ts](src/utils/README.md)). The same applies to `VITE_LIVE_UPDATES_HUB_URL` (the SignalR hub, PS-262; without it the OR boards and Intraop Queue fall back to polling), `VITE_API_BASE_URL` and the SSO authorities (`VITE_AUTH_*_AUTHORITY`, PS-60).
  - **Workstation agent:** printing uses `wss://127.0.0.1` with a certificate the agent's installer creates on each workstation ([src/utils/labels/pathscribeAgent/](src/utils/labels/pathscribeAgent/README.md)). Since Batch 346 the port can be set per printer profile, and users see whether their label is queued or printing.
  - **Interface-engine printing:** since Batch 347 the engine's answer (printed, or why not) comes back over the live-update hub, with a manual Retry that keeps the job's idempotency key ([docs/architecture/LIVE_UPDATES_SIGNALR.md](docs/architecture/LIVE_UPDATES_SIGNALR.md) §10).
  - **Grossing scale:** its agent address must be `https://`.
  - **Local development:** `npm run dev` stays on `http://localhost`, which browsers treat as secure.
- **LIS ingestion layer and Assist AI drafts** (Sep 2026, Jira PS-87). The external LIS's updates reach PathScribe as HL7 v2 messages, JSON webhooks or polls. Each goes through an adapter into one staging queue, and PathScribe's workflow reads only from that queue. In Assist mode, Gross Complete and Microscopic/Diagnosis Complete produce AI synoptic drafts for pathologist review. See [src/services/lisIngestion/](src/services/lisIngestion/README.md) and [src/services/assistPolling/](src/services/assistPolling/README.md).

---

## Issue tracking

Work is tracked in Jira project **PS** (PathScribe Alpha) at `formedrixai.atlassian.net`.

## Batch 431

Data hygiene and the Configuration search. See `src/i18n/README.md` → Batch 431.

## Batch 432

Unwired actions now have screens. See `src/i18n/README.md` → Batch 432.
