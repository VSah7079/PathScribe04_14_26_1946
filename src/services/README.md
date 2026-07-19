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
larger, multi-file scaffolded subsystem).

## Root-level files (not in a subfolder)

- **`index.ts`** — the barrel file. Re-exports every real mock service
  under its clean public name (e.g. `mockUserService` → `userService`).
  Most of the app imports services from here, not from individual folders.
- **`types.ts`** — shared types used by every service interface in the
  app: `ServiceResult<T>` (the `{ ok: true, data } | { ok: false, error }`
  result shape every service method returns) and `ID`.
- **`mockStorage.ts`** — thin typed `localStorage` wrapper used by nearly
  every mock service. Becomes unused once Firestore services replace the
  mocks.
- **`enhancementRequestService.ts`** — routes user-submitted enhancement
  requests (Email or Portal/webhook mode). Mock phase logs to console.
- **`synopticNotificationService.ts`** — STUB, deliberately: notifications
  for high-stakes synoptic audit events. Logs to console until a real
  `POST /api/v1/notifications` backend exists.
- **`phiSelectors.ts`** — central registry of DOM selectors marking PHI/PII
  elements, used by `useScreenCapture` to redact sensitive data before a
  screenshot is attached to an Enhancement Request or QA Feedback
  submission. **Tag new PHI-bearing UI with `data-phi="true"` — see this
  file's own header for how.**

## Folder index

| Folder | What it is |
|---|---|
| [actionRegistry/](./actionRegistry/README.md) | Voice/shortcut action catalog |
| [ai/](./ai/README.md) | Core AI provider abstraction (Claude/GPT/Bedrock swap layer) |
| [aiBehavior/](./aiBehavior/README.md) | Admin AI behavior settings (confidence thresholds etc.) |
| [aiIntegration/](./aiIntegration/README.md) | Higher-level AI features: transcript refine, suggestions, spellcheck |
| [auditlog/](./auditlog/README.md) | System-wide audit log |
| [auth/](./auth/README.md) | Case access control + institution/session resolution (not login) |
| [biometric/](./biometric/README.md) | WebAuthn e-signature |
| [cases/](./cases/README.md) | **Central folder** — case data access, LIS/Orchestration routing, production migration plan |
| [clientSLA/](./clientSLA/README.md) | Per-client SLA/TAT targets |
| [clients/](./clients/README.md) | Client (institution) dictionary |
| [codes/](./codes/README.md) | Terminology system CONFIG (which SNOMED/ICD variants are enabled) |
| [communications/](./communications/README.md) | Email/notification transport |
| [containerTypes/](./containerTypes/README.md) | Specimen container-type dictionary |
| [deficiencies/](./deficiencies/README.md) | Specimen/requisition deficiency tracking |
| [delegationTypes/](./delegationTypes/README.md) | Case delegation type dictionary |
| [diagnosisCodes/](./diagnosisCodes/README.md) | Referring physician's order-time diagnosis code |
| [flags/](./flags/README.md) | Case/specimen flag dictionary |
| [fonts/](./fonts/README.md) | Editor font dictionary |
| [grossing/](./grossing/README.md) | Grossing template routing (types only, real logic in cases/) |
| [grossingRoutingOverrides/](./grossingRoutingOverrides/README.md) | Per-client grossing route exceptions |
| [hl7/](./hl7/README.md) | Standard HL7 ORM^O01 builder — deliberate pre-integration scaffolding |
| [internalNotes/](./internalNotes/README.md) | Lab-internal case notes + management reviews |
| [intraop/](./intraop/README.md) | Intraoperative Pre-Check queue |
| [lisSync/](./lisSync/README.md) | Narrow mock for one UI sync-freshness indicator |
| [macros/](./macros/README.md) | Text-expansion macro dictionary |
| [messages/](./messages/README.md) | Internal staff messaging |
| [models/](./models/README.md) | AI model registry |
| [narrativeSignals/](./narrativeSignals/README.md) | AI-vs-pathologist edit-diff capture + PHI de-identification |
| [orderIntake/](./orderIntake/README.md) | Pending-orders queue + Client/SpecimenCategory resolution |
| [organisation/](./organisation/README.md) | Organization/Site/Lab hierarchy (Enterprise + participating hospitals) |
| [participationTypes/](./participationTypes/README.md) | Case Team role dictionary |
| [performanceTargets/](./performanceTargets/README.md) | Admin productivity targets |
| [physicians/](./physicians/README.md) | Physician directory |
| [priority/](./priority/README.md) | Display metadata for the 3 fixed priority tiers |
| [protocols/](./protocols/README.md) | Standalone processing-protocol dictionary |
| [quality/](./quality/README.md) | Discordance tracking (Frozen-to-Permanent gate) |
| [reportParts/](./reportParts/README.md) | Atomic report-building-block library |
| [reportTemplates/](./reportTemplates/README.md) | Report template assembly + routing resolution chain |
| [reports/](./reports/README.md) | **Active work (2026)** — amendment/versioning system |
| [roles/](./roles/README.md) | Staff role/permission dictionary |
| [routingRules/](./routingRules/README.md) | Admin template routing rule overrides |
| [savedSearches/](./savedSearches/README.md) | Saved search/filter presets |
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

- `src/templates/mockDcisTemplate.ts` (a different, top-level, non-services/
  folder) still needs relocating into `services/templates/` or
  `components/Config/Templates/`. Not yet done.
- `components/Config/Templates/TemplateRenderer.tsx` has a self-documented
  bug — ignores `templateId`, always loads the DCIS placeholder. Not yet
  fixed.
- `services/stains/firestoreStainService.ts`'s auto-generated stub comment
  names only one of its three real mocks as "the active implementation" —
  should name all three. Cosmetic, not yet fixed.
- `services/aiBehavior/IAIBehaviorService.ts`'s own header comment has a
  stale file path. Cosmetic, not yet fixed.

## Renames executed July 2026 (for anyone using old references/bookmarks)

- `services/aiIntegration/GeminiAIIntegrationService.ts` → `PathScribeAIService.ts`
- `services/voicemacro/mockVoiceService.ts` → `mockVoiceMacroService.ts`
- `services/cases/caseRoutingService.ts` → `casePoolAssignmentService.ts`
- `services/cases/firestoreCaseService.ts` → `FirestoreCaseService.ts` (casing fix)
- `services/templates/{ISynopticTemplateSuggestionService,ITemplateSuggestionSignalService,mockTemplateSuggestionSignalService,synopticTemplateSuggestionService}.ts` → moved to new `services/templateSuggestions/`
- `pages/Synoptic/Codes/codeSearchService.ts` → `services/terminologySearch/codeSearchService.ts`
- `services/internalNotes/{ICaseNoteService,firestoreCaseNoteService}.ts` — deleted (dead legacy lineage, superseded by `IInternalNoteService`/`mockInternalNoteService`)
