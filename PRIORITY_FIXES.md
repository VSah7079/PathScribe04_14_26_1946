# PathScribe — Priority Fixes Found During Naming/Architecture Review

Real functional or security issues found while reviewing folder structure
and naming tonight — NOT part of the mechanical cleanup/rename work, need
Pete's own judgment/action. Tracked here so they don't get lost.

## 1. SECURITY — Hardcoded UMLS API key committed to source
**File:** services/terminologySearch/codeSearchService.ts (moved from
pages/Synoptic/Codes/ tonight)
**Issue:** Was: `const UMLS_API_KEY = import.meta.env.VITE_UMLS_KEY ?? 'a29978e5-905a-4b4e-af8d-2c7ec4bd90d7';`
**Status: CODE FIX DONE + PUSHED** (commit 3343036) — hardcoded fallback
removed, now throws loudly via getUmlsApiKey() if VITE_UMLS_KEY is unset.
.env updated locally with new key.
**STILL OPEN:**
  - Deployment platform env var (Vercel etc.) still needs the new key set
    for production, separate from local .env — do this before any
    production deploy, not urgent for the copyright deposit itself.
  - Git-history scrubbing (BFG/git filter-repo) for the old, now-invalid
    key remains Pete's own call — lower urgency now that the key itself
    is rotated/dead, but the OLD (now-inert) key string would still be
    visible in history to anyone reviewing the repo. Purely a "does this
    look bad to a reviewer" question now, not a live security risk.
**ROTATION CONFIRMED COMPLETE** — Pete regenerated the key via NLM UTS
portal directly, which is what produced the new key value used to update
.env. Old key is invalidated.

## 2. BUG — TemplateRenderer.tsx ignores templateId
**File:** src/components/Config/Templates/TemplateRenderer.tsx (line ~35
per its own comment)
**Issue:** "Loads mockDcisTemplate regardless of templateId. Wire to
protocolRegistry" — self-documented, unresolved.
**Status: FIXED (July 2026).** Root cause turned out deeper than the
original note suggested: two structurally incompatible content schemas
existed (`types/templateTypes.ts`'s `TemplateSection`/`Question`, used by
the old renderer, vs. `SynopticEditor.tsx`'s real `EditorTemplate`, used
by the actual template builder and already stored via
`templateService.ts`'s `getTemplate()`). Rewrote `TemplateRenderer.tsx` to
consume `getTemplate()`/`EditorTemplate` directly — 19 real seeded
templates now display correctly, plus new SNOMED/ICD coding display the
old renderer never had. `types/templateTypes.ts` and
`src/templates/mockDcisTemplate.ts` deleted as fully dead (confirmed zero
consumers anywhere). Full detail in
`components/Config/Templates/README.md` and
`components/Config/Protocols/README.md`.

## 3. RELOCATE — mockDcisTemplate.ts orphaned location
**File:** src/templates/mockDcisTemplate.ts
**Issue:** Sole file in a top-level src/templates/ folder, one level away
from its only consumer (TemplateRenderer.tsx in components/Config/Templates/).
Pre-restructure leftover, same pattern as root-level contexts/hooks/mock/
found earlier tonight.
**Recommended fix:** Move into services/templates/ (where templateService.ts
and its seed data conceptually belong) and fix the one import in
TemplateRenderer.tsx.
**Status: RESOLVED BY ELIMINATION, not relocation (July 2026).** As part
of fixing #2 above, this file turned out to have zero real consumers once
`TemplateRenderer.tsx` was rewritten — it was typed against the
now-deleted `types/templateTypes.ts` schema. Deleted rather than moved;
`src/templates/` is now an empty folder.

## 4. RENAME — CaseRoutingSection.tsx naming collision (added during
components/ review, not originally in this doc)
**Status: CLOSED (July 2026).** Renamed to `CasePoolAssignmentSection.tsx`,
matching the already-completed `services/cases/casePoolAssignmentService.ts`
rename. See `components/Config/System/README.md`.

## 5. ARCHITECTURE — specimenTypes.ts inverted dependency (found during
components/ review, not originally in this doc)
**Status: CLOSED (July 2026).** Caught by Pete:
`services/specimenDictionary/ISpecimenDictionaryService.ts` was importing
its core `SpecimenEntry` type from inside `components/Config/System/` —
backwards for a data-layer service. Relocated to
`services/specimenDictionary/specimenTypes.ts`, 10 consumers updated. See
`services/specimenDictionary/README.md`.

## 6. ACCESS CONTROL — ForMedrix-employee-only settings not actually
gated (found during components/ review, not originally in this doc)
**Status: PLANNED, not built** — see `ACCESS_CONTROL_PLAN.md` (repo
root). Not blocking the copyright deposit; revisit before first real
customer deployment. Full reasoning in that doc.

## 7. DEAD CODE — orphaned third protocol-editing system (found during
components/ review, not originally in this doc)
**Files:** `src/protocols/protocolRegistry.ts`, `src/protocols/ProtocolEditor.tsx`,
`src/types/ProtocolDefinition.ts`
**Issue:** A third, isolated protocol-editing system (its own
`ProtocolDefinition` schema — a fourth flavor of "template content"
counting the two already resolved above), routed in `App.tsx` at
`/configuration/protocols/:protocolId` sitting directly between the two
real routes (`/template-editor/:id`, `/template-review/:id`), but
confirmed via full-`src/` grep to have zero navigate()/`<Link>` references
anywhere — technically routed, practically unreachable. Caught by Pete.
Checked the 3 stub entries for real CAP checklist content given the
copyright-cleanup context — confirmed thin/generic (one "Procedure"
question each, plain surgical terms), not a licensing concern, just dead
weight.
**Status: CLOSED (July 2026).** All 3 files deleted, plus the lazy import
and route registration in `App.tsx`. `src/protocols/` is now an empty
folder alongside the already-empty `src/templates/`.

## 8. CONSOLIDATION OPPORTUNITY — modal-overlay shell reimplemented ~14
times instead of shared (found during components/ review, not originally
in this doc)
**Files:** `Config/Protocols/SynopticEditor.tsx`, `Config/Protocols/protocolShared.tsx`,
`Config/Templates/TemplateRenderer.tsx`, `AppShell/AppShell.tsx`,
`Editor/PathScribeEditor.tsx`, `pages/AuditLogPage.tsx`,
`pages/WorklistPage/ResourcesModal.tsx`, `pages/WorklistPage/LogoutWarningModal.tsx`,
`pages/ConfigurationPage.tsx`, `pages/SynopticReportPage/SynopticReportPage.tsx`,
`pages/Synoptic/Codes/AddCodeModal.tsx`, plus `pages/Home.tsx` and
`pages/AuditLogPage.tsx` (found to have a *third* copy of the same Quick
Links modal, not originally counted in the ~14).
**Issue:** `Common/LookupModal.tsx` already provides a shared modal-overlay
shell, but each file above independently reimplemented the same
backdrop/blur/close-on-click-outside pattern instead of reusing it.
**Status: CLOSED (July 2026).** All files converted to the shared
`ps-overlay`/`ps-modal-dark` classes. Along the way: `Home.tsx`'s own
Quick Links and Safety modals were duplicate implementations of
`WorklistPage`'s versions — eliminated by reuse rather than reformatted a
third time. `AuditLogPage.tsx` had a third, separate copy of the same
Quick Links modal, also consolidated. `EnhancementRequest/EnhancementRequestModal.tsx`
and `InternalNotes/InternalNotesDrawer.tsx` were checked and found
already correct (no changes needed). Full file-by-file detail in
`components/Common/README.md` and `components/README.md`'s Fixes Applied
section.

## 9. DEAD CODE — orphaned PatientReportPage.tsx (found during components/
review, not originally in this doc)
**Files:** `src/components/PatientReportPage/PatientReportPage.tsx`
**Issue:** Routed at `/case/:accession` in `App.tsx`, but every real
navigation in the app goes to `/case/${id}/synoptic` instead (the real
`SynopticReportPage`). Confirmed via full-`src/` grep — zero real
navigation to the bare `/case/:accession` path anywhere. Thin stub reading
from `mock/mockReports.ts`, no real synoptic/grossing workflow. Caught by
Pete, confirmed with him that the real workflow (including grossing)
already correctly lives in `SynopticReportPage`.
**Status: CLOSED (July 2026).** Component deleted, plus its lazy import
and route registration in `App.tsx`. `mock/mockReports.ts` was NOT
deleted — still has a real, live consumer in `pages/FullReportPage.tsx`.
See `components/PatientReportPage/README.md`.

## 10. DATA INTEGRITY — RequestReviewModal.tsx's reviewer list has real ID
collisions with the app's actual user directory (found during
components/ review, not originally in this doc)
**Files:** `src/components/RequestReview/RequestReviewModal.tsx`
**Issue:** `RequestReviewModal.tsx`'s hardcoded `REVIEWERS` list (own
comment: "mirrors AppShell INTERNAL_USERS") had drifted from the real
directory in `AppShell.tsx`. Two IDs collided with different people:
`u3` = System Admin (AppShell) vs Dr. James Chen (RequestReviewModal);
`u4` = Dr. Sarah Li Chen (AppShell) vs Dr. Maria Santos (RequestReviewModal).
**Status: CLOSED (July 2026).** Pete's own analysis correctly identified
that AppShell's directory (general staff, non-clinical) and this modal's
needs (clinically-appropriate reviewers) are legitimately different
scopes — the UK names weren't a deliberate separate pool, the array was
just never connected to any real data source. Fixed by sourcing from the
real, canonical `services/users/mockUserService.ts` directory instead —
filtered to active Pathologist-role users, which is collision-free by
construction (none of its IDs overlap AppShell's `u`-range). See
`components/RequestReview/README.md` for full detail.

## 11. DATA INTEGRITY — participation-types data-source disconnect
**Files:** `Config/System/ParticipationTypesSection.tsx`,
`Config/Staff/RoleDictionary.tsx`
**Issue:** Both maintained a separate, disconnected local list of
participation types, drifted to **different type membership entirely**
from `services/participationTypes/mockParticipationTypeService.ts` — the
real service `CaseTeamModal.tsx` actually uses. Found by tracing a
user-reported drag-and-drop bug back through the data layer.
**Status: CLOSED (July 2026).** Both screens now read/write through the
real service directly. Final 8-type canonical list defined by Pete
against real CLIA/CAP/ACGME clinical role requirements. Also surfaced and
fixed: `TypeModal.tsx` mojibake (a real UI-rendering bug, not just
cosmetic comments as first assessed) affecting the modal title on all 9
admin screens sharing it, and a critical `DemoResetTab.tsx` bug —
`CASE_KEYS` referenced `'ps_cases'`, a key `mockCaseService.ts` never
wrote to (real key: `'cases'`) — meaning Demo Reset had likely never
correctly cleared primary case data. See `components/Config/System/README.md`.

## 12. DUPLICATE COMPONENT — two separate LogoutWarningModal implementations
**Files:** `pages/WorklistPage/LogoutWarningModal.tsx`,
`pages/SynopticReportPage/modals/LogoutWarningModal.tsx`
**Issue:** Same name, genuinely different prop interfaces
(`isOpen`/`onClose`/`onLogout` vs. `show`/`onCancel`/`onConfirm`), and the
second carried its own uncorrected `zIndex: 25000` bug. Raised directly
by Pete given the real support-analyst confusion risk in
`SynopticReportPage.tsx` specifically — a critical, high-traffic file.
**Status: CLOSED (July 2026).** Consolidated into one shared
`components/Common/LogoutWarningModal.tsx`; all 3 real consumers
(`WorklistPage.tsx`, `Home.tsx`, `SynopticReportPage.tsx`) updated.

## 13. SECURITY/COMPLIANCE — no session idle timeout existed anywhere,
plus fabricated audit log entries claiming one worked
**Files:** `contexts/AuthContext.tsx` (had zero timeout logic),
`services/auditlog/mockAuditService.ts` (had 2 fabricated "session
expired after 60 min inactivity" demo entries)
**Issue:** Raised directly by Pete as a real HIPAA Security Rule gap
(automatic logoff is a required technical safeguard). The fabricated
audit entries were a separate, real credibility risk independent of the
missing feature — they falsely implied a real security control had
fired successfully in the past.
**Status: CLOSED (July 2026), full spec built (Phase 1 + Phase 2).**
Fabricated entries removed immediately, before the real feature was even
started. **Phase 1:** real idle-detection timer (`hooks/useIdleTimeout.ts`),
honest warning modal (`Common/SessionExpiryWarningModal.tsx`), forced
logout via `ProtectedRoute.tsx`. Resolution is org-wide default,
overridden per the currently-open case's performing lab
(`Client.idleTimeoutMinutesOverride`) — deliberately per-single-open-case
rather than a multi-institution "strictest among all active permissions"
model, matching PathScribe's actual single-case-focused UI (no existing
user-to-client permissions concept in the data model to build that on).
Real admin UI for both the org default (Configuration → System → Session
Security) and the per-client override (Client Dictionary edit modal).
**Phase 2:** real local draft caching + recovery
(`services/drafts/`, `hooks/useDraftCache.ts`,
`Common/DraftRecoveryModal.tsx`), wired into `SynopticReportPage.tsx`.
Caches the full case (18 distinct dirty-able things found via a full
`markDirty()` call-site audit — an earlier, narrower synoptic-answers-only
version would have silently missed most real editable content),
explicitly excluding the `patient` object (name/DOB/MRN) for HIPAA
minimum-necessary reasoning and to avoid restoring stale demographics
over fresh LIS/EHR data. Restore is local-only, no auto-persist — marks
the case dirty so the pathologist's normal Save Draft review is the real
verification step. Full detail in `components/Common/README.md`,
`components/Config/README.md`.

## 14. LOGIN — Google/Microsoft SSO buttons were fully non-functional,
no onClick handler at all
**File:** `pages/LoginPage.tsx`
**Issue:** Raised by Pete — the two buttons had zero wiring, not
partially built. Real OAuth needs external app registration (Google
Cloud Console, Microsoft Entra ID) plus a real backend for the token
exchange (client secrets can't live in frontend code) — neither exists
in this app yet.
**Status: PARTIALLY CLOSED.** Buttons now `disabled` with a clear
"Coming Soon" state rather than silently doing nothing when clicked.
**HANDED OFF to dev team** — full requirements doc written
(`OAuth-SSO-Requirements.md`, not tracked in this repo — given to Pete
directly), covering the PKCE flow, external provider setup steps, and
the account-linking product decision (recommended: OAuth only
authenticates already-provisioned active staff, no self-service
provisioning) that needs deciding before implementation starts.

## 15. BUG — synoptic template review notifications silently never sent
**Files:** `hooks/useSynopticAudit.ts`, `components/Config/Templates/TemplateRenderer.tsx`
**Issue:** Found via a full organization-check sweep of `services/`,
flagged initially as a routine "duplicate filename" finding
(`synopticNotificationService.ts` existed in two places) — turned out to
be two separate, real, active bugs. (1) The hook imported from
`services/synopticNotificationService.ts`, an honestly-labeled STUB
(console-log only) — the real, complete implementation with recipient
resolution and email templates lived at
`services/communications/synopticNotificationService.ts` the whole time,
correctly exported via its own barrel, just never actually wired to this
hook. (2) Even after fixing the import, `TemplateRenderer.tsx`'s real
state-transition call passed a generic `'state_transition'` action
string left over from the old stub's own separate `NOTIFY_ON_ACTIONS`
list — the real list uses specific per-action strings
(`template.needs_changes`, `template.approved`, etc.), so the
notify-check would have always failed silently regardless.
**Net effect:** reviewer/author email notifications for real protocol
lifecycle transitions (approve/reject/publish/resubmit) were never
actually attempted, with no visible error anywhere — a live bug in an
actively-used feature, not dead code.
**Status: CLOSED (July 2026).** Both fixed; stub deleted (confirmed zero
other consumers). Verified end-to-end via live console testing — the
real recipient-resolution/email-building code path now genuinely
executes (correctly fails only at the final network call, since no real
backend notification endpoint exists yet — expected, not a bug).

## 16. CLEANUP — stale header path comments across services/, found via
check-organization.cjs
**Files:** `services/aiIntegration/PathScribeAIService.ts`,
`services/cases/casePoolAssignmentService.ts`,
`services/templates/templateService.ts`,
`services/templateSuggestions/ISynopticTemplateSuggestionService.ts`,
`services/templateSuggestions/ITemplateSuggestionSignalService.ts`
**Status: CLOSED (July 2026).** All 5 confirmed benign (documented
renames/folder reorganizations, no functional issues) and fixed.
`pages/`, `services/`, `hooks/`, and `contexts/` now all fully clean on
both checks (stale paths + duplicate filenames) — only one known,
already-tracked exception remains in `components/`
(`Staff/RoleDictionary.tsx`, cosmetic, not yet manually removed by Pete).

## 17. CLEANUP — Demo Reset storage-key audit, completed
**Status: CLOSED (July 2026).** Re-ran a full, unrestricted
`storageGet`/`storageSet` audit across `services/` (not limited to the
`pathscribe_` prefix — the exact gap that let the critical `'cases'` bug
in #11 go undetected originally) to get an accurate current list rather
than trust an earlier estimate. Added the 3 remaining real gaps:
`pathscribe_delegation_types_v2`, `pathscribe_internal_notes_v2`
(SETTINGS_KEYS), and `pathscribe_drafts` (CASE_KEYS — built this session
for #13's Phase 2). Confirmed all other real keys already correctly
covered, either directly or via existing mechanisms (`pathscribe_messages`
via its own version-key reseed check; `pathscribe_mock_lis_sync_state`
via the existing `pathscribe_mock_` prefix catch-all).

## N. UI CONSISTENCY — ~36 remaining native `<select>` elements in Config/System
**Status:** Deferred, not urgent. `Dropdown.tsx` (components/Common/) is built,
proven, and ready to reuse whenever this broader pass happens — fixed the
one flagged instance (StaffTab.tsx role-add) as a proof of concept. The
other ~36 need individual review (options shown, single/multi-select,
search needs) before swapping, not a mechanical find-replace. No bearing
on the copyright deposit — purely a UX-consistency item.

## N+1. DOCUMENTATION — template creation/setup workflow clarity
**Status:** Deferred, not urgent. The full synoptic template lifecycle
(build in `SynopticEditor.tsx` → save draft → submit for review →
`TemplateRenderer.tsx` approve/reject → publish) is a genuinely complex,
multi-step process spanning multiple files and states
(draft/in_review/needs_changes/approved/published), surfaced while
tracing #15's notification bugs. Worth a dedicated review of whether the
actual setup process is clearly documented/discoverable for someone
doing it for the first time, independent of whether the underlying code
itself is correct. Not a code bug — a workflow-clarity/documentation
concern. No bearing on the copyright deposit.

N+2. FUTURE ENHANCEMENT β€” AI biomarker extraction from Gross/Microscopic narrative text
Surfaced while reviewing orchestrator/contextBuilder.ts β€” discussed initially as a novel, higher-risk category of AI use (LLM extraction from free text vs. structured field entry), but that caution was corrected on investigation: services/aiIntegration/IAIIntegrationService.ts already has exactly this pattern built and proven β€” suggestSynopticFields(caseText, fields) returns AiFieldSuggestionResult { value, confidence, source } per field, where source is a short quote from the case text the suggestion was extracted from. This is the same safeguard (traceable provenance back to source narrative) that would be needed for biomarker extraction specifically β€” meaning this isn't a new AI-safety design problem, just wiring the existing, already-safeguarded infrastructure to a biomarker-specific field set. Genuine value confirmed with the S26-4437 lung case as a concrete example: PD-L1/KRAS results existed only as unstructured prose in "Ancillary Studies," not surfaced as a structured, displayable field the way ER/PR/HER2 is for breast cases. Not scoped for this session given copyright-deposit timing, but meaningfully lower-risk and lower-effort than first assessed β€” a good candidate for early post-deposit work, likely paired with the broader flexible-biomarker-structure redesign already logged separately (see FullReportPage.tsx's Notes, this same review).

Digital pathology viewer / material-list provenance β€” CoPilot mode needs real LIS integration, not PathScribe's own mock blocks. If a future digital pathology viewer links biomarker results back to specific blocks/slides, the material list (blocks, stains, slide scans) must come from the host LIS in CoPilot mode (likely via the existing services/hl7/ scaffolding), not from Specimen.blocks's own mock/demo model β€” that model is real and appropriate for Orchestration mode (where PathScribe owns the lifecycle), but presenting it as CoPilot material data would misrepresent PathScribe's own placeholder as real LIS-sourced data. Raised while discussing the Markers panel's provenance-tag idea; not blocking, since the current Markers panel scope shows resolved values only, no image links yet.
