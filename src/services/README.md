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

---

## The core pattern: interface / mock / firestore

Most folders here follow the same three-file shape:

- **`I<Name>Service.ts`** — the contract (TypeScript interface + shared types).
- **`mock<Name>Service.ts`** — the real, currently-active implementation.
  Despite the name "mock," this is what the running app actually uses
  today — it's `localStorage`-backed rather than a placeholder.
- **`firestore<Name>Service.ts`** — a *deliberate, forward-looking stub*
  for the eventual real backend. Not dead code, not wired in yet. When a
  real backend exists, swapping it in is meant to be a one-line change in
  `services/index.ts`.

Where a folder deviates from this pattern, its own `README.md` explains
why (e.g. `services/ai/` is a provider-abstraction layer, not a CRUD
service; `services/grossing/` is deliberately types-only because its real
logic lives in `services/cases/mockCaseService.ts`; `services/hl7/` is a
larger, multi-file scaffolded subsystem; `services/session/` is a small
resolution module, not a CRUD service — see its own README for why it
still follows the interface/mock/firestore split despite that).

## Root-level files (not in a subfolder)

- **`index.ts`** — the barrel file. Re-exports every real mock service
  under its clean public name (e.g. `mockUserService` → `userService`).
  Most of the app imports services from here, not from individual folders.
- **`types.ts`** — shared types used by every service interface in the
  app: `ServiceResult<T>` (the `{ ok: true, data } | { ok: false, error }`
  result shape every service method returns) and `ID`. **Extended (Aug
  2026)** with an optional `meta?: ServiceResultMeta` on the success
  branch (`hasMore`/`nextCursor`) for real, cursor-based pagination —
  currently used by `cases/ICaseService.ts`'s `getAll()`. Deliberately
  optional and additive: every existing caller across the app that
  destructures just `{ ok, data }` is completely unaffected; only a
  caller that explicitly opts in (`SearchPage.tsx`'s Load More) reads
  `result.meta`. Verified non-breaking directly (`tsc --noEmit` clean
  across the whole app) before building anything on top of it.
- **`mockStorage.ts`** — thin typed `localStorage` wrapper used by nearly
  every mock service. Becomes unused once Firestore services replace the
  mocks.
- **`enhancementRequestService.ts`** — routes user-submitted enhancement
  requests (Email or Portal/webhook mode). Mock phase logs to console.
- **`phiSelectors.ts`** — central registry of DOM selectors marking PHI/PII
  elements, used by `useScreenCapture` to redact sensitive data before a
  screenshot is attached to an Enhancement Request or QA Feedback
  submission. **Tag new PHI-bearing UI with `data-phi="true"` — see this
  file's own header for how.**

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
| [actionRegistry/](./actionRegistry/README.md) | Voice/shortcut action catalog |
| [ai/](./ai/README.md) | Core AI provider abstraction (Claude/GPT/Bedrock swap layer) |
| [aiBehavior/](./aiBehavior/README.md) | Admin AI behavior settings (confidence thresholds etc.) |
| [aiIntegration/](./aiIntegration/README.md) | Higher-level AI features: transcript refine, suggestions, spellcheck |
| [auditlog/](./auditlog/README.md) | System-wide audit log |
| [auth/](./auth/README.md) | Case access control + institution/session resolution (not login) |
| [billing/](./billing/README.md) | **NEW (August 2026)** — real CPT-to-work-RVU mapping table and calculation, workload/productivity tracking only (not a billing system) |
| [biometric/](./biometric/README.md) | WebAuthn e-signature |
| [caseRegistry/](./caseRegistry/README.md) | **NEW (August 2026)** — real accession-number generation/masking per organisation, with real facility-timezone-aware `{YEAR}` and annual sequence reset |
| [cases/](./cases/README.md) | **Central folder** — case data access, LIS/Orchestration routing, production migration plan |
| [clientSLA/](./clientSLA/README.md) | Per-client SLA/TAT targets |
| [clients/](./clients/README.md) | Client (institution) dictionary |
| [codes/](./codes/README.md) | Terminology system CONFIG (which SNOMED/ICD variants are enabled) |
| [communications/](./communications/README.md) | Email/notification transport |
| [containerTypes/](./containerTypes/README.md) | Specimen container-type dictionary |
| [deficiencies/](./deficiencies/README.md) | Specimen/requisition deficiency tracking |
| [delegationTypes/](./delegationTypes/README.md) | Case delegation type dictionary |
| [diagnosisCodes/](./diagnosisCodes/README.md) | Referring physician's order-time diagnosis code |
| [drafts/](./drafts/README.md) | **NEW (July 2026)** — local caching of in-progress unsaved work (Inactivity Timeout & Draft Recovery Phase 2) |
| [externalResources/](./externalResources/README.md) | **NEW (July 2026)** — admin-managed reference links (CAP protocols, WHO classification, lab systems), org-scoped with real per-viewer relevance filtering |
| [flags/](./flags/README.md) | Case/specimen flag dictionary |
| [fonts/](./fonts/README.md) | Editor font dictionary |
| [grossing/](./grossing/README.md) | Grossing template routing (types only, real logic in cases/) |
| [grossingRoutingOverrides/](./grossingRoutingOverrides/README.md) | Per-client grossing route exceptions |
| [hl7/](./hl7/README.md) | Standard HL7 ORM^O01 builder — deliberate pre-integration scaffolding |
| [interfaceExceptions/](./interfaceExceptions/README.md) | **NEW (August 2026)** — real holding queue for inbound ADT/patient-management messages that can't be safely auto-processed (unresolved identity, missing MRG-5) |
| [internalNotes/](./internalNotes/README.md) | Lab-internal case notes + management reviews |
| [intraop/](./intraop/README.md) | Intraoperative Pre-Check queue |
| [lisSync/](./lisSync/README.md) | Narrow mock for one UI sync-freshness indicator |
| [macros/](./macros/README.md) | Text-expansion macro dictionary |
| [messages/](./messages/README.md) | Internal staff messaging |
| [models/](./models/README.md) | AI model registry |
| [narrativeSignals/](./narrativeSignals/README.md) | AI-vs-pathologist edit-diff capture + PHI de-identification |
| [orderIntake/](./orderIntake/README.md) | Pending-orders queue + Client/SpecimenCategory resolution |
| [organisation/](./organisation/README.md) | Organization/Site/Lab hierarchy (Enterprise + participating hospitals) |
| [patients/](./patients/README.md) | **NEW (July 2026)** — real Master Patient Index (MPI), org-scoped identity resolution with a genuine ambiguous-match review workflow |
| [participationTypes/](./participationTypes/README.md) | Case Team role dictionary |
| [performanceTargets/](./performanceTargets/README.md) | Admin productivity targets |
| [physicians/](./physicians/README.md) | Physician directory |
| [priority/](./priority/README.md) | Display metadata for the 3 fixed priority tiers |
| [protocols/](./protocols/README.md) | Standalone processing-protocol dictionary |
| [quality/](./quality/README.md) | Discordance tracking (Frozen-to-Permanent gate) |
| [reportParts/](./reportParts/README.md) | Atomic report-building-block library |
| [reportRelease/](./reportRelease/README.md) | **NEW (August 2026)** — Post-Sign-Out Release Buffer: a real, configurable hold window between sign-out and genuine external release, with recall |
| [reportTemplates/](./reportTemplates/README.md) | Report template assembly + routing resolution chain |
| [reports/](./reports/README.md) | **Active work (2026)** — amendment/versioning system |
| [research/](./research/README.md) | **NEW (August 2026)** — external PubMed literature feed for the dashboard ticker (live NCBI eUtils, no firestore stub — see its README) |
| [roles/](./roles/README.md) | Staff role/permission dictionary |
| [routingRules/](./routingRules/README.md) | Admin template routing rule overrides |
| [savedSearches/](./savedSearches/README.md) | Saved search/filter presets |
| [session/](./session/README.md) | **NEW (July 2026)** — idle-session-timeout resolution (org default + per-performing-lab override) + same-browser session-supersede detection |
| [specimenCategories/](./specimenCategories/README.md) | Coarse-grained specimen classification |
| [specimenDictionary/](./specimenDictionary/README.md) | Fine-grained Specimen Dictionary (SpecimenEntry) — the real backend |
| [stains/](./stains/README.md) | Stain catalog (3 sub-concepts: type/sectioning/order macro) |
| [subspecialties/](./subspecialties/README.md) | Subspecialty/pool/workgroup dictionary |
| [systemConfig/](./systemConfig/README.md) | Lab-wide system configuration |
| [templateSuggestions/](./templateSuggestions/README.md) | AI-driven synoptic template suggestion (split from templates/ 2026) |
| [templates/](./templates/README.md) | Synoptic template library management |
| [terminologySearch/](./terminologySearch/README.md) | Live REST API terminology search (SNOMED/ICD/LOINC/CPT) |
| [users/](./users/README.md) | Staff user directory |
| [validationStudies/](./validationStudies/README.md) | Validation Study governance workflow |
| [voicemacro/](./voicemacro/README.md) | Voice-triggered macro dictionary |

## Known issues (as of this review — see PRIORITY_FIXES.md in project root)

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
