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
**Status: CLOSED (July 2026) — route removal only; file deletion
never actually landed until now.** The route registration and lazy
import in `App.tsx` were genuinely removed back in July, confirmed
clean. But the three files themselves — `protocolRegistry.ts`,
`ProtocolEditor.tsx`, `types/ProtocolDefinition.ts` — were still
sitting on disk, contradicting this entry's own "All 3 files deleted"
claim. Found while answering a direct question about README coverage
(checking `src/protocols/` turned up the discrepancy). Verified
carefully before completing the deletion — a grep for these names hit
two files (`PathScribeEditor.tsx`, `caseFilterUtils.ts`), checked each
match individually rather than trusting the grep alone (the same
lesson from the `serviceResult.ts` near-miss earlier in this review)
and confirmed both are just comments mentioning the name in passing,
not real imports. Genuinely dead, confirmed zero real references.
Deleted all 3 files now; `src/protocols/` removed as it's now empty.
`npx tsc --noEmit -p .` zero errors after.

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
Deferred to full UI/UX usability study β€” faint border pattern (rgba(148,163,184,0.2)) used inconsistently across 24 locations in pathscribe.css. Some are appropriately subtle (modals, dropdowns, input fields); others are interactive elements that may benefit from stronger visual treatment, similar to the fix applied to .ps-hb-compact-nav-btn (the compact header's Worklist/Full-view buttons) during tonight's session. Not to be addressed piecemeal β€” hold for the study's own findings and treat as a broader UI/UX cleanup pass, the same way the codebase itself has been getting a systematic review.

Future enhancement: real, granular material-status tracking, sourced from actual lab systems rather than derived internally.

Today's stepper fix uses caseData.status (case-level) and the existing HistologyBlock.status/StainOrder.status fields as PathScribe's own best-available internal signal β€” appropriate for a pre-integration, demo-stage app, but explicitly an interim stand-in, not the real architecture.

The real architecture, once lab-system integrations exist:

LIS (CoPilot mode) owns the clinical report and patient demographics β€” the case-level source of truth.
Lab tracking/middleware systems (e.g., Roche Vantage/navifyΒ® Pathology Lab Advantage, Leica CEREBRO) own the physical bench state β€” real-time location and preparation status of every block and slide, tracked via barcode verification at each touchpoint (grossing station, microtome, stainer). These are genuinely the source of truth for material status, not the LIS and not PathScribe.
Integration pattern: HL7 v2.x (ORM/ORU messages) or vendor-specific REST/WebSockets, depending on query-based vs. pub/sub event delivery. Expected payload shape: AccessionNumber/CaseID, SpecimenID/BlockID/SlideID, StationID/TechID/Timestamp, MaterialStatus (e.g., CUT_AND_PLACED, STAINING, COVERSLIPPED), StainProtocol (e.g., H&E, IHC ER/PR, Ki-67).

Granular stepper taxonomy (specimen β†’ block β†’ slide level), for whenever real per-touchpoint status becomes available:

Entity	Status	Stepper Stage	Triggering Event
Specimen	Received/In-Transit	0 (Accessioning)	Container logged at intake
Specimen	Accessioned	0 (Accessioning)	Barcode scanned, case ID assigned
Specimen	Grossing/In-Grossing	0 (Grossing)	Dissected, measured, cut
Specimen	Gross Complete	0 (Grossing)	Returned to fixative bench
Block	Cassette Printed	0 (Grossing)	Barcode cassette generated
Block	Tissue Placed/Loaded	0 (Grossing)	Section placed in cassette
Block	Fixing/In-Fixative	1 (Processing)	Submerged in NBF
Block	Processing	1 (Processing)	Automated tissue processor run
Block	Embedding	1 (Processing)	Paraffin poured, cooled
Block	Block Ready	1 (Processing)	Trimmed, queued for cutting
Slide	Label Printed	2 (Sectioning)	Slide label generated
Slide	Cut & Floating	2 (Sectioning)	Ribbon cut, floated
Slide	Mounted & Drying	2 (Sectioning)	Baked in drying oven
Slide	Staining	2 (Staining)	Automated stainer run
Slide	Coverslipped	2 (Staining)	Coverslip applied
Slide	Ready for Review/Digitized	2 (Staining/WSI)	Scanned or trayed
Case/Slide	Pending/In-Review	3 (Synoptic/Sign-Out)	Pathologist opens case
Case/Slide	Recut/Special Ordered	3 β†’ re-enters Stage 2	Deepers/IHC ordered
Case/Specimen	Finalized/Signed-Out	3/4 (Sign-Out)	Report electronically signed

Regional terminology variants (relevant once real per-region LIS/lab-system integrations exist β€” cosmetic without them):

US (CAP/CLIA/APLIS): PA-centric workflow, S26-12345 A1 specimen/block format, discrete LIS timestamps for In-Grossing/Embedded/Coverslipped, IHC Ordered/Reflex Staining/Level or Deeper Requested.
UK/Ireland: England/Wales use Booking-In rather than "Accessioning"; Scotland (NSS standards) uses Cassettes pre-embedding, Cut & Stained/Trayed for Pathologist; Northern Ireland (BSO/HSC) uses BMS Validation; Ireland (HSE/INAB/ISO 15189) uses Cut & Placed/H&E Complete/Dispatched to Consultant.
Canada: CSMLS/provincial (Ontario Health, AHS) terms β€” Receiving/Accessioning, Cut/Grossed, Processed, Cut & Stained, Distributed; BC/Quebec add Scanned/Pushed to PACS.
Australia/NZ (RCPA/NATA/IANZ): "Grossing" β†’ Cut-Up/Gross Examination; Cassette Cut-Up, Tissue Processing, Embedding, Sectioning; slides Sectioned β†’ Stained & Coverslipped β†’ Assigned to Pathologist.

Not urgent, not a current capability gap β€” the existing block.status/stain.status fields give a pathologist/PA the practical signal they need today (is material ready to work with). This entry is for when PathScribe pursues deeper LIS-adjacent integration or serves customers where region-accurate terminology genuinely matters, not before.
## No case locking / concurrency control exists anywhere in the application

**Confirmed via direct code search (July 2026)** — no `isLocked`, `lockedBy`,
version field, or any conflict-detection mechanism exists anywhere in
`services/cases/` or the pages that call into it. `caseRouter.updateCase()`
unconditionally overwrites whatever's in the mock/backend service with
whatever patch it's given — there is no check for whether the record has
changed since it was last read.

**Real-world risk:** if two sessions have the same case open at once (two
browser tabs, two pathologists, a pathologist and someone they delegated
to) and both save, the second save silently and completely overwrites the
first — with zero warning to either user, and no record in the audit log
that a conflicting write occurred. This is a genuine data-integrity risk
in a clinical application, not a cosmetic gap — it's a materially
different category from most other items on this list.

**Why it matters more than it might for a typical app:** PathScribe
already has multiple real workflows where more than one person can
reasonably touch the same case — Delegation, Pool claiming, Case Team
assignment. Any of these could plausibly result in two people having the
same case open concurrently, especially as usage scales beyond a single
pathologist.

**Not designed here — needs its own dedicated discussion.** Several
legitimate approaches exist with different trade-offs (a "someone else
has this case open" warning banner, optimistic locking via a version
number with a conflict-resolution UI on save, pessimistic checkout/lock
on open, etc.) — this entry is deliberately scoped to documenting that
the gap exists and why it matters, not prescribing the fix.

**Status:** flagged, not yet prioritized. Pete to decide when this moves
up the queue.

## 18. UI CONSISTENCY — Inline styles found across 39 files in src/pages/
**Found during:** the `src/pages/` review pass (August 2026), starting
with `pages/system/ClientDictionaryPage.tsx`.
**Issue:** The stated CSS philosophy is "no inline styles anywhere in
the codebase; all styling via named classes in `pathscribe.css`." A grep
for `style={{` across `src/pages/` turned up 39 files still using it,
including `SynopticReportPage.tsx` itself and most of its `components/`
and `modals/` subfolders, `SearchPage.tsx`, `WorklistPage.tsx`,
`AccessionPage/`, `Home.tsx`, and others. This wasn't a one-off — it's a
real, systemic gap against a hard rule, not a style nitpick.
**Approach:** Not a separate deferred sweep (unlike the native-`<select>`
and border-pattern items above, which are judgment calls). This one
gets fixed incrementally, file by file, as the `src/pages/` review pass
reaches each one — extract to a named class in `pathscribe.css` at the
point of review, same as any other real issue found during that pass.
**Status: IN PROGRESS.**
- [x] `pages/system/ClientDictionaryPage.tsx` — 2 instances fixed
      (`.config-section-loading`, `.config-section-header-row`)
- [x] `pages/AccessionPage/IntraopMergePromptModal.tsx` — 2 instances
      fixed (`.ps-intraop-note-group`, `.ps-intraop-merge-intro--footer`)
- [x] `pages/SearchPage.tsx` — all instances fixed (~136 down to 7
      legitimate `--accent` custom properties); the largest file in the
      review at 2,199 lines. See item #29 for full findings — this
      completes the checklist (39/39)
- [x] `pages/Home.tsx` — all instances fixed (`.ps-home-*` family, ~40
      instances, including a card-accent color parameterized via CSS
      custom properties rather than raw inline rules); also fixed a
      profile-modal `color-contrast` failure, removed a dead `as any`
      ternary, moved a mount-time `document.body.style.margin` mutation
      into a real CSS reset, and found (but did not fix, see item #26)
      that the whole "User Preferences" modal is unreachable
- [ ] `pages/ReportPreview/ReportPreviewRenderer.tsx`
- [x] `pages/AuditLogPage.tsx` — all instances fixed (`.ps-auditlog-*`
      family, ~69 instances); also fixed 4 direct-DOM-mutation hover
      hacks, removed the last `as any` cast, consolidated a
      third independent copy of the ConfigurationPage.tsx-style
      localStorage role-parsing duplication onto `useAuth()`, extracted
      a `stats` computation out of an inline JSX IIFE, and fixed a real
      bug — see item #25
- [x] `pages/FullReportPage.tsx` — all instances fixed (`.ps-report-*`
      family, ~60 instances plus the JS-object style-token pattern it
      was built on); also removed 3 direct-DOM-mutation hover hacks
      (replaced with CSS `:hover`), narrowed 2 redundant `any`-on-`any`
      casts on `location.state` to a real interface, and extracted an
      inline JSX display-string computation to a named const
- [ ] `pages/Synoptic/Delegate/DelegateModal.tsx`
- [ ] `pages/Synoptic/UI/SaveToast.tsx`
- [ ] `pages/Synoptic/Codes/AddCodeModal.tsx`
- [ ] `pages/WorklistPage/WorklistPage.tsx`
- [ ] `pages/WorklistPage/ResourcesModal.tsx`
- [x] `pages/DeficienciesPage.tsx` — 2 instances fixed
      (`.ps-defic-trend-tooltip-closed`/`-reopened`); also removed 2
      unnecessary `as any` casts on `toLocaleDateString` options objects
      and replaced a third `any` (the recharts `Tooltip` content prop)
      with the library's own real `TooltipContentProps` type
- [x] `pages/ConfigurationPage.tsx` — all instances fixed
      (`.ps-cfgpage-*` family); also consolidated `useIsAdmin`/
      `useIsSuperAdmin` to read `useAuth()` instead of re-parsing
      `localStorage` directly (was duplicating `AuthContext`'s own
      storage read), and replaced a direct-DOM-mutation hover hack
      (`onMouseEnter`/`onMouseLeave` setting `e.currentTarget.style`)
      with a real CSS `:hover` rule
- [ ] `pages/SynopticReportPage/components/EMRSidecarDrawer.tsx`
- [ ] `pages/SynopticReportPage/components/MaterialTreePanel.tsx`
- [ ] `pages/SynopticReportPage/components/InformalReviewBanner.tsx`
- [ ] `pages/SynopticReportPage/components/BottomActionBar.tsx`
- [ ] `pages/SynopticReportPage/components/LeftReportPanel.tsx`
- [ ] `pages/SynopticReportPage/components/AddSynopticModal.tsx`
- [ ] `pages/SynopticReportPage/components/Sidebar.tsx`
- [ ] `pages/SynopticReportPage/components/MarkersPanel.tsx`
- [ ] `pages/SynopticReportPage/components/OrchestratorSectionEditor.tsx`
- [ ] `pages/SynopticReportPage/components/HeaderBar.tsx`
- [ ] `pages/SynopticReportPage/components/RightSynopticPanel.tsx`
- [ ] `pages/SynopticReportPage/components/SequencerPanel.tsx`
- [ ] `pages/SynopticReportPage/modals/BlockStainEditorModal.tsx`
- [ ] `pages/SynopticReportPage/modals/AiReviewModal.tsx`
- [ ] `pages/SynopticReportPage/modals/UnsavedWarningModal.tsx`
- [ ] `pages/SynopticReportPage/modals/PreFinalisationModal.tsx`
- [ ] `pages/SynopticReportPage/modals/CaseTeamModal.tsx`
- [ ] `pages/SynopticReportPage/modals/DiscordanceReconciliationModal.tsx`
- [ ] `pages/SynopticReportPage/modals/CaseSignOutModal.tsx`
- [ ] `pages/SynopticReportPage/modals/ProtocolChangeModal.tsx`
- [ ] `pages/SynopticReportPage/modals/AddOrdersModal.tsx`
- [ ] `pages/SynopticReportPage/SynopticReportPage.tsx`
- [x] `pages/IntraopQueuePage.tsx` — 3 instances fixed
      (`.ps-intraop-discard-body`, `.ps-intraop-report-actions`,
      `.ps-intraop-desktop-switch-link`); also resolved item #24's
      pending contrast fix (`.ps-intraop-timeline-time`,
      `.ps-intraop-note-label`)
- [x] `pages/MockEMRPage.tsx` — all instances fixed
      (`.ps-mockemr-*` family); also removed 2 unnecessary `as any`
      casts
- [x] `pages/ContributionDashboardPage.tsx` — all instances fixed
      (~90 instances, the most of any file reviewed so far); also
      removed all 10 `any` casts (verified none load-bearing),
      extracted a Teaching Cases IIFE to a proper named component,
      fixed a real WarningIcon color-prop bug, consolidated two
      duplicate CSS class definitions, and fixed WCAG contrast +
      keyboard-access issues — see item #28

Also noted in passing, not yet actioned: the flex/space-between/
flex-start header-row pattern this fix introduced
(`.config-section-header-row`) is separately duplicated near-verbatim
under several other class names already in `pathscribe.css`
(`.ps-del-header` x4, `.ps-sub-header` x2, `.ps-tat-header`,
`.ps-tat-client__section-header`, `.ps-tat-trend__header`) — a class-
duplication problem distinct from this inline-style one. Not scoped
into this item; logging so it isn't lost.

**AccessionPage/AccessionPage.tsx** — reviewed, no inline styles found
(clean already; not on the list above).

## 19. UI CONSISTENCY — window.confirm() used directly instead of ConfirmModal
**Found during:** the `src/pages/` review pass (August 2026),
`AccessionPage/AccessionPage.tsx`'s `handleImportOrder`.
**Issue:** `components/Common/ConfirmModal.tsx`'s own README describes it
as "explicitly meant to replace `window.confirm()` throughout the app."
A grep for `window.confirm(` across `src` found 5 files still calling it
directly: `AccessionPage/AccessionPage.tsx` (the "this form has unsaved
info, importing will replace it — continue?" gate before an order
import), `components/Config/System/RoutingRulesSection.tsx`,
`components/AppShell/AppShell.tsx`, `components/InternalNotes/InternalNotesDrawer.tsx`.
(`components/Common/ConfirmModal.tsx` itself also matched the grep —
that's its own doc comment referencing `window.confirm()`, not a real
usage.)
**Why not fixed on the spot:** unlike the inline-style item above, this
isn't a mechanical extraction — `window.confirm()` blocks synchronously
and the calling code continues in the same function afterward;
`ConfirmModal` is async/UI-driven and needs the calling function's
control flow restructured (pending-confirmation state, continuation
logic split out) to convert correctly. That's a real behavioral change
per call site, not a find-and-replace, so it deserves its own scoped
pass with its own verification rather than being bundled into whichever
file happens to have one.
**Status: FIXED.** All 4 files converted, 7 total call sites (the
"4 files" count above was distinct files — `AppShell.tsx` alone had 4
separate calls, one per Messages-drawer delete/close action):
- `RoutingRulesSection.tsx` — 1 site (delete routing rule), straightforward
- `InternalNotesDrawer.tsx` — 1 site (delete note), straightforward
- `AccessionPage.tsx` — 1 site, the trickiest of the three simple ones:
  the confirm sat at the top of an 80-line `handleImportOrder`. Split
  into `doImportOrder` (the unchanged import logic) plus a thin
  `handleImportOrder` gate that either calls it directly or opens the
  modal first, rather than duplicating the 80 lines.
- `AppShell.tsx` — 4 sites, each with different real logic to preserve
  exactly: `handlePermanentDelete` (simple), `handleEmptyDeleted`
  (needed the message count captured before opening the modal, for the
  message text), `handleBulkDelete` (only the `filterType === 'deleted'`
  branch needed confirmation — the soft-delete branch still runs
  immediately, unchanged), `handleCloseDrawer` (a three-way branch:
  dirty+confirmed → close, not-dirty → close directly with no modal,
  dirty+cancelled → stay open — converted without collapsing the
  not-dirty fast path into an unnecessary modal).
**Verified:** `npx tsc --noEmit -p .` zero errors; confirmed via grep
that zero real `window.confirm()` calls remain anywhere in `src`
(every remaining match is a comment); smoke-tested the Messages drawer
and Accession page for runtime errors — none found.
**Status:** flagged, not yet actioned. 4 real call sites once
`ConfirmModal.tsx`'s own self-reference is excluded.

## 20. TYPE SAFETY — `import.meta.env.VITE_*` is untyped everywhere (all 22 vars)
**Found during:** the `src/pages/` review pass (August 2026),
`LoginPage.tsx`'s `resolveEnvironment()`.
**Issue:** `LoginPage.tsx` accessed `VITE_APP_ENV` through an unnecessary
double-cast: `(import.meta as unknown as { env?: Record<string, string> }).env?.VITE_APP_ENV`.
Traced why: Vite's own `ImportMetaEnv` base type
(`node_modules/vite/types/importMeta.d.ts`) extends
`Record<string, any>` as a permissive fallback for projects that haven't
declared their own env shape. That means every one of the 22 distinct
`import.meta.env.VITE_*` reads across the codebase — `VITE_AI_API_KEY`,
`VITE_AI_MODEL`, `VITE_UMLS_KEY`, `VITE_QA_ENABLED`, etc. — is currently
typed `any`, not just this one. A typo in any of these var names
anywhere would silently return `undefined` with zero compile-time
warning. **Fixed:** removed the double-cast in `LoginPage.tsx` itself —
confirmed via `npx tsc --noEmit -p .` that `import.meta.env.VITE_APP_ENV`
already type-checks fine without it (it was pure dead weight, same
category as the `any` casts elsewhere in `DEAD_CODE_TRACKING.md`).
**Not fixed:** the underlying project-wide gap. Vite supports declaring
a proper `interface ImportMetaEnv { VITE_FOO: string; ... }`
augmentation in `vite-env.d.ts` (declaration merging — additive only,
doesn't require touching any of the 22 consuming files individually) to
get real typing everywhere at once. Not done here because getting it
right means confirming each var's actual contract (required vs.
optional, string vs. boolean-like string, which ones are secrets that
should never be read client-side per the earlier `VITE_`-prefix
API-key-exposure fix) — real research, not a mechanical add, so it's
its own scoped item rather than a byproduct of reviewing one page.
**Status:** flagged, not yet actioned.

## 21. TYPE SAFETY / DUPLICATION — recharts Tooltip content typed `any` in 5 places
**Found during:** the `src/pages/` review pass (August 2026),
`DeficienciesPage.tsx`'s trend chart.
**Issue:** The exact same custom-tooltip pattern —
`<Tooltip content={({ active, payload, label }: any) => { if (!active || !payload?.length) return null; ... }}>`
— is duplicated near-verbatim across 5 files:
`pages/DeficienciesPage.tsx` (fixed here),
`components/Contribution/QualityTab.tsx`,
`components/QualityAssurance/ReconciliationTab.tsx`,
`components/QualityAssurance/CountersignTurnaroundTab.tsx`,
`components/QualityAssurance/IntraopLinkageTab.tsx`. Both the `any` typing
and the duplicated null-guard/shape logic repeat every time.
**Fixed here:** `DeficienciesPage.tsx`'s copy now uses recharts' own
exported `TooltipContentProps<TValue, TName>` type instead of `any` —
verified via `npx tsc --noEmit -p .` that it type-checks cleanly with no
changes needed to the function body itself.
**Not fixed:** the 4 copies in `components/` — those were already
covered by the earlier, separate `components/` review pass, so
re-touching them here would blur which review found what. Also a
genuine candidate for extracting one shared `<TrendTooltip>` component
instead of 5 independent copies, but that's a bigger consolidation
decision (shared component API, where it lives) than a type-annotation
swap.
**Status: FIXED, 5/5.** Picked back up as part of clearing this
session's deferred items. All 4 remaining files converted the same
way. Bonus finds while in each file: `QualityTab.tsx` had 2 more `any`
casts beyond the Tooltip one — `intraopRes.data as any` (dead weight,
confirmed via `tsc`) and a custom recharts tick-renderer component
(`YBTick`) typed `({ x, y, payload }: any)`; recharts doesn't export a
clean type for this exact custom-tick shape, so it got a minimal
accurate local type instead of staying `any`.
`ReconciliationTab.tsx`/`CountersignTurnaroundTab.tsx`/
`IntraopLinkageTab.tsx` each had the identical extra pair of `any`
casts too (`(c: any) => {...}` in a `.forEach`, and a
`toLocaleDateString(..., {...} as any)` — both confirmed dead weight).
All 6 removed. Verified via `npx tsc --noEmit -p .` — zero errors
project-wide.

## 22. ACCESSIBILITY — Messages drawer had 2 critical button-name violations
**Found during:** a real Playwright + axe WCAG audit (2A/AA, 2.1A/AA) run
against every page touched in the `src/pages/` review pass so far, done
after the `NavBar.tsx` tooltip fix to verify it didn't miss anything —
see item below this one for the audit's clean results on the actual
review work.
**Issue:** Opening the Messages drawer (`components/AppShell/AppShell.tsx`'s
`MessageListPanel`) surfaced 2 **critical** `button-name` violations —
worse than a missing hover tooltip, these buttons had literally no
accessible name at all (no `aria-label`, no `title`, no text content,
just a bare SVG): the filter button (`.ps-msg-filter-btn`) and one of
three `.ps-msg-close-btn` variants (thread view, compose view, empty/
default view — only the one active in that render was caught by the
scan, but all three shared the same gap). Also 1 serious
`scrollable-region-focusable` violation: `.ps-msg-list` scrolls but had
no way to reach it via keyboard.
**Status: FIXED.** Added matching `aria-label`/`title` to the filter
button and all three close-button variants; added `title` to the
existing "Back to message list" button (had `aria-label` only, same
gap pattern as the original `NavBar.tsx` tooltip bug); added
`tabIndex={0}`/`role="region"`/`aria-label` to `.ps-msg-list`. Re-ran
the same audit after the fix — confirmed 0 critical violations and 0
`scrollable-region-focusable` violations on the Messages Drawer, down
from 2 critical + 1 serious. Verified via `npx tsc --noEmit -p .`.

## 23. ACCESSIBILITY — color-contrast on shared nav/tab classes and the Messages drawer
**Found during:** the same audit as item #22 above.
**Issue:** `color-contrast` violations on `.ps-nav-user-role` ("MD,
FCAP" text in the nav) appeared on literally every page audited, since
`NavBar` is global. `.ps-tab-btn`, `.ps-label`, and the `.ps-conf-*`
config-table family (`--ps-conf-text-3`, 12 usages) also showed up
wherever they're used (Accession, Configuration, Deficiencies). None of
these classes were touched by anything in this review session before
this audit — confirmed by checking which classes actually appeared in
each page's violation list before concluding this wasn't a regression
from the `src/pages/` work.
**Status: FIXED.** Per direction ("even though you may not have
directly caused the issue found, we are correcting them... we want to
be proud of this application") — these got fixed rather than deferred
to the planned formal WCAG certification. Changes, all verified via
re-running the full audit after each:
- `.ps-nav-user-role`: `#64748b` (~3.75:1) → `#94a3b8` (~6.96:1)
- `.ps-tab-btn`: base `#64748b` → `#94a3b8`; hover bumped from the old
  base color to `#e2e8f0` to preserve a visible hover step
- `.ps-label`: `#475569` (~2.36:1, the worst of the three) → `#94a3b8`
- `--ps-conf-text-3` (root variable, 12 consumers): `#64748b`
  (measured 4.15-4.23:1 in its real contexts) → `#8291a8` (~6.3:1) —
  chosen slightly darker than `--ps-conf-text-2` (`#94a3b8`) to keep
  the two-tier muted-text hierarchy visually distinct rather than
  collapsing them to the same color
- `.ps-accession-order-picker-empty`: was `var(--ps-text-muted)`
  (nominally `#94a3b8`) but measured as an effectively diluted `#6b7f99`
  (4.38:1) in its real composited context — given an explicit literal
  `#b0bccc` instead of relying on the variable, to keep enough margin
- The breadcrumb bar in `components/AppShell/AppShell.tsx` — converted
  from inline styles (3 failing colors: `#334155` separator ~1.6:1,
  `#64748b` modal-crumb span and link button, both ~3.75:1) to a new
  `.ps-crumb-*` class family, all now `#94a3b8` (link hover: `#e2e8f0`).
  This also eliminated another instance of the direct-DOM-mutation
  hover anti-pattern (`onMouseEnter`/`onMouseLeave` writing
  `e.currentTarget.style.color`) — same pattern already fixed in
  `ConfigurationPage.tsx` and `FullReportPage.tsx` earlier in this
  review.
- Messages drawer, two distinct problems found via the drawer's own
  audit: (1) the `.urgent-row` background tint (`--msg-urgent-dim`,
  semi-transparent red) darkened the effective backdrop enough that
  `.urgent-avatar` and `.ps-msg-urgent-pill`'s red text
  (`var(--msg-urgent)` / `#ef4444`) dropped to 4.44:1 and 4.07:1 —
  brightened both to `#f87171` (already used elsewhere in the app as
  the accessible-red tone, e.g. `DeficienciesPage`'s "reopened" trend
  line), ~6:1 and ~5.5:1 respectively. (2) Separately, and more
  significantly — `--msg-muted` (`#4e607a`) measured only 3.0:1 against
  the drawer's real background, and `.ps-msg-row-preview`'s own
  hardcoded `#3a4d62` measured 2.21:1 — both failing everywhere they're
  used as real text (row timestamps/subjects/previews, thread meta,
  form labels, recipient roles, edit-mode selection count), not just in
  urgent rows. Fixed at the root: `--msg-muted` → `#94a3b8` (~7.5:1),
  `.ps-msg-row-preview` switched from its own hardcoded color to the
  same shared variable. `--msg-muted` has 27 total consumers; the
  others are `::placeholder` text and `:disabled` controls (both
  legitimately exempt from WCAG's text-contrast requirement) or
  icon/border/background fills (a different, lower 3:1 threshold) —
  triaged individually before concluding a root-level fix was safe
  rather than assuming.
**Verified:** re-ran the full page-by-page audit after every change.
Final state: Login, Home, Accession, Configuration, Deficiencies, Full
Report (both variants), Mock EMR, and the Messages Drawer all show 0
violations. Also ran the broader existing `wcag_audit.cjs` (covers
Worklist, Search, Audit Log, Intraop Queue — pages outside this
session's review scope) to check for regressions and ripple effects:
Worklist, Search, and Audit Log are now also fully clean (positive
ripple effect from the shared classes fixed above, without touching
those pages directly) — Intraop Queue is not, see item #24 below.

## 24. ACCESSIBILITY — color-contrast on IntraopQueuePage.tsx (FIXED)
**Found during:** the broader `wcag_audit.cjs` run in item #23, run to
check for regressions outside this session's review scope.
**Issue:** `.ps-intraop-timeline-time` and `.ps-intraop-note-label` (6
elements on the one card tested) fail `color-contrast`. Page-specific
classes, not part of any shared family touched in this session.
**Status: FIXED**, folded into the full `IntraopQueuePage.tsx` review
pass as planned. Both bumped `#64748b` → `#94a3b8`. Re-ran the audit
after — confirmed both classes were actually present in the tested
DOM (8 instances each, not just theoretically reachable) and passed
clean.

## 25. BUG — AuditLogPage.tsx's Resources modal had no way to ever open
**Found during:** the `src/pages/` review pass (August 2026),
`AuditLogPage.tsx`.
**Issue:** The page declared `isResourcesOpen` state and rendered
`<ResourcesModal isOpen={isResourcesOpen} .../>`, but never set
`isResourcesOpen` to `true` anywhere — no button, no keyboard shortcut,
no event listener. Compared against `WorklistPage.tsx`, which renders
the same `ResourcesModal` correctly: that file listens for a global
`PATHSCRIBE_PAGE_OPEN_RESOURCES` window event (presumably dispatched by
a voice command or keyboard shortcut elsewhere in the app) and calls
`setIsResourcesOpen(true)` in response. `AuditLogPage.tsx` was simply
missing that `useEffect` entirely — the modal was fully wired up and
functional, just permanently unreachable.
**Status: FIXED.** Added the same `PATHSCRIBE_PAGE_OPEN_RESOURCES`
listener `WorklistPage.tsx` already uses, mirroring that working
pattern exactly rather than guessing at what the trigger should look
like.

## 26. BUG — Home.tsx's "User Preferences" modal is unreachable (RESOLVED)
**Found during:** the `src/pages/` review pass (August 2026),
`Home.tsx`.
**Issue:** `Home.tsx` tracked `isProfileOpen` state and rendered a full
"User Preferences" modal off it — originally the Appearance theme
picker (Light/Dark/Auto), "Support & Protocols", and "About PathScribe"
links — but nothing in the file ever called `setIsProfileOpen(true)`.
No button, no listener, nothing. Same category of bug as item #25
(`AuditLogPage.tsx`'s `ResourcesModal`), but this one wasn't fixed the
same mechanical way at first, because unlike that case there was no
clear working sibling to mirror. Traced the actual mechanism:
`SynopticReportPage.tsx` (a page that renders `NavBar` directly rather
than going through the shared `AppShell` layout) passes its own
`onProfileClick={() => setIsProfileOpen(!isProfileOpen)}` to `NavBar`,
wiring the nav avatar click to its own local profile modal. `Home.tsx`
goes through the shared `AppShell` instead, and confirmed by direct
testing: clicking the nav avatar while on the Home page opens
`AppShell`'s own badge/System-Information modal (a different, working,
separate feature), not `Home.tsx`'s local one — confirming
`Home.tsx`'s `isProfileOpen` modal was orphaned, left behind when the
app moved from each page owning its own `NavBar` to the shared
`AppShell` layout.
**Resolution — Pete's product decision, reached in conversation:**
- The Appearance theme-picker content was already gone (see item #27,
  theme descoped to dark-only).
- Comparing the two modals directly (Pete's own instinct, confirmed by
  checking the actual code): `AppShell`'s working badge modal
  (internal — User Guide, Admin Guide, System Information) and the
  nav's "Clinical Links" (external reference material) already covered
  different, legitimate purposes — no need to merge those two.
  "Support & Protocols" and "About PathScribe" in the orphaned modal
  were the real duplicates: "Support & Protocols" was a single
  hardcoded link to cap.org, already covered by Clinical Links; "About
  PathScribe" showed a **hardcoded, stale** "Version 1.0.0 | Build:
  2026-02-14" string, while `SystemInfoModal` (reachable from the
  working badge modal) already shows the real, live `__APP_VERSION__`
  injected from `package.json`.
- Also found and folded in: `Home.tsx`'s separate `ResourcesModal`
  (`quickLinks` — Protocols/References/Systems sections) had the
  *same* orphaned-trigger bug (fourth occurrence of this pattern, see
  items #25/#29) and had drifted into its own separate URLs for
  CAP/WHO — a real duplication bug (three independently-maintained
  "same link" lists that diverged over time, each pointing somewhere
  slightly different for the same resource).
- **Final result:** `components/NavBar/NavBar.tsx`'s `EXTERNAL_LINKS`
  is now the one canonical external-resources list — folded in
  UpToDate, kept whichever of the drifted URLs was more specific per
  link, dropped two placeholder Systems links (Hospital LIS/Lab
  Management, both dead `#` hrefs that never went anywhere). Clinical
  Links also upgraded from plain `target="_blank"` anchors to the same
  `useCompanionWindow` hook `PubMedTicker.tsx` already uses (Pete's own
  suggestion) — real UX improvement over a plain new tab: positions on
  a second monitor when available, reuses one window across clicks
  instead of piling up duplicate tabs, remembers where the user
  dragged it. `closeOnUnmount: false` since this is reference material
  with no patient context, matching the hook's own documented intent
  for exactly this case.
- `Home.tsx`'s `isProfileOpen` modal, `showAbout`/"About PathScribe"
  modal, and `ResourcesModal` wiring all deleted entirely — 273 → 125
  lines. `LogoutWarningModal`/`showWarning` deliberately left in place
  even though it has the *same* orphaned-trigger bug (confirmed via
  git history — never called anywhere) — that's a separate finding
  outside what was actually discussed and agreed, not silently
  bundled into this cleanup.
**Also cleaned up:** removed the now-dead `.ps-home-profile-*`/
`.ps-home-about-*` CSS classes. `HelpIcon` (in addition to
`SunIcon`/`MoonIcon`/`MonitorIcon` from item #27) is now unused
anywhere in the app — same note as before, not removed from the
shared `Icons.tsx` library unilaterally.
**Verified:** `npx tsc --noEmit -p .` zero errors; re-ran the WCAG
audit on both the Home page and the Clinical Links modal — 0
violations on both; confirmed via testing that the consolidated
4-link list renders correctly and no console/page errors appear.
**Status: FIXED.**

## New finding, not fixed — `LogoutWarningModal` orphaned trigger
**Found during:** the item #26 cleanup above, checking git history to
confirm `Home.tsx`'s `LogoutWarningModal` wiring was safe to leave
untouched.
**Issue:** Same bug category as items #25/#26/#29 — `Home.tsx` tracks
`showWarning` state and renders `LogoutWarningModal` off it, but
`setShowWarning(true)` is never called anywhere in the file. No
button, no listener. This predates today's changes and wasn't touched
by them.
**Status:** flagged, not fixed — wasn't part of what was actually
discussed/agreed for this cleanup pass.

## 27. UX GAP — Appearance theme picker only ever affects the Home page (RESOLVED — descoped)
**Found during:** the same review pass, before item #26 above made the
picker's reachability question moot in practice.
**Issue:** Every CSS custom property the theme engine sets
(`--bg-color`, `--text-color`, `--text-secondary`, `--nav-bg`,
`--border-color`, `--bg-filter`) is consumed only by `Home.tsx`'s own
page-shell classes and `PubMedTicker` — confirmed by checking every
consumer in `pathscribe.css`/`research-ticker.css`. Every other page
hardcodes its own dark-theme colors directly. Picking "Light" would
only re-theme the Home page itself; navigating anywhere else drops
straight back into the hardcoded dark theme.
**Resolution: Pete's product decision — theming descoped, dark-only
for now.** Rather than building real app-wide theming (a much larger
feature than this review's scope) or leaving the narrow, half-working
picker in place, removed the light/auto theme-switching machinery
entirely:
- `Home.tsx`: removed `currentTheme` state, the entire "Theme Engine"
  `useEffect` (which set the CSS custom properties above at runtime),
  the Appearance section (theme-picker buttons) from the User
  Preferences modal, and the now-unused `SunIcon`/`MoonIcon`/
  `MonitorIcon` imports
- `pathscribe.css`: found and fixed a real duplicate-definition bug
  while doing this — `.ps-page`/`.ps-page-bg`/`.ps-page-gradient` were
  defined twice (once before the theme picker existed, once alongside
  it), with the second silently winning the cascade for every
  property both defined. Consolidated into one definition, hardcoded
  to the values that were actually rendering (not guessed), removing
  the `var(--bg-color, ...)` indirection entirely. Also removed the
  now-unused `.ps-home-theme-*`/`.ps-home-profile-section-label`
  classes.
- `research-ticker.css`: hardcoded `var(--text-color)`/
  `var(--text-secondary)` to their dark-theme values.
**Note:** `SunIcon`/`MoonIcon`/`MonitorIcon` in `components/Icons/Icons.tsx`
are now unused anywhere in the app — confirmed via grep. Not removed
from that shared icon library file, since that's a different kind of
cleanup call (a shared library legitimately might keep an icon around
for future use) than removing dead page-specific logic; flagging in
case it's worth a look.
**Verified:** `npx tsc --noEmit -p .` zero errors; re-ran the WCAG
audit on the Home page — 0 violations, no console/page errors.

## Also fixed while auditing Home.tsx
- `document.body.style.margin = '0'` was set imperatively in a
  `useEffect` on mount — meaning it only ever applied once `Home.tsx`
  happened to mount, never on pages that load first (`LoginPage`).
  Moved to a real `margin: 0` in `index.css`'s global `body` rule.
- `(card as any).tab` — dead code; no card object in the `cards` array
  has ever had a `tab` field, so the ternary it gated always evaluated
  to `undefined`. Simplified `navigate(card.route, ...)` down to
  `navigate(card.route)`.
- Found via testing, not part of `Home.tsx` itself but reached while
  auditing its nav avatar flow: `components/AppShell/AppShell.tsx`'s
  badge modal had a `color-contrast` failure on the role text
  ("superadmin" etc., `#64748b`, ~3.86:1). Fixed that one line —
  scoped fix only, `AppShell.tsx` as a whole is outside today's review.

## 28. Findings from ContributionDashboardPage.tsx (the biggest file yet)
**Found during:** the `src/pages/` review pass (August 2026).
**Inline styles:** ~90 instances, the most of any file reviewed so
far — this page previously applied its styling by referencing
`theme/pathscribeTheme.ts` color tokens (`t.colors.*`, `t.gradients.*`)
directly inside `style={{}}` objects. The theme-token *values* were a
reasonable choice; applying them via inline styles instead of CSS
classes was still the same violation as everywhere else in this
review. All moved to a new `.ps-contrib-*` class family with the
token's actual hex/gradient values baked in (CSS can't reference a JS
module at build time). Genuinely dynamic per-item values (chart bar
heights, TAT bar widths/colors) use CSS custom properties or modifier
classes rather than raw inline rules.
**`any` casts:** all 10 removed — 5 on `res.data` passed into the
`compute*` functions in `contributionDashboardCalculations.ts` (the
real `Case[]` type was already structurally compatible with those
functions' `CaseForDashboardCalc[]` parameter), and 5 more on
`(c: any)`/`(p: any)` callback parameters in `.filter()`/`.map()`
chains. Verified via `tsc` that removing all of them introduced zero
new errors.
**Business logic in JSX:** the "My Teaching Cases" tile was an IIFE
(`{(...) && (() => {...})()}`) computing subspecialty breakdowns,
concordance rates, and feedback sorting directly inside the JSX
return — extracted to a proper named `TeachingCasesTile` component,
matching the pattern this same file already used correctly for
`WeeklyOverviewChart`/`Rvu30Tile`/`TatPerformanceTile`.
**Real bug found and fixed:** the Quality Flags tile's `WarningIcon`
was styled via `style={{ color: t.colors.semantic.warning }}` —
`WarningIcon`'s stroke is bound to its own `color` *prop*, not CSS
`color`, so this had silently done nothing; the icon was rendering
its own default color instead of the intended one. Fixed by passing
`color` as an actual prop.
**CSS duplication found and fixed (scoped):** `.ps-contrib-tab-bar`
and `.ps-kpi-grid` were each defined twice in `pathscribe.css`, with
different, partially-conflicting properties silently cascade-merging
into a result neither definition alone specified. One of the two
`.ps-contrib-tab-bar` definitions came paired with a `.ps-contrib-tab-btn`
class confirmed unused by any component — dead CSS. Consolidated both
pairs into one clean rule each, preserving the exact previously-
rendered computed appearance (verified rather than guessed) rather
than picking one side and risking a visual regression.
**CSS duplication found, not fixed (too large a tangent):**
`.ps-tat-tile__*` has two complete parallel definitions — 24 total
declarations across both. Worked around it safely for this page's own
needs (one new modifier class, a CSS custom property for dynamic bar
width) without attempting a full consolidation, since that's separate,
larger-scoped work with its own risk of affecting other consumers of
that class family.
**WCAG, Overview tab (the tab actually reviewed this session):** fixed
`color-contrast` on `.ps-contrib-tab` (inactive tab labels, ~4.05-
4.27:1), `.ps-tat-tile__eyebrow` (~4.05:1), and `.ps-contrib-tat-clients`
(~2.54:1, the worst of the three) — all bumped to `#94a3b8` with hover
states adjusted to stay visually distinct. Also fixed
`scrollable-region-focusable` on the page's own scroll container
(added `tabIndex`/`role`/`aria-label`). Re-ran the audit after: 0
violations on the Overview tab.
**WCAG, other three tabs — FIXED.** Picked back up as part of clearing
this session's deferred items. `ProductivityTab.tsx` needed no separate
fix at all — it shared the `.ps-quality-btn`/`.ps-prod-filter-btn`
class already corrected while fixing `QualityTab.tsx`. `QualityTab.tsx`
itself needed 6 more distinct class/inline-style fixes (including one
using the same `--accent` custom-property pattern for a per-tile
dynamic color, and one genuine miss caught only by re-auditing after
opening the trend-chart view, not just the tab's default state).
`AIContributionTab.tsx` needed 1 shared-class fix
(`.ps-quality-bar-row__meta`). Verified via a full re-audit across all
four tabs together (Overview, Productivity, Quality, AI Contribution):
0 violations on every one.

## 29. Findings from SearchPage.tsx (2,199 lines — the largest file reviewed)
**Found during:** the `src/pages/` review pass (August 2026), spanning
several sessions given the file's size.
**Inline styles:** ~136 instances, the most of any file in this
review — down to 7 legitimate CSS custom-property assignments
(`--accent`, parameterizing genuinely per-instance dynamic colors
across `Chip`/`CheckPill`/pill components reused with different accent
colors throughout the filter sidebar). Converted across many
sub-components (`Chip`, `CheckPill`, `SectionLabel`, `BrowseBtn`,
`SynopticLookupContent`, `UserLookupContent`, `FlagsLookupContent`,
`ClientLookupContent`, `CompFlagsLookupContent`, `SpecimenLookupContent`,
`SnomedAxisContent`, `SnomedModalContent`, `CodeLookupContent`,
`IcdModalContent`) plus the full filter sidebar, results pane, and
profile/resources/logout modals in the main component.

**`any` casts:** all 14 removed — every one was either dead weight or
masking a real bug:
- **Real, repeated bug found and fixed:** `SpecimenFlag`/`CaseFlag`
  have a `.label` field, not `.name`. Two places compared against
  `.name` (only caught once the `any` cast hiding it was removed): the
  computational-flags search filter checked
  `sf.lisCode === code || sf.id === code || sf.name === code`, where
  `code` is a catalog display name that only `.label` would actually
  match — that filter likely never worked correctly. The CSV export's
  "Flags" column had the identical bug, silently empty for every case
  that actually had flags. Fixed both with `.label`.
- Removed 2 leftover debug `console.log` statements
  (`'[Search] params:'` / `'[Search] result:'`).
- The rest were dead-weight casts on already-correctly-typed values:
  `meta.hasMore`/`nextCursor` on a properly-typed `ServiceResult`,
  `user?.id`, `user?.canViewOrchestration` (a real declared field),
  several setState updater callback params, `colorScheme: 'dark'`.

**Direct-DOM-mutation hacks fixed:** the `onF`/`onB` focus handlers
mutated `e.currentTarget.style.borderColor` directly for the focus
ring — replaced with a real CSS `:focus` rule. Several more hover
hacks throughout (saved-search chip remove-x, Export CSV button,
resource links, logout Sign Out button) — same fix pattern applied
throughout this whole review.

**Real bug found and fixed (third occurrence):** same as items #25/#26
— `isResourcesOpen` state and a rendered `ResourcesModal`, but no
listener for the global `PATHSCRIBE_PAGE_OPEN_RESOURCES` event that
actually opens it (see `WorklistPage.tsx`). Fixed by adding the
listener, mirroring the same working pattern already used for
`AuditLogPage.tsx`. Verified via testing: dispatching the event now
correctly opens the modal.

**Found, not fixed:** `isProfileOpen` here is orphaned too — same
pattern as `Home.tsx` (item #26), no clear mechanical fix (no working
sibling to mirror, since this page also goes through the shared
`AppShell`). Flagged, not guessed at.

**Two duplicate/conflicting CSS class definitions found and
consolidated** during the review, same pattern as item #28's
`ContributionDashboardPage.tsx` finding — not part of this file
directly but touched while establishing its class family.

**File corruption found and fixed:** this file has double-encoded/
corrupted UTF-8 characters in several places — not something
introduced by this review, pre-existing in the file. Comment-divider
box-drawing characters (`─`) throughout are cosmetically garbled but
harmless (internal comments only, don't affect functionality — not
fixed, low value for the effort/risk of exact-byte-matching across
~30 decorative instances). More importantly, several **user-facing**
strings had the same corruption and were genuinely broken on screen:
the search summary's DOB range arrow, the age range's infinity symbol,
the ICD empty-state's arrow, the save-search cancel mark, a resource
link's arrow, and the logout modal's "back" arrow. All fixed with
clean Unicode characters, verified each one's context before choosing
the replacement rather than guessing.

**Found via testing, one file outside SearchPage.tsx itself:**
`components/Common/LookupModal.tsx` (a shared component this page
uses extensively) had a `color-contrast` failure on its subtitle text.
Fixed that one confirmed instance — left 4 other occurrences of the
same color in that file untouched, since only this one was actually
verified failing in its real rendered context; guessing at the other
4 without testing would risk an unnecessary change.

**WCAG:** re-ran the audit after every batch of changes throughout
this review, not just once at the end. Final state: Search page
(default) 0 violations, a lookup modal 0 violations, the newly-fixed
Resources modal 0 violations (and confirmed via `window.dispatchEvent`
that it actually opens now, not just that the code compiles).

**Status:** `src/pages/` review complete — 39/39 files on the item #18
checklist.

## 30. ACCESSIBILITY — `<select>`/`<label>` missing htmlFor/id association, widespread (RESOLVED)
**Found during:** the WCAG re-audit of `CountersignTurnaroundTab.tsx`
while clearing this session's deferred items — a `<select>` inside
`DeficienciesPage.tsx`'s `ResolveModal` (visible from that tab's flow)
had a sibling `<label>` with no `htmlFor`/`id` pairing, so axe reported
no accessible name.
**Issue:** Checked how widespread the underlying pattern is before
fixing more than the one confirmed instance: the shared
`.ps-conf-select` class appears in 28 files, with 63 total
`<select className="ps-conf-select">` instances — only 4 of which
already had an `id` attribute. Flagged as its own tracked item at the
time rather than blanket-fixing off one confirmed case.
**Status: FIXED, all 28 files.** Picked back up as a dedicated pass. A
precise static scan (parsing every actual `<select>` tag rather than
just grep-counting the class name, and specifically checking for the
*wrapped-label* pattern — `<label>Text<select>...</select></label>`,
which is already a fully valid accessible-name association needing no
`htmlFor`/`id`) found 46 real candidate instances, 2 of which turned
out to be false positives (`CrosswalkSection.tsx` — both already
correctly wrapped, left untouched) — 44 genuine fixes across the
remaining files.
- Where a real, adjacent `<label>` existed: added matching
  `htmlFor`/`id` pairs. One file (`BlockStainEditorModal.tsx`) renders
  its selects inside a `.map()` over blocks — used a per-block unique
  ID (`` `block-status-${block.id}` ``) rather than a static one, since
  a static ID would have produced duplicate IDs (invalid HTML, and
  `htmlFor` would only bind to the first match) once more than one
  block renders at once.
- Where fields were grouped under one umbrella label with no
  individual label of their own (e.g. `TATConfigSection.tsx`'s
  "Applies To" filter row, its "Resolution Simulator" controls,
  `RoutingRulesTab.tsx`'s styled-`<div>`-not-`<label>` fields): used
  `aria-label` instead, naming each field individually.
- Where no label existed at all (`ValidationStudiesSection.tsx`'s bare
  study-picker dropdowns): added a descriptive `aria-label`.
- **Bonus find while in `TATConfigSection.tsx`:** a real `any` cast —
  `(draft as any).roleId` / `set('roleId' as any, ...)` — was
  unnecessary; `roleId` is a genuinely declared field on `TATEntry`.
  Removed, confirmed dead weight via `tsc`.
**Verified:** `npx tsc --noEmit -p .` zero errors throughout; re-ran
the precise static scan after all fixes — 0 remaining flagged
instances (48 confirmed OK via `id`/`aria-label`, 2 confirmed OK via
wrapped-label, 0 needing further work); spot-checked live via
Playwright + axe on the Configuration page's System/TAT
Configuration/Validation Studies tabs — 0 `select-name`/`label`
violations wherever tested, consistent with the earlier live-verified
fix on `DeficienciesPage.tsx` using the identical pattern.

## 31. BUG — subspecialties had two disconnected data sources; the admin CRUD screen edited the wrong one (RESOLVED)
**Found during:** the start of a `src/contexts/` folder review — two
suspiciously similarly-named files, `DirtyStateContext.tsx` and
`DirtyStateProvider.tsx`, prompted a closer look at the whole folder
for duplication. That pair turned out to be a legitimate, standard
context/provider split (no issue). The next file in the folder,
`useSubspecialties.tsx`, had real warning signs instead: hardcoded
mock data inline in a Context provider (not the established
interface/mock/real service-triplet pattern used everywhere else in
this codebase), a weak `Math.random()`-based ID scheme, and a comment
that literally read "Initial state updated with new required fields
to prevent TS2345" — describing a TypeScript error fix rather than
intent, a strong signal of quick unpolished patchwork.
**Issue, once traced fully:** there were two entirely separate
"subspecialties" data sources that had drifted apart:
- The real `subspecialtyService` (proper interface/mock/real triplet,
  matching the codebase's established pattern) — 9 subspecialties,
  actually persisted to mock storage, IDs like `'gi'`/`'breast'`/
  `'derm'`. Used by `RoutingRulesSection.tsx`, `FppeAssignmentsSection.tsx`,
  `CasePoolAssignmentSection.tsx`, `FppeTrackingTab.tsx`,
  `WorklistTable.tsx`, `CaseRouter.ts`, `casePoolAssignmentService.ts`,
  and `ContributionDashboardPage.tsx`.
- A React Context (`contexts/useSubspecialties.tsx`) — only 2
  hardcoded subspecialties (Gastrointestinal, Dermatopathology) held
  in `useState`, never persisted anywhere, with different IDs
  (`'1'`/`'2'`) that didn't even match the real service's IDs for the
  same two subspecialties. Used by six files — critically including
  **`SubspecialtiesSection.tsx`, the actual admin screen for managing
  subspecialties**, plus `StaffTab.tsx`, `TATConfigSection.tsx`,
  `SpecimenDictionarySection.tsx`, `DelegateModal.tsx`, and `App.tsx`
  (which mounted the provider around most of the route tree).
**Real-world impact:** a lab admin adding or editing a subspecialty
through Configuration was editing in-memory state that silently
vanished on refresh — it never reached the real service, so it had
zero effect on routing, FPPE assignments, case pooling, or anything
else. Meanwhile the other five consumer screens were all showing an
incomplete list, missing 7 of the 9 real subspecialties (Breast,
Neuro, Heme, Gyn, Uro, Thoracic, Oncology Pool). This overlapped
directly with several files already touched earlier in this review
(`TATConfigSection.tsx`, `RoutingRulesSection.tsx`,
`FppeAssignmentsSection.tsx`) — present the whole time, just not
something an accessibility or type-safety pass would surface.
**Fix:** migrated all 6 consumers off the Context onto the real
`subspecialtyService`, following each file's own existing data-fetch
pattern rather than a uniform template (e.g. `DelegateModal.tsx` was
folded into its existing refresh-on-open `Promise.all` alongside
staff/delegation-types, matching how that modal already refreshes
other data each time it opens).
- `SubspecialtiesSection.tsx`: replaced the context hook with local
  state fetched via `subspecialtyService.getAll()`, added a
  `loadSubspecialties()` refetch after successful add/update.
  `commitSave` converted to call the real async `add()`/`update()`
  methods. Removed a manual ID-slugification step that's no longer
  needed (the real `add()` generates its own ID from
  `Omit<Subspecialty,'id'>`) and 2 `as any` casts that existed only
  because the old context's type didn't match what the code was
  actually trying to pass — confirming the code had already been
  half-written against the real service's shape.
- `StaffTab.tsx`, `TATConfigSection.tsx`, `SpecimenDictionarySection.tsx`,
  `DelegateModal.tsx`: read-only migrations, each folded into that
  file's existing `useEffect`/fetch pattern.
- `App.tsx`: removed the `<SubspecialtyProvider>` wrapper and its
  import.
- Deleted `contexts/useSubspecialties.tsx` entirely — confirmed via
  grep that zero real references remained anywhere in `src` before
  deleting.
**Verified:** `npx tsc --noEmit -p .` zero errors project-wide after
every step; functional smoke test via Playwright confirmed the fix
directly — the TAT Configuration add-rule modal's subspecialty dropdown
now shows "Breast" (one of the 7 previously-missing subspecialties);
the Staff tab correctly resolves "Gastrointestinal" from the real
service. No new console/page errors introduced.
**New finding surfaced while smoke-testing, not fixed (separate,
out of today's scope):** `TATConfigSection.tsx`'s add-rule modal has
its own widespread `color-contrast` issue — a different muted-gray
(`#6b7280`/`rgb(107,114,128)`) than the `#64748b`/`#475569` shades
fixed elsewhere in this review, affecting ~17 elements (filter
buttons, table headers, hint text) across both `TATConfigSection.tsx`
and shared `.ps-sub-*` classes it uses. Also found: the "Target
Hours" number input (`.ps-sub-input`) has a real, unlabeled `<label>`
sibling with no `htmlFor`/`id` — missed by item #30's fix because that
pass specifically targeted `.ps-conf-select` elements, and this is a
differently-classed `<input>`. Flagged for a future pass rather than
expanding scope mid-fix.

## 32. Findings from src/contexts/ review (AuthContext, MessagingContext, ScannerProvider, SystemConfigContext)
**Found during:** the `src/contexts/` folder review, continuing after
item #31's subspecialty data-source fix.

**`AuthContext.tsx`:**
- A debug `console.log('[Auth Login]', ...)` fired on every real login
  attempt (not gated to dev mode), logging the email and password
  length to the console. Removed.
- `resolveStaffFields`'s `res.data.find((u: any) => u.id === userId)`
  typed its callback param `any`, making `staffUser` implicitly `any`
  — which meant 4 of the 9 fields read off it
  (`canViewOrchestration`, `canAccessCrossTenantQa`, `middleName`,
  `organisationId`) had an additional, redundant `as any` cast on top
  of an already-`any` value, while the other 5 fields
  (`canViewPediatric`, `credentials`, `signatureUrl`, `firstName`,
  `lastName`) were read cleanly with no cast — pure inconsistency, no
  functional difference, but misleading (reads as if some fields need
  special handling when none of them do). Removed the `: any` on the
  `.find()` callback so `staffUser` is properly typed as `StaffUser`;
  confirmed via `IUserService.ts` that all 4 previously-cast fields
  are genuinely declared there. Removed all 4 now-redundant casts.
- `voiceProfile: cred.voiceProfile as any` — unnecessary; traced
  `VoiceProfileId`'s actual definition
  (`typeof VOICE_PROFILES[number]['id']`) back to `VoiceProfile.id:
  string` — the type is really just `string` under the hood, so the
  cast did nothing. Removed, confirmed via `tsc`.

**`MessagingContext.tsx`:** `setPortalOpen` already persists to
`sessionStorage` synchronously on every call, but a separate
`useEffect` also wrote the identical value to the same key every time
`portalOpen` changed — confirmed via grep that `setPortalOpenRaw` (the
only thing that could change `portalOpen` without going through
`setPortalOpen`) has no other caller, making the effect fully
redundant. Removed the effect. (Caught and corrected a mistake made
while fixing this: the first edit accidentally deleted three
unrelated, legitimate effects — the mount-load effect, the 20-second
poll, and the visibility-change reload — along with the intended one.
Caught immediately by re-viewing the file, restored exactly, verified
against the original before moving on.)

**`ScannerProvider.tsx`:** a keydown handler had
`if (window.location.pathname === '/' && !user) return;` — dead code
on two counts. The whole effect is already gated by `if (!user)
return;` one level up, so `!user` here is always `false` by the time
this line runs, making the condition permanently `false` regardless
of pathname. Separately, the comment claimed this was "the login
page," but `App.tsx`'s routing shows `/` is actually the Home page —
so even if the dead condition had somehow been reachable, it was
checking the wrong route. Removed the line entirely; the outer guard
already provides the real protection.

**`SystemConfigContext.tsx`:** `(import.meta as any).env?.VITE_VOICE_ENABLED`
— unnecessary cast; `import.meta.env.X` is read directly without
casting elsewhere in this codebase (e.g. `NavBar.tsx`,
`AuthContext.tsx`). Removed, confirmed via `tsc`.

**Verified:** `npx tsc --noEmit -p .` zero errors after every
individual fix.

**`VoiceProvider.tsx`** (550+ lines, the largest file in this folder):
- Two genuinely dead pieces of the public `VoiceContextType` API:
  `isProcessing` was a hardcoded `false` literal (never a real state
  variable), and `setIsAiEnabled` was a literal no-op `() => {}` that
  silently discarded whatever caller passed it. Traced every consumer
  before removing anything: `usePathscribeSpeech.ts` re-exported
  `isProcessing`, but its own only consumer (`SpeechConfigTab.tsx`)
  never reads it; `setIsAiEnabled` had zero callers anywhere in the
  codebase. Confirmed genuinely dead on both ends, not just
  unused-but-reachable. Removed from the interface, the value object,
  and `usePathscribeSpeech.ts`'s re-export.
- `window.__psRecordDictationCorrection` (a real, intentional global
  side-channel) had 3 separate `(window as any)` casts. Unlike
  `SpeechRecognition`/`webkitSpeechRecognition` a few lines below —
  which genuinely have no TypeScript DOM lib type (confirmed no
  `dom-speech-recognition`-style package is installed or reachable in
  this sandbox, so those `any` usages are correctly left as the
  pragmatic, necessary choice) — this one was properly fixable: added
  one `declare global { interface Window { ... } }` block, removed all
  3 casts.
- Removed a debug `console.log` that fired on every real dictation
  correction in production, logging the raw/corrected phrase pair to
  the console. Left the file's several `console.warn` calls alone —
  those report genuine failures (a Gemini fetch failing, the proxy
  returning a bad status, a speech-recognition error), not debug
  noise; same distinction applied consistently throughout this whole
  review.

**Verified:** `npx tsc --noEmit -p .` zero errors after every fix.

**Status: `src/contexts/` review complete.** `src/contexts/README.md`
written, documenting all 8 files (9 originally, minus the deleted
`useSubspecialties.tsx`).

## 33. DEAD FEATURE — disconnected popup-window live report preview, removed (per Pete's decision)
**Found during:** the `src/hooks/` folder review — `usePreviewChannel.ts`
documented a combined `usePreviewChannel(caseId, isReceiver?)` API that
didn't actually exist (the real exports were two separate hooks,
`usePreviewSender`/`usePreviewReceiver`, a stale-doc-comment bug fixed
immediately regardless of the bigger question below). Investigating
that surfaced something much bigger: `usePreviewSender` — the entire
"broadcast side" of a real, sophisticated cross-window live-preview
system (BroadcastChannel sync, window-geometry persistence with
multi-monitor clamping, popup-blocked detection with its own toast
fallback message) — had zero consumers anywhere in the codebase.
**Investigated with Pete before touching anything:**
- Confirmed `usePreviewSender` is never imported anywhere; the
  `/report-preview/:caseId` route is unreachable through any real UI
  path in the app (button, link) — only reachable by typing the URL
  directly, where it would sit connected-but-empty since nothing ever
  broadcasts to it.
- Traced what actually serves the "print a formatted report" need: a
  separate, fully working, self-contained mechanism
  (`handleOrchPrint` in `SynopticReportPage.tsx`) — POSTs to a real
  server-side PDF endpoint and opens the result, with a client-side
  DOM-snapshot print fallback if that endpoint fails. Confirmed this
  doesn't touch BroadcastChannel or the popup-preview system at all.
- Traced what actually serves the "see the report update live while
  editing" need: `SynopticReportPage.tsx`'s own three-column
  Orchestration layout renders `ReportPreviewRenderer` **inline**, in
  the same component tree as the editor — `orchSections`/
  `resolvedContext`/`caseData` passed straight down as normal React
  props, updating automatically on every edit via ordinary
  re-rendering. No cross-window messaging needed. Strictly simpler and
  more reliable than what the popup-window system was trying to
  build, and it's the version that's actually reachable and working.
- Conclusion, confirmed with Pete: the popup/BroadcastChannel system
  was an earlier design direction, superseded once the inline preview
  shipped, with the sender-side wiring never finished and never
  cleaned up afterward. Print and live-preview-while-editing are both
  already fully covered by the mechanisms above — nothing left this
  system was uniquely serving.
**Removed, per Pete's explicit go-ahead:**
- `src/hooks/usePreviewChannel.ts` — deleted entirely
- `src/pages/ReportPreview/ReportPreviewPage.tsx` — deleted (its
  sibling `ReportPreviewRenderer.tsx` in the same folder was
  preserved — `SynopticReportPage.tsx`'s inline preview depends on it
  directly)
- `App.tsx` — removed the `ReportPreviewPage` lazy import and the
  `/report-preview/:caseId` route
- `SynopticReportPage.tsx` — removed the dormant
  `PATHSCRIBE_PREVIEW_BLOCKED` event listener (the only thing that
  could ever have dispatched that event was the now-deleted
  `usePreviewSender`)
**Verified:** `npx tsc --noEmit -p .` zero errors after every step,
including immediately after the two file deletions (confirming
nothing else depended on them); confirmed via grep that zero
references to any part of this system remain anywhere in `src`;
Playwright smoke test confirmed the app loads and navigates with no
console/page errors, and confirmed the old `/report-preview/:caseId`
URL genuinely no longer resolves to the deleted page.

## 34. ⚠️ SERIOUS BUG (confirmed, PHI/compliance-relevant) — screenshot redaction was silently non-functional (FIXED)
**Found during:** the `src/hooks/` folder review, `useScreenCapture.ts`.
**Severity: the most serious finding in this entire review.** This is
not a code-quality issue — it's a confirmed, empirically-verified
failure of a feature whose entire purpose is protecting patient
health information before it leaves the app.
**What the feature is:** `useScreenCapture.ts` powers the "Enhancement
Request" modal (`EnhancementRequestModal.tsx`) — a user-facing
feedback/support-ticket tool that attaches a screenshot of the current
screen. Given this app routinely displays real patient names, MRNs,
and clinical data, the hook redacts PHI before capturing: elements
matching `PHI_SELECTORS` get a "[REDACTED]" overlay div appended on
top of them, and the whole page is then captured via `html2canvas`.
**The bug:** the `html2canvas` call's `ignoreElements` option was
configured to exclude `data-phi-overlay` elements — i.e., the
redaction overlays *themselves* — from the render. Read `html2canvas`'s
actual clone-tree logic in `node_modules` to confirm precisely what
`ignoreElements` does: it excludes the matched element from the cloned
DOM tree html2canvas renders from, entirely — not just its own pixels.
Since the overlay is a separate, `position:fixed` sibling div (not a
wrapper around the real PHI element), excluding the overlay from
rendering left the real, un-redacted PHI element — a completely
separate DOM node the overlay was never actually attached to —
rendering normally, fully visible, in its own original position. The
overlay that was supposed to cover it never painted at all.
**Verified empirically, not just by reading the code:** built an
isolated test page reproducing the exact mechanism (a "PHI" div with
distinct styling, covered by a redaction overlay with the same
`ignoreElements` condition used in the real hook), ran it through the
actual installed `html2canvas` library via Playwright, and sampled the
resulting canvas pixel where the overlay should have been. Before the
fix: the pixel matched the underlying content's color, not the
overlay's — confirming the PHI was fully visible in the captured
image, the redaction did nothing. After removing `data-phi-overlay`
from `ignoreElements`: re-ran the identical test, the pixel now
matched the overlay's color — confirming the fix actually works, not
just that it compiles.
**Also fixed in the same edit:** `data-pdf-placeholder` was in the
same `ignoreElements` list. Lower severity — the *original* PDF
viewer element gets `visibility: hidden` applied directly to it (a
real style change, not a covering overlay), so even before this fix
its content wouldn't have rendered. But excluding the *placeholder*
meant the nice "🔒 PHI PROTECTED" replacement box never showed either,
leaving blank space where it should have appeared. Verified via the
same empirical pixel-sampling method: the placeholder's color now
appears correctly, and the hidden original still doesn't leak.
**Why the third redaction mechanism (`data-capture-hide-placeholder`,
whole-section hiding for things like the worklist table) was
never affected:** its own code was already correct — that placeholder
was never added to `ignoreElements` in the first place, which is
exactly why it worked and the PHI-overlay one didn't. Comparing the
two mechanisms side by side is what made the bug obvious once found.
**Fix:** removed `data-phi-overlay` and `data-pdf-placeholder` from
the `ignoreElements` callback, leaving only `data-enhancement-modal`
(the request modal itself, which genuinely should be excluded so it
doesn't capture itself capturing itself).
**Verified:** `npx tsc --noEmit -p .` zero errors; the empirical
pixel-sampling test described above, both before (confirming the bug)
and after (confirming the fix) the change.

## 35. Findings from src/utils/ review (in progress)
**Found during:** starting the `src/utils/` folder review.

**Dead files removed (1.2MB+ of repo bloat):**
- `src/utils/index.css` — a stale, orphaned duplicate. Confirmed via
  grep that nothing imports it anywhere. Compared its content against
  the real, actually-loaded `src/index.css` (imported in `main.tsx`):
  every class it defines (`.category-section`, `.shortcut-row`,
  `.shortcut-label`, `.shortcut-display`, `.shortcut-change-btn`,
  `.ps-scroll`, `.ps-no-scroll`) already exists in the real file, more
  refined (e.g. the real one unifies `.ps-scroll`/`.ps-msg-list`/
  `.ps-thread-body` scrollbar styling and uses CSS variables instead
  of hardcoded values). The real `src/index.css` also already contains
  this session's own earlier body-margin fix from the `Home.tsx`
  review — confirming that fix is intact and this orphaned copy is a
  genuinely earlier, superseded version, not something anything
  depends on. Deleted.
- Three stale timestamped backups of `guideAssets.ts`
  (`.bak_20260605_094452`, `.bak_20260624_132635`, `.bak_20260626_134327`
  — 104K/184K/948K), left behind by `Update-GuideAssets.ps1`'s "backup
  before overwrite" step with no cleanup afterward. Confirmed zero
  references anywhere. Deleted.
- **Also found and fixed:** `.gitignore` already had a `*.bak` rule,
  presumably meant to cover exactly these files — but the real
  filenames the PowerShell script generates
  (`guideAssets.ts.bak_TIMESTAMP`) don't actually end in `.bak` (the
  timestamp comes after), so the existing glob never matched them.
  Added `*.bak_*` alongside the existing rule so future runs of that
  script don't recreate this same accumulation.

**Real bug found and fixed — an incomplete prior consolidation:**
`utils/caseUrgency.ts`'s own header comment documents a past fix
consolidating `WorklistTable.tsx`'s and `WorklistPage.tsx`'s
independently-diverging "is this case urgent" logic into one shared
`isUrgentCase()` function, explicitly to prevent exactly this kind of
divergence risk in the future. Checking whether that fix actually
held: `WorklistPage.tsx` does correctly import and use the shared
function. `WorklistTable.tsx` does not — it still had its own
separate, locally-defined `isUrgentCase` (a `useCallback`), reachable
from 12+ call sites throughout that file (filtering, grouping,
sorting, row-building, urgent-dot rendering), implementing the
identical logic in parallel. The consolidation the comment claimed was
complete had only actually happened for one of the two files.
Currently harmless since both copies compute the same thing today, but
it defeats the entire point of the original fix — the comment itself
anticipates a plausible future change (a facility-configurable
STAT-vs-Rush distinction) that would silently apply to only one of the
two files if it ever happened, reintroducing the exact inconsistency
bug the original fix was written to prevent. Migrated
`WorklistTable.tsx` to import and use the real shared function, removed
its local duplicate. As a side effect, this also removed a redundant
`(c.order as any)?.priority` cast that existed in both the shared
function and the now-removed local copy — the identical property is
already accessed cleanly one clause earlier in the same expression.
**Verified:** `npx tsc --noEmit -p .` zero errors after every step,
including immediately after the file deletions; Playwright smoke test
on the Worklist page and its Urgent filter tile — 0 WCAG violations,
no console/page errors, filter click works correctly.

**Status: `src/utils/` review complete.** The remaining
individual utility files (`formatDate.ts`, `facilityTime.ts`,
`deviceDetection.ts`, `barcodeFormatMapping.ts`,
`normalizeAccession.ts`, `personName.ts`, `specimenLabeling.ts`,
`flagAdapter.ts`, `formatLabel.ts`, `synopticFieldLabels.ts`,
`caseRevisionDisplay.ts`, `guideAssets.ts`) were genuinely clean —
one of the strongest folders reviewed in this whole pass, several with
real, documented, caught-and-fixed bugs from past sessions still
intact (e.g. `facilityTime.ts`'s inline record of a sign-flip bug
caught via direct numeric verification before shipping). One minor,
deliberate, self-documented legacy export
(`synopticFieldLabels.ts`'s `CAP_FIELD_LABELS`) confirmed to have
zero consumers but left alone rather than removed, since it's an
explicit, intentional backward-compat choice, not undocumented dead
code. `src/utils/README.md` written.

## 36. BUG — duplicate internalKeys in systemActions.ts, the keyboard/voice dispatch registry (FIXED, partial — see also the cross-file finding below)
**Found during:** the `src/constants/` folder review — the file's own
header comment states an explicit, documented invariant ("Never reuse
or reassign an internalKey even if an action is removed"), which
prompted a direct check of whether that invariant actually holds.
**Issue:** it didn't. 21 `internalKey` values were each assigned to
two genuinely different, semantically distinct actions (two spots were
even 3-way collisions) — e.g. `F17+PS001` was shared by both
`diagnosis.grossDescription` ("Enter Gross Description") and
`ai.diagnosisSuggest` ("AI Diagnosis Suggestions"), two completely
different commands. Given the file's own header states this key is
"what the keyboard handler dispatches," a real collision here means
the dispatch system cannot actually distinguish between the colliding
actions — pressing the shortcut for one could trigger the wrong one,
or produce genuinely undefined behavior, depending on how the lookup
resolves ties.
**Root cause, once mapped out precisely:** an entire later block of
actions (`ai.*`, `delegation.*`, `synoptic.*`, `pool.*` — all
appearing later in the file, at higher line numbers) had internalKeys
identical to an earlier block (`diagnosis.*`, `messages.*`) — the
pattern strongly suggests the later block was created by copy-pasting
the earlier one as a template and never renumbering the keys for the
new entries.
**Fix:** kept the earlier (first-appearing) block's keys unchanged,
assigned fresh, sequential, genuinely non-conflicting numbers to the
later block's colliding entries — `F17+PS012` through `F17+PS021` and
`F18+PS023` through `F18+PS035`, chosen by finding the actual highest
existing number already used in each `Fnn` block (`F17` topped out at
`PS011`, `F18` at `PS022`) before assigning anything new, so the
file's own documented numbering convention stays intact. Applied via a
line-number-anchored script rather than string matching, given some
labels/ids could plausibly repeat elsewhere in a 221-entry file.
**Verified:** wrote a script to enumerate every `internalKey` in the
file and confirm zero duplicates remain (188 entries, 188 unique
keys) — not just spot-checked the ones already found. `npx tsc
--noEmit -p .` zero errors.

**Found, NOT fixed — a related but more complex cross-file finding:**
while verifying the fix above, checked whether `systemActions.ts`'s
key-space could also collide with `services/actionRegistry/
mockActionRegistryService.ts` (which imports `ACTION_MAP` from
`systemActions.ts` and, in several confirmed places, deliberately
reuses an existing action's key via `ACTION_MAP['x']?.internalKey` —
a legitimate alias pattern, not a bug). Beyond those legitimate
aliases, found 10 more real collisions where `mockActionRegistryService.ts`
defines its own separate, hardcoded-key action that happens to share
an internalKey with a `systemActions.ts` entry (`F17+PS005` through
`F17+PS009`, `F18+PS014`, `F24+PS036` through `F24+PS039`). Not fixed,
because this one is genuinely more complex than a numbering fix: one
of the pairs (`systemActions.ts`'s `synoptic.confirmField` and
`mockActionRegistryService.ts`'s `CONFIRM_FIELD`) share the exact same
"Confirm Field" label, raising a real question of whether some of
these 10 pairs are two independently-written definitions of what's
actually meant to be the same logical action (which should be
consolidated, not just renumbered) rather than a pure key-numbering
accident like the fix above. That's a judgment call about the
intended architecture of these two files, not something to guess at
mechanically. Flagged for a follow-up pass.

## 37. Findings from src/loaders/, src/mock/, src/api/, src/theme/, src/assets/, src/styles/
**Found during:** continuing the small-folder review pass.

**Dead files removed:**
- `src/assets/react.svg` — the default Vite/React scaffolding leftover,
  confirmed zero consumers anywhere.
- `src/styles/globals.css` — confirmed zero consumers. Notable: this
  was yet another, different, earlier attempt at a light/dark theme
  system (a `data-theme="light"/"dark"` attribute + CSS variable
  approach), separate from the JS-driven one already found and removed
  from `Home.tsx` (item #27). Given theming was explicitly descoped to
  dark-only, this fits the same pattern and is doubly safe to remove.
  Folder removed along with it since it was the only file in it.

**`src/loaders/synopticLoader.ts`:** confirmed genuinely wired up as a
real React Router loader (not dead), but doing outdated work —
manually tried `mockCaseService.getCase()` then
`mockOrchestratorCaseService.getCase()` as two separate steps, logic
`CaseRouter.ts` has since consolidated into one call. Also confirmed
`SynopticReportPage.tsx` never calls `useLoaderData()` — it does its
own separate `caseRouter.getCase()` fetch instead, so the loader's own
returned data goes unused (though its redirect-on-not-found behavior
still provides real, valid guard value before the page even renders).
Simplified the loader to use the same unified `caseRouter` the rest of
the app already uses, for consistency and correctness. Did not attempt
the larger, riskier change of making the page consume
`useLoaderData()` instead of its own fetch — smaller, safer fix scope.

**`src/mock/mockReports.ts`:** clean. Notable: this file's own header
comment confirms it exists specifically to support verifying the PHI
screenshot-redaction feature — the exact feature found broken and
fixed in item #34, from a completely different folder review earlier
in this pass.

**`src/theme/pathscribeTheme.ts`:** clean, no issues.

**`src/api/caseFlagsApi.ts` — a significant, real architectural
conflict found, NOT fixed (needs a real decision, not a guess).**
Initially looked like the same "unnecessary `any` cast" pattern found
and cleaned up throughout this review — testing that assumption by
actually removing the casts immediately surfaced a real TypeScript
type error, which is what surfaced the real issue underneath. There
are two independent, unaware-of-each-other flag-tracking systems in
this codebase, both reading and writing the exact same
`Case.caseFlags`/`Specimen.specimenFlags` fields, with genuinely
incompatible shapes:
- This file (and its confirmed consumer,
  `pages/Synoptic/useSynopticFlags.ts`, reading the data back the same
  way — `.flagDefinitionId`/`.deletedAt`) treats those fields as
  `FlagInstance[]` — an audit-style "who applied which flag
  definition, when" record.
- The real, declared type on `Case`/`Specimen`
  (`types/case/CaseFlag.ts`, `Specimen.ts`'s `SpecimenFlag`) is
  `CaseFlag[]`/`SpecimenFlag[]` instead — a flag-*definition* record
  (`id`, `label`, `color`, `lisCode`), with no application/audit
  fields at all. This is the shape the Contribution Dashboard's
  Quality Flags tile and `SearchPage.tsx`'s computational-flags filter
  both read, expecting `.label`/`.lisCode`.
**Confirmed both sides are genuinely reachable, not dead code** — this
file's `applyFlags`/`deleteFlags` are called from
`FlagManagerModal.tsx`, `useSynopticFlags.ts`, and
`SynopticReportPage/components/HeaderBar.tsx`. Practical effect:
whichever system touches a given case's flags last effectively
corrupts the data for the other's perspective — a flag applied through
the Synoptic Report page's flag manager would show up with an
undefined `.label` wherever the Quality Flags/Search systems expect
one, and vice versa.
**Not fixed** — this needs a real architectural decision (which model
is authoritative, or whether these two concerns belong on genuinely
separate fields rather than sharing one) that isn't mine to make
unilaterally. Restored the file to its original, working state (the
`as any` casts are necessary given the current, unresolved conflict,
not laziness — removing them without resolving the underlying issue
just relocates the same real type error rather than fixing anything).
Documented the full finding directly in the file itself, not just
here, so it's visible to whoever next touches this code. **Did** keep
one small, safe, uncontroversial fix: removed 2 debug `console.log`
calls that fired on every real flag-apply action in production.
**Verified:** `npx tsc --noEmit -p .` zero errors after every step,
including the deletions and the loader change.

## 38. Findings from src/data/ and src/types/
**Found during:** continuing the folder review — src/data/ (27 CAP/
RCPath synoptic template JSON files) and src/types/ (38 type
definition files).

**src/data/:** all 27 files confirmed genuinely loaded (an initial
count of 24 import lines was an artifact of a truncated terminal
command, not 3 missing files), all valid JSON, zero duplicate template
IDs, zero duplicate field IDs within any template. One useful false
positive caught before being reported: an initial heuristic flagged 5
templates with "duplicate field ids" like `'yes'`/`'no'`/`'other'`
repeating — checking the actual JSON structure showed these are
correctly-scoped *option* IDs nested inside each field's own `options`
array (legitimately fine to repeat across different fields). Re-ran
the check properly scoped before concluding anything.

**src/types/ — a real near-miss, documented in detail because the
lesson matters beyond this one file:** `serviceResult.ts` (an older
`{success, data, error}` `ServiceResult` shape) had zero direct-import
consumers by grep, so it was deleted as apparently dead — the same
category of fix applied successfully many times elsewhere in this
review. `tsc` immediately caught what grep missed: 3 files import it
indirectly through `types/index.ts`'s barrel re-export. Traced further
rather than just restoring blindly — confirmed one of those 3
(`PathScribeAIService`) is genuinely instantiated by a real, live
component (`OrchestratorSectionEditor.tsx`). Restored the file.
**Real finding underneath:** two different `ServiceResult` conventions
genuinely coexist in this codebase right now — this older shape (the
`aiIntegration/` subsystem) and the newer `{ok, data, meta, error}`
shape in `services/types.ts` (used by essentially everything else).
Each is internally consistent within its own call chain, inconsistent
with the other. Not fixed — worth consolidating at some point, not a
folder-review-sized decision. Documented directly in the restored
file, not just here.

Also checked, individually, four apparently-unused exported types
(learning the lesson above, verified each by actual exported name, not
file path): `DigitalAsset`/`Decant` turned out to be a false positive
(genuinely used). `ErasureCertificate` and `AddSpecimenPayload` are
confirmed zero-consumer but read as deliberate, well-documented,
forward-looking scaffolding for real planned features (a GDPR
Article 17 compliance flow; a hardware-triggered specimen-add flow
referencing a real, existing service by name) — left alone, same
reasoning as the `CAP_FIELD_LABELS` legacy export found earlier in
this review. `ReportSnapshot`/`ReportSnapshotHistory` looks genuinely
*superseded* rather than merely not-yet-built — `ReportVersionRecord`
(confirmed live, "already relied on by SynopticReportPage.tsx" per its
own header) covers the same original/corrected/addendum tracking
concern with an overlapping field, reading like an earlier design that
was reworked differently and never cleaned up. Flagged, not deleted —
the evidence is circumstantial, and this deserves a real decision.

Separately, re-examined a duplicate-type concern noted earlier in this
review (`templateService.ts`'s `TemplateStatus` vs `types/template.ts`'s
own `TemplateStatus`) — confirmed these are genuinely unrelated
concepts (protocol/synoptic templates vs. the Tiptap report-builder's
`ReportTemplate`) that coincidentally share a name, with zero files
importing both into the same scope. Not a bug.

**Verified:** `npx tsc --noEmit -p .` zero errors after every step,
including immediately after the (corrected) deletion/restoration.
`src/data/README.md` and `src/types/README.md` written.

## 39. Cleanup — src/ root-level cruft, including the original stray junk folder (RESOLVED)
**Found during:** closing out the folder-by-folder review with a look
at loose files sitting directly in `src/` (not inside any subfolder),
including the empty stray `src/{components` folder flagged as
unresolved cruft all the way back near the start of this review.

**Confirmed dead, deleted:**
- `src/{components` — the original artifact: a literal folder named
  `{components` (leading brace, no closing brace, no comma-separated
  siblings), almost certainly from a `mkdir src/{components,pages,...}`
  run in a shell that didn't expand the braces. Confirmed genuinely
  empty (zero files inside, at any depth) before deleting.
- `src/App.css` — confirmed byte-for-byte the unmodified default Vite/
  React scaffolding stylesheet (the spinning logo animation, `.card`,
  `.read-the-docs` — none of which exist anywhere in this app's real
  UI), and confirmed zero imports anywhere. Same category as
  `assets/react.svg`, found and removed earlier in this same pass.
- `src/pathscribe.css.bak` (767K) — confirmed stale (19,209 lines vs.
  the current file's 21,164 — the live file has grown by ~2,000 lines
  through this review's own additions alone) and zero references.
- `src/services.zip` (471K) — a full point-in-time backup of the
  entire `src/services/` folder from July 19. Before deleting,
  specifically checked whether anything inside it (including a
  `.docx` engineering brief) was the *only* remaining copy of
  something — confirmed the same `.docx` still exists live in
  `src/services/aiIntegration/`, and `src/services/` itself is a real,
  extensively-reviewed, actively-maintained folder (see this review's
  earlier `src/services/` pass) — so the zip was purely a redundant,
  stale snapshot, not a unique backup of anything.

**Checked and confirmed genuinely fine, left alone:**
- `NETFLIX_SETUP.md` — not a mistaken leftover from an unrelated
  project despite the odd name; it's a real, historical setup doc
  describing the "Netflix-style" card-grid redesign of `Home.tsx`
  (the card-grid layout this app's actual Home page still uses today).
  The work it describes is long since complete — genuinely historical
  now, not actionable, but not broken or worth deleting without
  Pete's own call on repo history.
- `css-audit.cjs` — a genuinely useful CLI tool (checks for CSS
  classes referenced in `.tsx` files but never defined in
  `pathscribe.css`, and vice versa) — the exact same kind of tool this
  review has repeatedly written one-off versions of. Non-conventionally
  located (`scripts/` would be more standard than `src/`), but
  harmless where it is — nothing bundles or imports a `.cjs` script,
  so it doesn't affect the shipped app.
- `talisman.d.ts` — an ambient module declaration for a phonetic-
  matching library (`double-metaphone`). The `talisman` npm package is
  genuinely installed, but this specific submodule isn't currently
  imported anywhere. Near-zero cost to keep (just a type declaration),
  plausibly relevant to a future dictation "sounds like" matching
  feature — left alone rather than removed on spec.
- `login-brand.css`, `MobileRestrictedRoute.tsx`, `ProtectedRoute.tsx`,
  `global.d.ts`, `vite-env.d.ts`, `main.tsx`, `index.css`,
  `research-ticker.css` — all confirmed genuinely used, no action
  needed.

**Verified:** `npx tsc --noEmit -p .` zero errors after every
deletion; a full Playwright smoke test across Home, Worklist,
Configuration, Search, and Contribution Dashboard — all load cleanly,
zero console/page errors, 0 WCAG violations on the final page checked.

## Review status: src/ folder-by-folder pass complete

Every folder in `src/` has now been reviewed: `components`,
`orchestrator`, `pages`, `services`, `templates`, `contexts`, `hooks`,
`utils`, `audit`, `firebase`, `constants`, `loaders`, `mock`, `api`,
`theme`, `assets`, `styles` (now removed), `data`, and `types`, plus
every loose file sitting at the `src/` root. READMEs written for each
folder reviewed this pass. See each item above (#18 through #39) for
the full findings history.

## 40. Findings from clearing the TATConfigSection.tsx contrast finding (item #31's deferred note)
**Found during:** picking up the widespread `#6b7280` color-contrast
issue flagged when the subspecialties data-source bug was fixed
(item #31), deliberately deferred at the time since it was outside
that fix's scope.

**A duplicate CSS block found along the way, same category as items
#23/#28 earlier in this review:** the entire "Subspecialties Section"
class family (`.ps-sub-*`, ~92 classes) was defined twice in
`pathscribe.css`, ~500 lines apart. Verified property-by-property
before consolidating (not just class-name matching) — 91 of 92 shared
classes were byte-identical; only `.ps-sub-modal` genuinely differed,
and since the later block wins CSS cascade for any selector defined in
both, its values were already what's been rendering. One real
complication found while consolidating: `.ps-sub-add-btn` in the
earlier (removed) block was part of a compound, comma-separated
selector shared with `.ps-section-add-btn` — a *different* class with
no other definition anywhere in the file, genuinely used by 5+ real
components (`RoutingRulesSection.tsx`, `RoleDictionary.tsx`, etc.).
Preserved `.ps-section-add-btn`/`.ps-section-add-btn:hover` as their
own standalone rule rather than deleting them along with the rest of
the duplicate block. Net: ~120 lines of duplicate CSS removed, zero
functional change, verified via a live smoke test on the affected
admin screen (0 console/page errors, 0 WCAG violations).

**A real CSS syntax bug found:** `.ps-tat-sim-source { ... color:
'#6b7280'; ... }` — literal quote characters around a hex color value,
which is invalid CSS syntax. The browser silently drops a malformed
declaration like this rather than erroring, meaning this element had
*no* color applied at all (not even the intended, still-failing
`#6b7280` — genuinely nothing), inheriting whatever color its parent
happened to have. Fixed the syntax and bumped to a passing value in
the same edit.

**The main fix:** bulk-replaced all remaining 55 occurrences of
`#6b7280` in `pathscribe.css` with `#94a3b8` — the same value already
proven to pass WCAG AA against this app's dark backgrounds, used
consistently throughout this entire review for equivalent muted-text
contexts. Given the scale (55 instances spread across many different
components), verified via broad, live testing across 7 different
pages/states rather than trying to pre-verify every individual
instance's exact rendering context — all came back at 0 violations.
Also found and fixed 4 more instances of the same color as *inline*
`style` props directly in `TATConfigSection.tsx` (not the CSS file,
so the bulk replace didn't touch them) — converted to a new, real
`.ps-tat-hint-text` class rather than just patching the inline color
value, consistent with the "no inline styles" standard applied
throughout this review. One more class (`.ps-sub-label-hint`, a
different color, `#475569`, ~2.35:1 — the worst-failing contrast found
in this whole batch) fixed the same way.

**Also fixed:** the "Target Hours" number input's missing
`<label>` association (confirmed via axe as a `label` rule violation)
— added `htmlFor`/`id` pairing, same pattern used throughout item #30.

**Verified:** `npx tsc --noEmit -p .` zero errors after every step.
Playwright + axe: TAT Configuration's default view and its add-rule
modal both at 0 violations (down from 2 rule types / 5 elements before
this batch, and the original ~17 elements found when this was first
flagged). Broader sanity check across Worklist, Search, Contribution
Dashboard, System Audit, and Deficiencies — all 0 violations,
confirming the broad CSS bulk-fix didn't regress anything elsewhere in
the app.

## 41. Closing the services/ README gap — governingBodies, hardware, referenceCheck (FINAL)
**Found during:** answering a direct question about README coverage.
63 of 66 top-level `services/*` folders had their own dedicated
README — a clear, established, near-universal convention specific to
that folder. `governingBodies`, `hardware`, `referenceCheck` were the
3 exceptions. Checked why: 2 of them had only ever come up in passing
during other investigations this review (referenced while checking
something else, never reviewed as their own unit); `governingBodies`
never came up at all. Genuinely missed, not deliberately skipped —
reviewed all 3 properly now.

**`governingBodies/`** — clean. Its own header documents a real past
fix (a bare `/* TODO: persist */` that meant every governing-body
edit silently vanished on refresh). Didn't just trust the header — ran
its test suite directly, 4/4 pass, and confirmed
`GoverningBodiesSection.tsx` is genuinely wired to it.

**`hardware/`** — clean, genuinely excellent code (real architectural
discipline building on the existing HL7 pipeline rather than a
parallel one; honest "not yet implemented" errors instead of faking
unsupported paths). Confirmed currently unwired — every reference
elsewhere in the codebase turned out to be a comment explaining
forward-looking design intent, not a real import — but that's
deliberate, planned infrastructure, not dead code.

**`referenceCheck/`** — real, well-scoped code (its header explicitly
documents which dependency relationships were checked and found to
have none, and why one relationship is deliberately excluded from the
checker). Confirmed genuinely used by 3 real components. Removed 3
unnecessary `any` casts, confirmed removable via clean compilation.
Confirmed no relationship to the disconnected-subspecialty-data-source
bug found earlier in this review (item #31) despite touching
subspecialty data — this file reads from the real, live sources.

**Verified:** `npx tsc --noEmit -p .` zero errors; `governingBodies`'
own test suite run directly (4/4 pass); Playwright smoke test on
Configuration — zero console/page errors.

READMEs written for all 3. This closes the last known gap in
services/'s per-folder documentation coverage, and effectively
concludes this review's application cleanup activity.

## 42. BUG (severe, confirmed via live reproduction) — FlagManagerModal infinite re-render loop, the real root cause of the reported "Discard Changes" data-loss bug (item #37 in Pete's issue list)
**Found during:** investigating a reported bug — "I applied a Flag to
the case and clicked Save, then used the X to close the modal. I get
a popup asking Discard Changes or Keep Editing. Discard Changes gets
me back to the SynopticReport Page, but discards my changes." Static
code reading showed `handleSave` should already call `onClose()`
directly on success, meaning the modal shouldn't still be open for an
X-click afterward — the described sequence didn't match what the code
appeared to do. Reproduced live rather than guess.
**What was actually found:** a genuine "Maximum update depth
exceeded" React error, thrown directly from `FlagManagerModal`,
severe enough that DOM elements were continuously detaching and
remounting under Playwright — the test's own click action timed out
retrying against an element stuck being torn down and recreated.
**Root cause, traced precisely:** `SynopticReportPage.tsx` passed
`onDirtyChange={(dirty: boolean) => setSectionDirty('Flags', dirty)}`
to `FlagManagerModal` — a fresh, unmemoized arrow function created on
every single render of the parent. `FlagManagerModal`'s own dirty-
tracking `useEffect` has `onDirtyChange` in its dependency array. The
result is a textbook infinite loop: parent renders → new
`onDirtyChange` reference → child's effect sees a "changed"
dependency → re-fires (cleanup then re-run) → calls back into
`setSectionDirty` → parent's state updates → parent re-renders → new
`onDirtyChange` reference again → repeat forever. The identical
pattern existed for `CaseTeamModal`'s `onDirtyChange` at the adjacent
call site. Also contributing: `FlagManagerModal`'s own `FlagChip`
sub-component was defined *inside* the parent's render body rather
than hoisted out, meaning every one of these thrashing re-renders also
tore down and rebuilt every flag chip's own component identity — the
direct explanation for the "element was detached from the DOM,
retrying" symptom observed empirically.
**This is almost certainly the real root cause of the reported bug,**
not a separate issue: a component stuck re-rendering in a tight loop
cannot reliably process a click, keep its own dirty-state consistent,
or guarantee `handleSave`'s `onClose()` actually takes effect the way
the code intends — exactly the kind of erratic, hard-to-pin-down
behavior Pete described.
**Fixed:** wrapped both `onDirtyChange` callbacks in `useCallback` at
the parent (`handleFlagsDirtyChange`, `handleTeamDirtyChange`),
referencing the already-stable `setSectionDirty`. Confirmed via
repeated live reproduction: 0 "Maximum update depth exceeded" errors
after the fix, across multiple independent test runs, including the
full real flow (apply a flag → dirty state correctly shown → Save
button correctly enabled → Save click auto-closes the modal as
designed, with the flag genuinely persisted).
**A second, related bug found and fixed while directly investigating
this same code:** `handleSave`'s commit loop had no error handling at
all — if any `onApplyFlags`/`onRemoveFlag` call threw partway through
(a real possibility given this app's optimistic-concurrency version
checking elsewhere), the error was silently swallowed, the user got
zero feedback, and — worse — any flag changes that *did* succeed
before the failure would leave the modal showing "unsaved changes"
with the discard-warning still unconditionally claiming "nothing has
been saved yet," which could be false in that scenario. Added real
error surfacing (a visible message in the modal footer, tracking
whether anything succeeded before the failure) and made the discard-
warning's own text conditionally accurate to a failed-partial-save
state rather than always asserting nothing was saved.
**Also fixed while in this file:** a `scrollable-region-focusable`
accessibility gap on the flag catalog list (added `tabIndex={0}`) —
found via a live WCAG check while verifying the main fix, unrelated to
either bug above. **Explicitly not touched:** the same WCAG check
surfaced ~25 pre-existing color-contrast violations, all within
`HeaderBar.tsx`'s light-background elements and the Flag Manager's own
`+ Apply` chip — confirmed unrelated to this fix (nothing here touched
color/CSS) and squarely inside the widespread contrast issue already
discussed and deliberately deferred to a dedicated pass with the
human dev team, not re-litigated here.
**Verified:** `npx tsc --noEmit -p .` zero errors. Multiple independent
live Playwright reproductions before and after the fix, confirming the
infinite loop specifically (not just "no crash observed once").

## 43. Accession-area items from the bug list (#3, #5, #6, #7)
**#6, FIXED — "Specimen Count is 1 before we save anything?"**
Confirmed: `specimens` state is deliberately seeded with one empty
placeholder row (`useState<SpecimenDraft[]>([emptySpecimen('A')])`) so
the form has something to fill in immediately. The Specimens tab
label showed raw `specimens.length`, meaning it read "(1)" from the
moment the page loaded, before any real data existed — misleading,
exactly as reported. Added a derived `filledSpecimenCount` (specimens
with a non-empty description, the same criterion `specimensValid`
already uses) and switched the tab label to that instead. Verified
live: label now reads plain "Specimens" with no count until real data
exists.

**#7, verified NOT reproducible under the default flow — "Submit
Accession seems to be available?"** Checked the actual gating logic
(`canSubmit = caseInfoValid && specimensValid && !submitting &&
!categoryConflictNames`, with `specimensValid` requiring every
specimen's description to be non-empty) and confirmed live via
Playwright that the Submit button is genuinely `disabled` with only
the default empty placeholder present. This item's own triage note
ties it to item #1 ("Design Decision, Pete first" — the
accession-without-an-order flow); its full resolution likely depends
on that still-open decision, and the specific "no order exists"
scenario may have a different validation path than what's testable
today. Not fixed, since nothing here is currently broken as far as
verified — flagged for Pete to clarify the exact scenario if the
concern persists once #1 is resolved.

**#3, confirmed already correct — "Will Order-record fields
populate?"** Read `doImportOrder` in full: patient name, DOB, sex,
MRN, encounter number, priority, requesting provider, clinical
indication, ICD-10 codes, client, and per-specimen dictionary
resolution are all genuinely populated from the order on import.
Comprehensive, already working as expected — no fix needed, this was
a Verify item and it verified true.

**#5, NOT reproducible — "Deficiency doesn't actually display the
deficiency."** Checked all three deficiency-related display paths in
the Accession flow: the per-specimen manual deficiency trigger, the
case-level manual deficiency trigger, and the automatic
dictionary-mismatch deficiency banner. All three correctly show real,
specific information once a deficiency exists (the actual deficiency
type name, or the specific unmatched order text) — none match "doesn't
display." Genuinely couldn't find the gap Pete's describing in what
was tested. Possible explanations not yet ruled out: he may mean
whether a deficiency recorded at accession time shows up anywhere
*after* the case is created (worklist card, case header) — a
different question from the accession-time display, and one this
investigation didn't check. Flagged for Pete to clarify exactly where/
when he saw the missing display, rather than keep guessing.

**Verified:** `npx tsc --noEmit -p .` zero errors. Live Playwright
verification for #6 (label text) and #7 (Submit button disabled
state).

## 44. Case-level vs specimen-level deficiency scoping (from Pete's design observation), plus the Case-Level Deficiency modal's tab-boundary bug
**Found during:** Pete asking what the Case-Level Deficiency field
actually does. Investigating that live turned up a genuine, confirmed
bug: the button correctly set its own "open" state, but the modal
it's supposed to open was nested inside `{tab === 'specimens' && (...)}`
— the WRONG tab's JSX — while its trigger button lives on the Case &
Patient tab. Clicking it while on that tab did nothing visible at all,
since the modal's own render block didn't exist in the tree yet. This
is very likely what item #5 ("Deficiency doesn't actually display")
was actually about — the specimen-level and auto-detected deficiency
displays both work correctly; only this one, case-level path was
broken. Fixed by moving it to the same tab-independent location the
adjacent, correctly-built `CaseCommentModal` already uses. Verified
live: modal now genuinely opens with the right content.

**The deeper design gap Pete then identified:** the same flat list of
8 `DeficiencyType` dictionary entries was shown identically in both
the case-level and specimen-level dropdowns, with nothing distinguishing
types that only make sense at one level (e.g. "Container Damaged" —
specimen-only — vs "Missing Requisition" — explicitly documented in
this codebase as case-only) from ones that genuinely apply either way.
Confirmed via direct code reading that `ReportDeficiencyModal` rendered
every item in whatever list it was given with zero filtering, and both
Accession-page call sites passed the exact same unfiltered list.

**Built, per Pete's explicit spec ("Specimen, Case/Requisition, or
Both" in admin config):**
- Added `level?: 'case' | 'specimen' | 'both'` to `DeficiencyType`
  (optional, defaulting to 'both' when absent — the safe, permissive
  choice for existing/unclassified data rather than silently hiding a
  type nobody's explicitly scoped)
- Classified all 8 existing seed types by their actual real-world
  applicability
- `ReportDeficiencyModal` now takes a `context: 'case' | 'specimen'`
  prop and filters its dropdown accordingly — always keeping the
  currently-selected type visible even if reclassified later, so an
  existing record's own edit dropdown never loses its own selection
- Both Accession-page call sites updated to pass their actual context
- Extended the shared `DeficienciesSection.tsx` admin screen (used for
  both Deficiency Types and Resolution Types via one generic
  `TypeDictionaryTab` component) with a `showLevel` prop — a Level
  column and selector appear only on the Deficiency Types tab, since
  Resolution Types has no equivalent concept and showing an irrelevant
  field there would be its own confusion

**Verified live, end to end:** admin screen shows Level correctly for
Deficiency Types (all 8 correctly classified), correctly absent from
Resolution Types. Case-level dropdown on Accession now shows exactly
the 3 applicable types (Missing Requisition + the 2 "both" types);
specimen-level shows exactly the 7 applicable types (5 specimen-only +
2 "both").

## 45. NEW BUG — Accession page had zero unsaved-changes protection
**Reported by Pete:** "There is no catching dirty fields if you leave
accessioning before saving." Confirmed: zero references anywhere in
`AccessionPage.tsx` to the app's shared `DirtyStateContext` — the same
mechanism `SynopticReportPage.tsx` already uses to warn before losing
unsaved work. Real data loss risk: filling in patient info and
specimens, then clicking any nav link, silently discarded everything
with no warning at all.

**Fixed, reusing the page's own existing `hasUnsavedProgress()` check**
(already defined for a narrower purpose — warning before an order
import overwrites in-progress typing) rather than inventing a separate
notion of "dirty":
- Wired `useDirtyState()`'s `setDirty` to react to the same fields
  `hasUnsavedProgress()` already checks, clearing on unmount so a
  stale flag doesn't leak into whatever page loads next
- Added a `beforeunload` handler for the browser refresh/tab-close
  case, mirroring `SynopticReportPage.tsx`'s exact existing pattern
- Cleared the dirty flag at the real point of successful persistence
  (right after the case genuinely gets created), not on the submit
  button click, so the success screen doesn't itself trigger a false
  warning

**A second, real gap found while verifying this, not obvious from
reading the code alone:** `AppShell.tsx`'s `guardedNavigate` correctly
calls `requestNavigate` and genuinely blocks navigation when dirty —
confirmed live, clicking away with unsaved data did stay on the page —
but `DirtyStateProvider` itself renders no confirmation UI anywhere.
Every page using this system has to supply its own dialog reacting to
`pendingPath`/`confirmNavigate`/`cancelNavigate`, or the user just gets
silently stuck with no way to actually leave or stay. Added a
`ConfirmModal` for this, reusing the exact same component already used
elsewhere in this file for the order-import warning, for consistency.

**Verified live, several scenarios:** dirty form + nav click → dialog
appears, blocks navigation; confirming leaves and discards; canceling
stays on the page with all entered data still intact; a genuinely
clean form (nothing entered) navigates freely with no false-positive
warning.

**Deliberately not replicated:** `SynopticReportPage.tsx`'s browser
back/forward-button interception (a `popstate` listener tied to its
own bespoke `UnsavedWarningModal`, materially more complex than the
shared `ConfirmModal` pattern used here). The core ask — catching
unsaved changes when navigating away in-app or closing the tab — is
fully covered without it; flagged here rather than silently expanding
scope.

**Verified:** `npx tsc --noEmit -p .` zero errors throughout every
step of both items in this entry.

## 46. Following the deficiency system through to completion — Contribution Dashboard's Quality Flags widget was a dead end
**Requested by Pete:** verify My Contribution and Quality Assurance
actually follow the (now level-aware) deficiency system through to
completion, rather than just checking the pieces built so far in
isolation.

**Deficiencies display: already correct everywhere.** Traced every
place `DeficienciesPage.tsx`, its two modals, and
`ManagementReviewModal.tsx` reference a deficiency's specimen — all 4
spots already correctly show "Case-level" rather than breaking or
showing blank for a record with no `specimenId`. Only one shared table
renders every tab (Open/Pending Verification/Closed), so this coverage
is comprehensive, not just the one spot checked first.

**The real gap, found by tracing the full loop, not just the
endpoints:** Contribution Dashboard's own "Quality Flags" widget
already correctly displayed case-level deficiencies too (`d.specimenLabel
? ... : ' — case-level'`) — but clicking one navigated to the case's
own synoptic report page, not to `/deficiencies`, where resolving a
deficiency actually happens. Confirmed directly: `SynopticReportPage.tsx`
only ever *displays* existing deficiencies and has two automatic
raise-and-resolve flows — no manual resolve/verify UI exists there at
all. So the widget's own stated purpose — surface your own open
quality issues so you can act on them — dead-ended: clicking through
landed on a page with nothing to actually do about it.

**Fixed with two real, complementary pieces**, not just redirecting
the link:
- `DeficienciesPage.tsx` now supports a `?open=<id>` query param —
  switches to that record's own status tab, scrolls it into view, and
  gives it a brief fading highlight (auto-clears after 3s, matching
  the CSS transition timing), then cleans the URL so refreshing or
  sharing the link later doesn't keep re-triggering it on an item that
  may already be resolved by then
- Contribution Dashboard's Quality Flags `onClick` for deficiency
  entries now links to `/deficiencies?open=${d.id}` instead of the
  case's synoptic page

**Deliberately checked and left alone:** the *other* flag type feeding
this same widget (Frozen/Final discordances) links to the case's
synoptic page too — confirmed via `DiscordanceReconciliationModal`
being genuinely rendered from `SynopticReportPage.tsx` that this one
is already correct as-is; discordances really do reconcile there,
unlike deficiencies. Also checked a second, unrelated `/deficiencies`
link from the Teaching Cases tile (countersign/FPPE data) — a
"view all" style link to a different tab family entirely, not a
specific-record link, correctly left untouched.

**Verified live, end to end**, using a real seeded case-level
deficiency (`def-demo-001`, status 'open', no specimenId — a genuine
existing example of exactly the scenario this fix targets): navigating
directly to `/deficiencies?open=def-demo-001` correctly activated the
Open tab, showed the record with "Case-level" labeled correctly, the
row carried the highlight class, and the URL cleaned itself up
afterward.

**Verified:** `npx tsc --noEmit -p .` zero errors throughout.

## 47. Deficiencies queue restructured — grouped by level, renamed, per-row status circle
**Requested by Pete**, following up on confirming the Open tab mixes
case-level and specimen-level items together. Clarified scope directly
before building (a real structural fork: does the renamed tab stay
Open-only, or does it now span multiple statuses with the circle
distinguishing them) — confirmed the latter.

**Built:**
- Merged the separate Open and Pending Verification tabs into one,
  renamed "Case-Specimen Deficiency" — both statuses now live together
  (still genuinely separate statuses internally, just not split across
  two tabs). Closed remains its own separate tab/archive, unchanged.
- Within the combined tab, items are grouped into two sections —
  Case-Level and Specimen-Level, each with its own count in the
  section header — sorted by case/accession number within each group
  (previously sorted by raised-date across a flat, ungrouped list).
- Added a per-row status indicator (colored circle + label), reusing
  the exact existing `.ps-conf-status-dot`/`.ps-conf-status-cell`
  pattern already used elsewhere in Configuration for
  Active/Inactive/Unverified — same component family, not a new,
  one-off pattern. Added one new color variant (`--open`, red) to that
  shared pattern, since neither of its existing two colors (green
  "active," amber "pending") fit an unaddressed item; reused the exact
  red (`#f87171`) already used elsewhere on this same page for
  overdue/reopened styling, for internal consistency.
- The Detail/When/Actions columns are now driven by each row's own
  `status`, not by which tab is active (both statuses render in the
  same table now, so this had to move from a tab-level condition to a
  per-row one) — via a shared row-render helper to avoid duplicating
  the cell markup between the two grouped sections.

**Updated everything downstream of the tab restructuring:** the
`Tab` type itself, `columnsFor`, the trend-chart visibility gating, the
Closed-tab's own rendering path (kept genuinely unchanged, verified
still renders correctly), and the `?open=<id>` deep-linking added
earlier this session — that now maps both 'open' and
'pending-verification' statuses to the one combined tab value rather
than a tab value that no longer exists.

**Verified live:** tab reads "Case-Specimen Deficiency (3) — 1
overdue" (matching real seed data); both group headers show correct
per-group counts; case IDs correctly grouped and sorted; status labels
and colors correctly match each row's real status; deep-linking
re-verified working with a specimen-level record after the
restructuring; Closed tab confirmed unaffected and still rendering
correctly. `npx tsc --noEmit -p .` zero errors. Live WCAG check on
both tabs — 0 violations.

## 48. Quality Control added to System Logs — the permanent QA compliance record, separate from the working queue
**Requested by Pete**, after a real back-and-forth about where closed
deficiency records should actually live. Pete's own first instinct —
route closed items only through a downloaded report, with no in-app
browsing — self-corrected mid-message as bad workflow, which led to a
better final architecture: don't make the working queue browse-only
via export, instead give the *permanent record* its own proper home,
separate entirely from the day-to-day working queue.

**What was built:** a third top-level tab, "Quality Control," added to
`AuditLogPage.tsx` (titled "System Logs" in the UI) alongside the
existing Audit Log and Error Log tabs — matching every one of their
established conventions exactly, not a new one-off pattern:
- Same tab-switcher styling, with a badge showing the open count
  (mirroring Error Log's own open-issues badge)
- Same stats-card row (Total / Open / Pending Verification / Closed)
- Same filter-row shape: status pills, a level filter (Case+Specimen /
  Case-Level Only / Specimen-Level Only — the same grouping distinction
  the working queue now uses), date range (Today/7/30/90 days/Custom —
  reusing the exact same `getDateThreshold` helper the Audit tab
  already uses), and a text search box
- Same rich, compliance-oriented CSV export: the identical
  notice/filters/requester/record-count meta header the Audit and
  Error exports already use, plus the PHI-safety principle
  `qaReportUtils.ts` established elsewhere in this app for this exact
  data (no patient name/MRN/DOB in the export, only case/accession
  identifiers) — genuinely the record meant to hold up under a CAP or
  other certification inspection, so it needed to read as a complete,
  self-explanatory document on its own, the same way the other two
  exports already do

**Deliberately defaults to All Time**, not last-7-days like the Audit
tab — this is meant to be the complete historical record, not a
recent-activity feed. Status/level/date/search all compose together
the same way the Audit and Error filters already do.

**A real, pre-existing gap found and fixed while building this, not
scoped to just the new tab:** all three exports on this page — Audit,
Error, and now Quality — had hardcoded `"Requested By": "Unknown"`
regardless of who was actually logged in. Given this feature's whole
stated purpose is holding up under an inspection, a report that can't
say who pulled it is a real gap. Added a `requestedByLabel` derived
from the actual logged-in user (already available via `useAuth()` in
this same file) and fixed all three call sites, not just the new one.

**Deliberately not yet addressed:** whether the existing "Closed" tab
on the Quality Assurance working queue itself (`DeficienciesPage.tsx`)
should be removed or de-scoped now that this is the real permanent
record. Left it exactly as it was — it still serves the Management
Review workflow (batch-reviewing recently closed items is a genuine
active task, not pure archival browsing) — rather than removing
something without confirming that's actually wanted.

**Verified:** `npx tsc --noEmit -p .` zero errors throughout. Live,
end to end: tab renders with correct stats and rows; status-pill
filtering narrows results correctly; text search matches across
case/issue/detail fields correctly; Export CSV genuinely triggers a
real file download (not just a UI click) — confirmed by reading the
actual downloaded file's content, correct filename, correct
compliance header, correct data columns, and (after the fix) the real
requester's name instead of "Unknown." Live WCAG check on all three
tabs (Quality Control, Audit Log, Error Log, the latter two re-checked
since the requester fix touched shared code) — 0 violations across
all three.

## 49. Inline style cleanup + README updates for items #42-48
Per explicit instruction: swept every file touched across this whole
session (`AuditLogPage.tsx`, `DeficienciesPage.tsx`,
`ContributionDashboardPage.tsx`, `AccessionPage.tsx`) for stray inline
`style=` usage. Found one — the Quality Control tab's Pending
Verification status badge, added as a quick inline conditional during
that build rather than a proper class. Fixed: added
`.ps-auditlog-status-badge--pending` alongside the existing
`--resolved`/`--open` variants, matching the exact same amber already
used consistently elsewhere on this page. Verified live — same visual
result, now via a real class. Confirmed no other stray inline styles
anywhere else touched this session (`ContributionDashboardPage.tsx`'s
existing `--bar-height`/`--bar-width` CSS custom-property usage is
pre-existing, legitimate, dynamic-value handling, not the same class of
problem, and untouched).

**READMEs updated** to reflect everything from items #42–48, across 6
files: `pages/README.md` (DeficienciesPage.tsx, AuditLogPage.tsx,
ContributionDashboardPage.tsx, IntraopQueuePage.tsx entries),
`pages/AccessionPage/README.md`, `services/deficiencies/README.md`,
`components/Config/System/README.md`, `components/Flags/README.md`.

**A stale claim caught and corrected along the way, not just new
additions:** `pages/AccessionPage/README.md` still described the
unsaved-import-replace gate as using `window.confirm()` directly
rather than the shared `ConfirmModal` — flagged there as "found, not
fixed," referencing this same file's `PRIORITY_FIXES.md` item #19.
Checked the actual current code before writing an update rather than
trusting what was already documented: it was already fixed, in a
session between when that README entry was written and now — the
fix's own code comment confirms it. Corrected the README rather than
silently leaving a false claim standing.

**Verified:** `npx tsc --noEmit -p .` zero errors. Live WCAG re-check
on the Quality Control tab after the inline-style fix — 0 violations.

## 50. Export added to remaining QA tabs; status-dot consistency fixes
**Requested by Pete:** add export to whichever Quality Assurance tabs
still lack one, exporting just the currently-working rows; separately,
check whether the colored status-circle treatment (added to the
Case-Specimen Deficiency tab in item #47) is missing from other tabs.

**Surveyed all QA tabs first** rather than guess: 5 of 8
(`ReconciliationTab`, `CountersignTurnaroundTab`, `FppeTrackingTab`,
`IntraopLinkageTab`, `DriftCorrectionTab`) already had export via the
shared `exportQaReportRows` utility. 4 genuinely lacked one —
`PatientMatchReviewSection.tsx`, plus the three tabs living directly
in `DeficienciesPage.tsx` itself (Case-Specimen Deficiency, Closed,
Management Reviews, which are distinct from the separate System Logs
compliance export added in item #48 — these export "just the working
rows" currently on screen, not the complete historical record).

**Export added to all 4**, using the same shared `exportQaReportRows`
utility for consistency with the other 5 tabs, not a separate one-off
CSV path. Verified live by triggering real downloads and confirming
filenames for all 4 (`quality-assurance-active-*.xlsx`,
`quality-assurance-closed-*.xlsx`,
`quality-assurance-management-reviews-*.xlsx`,
`patient-match-review-*.xlsx`).

**Status-dot gap confirmed real, fixed in 2 places:**
`DriftCorrectionTab.tsx`'s "Deferred (conflict)"/"Failed" status was
shown as inline-styled colored text (`style={{ color: ... }}`), not
the dot+label pattern — converted to reuse the exact same
`.ps-conf-status-dot`/`--pending` (amber)/`--open` (red) classes
already established. `PatientMatchReviewSection.tsx`'s "Needs Review"
badge was a bespoke inline-styled pill — converted to the same shared
pattern for consistency, even though every row in that queue currently
shares the same single status (nothing to visually distinguish via the
dot yet, but consistent with how every other tab in this module now
represents status).

**Checked and left alone:** `ReconciliationTab.tsx`'s Concordant/
Discordant split — already handled via two clearly-labeled, counted
sections rather than a per-row indicator, which is a reasonable,
already-adequate treatment for a binary outcome, not a gap needing the
same dot treatment.

**A real, unrelated `select-name` WCAG violation found and fixed while
verifying:** `PatientMatchReviewSection.tsx`'s Organisation dropdown
had no `htmlFor`/`id` label association — added it, quick and isolated
since already deep in this exact file for the reasons above.

**Explicitly not touched:** several genuine `color-contrast`
violations surfaced by visiting these tabs live for the first time
this session (`Management Reviews`' empty-state text, `Post-
Finalization Drift`'s empty-state text, 2 more on `Patient Match
Review`) — all `#475569`/`#6b7280`/`#64748b`-class text, confirmed as
the same widespread contrast issue already investigated and
deliberately deferred to the human dev team earlier this engagement.
Not re-litigated here; none of these lines were touched by today's
actual changes.

**Verified:** `npx tsc --noEmit -p .` zero errors throughout. Live:
all 4 new export buttons trigger genuine file downloads with correct
filenames; both status-dot conversions compile clean and use
CSS classes already visually confirmed correct elsewhere this session;
the Organisation select fix confirmed present via its new `id`.

## 51. Home tile renamed — "System Audit" → "Audit", tagline updated
Per Pete's exact wording: title changed to "Audit", description
changed to "Review System Activities, Audit Trail, and Quality
Assurance" — reflecting the page now covering Quality Control (item
#48) alongside the original Audit Log and Error Log. Left the one
other "System Audit" reference in the codebase alone
(`AuditLogPage.tsx`'s CSV export meta-header, "PathScribe AI — System
Audit Log Export") — that's the formal document title printed at the
top of the exported file itself, a different context from the Home
page's nav tile, and wasn't part of what was asked.

Worth knowing: the Home page also has a separate "Quality Assurance"
tile (routing to `/deficiencies`) sitting right next to this one, so
both tiles now reference "Quality Assurance" — the other tile in its
title, this one in its new tagline. Not changed unprompted since exact
wording was given; flagged for awareness.

**Verified:** `npx tsc --noEmit -p .` zero errors. Live: tile renders
with the exact requested title and description.

## 52. Quality Assurance (renamed from Quality Control) now covers all 8 QA groups, not just Deficiencies
**Requested by Pete**, following up on the original Quality Control
tab: rename to "Quality Assurance," add a Group selector covering
every tabbed item group from the working queue (not just
Deficiencies), with status options that adapt to whichever group is
selected, then User, then Date, then Search, in that order. Confirmed
scope precisely before building given the size of the change — in
particular whether Management Reviews belongs as its own group despite
having no real open/closed lifecycle. Pete's own reasoning settled it:
documenting that a Management Review happened is itself the compliance
requirement, not something to leave out for lack of a status column.

**Built:** a normalized `QualityRecord` shape that all 8 groups map
into — Deficiencies, Intraoperative Linkage, Discordance &
Reconciliation, Countersign Turnaround, Credentialing Review,
Post-Finalization Drift, Patient Match Review, and Management Reviews
— each keeping its own real status vocabulary (`GROUP_STATUS_OPTIONS`)
rather than forcing one fake shared set. Investigated each group's
actual underlying type/service before writing the mapping, not
guessed: `IntraoperativeEntry.status` ('pending'/'merged'),
`ReconciliationRecord.outcome` ('concordant'/'discordant'),
`CountersignRecord.status` ('pending'/'countersigned'),
`FppeAssignment.status` ('active'/'completed'), Post-Finalization
Drift's 4 real event names (reusing the same real audit-log-backed
source `DriftCorrectionTab.tsx` itself already reads from — no
dedicated service exists for this, by design), Patient Match Review's
single 'needs-review' state, Management Review's single 'completed'
state.

**A real service gap found and worked around, not glossed over:**
Patient Match Review's own service has no cross-organisation `getAll`
— only `listPendingReview(organisationId)`, org-scoped. Aggregated
across every organisation (`listOrganisations()` + one call per org),
matching the same complete-record purpose this whole tab exists for,
rather than silently only showing one organisation's queue.

**Status filter, stats cards, and the status badge's color-coding are
all now driven generically off each group's own vocabulary** — a
label like "Closed"/"Merged"/"Concordant"/"Countersigned"/"Completed"/
"Auto-Corrected" reads as resolved (green), "Open"/"Discordant"/
"Failed" reads as needs-attention (red), everything else reads as
in-progress (amber) — rather than 8 separate hardcoded stat/badge
blocks repeating the same logic per group.

**Directly answers Pete's original question** ("is there an ability
to output completed Management Reviews?") — yes: selecting that group
and hitting Export produces the same compliance-grade CSV (notice/
filters/requester/record-count header) every other group gets,
scoped to whichever group/status/user/date/search combination is
currently active.

**Verified live, comprehensively:** all 8 groups load and switch
correctly; status options confirmed to change per group (Deficiencies
shows 3, Intraop Linkage shows 2, Drift shows 4, etc.); 4 of 8 groups
returned real data during testing (Deficiencies: 4, Intraop Linkage:
22, Discordance & Reconciliation: 175, Countersign Turnaround: 12);
the other 4 (Credentialing Review, Post-Finalization Drift, Patient
Match Review, Management Reviews) confirmed genuinely empty by
checking the underlying seed data directly, not assumed — consistent
with what those same groups' own standalone tabs already showed
earlier this session, not a new bug. Status filtering, the
superadmin-only user filter, search, and CSV export (read the actual
downloaded file's content, not just the click) all verified working
correctly, including the real compliance meta-header with correct
filter summary and requester name. WCAG-checked across 3 different
groups — 0 violations. `npx tsc --noEmit -p .` zero errors throughout
every step of this build.

## 53. BUG (severe, confirmed) — Quality Assurance page had no vertical scrolling at all
**Reported by Pete.** Confirmed live rather than assumed: traced the
actual CSS overflow chain from `.ps-defic-page` up through every
ancestor. The app-shell's own content wrapper is a fixed-height,
`overflow: hidden` container by design — every page is expected to
provide its own internal scrollable region within it. This page never
did. Content taller than the wrapper (595px in the test viewport, vs.
2384px of actual content on the Discordance & Reconciliation tab
alone, which has 175 real records) was silently clipped with no
scrollbar anywhere — not a rendering glitch, a hard, invisible cutoff.
Anything below the fold on any tab with enough rows was completely
unreachable.

**Fixed** by giving this page the exact same internal-scroll structure
`ConfigurationPage.tsx` already uses correctly (`.ps-cfgpage-shell` /
`.ps-cfgpage-scroll` / `.ps-cfgpage-inner`) — matched the working
pattern rather than inventing a new one: `.ps-defic-page` now
establishes a full-height flex column, wrapping a new
`.ps-defic-scroll` (`flex: 1; min-height: 0; overflow-y: auto`)
containing a `.ps-defic-inner` that carries the padding/max-width the
outer container used to have directly.

**Verified live, precisely:** confirmed the exact broken overflow
chain before fixing (parent wrapper 595px, `overflow: hidden`, content
2384px). After the fix: `.ps-defic-scroll`'s `scrollTop` genuinely
advances via both direct scroll and real mouse-wheel input; a
screenshot after scrolling shows records (PSA-2024-2202 onward) that
were previously completely inaccessible now fully visible. Re-checked
5 other tabs on this same page (Case-Specimen Deficiency, Closed,
Intraoperative Linkage, Countersign Turnaround, Patient Match Review)
to confirm the layout restructuring didn't break anything elsewhere —
all render correctly. One WCAG violation surfaced on Patient Match
Review during this check, confirmed to be the same pre-existing
`#6b7280` contrast issue already found and explicitly deferred earlier
this session (item #50), not something introduced by this fix.

**Verified:** `npx tsc --noEmit -p .` zero errors.

## 54. Worklist bug-list items #9, #10, #11, #12 (item #17 flagged, not found)
**#11/#12, FIXED together — page title didn't match the selected
tile.** Traced to two completely independent, hardcoded copies of the
same concept: `FILTER_TITLES` (drove the page heading) and each tile's
own inline label string. They'd already drifted apart in several real,
confirmed places — `urgent` read "Urgent Cases" in the title vs.
"Urgent" on the tile, `draft` read "Draft Cases" vs. "Draft", `amended`
read "Amended Cases" vs. the tile's own "Amendment & Addenda" (the
specific case Pete reported), `grosscomplete` had an extra
"— Awaiting Microscopic" suffix, and `countersign` wasn't in the title
map at all — selecting that tile silently fell back to the generic
"Active Cases" title. Fixed properly, not just patched: replaced both
with one shared `FILTER_LABELS` map that the title and every tile's
label both read from, making this specific class of drift structurally
impossible going forward.

**#10, FIXED — Urgent tile showed 4 with no indication 2 more urgent
cases existed, unassigned, in the pool.** Confirmed the "4" was
already correctly excluding pool-status cases (not a math bug) — the
real gap was that those pool-urgent cases weren't visible anywhere on
the tile at all. Added a restricted-count sublabel ("2 Restricted"),
using an existing `sublabel` field already wired into the tile's own
rendering but never populated by any tile until now.

**#9, FIXED — two tiles used the exact same color, others too close
to reliably tell apart.** Confirmed precisely: `delegated` and
`accessioned` used identical hex values (`#38bdf8` and `#38BDF8` — a
literal duplicate, just different letter casing). Also found and
fixed two near-duplicate pairs that would be genuinely hard to
distinguish, particularly for colorblind users: `countersign`/
`amended` (both light violets) and `pool`/`review` (both oranges).
Reassigned `accessioned` to indigo, `amended` to a darker, more
saturated violet (distinct from both `countersign`'s lighter violet
and `finalizing`'s pink), and `review` to a gold/yellow shifted clearly
off `pool`'s orange. All 12 tile colors confirmed unique afterward.
Scoped as a targeted fix to the confirmed collisions, not a full
ground-up 12-color redesign — the other 9 colors were already
reasonably distinct and semantically sensible (red/green/gray for
urgent/completed/draft in particular), so left alone rather than
changed without a clear reason.

**#17, NOT FOUND — flagged for clarification rather than guessed.**
"Case Group display" doesn't appear anywhere in this codebase — not in
`WorklistPage.tsx`, not anywhere else in `src/`, checked both narrow
and broad searches. No image link or other context in the issue itself
to disambiguate. Rather than guess and risk building the wrong thing
in the wrong place, left this one for Pete to point to directly.

**Verified:** `npx tsc --noEmit -p .` zero errors. Live: page title
confirmed to read "Amendment & Addenda" (previously "Amended Cases")
after clicking that tile; Urgent tile confirmed showing "4" with
"2 Restricted" beneath it; all 12 tile colors confirmed unique via
direct extraction from the rendered file. WCAG-checked — 0 violations.

## 55. Item #17 resolved — group bars now show restricted counts, and urgent pool cases sort to the top
**Clarified by Pete**, after item #17's original description didn't
match anything in the codebase: "Case Group display" turned out to be
the section divider bars within the worklist table itself (Urgent /
All Cases / per-pool headers in `WorklistTable.tsx`, a separate
component from the top summary tiles fixed in item #54) — found by
recognizing them in a screenshot from that earlier fix. Two real
requests, both implemented:

**Restricted count on the Urgent/All Cases divider bars.** Same idea
as the top tile fix in item #54, applied here too: the "Urgent" and
"All Cases" bars now show how many additional cases of that same tier
are sitting unassigned in the pool (e.g. "URGENT — 2 Restricted — 4").
Added an optional `restrictedCount` field to the divider type, computed
directly alongside each divider's own count. One real TypeScript
narrowing quirk hit and fixed along the way: `!row.isPool` didn't
narrow the `DividerRow` union reliably in this JSX context; switching
to the explicit `row.isPool === false` comparison resolved it cleanly.

**Unassigned + urgent cases now sort to the very top of the list.**
Confirmed the existing code (already quite sophisticated — pools
containing urgent cases already sorted before pools that don't, and
each pool already split its own urgent cases into their own
sub-divider) still placed the *entire* pool section, urgent included,
after both the regular Urgent and All Cases sections — meaning an
unassigned urgent case was previously buried at the very bottom of the
whole worklist, the opposite of where it needed to be. Added
`splitPoolRowsByUrgency` as a new, additive function in
`poolGrouping.ts` — deliberately did not modify `buildPoolGroupRows`
itself, which already had 19 passing tests covering its exact current
behavior; the new function just partitions its existing output by each
divider's own `isUrgent` flag, letting the caller reorder without
touching the tested function's contract at all. `WorklistTable.tsx` now
pulls the urgent-pool sub-groups out to the very top of the whole list,
ahead of even assigned Urgent cases, while every other pool group keeps
its existing position at the bottom.

**Verified:** `npx tsc --noEmit -p .` zero errors. All 19 existing
`poolGrouping.test.ts` tests re-run and confirmed still passing
unmodified — the additive approach genuinely didn't disturb the
existing, tested function. Live: divider order confirmed top-to-bottom
as "Gastrointestinal — Urgent" (the unassigned/urgent pool group) →
"Urgent" (2 Restricted) → "All Cases" (5 Restricted) — exactly the
requested order and counts, screenshot-confirmed showing the
unassigned urgent cases correctly marked "Restricted Pooled Case —
Claim this case to view patient details." Applied to both of this
component's two divider-rendering paths (the card view and the table
view), not just one. WCAG-checked — 0 violations.

## 56. Business logic extracted from JSX + README updates for items #54-55
Per explicit instruction: swept item #55's changes for business logic
sitting directly in JSX rather than extracted to named variables, and
updated every README covering files touched in items #54-55.

**Found and fixed:** `WorklistTable.tsx`'s two divider-rendering blocks
(card view and table view) had the restricted-count condition
(`row.isPool === false && !!row.restrictedCount`) evaluated directly in
the JSX rather than extracted, unlike the adjacent, pre-existing
`isCollapsible`/`isCollapsed` pattern right above it. Extracted into a
`const restrictedCount = row.isPool === false ? row.restrictedCount :
undefined` at the same point those other two variables are already
declared — resolves the value once, in the same place the divider type
is first narrowed, rather than re-deriving it inline in the JSX.
Genuinely necessary, not just style: a plain boolean extraction
(`showRestrictedCount`) was tried first and didn't work — it doesn't
carry the type-narrowing information TypeScript needs when
`row.restrictedCount` is actually read later, so extracting the real
value (already resolved to `number | undefined` at the point of
narrowing) was the correct fix, not just a preference. Applied to both
of the component's two divider-rendering paths, not just one — the
second was initially missed on the first pass (a `str_replace` matched
only the first of two identical-looking blocks) and caught immediately
by grepping for the pattern afterward rather than assuming both landed.

**READMEs updated**, 3 files: `components/Worklist/README.md`
(`WorklistTable.tsx` and `poolGrouping.ts` entries extended, test-count
note updated to confirm the 19 existing tests were re-run and still
pass unmodified), and a **new** `pages/WorklistPage/README.md` — this
subfolder had no README at all despite `pages/README.md`'s own header
already listing `WorklistPage/` as one of the subfolders expected to
have one. Covers all 3 files in that folder, including honest,
appropriately-scoped notes on the two files not deeply reviewed this
session (`AmendedAddendaTriageTile.tsx`, `ResourcesModal.tsx`) rather
than overclaiming review depth that didn't happen.

**Verified:** `npx tsc --noEmit -p .` zero errors. All 19
`poolGrouping.test.ts` tests re-run, still passing. Live: restricted
badge text and divider order re-confirmed byte-identical to before the
refactor (`2 Restricted`/`5 Restricted`, `Gastrointestinal — Urgent` →
`Urgent` → `All Cases`) — the extraction genuinely changed nothing
about behavior, only where the logic lives. WCAG-checked — 0
violations.

## 58. Divider count brightness + Audit dropdown white-fill, item #1 investigated and reported
**#2, FIXED — divider header count numbers were nearly invisible.**
Traced to `.wl-card-divider__count` using `#475569` — the exact same
dim, failing-contrast gray flagged and fixed repeatedly elsewhere this
session. Brightened to the same established `#94a3b8` replacement used
consistently throughout.

**#3, FIXED — Audit page dropdowns showed a stark white options list
when opened, clashing with the dark theme.** Confirmed live: this
codebase already has a proven, working fix for exactly this — `color-
scheme: dark`, currently only applied to the two date-input variants
(`.ps-auditlog-select--date`, `.ps-searchpage-filter-input--date`), not
to the general `.ps-auditlog-select` class used for every other
dropdown on that page (Type, Severity, Date Range, Status, Group,
User). Added it to the base class. Verified with an actual screenshot
of the opened dropdown, not just computed-style checks — genuinely
dark now, matching the rest of the app. Worth noting for later:
`.ps-conf-select` (Configuration's own dropdown class) doesn't have
this either, so the same white-flash likely happens there too — not
touched here since it wasn't what was reported, flagging for a
possible follow-up.

**#1, investigated thoroughly, not a code bug — reported back rather
than guessed at.** "Not all sub headers have the Restricted count"
turned out to have a real, concrete explanation: checked the actual
seed data behind `computeRestrictedPoolKeys()` directly. Two of the
four pools shown (Gastrointestinal, Dermatopathology) exist as real
`Subspecialty` records, but both have `isWorkgroupEnabled: false` — the
function explicitly skips any subspecialty with that flag off, so
neither could ever show as restricted regardless of who's logged in.
The other two (Gynaecologic Pathology, Uropathology) don't match any
real Subspecialty record at all, so there's no membership data to
check in the first place. In short: the code is working exactly as
designed against the current demo configuration, which happens to have
workgroup-restriction turned off everywhere — not a rendering bug.
Flagged for Pete to decide how to proceed (e.g. enabling
`isWorkgroupEnabled` on some seed pools to actually demonstrate the
feature) rather than changing anything unilaterally, since this is a
data/configuration decision, not a code fix.

**Verified:** `npx tsc --noEmit -p .` zero errors. Live: divider count
color confirmed `rgb(148, 163, 184)` (`#94a3b8`); Audit select's
`color-scheme` confirmed `dark`; screenshot of the actual opened
dropdown confirms a genuinely dark list, not the reported white fill.
WCAG-checked on both affected pages — 0 violations.

## 59. Audit dropdown white-fill — real root cause found, not just color-scheme
**Follow-up to item #58**, after Pete reported the `color-scheme: dark`
fix didn't actually resolve the white dropdown fill on his machine.
Rather than re-guess, asked for and got a real, working example
already in this codebase to compare against: the Synoptic Report
editor's own dropdown field (`RightSynopticPanel.tsx`), confirmed
genuinely dark via a real screenshot Pete provided.

**The real difference, found by comparing the two directly:** the
working select uses a solid, fully opaque background (`#0f172a`).
`.ps-auditlog-select` used a *near-transparent* white tint
(`rgba(255,255,255,0.05)`) — visually dark once layered over the dark
page behind it, but Chrome's native dropdown-theming heuristic reads
an element's own *computed* background color in isolation, not what's
visually showing through it. A 5%-opacity white almost certainly
resolves as "light" to that heuristic regardless of the
`color-scheme: dark` hint, which likely explains why that property
alone didn't fix it. Changed the background to the same solid
`#0f172a` the proven-working element already uses; kept
`color-scheme: dark` too, since it doesn't hurt and reinforces the same
intent.

**Also checked while investigating:** `.ps-conf-select` (Configuration's
own dropdown class, flagged as a possible related issue in item #58)
already uses a solid background (`#0d1829`, via `--ps-conf-surface`),
not a transparent one — so it's likely *not* affected by this same
issue after all. Correcting that earlier speculation now that the real
mechanism is understood, rather than leaving a wrong guess standing.

**Honest note on verification:** my own test environment showed this
dropdown rendering correctly dark even *before* this specific fix
(using Playwright's bundled Chromium), which is a real reminder that
it doesn't reliably reproduce whatever's different about Pete's actual
browser/OS environment. I can't independently confirm this specific
fix resolves it the way I could with the earlier, cache-related issue
— this needs Pete's own check to know for sure. Verified what I
reasonably can: `npx tsc --noEmit -p .` zero errors, and the dropdown's
closed-state appearance still renders correctly, nothing regressed.

## 60. Overnight batch — items #24, #28, #29/#40, #30, #34, #36, #44, #46, #51, #54, #60, #65, #68, #70, #71, #92, #100, #101
Worked through the remaining bug-list items overnight per direct
request, holding everything for one combined patch rather than
delivering incrementally. Full breakdown below; items confirmed
already-correct or genuinely out of scope for a quick fix are
documented separately at the end.

**#29/#40 — root cause found and fixed.** `.env` had
`VITE_AI_PROVIDER=anthropic`, an invalid value — every switch
statement reading this field only recognizes request-format IDs
(`structured_messages`, `chat_completions`, etc.), and `'anthropic'`
matches none of them, hence "[PathScribe AI] Unknown provider:
anthropic". `structured_messages` is the correct value (its own type
comment literally says "Anthropic-shaped"). Fixed in both `.env` and
`.env.example` (which also had a second, separate stale model name
never caught before). Confirmed live — zero "Unknown provider" errors
after a dev-server restart.

**#24 — the "AMENDED" comparison table showed every synoptic field
regardless of whether it actually changed**, not just the ones that
differed — dozens of identical-value rows cluttering what's meant to
be a "what changed" view. Fixed by filtering to fields where at least
one version's value genuinely differs from another (JSON.stringify
comparison, so array-valued fields like `tumor_site` are handled
correctly too). Confirmed live on the specific case referenced: a
table that showed ~20 mostly-identical rows now shows exactly the 2
fields that truly changed. Separately confirmed the case-level status
itself was already correct ("In Progress", matching the real
`status: 'in-progress'` field) — the "Amendment In Progress" text
Pete saw was a different, legitimate banner showing additional
context, not a conflicting status bug.

**#28 — two real gaps in block navigation, both fixed.** Adding a
block never told the UI to navigate to it (`setFocusedBlockIndex`
already existed as the mechanism but was never called); clicking a
specific block opened the editor generically without saying which one
(`onOpenBlockEditor` took no arguments at all). Fixed both: computed
and set the new block's index after adding one; updated the callback
signature and all 3 click sites in `MaterialTreePanel.tsx` to pass the
specific block's id. Also found the modal component itself had no prop
for "which block to focus" — added `initialFocusBlockId` plus a
scroll-into-view effect, since setting state upstream with nothing
downstream reading it wouldn't have produced any visible change.

**#30 — slide codes overflowing their chip outline.** Real CSS bug:
`text-overflow: ellipsis` was set on a plain inline `<span>` with no
width constraint, so it never actually activated. Added
`display: block; max-width: 100%` (plus `min-width: 0` on the flex
parent) so the existing ellipsis rule can actually take effect.
Confirmed live — "MMR Panel" now truncates to "MMR…" instead of
overflowing the slide outline.

**#34 — the real root cause was a silent CSS override, not a missing
style.** Reproduced live at a realistic viewport width and found three
separate `.ps-ose-summary-row` rules in the stylesheet; the last one
(intended as a "three-group layout" upgrade) switched the row from
flexbox to CSS grid with `grid-template-columns: auto 1fr auto` and no
wrap capability — grid columns can't move to a new row the way flex
items can, so the middle "Jump to" cell got crushed into a stacked,
overlapping mess instead of the whole row wrapping gracefully. Fixed
by restoring flex-based wrapping on the winning rule, plus
`white-space: nowrap` on the button/label text so words don't break
mid-button. Confirmed with a before/after screenshot at the exact
viewport that reproduced it — completely resolved. The "greyed text"/
"badge overlap" parts of the original report couldn't be verified
since the available case data didn't have generated content to check
against — noted rather than claimed fixed.

**#36 — Material Tree now highlights the actively-viewed specimen.**
`activeSpecimenId` already existed as page-level state but was never
passed to `MaterialTreePanel`. Wired it through with a subtle
background/border highlight matching the app's existing accent
conventions. Confirmed live via computed styles.

**#44 — Search/Worklist result cards were nearly invisible against
the page background** (`rgba(255,255,255,0.03)`, 3% opacity).
Brightened to 6%, hover state adjusted proportionally.

**#46 — added a clear button to the Identifier search field.** New
`.ps-searchpage-identifier-clear` button appears whenever there's
text to clear; the existing type-detection badge shifts left via an
adjacent-sibling CSS rule when both are present, rather than
overlapping. Confirmed live both visually (correct positioning) and
functionally (clicking genuinely empties the field).

**#51 — real distinction found between two different uses of the same
word.** `CasePoolAssignmentSection.tsx`'s "Enabled/Disabled" toggles
are genuine feature-flag behaviors ("Automatic Pool Routing," "STAT
Cases Route Immediately") — checked before changing, and left alone,
since "Enabled" is actually the correct word there, not an
inconsistency. `FontsSection.tsx` and `GoverningBodiesSection.tsx` are
genuine entity-status displays, same concept as Staff's own
"Active/Inactive" — standardized both to match.

**#54 — confirmed real: all 9 seed macros used a `.` prefix while
validation and the input's own placeholder both require `;`.** Fixed
the seed data to match the established, currently-enforced convention
(rather than relaxing the validation, since two other UI elements
already agree `;` is correct).

**#58 — same underlying bug class as the Audit dropdown fix (item
#59), found and fixed earlier tonight:** `.ps-st-role-filter` had the
same near-transparent background with no `color-scheme`, causing the
same native-dropdown white-fill issue on Staff's Role filter. Applied
the same proven fix (solid background + color-scheme: dark).

**#60 — confirmed the Role Dictionary modal had no `minHeight` at
all**, so it genuinely resized visibly between tabs with differing
amounts of content. Added a consistent 600px minimum. Verified live —
confirmed via computed style after opening the modal.

**#65 — multi-column layout, done properly rather than superficially.**
For Fonts, found the *real* blocker wasn't "no grid," it was a
`maxWidth: 560px` cap on the whole section quietly preventing any
multi-column layout regardless of what grid CSS was added — fixed
both together (widened to 900px, added
`grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`).
Confirmed visually: 14 fonts went from 14 stacked rows to roughly 5.
For Delegation Types, found `.ps-del-list` was defined identically 5
times across the stylesheet (a real, pre-existing duplication) —
updated all 5 to the same grid pattern rather than leaving 4 stale,
confusing copies behind. Confirmed visually: 7 types went from 7 rows
to 2. Checked the other three sections Pete named (RVU Code Map,
Sub Specialties, Case Routing) before touching anything — RVU Code Map
and Sub Specialties are already real, compact `<table>` elements (8
and 9 rows respectively, already comfortably fitting without
scrolling — genuinely not the same problem Fonts had); Case Routing is
feature-toggle cards with long descriptive text, where a grid would
hurt readability rather than help — left both categories alone
deliberately, not from time pressure.

**#68 — renamed "Specimen Code Crosswalk" → "Specimen Code Map"** in
both places it appears (sidebar label, section title).

**#70 — the real issue was a misleading description, not a missing
feature.** This section is a connectivity health-check dashboard for
6 external coding APIs (SNOMED CT, ICD-10-CM, ICD-11, LOINC, ICD-O,
CPT) — there was never meant to be an "add" or "upload new version"
workflow here, since these are externally-maintained standards, not
custom vocabularies. The previous one-line description didn't make
that clear, leading to a completely reasonable but incorrect
expectation that it worked like RVU Code Map's real
upload-a-new-version flow. Rewrote the description to state this
explicitly.

**#71 — added a genuinely detailed, collapsible "How this works"
panel with a concrete worked example** (a hypothetical Metro General
Hospital breast-core-biopsy study), walking through all six real
workflow stages (Draft → Pending Approval → Approved → Active → Closed
→ Reported) with the actual field concepts involved (acceptance rate,
edit ratio, the three possible grades). Confirmed live, including that
the example's fictional client name happens to closely match real seed
data already in the system, which is a nice coincidence, not
engineered.

**#92 — added a "See All Organisations" option for admin/cross-tenant
users on Patient Match Review**, reusing the exact same
aggregate-across-every-org pattern already built for the System Logs
Quality Assurance tab. Confirmed live: option appears only for
cross-tenant sessions, selecting it produces zero errors and the page
still renders correctly.

**#100 — "Forgot password?" was a genuine dead link**
(`href="#"` + `preventDefault()`, no other handler at all). Wired it
to show an honest, direct message using the page's own existing error-
display mechanism, rather than continue doing nothing. Confirmed live.

**#101 — found a real root cause, not a timing fluke.** Closing a
tab/window (as opposed to an explicit logout) never cleared the shared
`localStorage` active-session marker — only `logout()` did. Relaunching
shortly after simply closing the app (not logging out) found the
previous session's stale marker and incorrectly reported "another tab
already active." Added a `beforeunload` handler that clears just the
marker, not drafts, mirroring only the synchronous half of the
existing logout cleanup. Verified precisely: confirmed the marker
genuinely persists after Playwright's `page.close()` (a real testing
limitation, not evidence the fix doesn't work), then confirmed via
actual navigation-triggered `beforeunload` that it clears correctly,
then confirmed the full relogin scenario shows no false warning.

## Investigated and confirmed correct — no fix needed
- **#35** — "Learn this pairing" already wired to something real
  (records a genuine signal via `templateSuggestionSignalService`),
  fixed in an earlier session; verified the service reference is real,
  not stale.
- **#52** — Models section "status" is genuinely, deliberately set
  (via an explicit `retire()` admin action); "accuracy" and
  "casesProcessed" are static seed values that never update from real
  usage, which is accurate and expected for a mock/demo service, not a
  bug to fix.
- **#96** — Active Intraop Sessions tile already correctly confirms
  Pete's own assumption directly in the UI ("all merged" sub-text
  shown when the count is 0); no change needed.

## Genuinely out of scope for a quick fix, documented rather than rushed
- **#25** — tooltips already exist and are descriptive; the Admin
  Guide documentation gap is real but requires the PDF-rebuild
  workflow that only runs on Pete's own machine.
- **#31** — tested live (real popup opens, loads real content
  correctly); could not reproduce "Site cannot be reached" in this
  environment. Not fixed since nothing reproducibly broken was found.
- **#109** — the full draft-save/restore infrastructure
  (`saveDraft`/`getDraft`/`clearDraft`) already exists, explicitly
  built for exactly this "timeout preservation" purpose per its own
  spec comment, but nothing in `SynopticReportPage.tsx` actually calls
  it. A real, substantial feature gap — spec'd and backed, never wired
  into the UI — too large to safely build in the time available
  tonight without risking a rushed, incomplete version.
- **#21** — investigated three separate times across the session
  (searched for "Gross Dictation" mode-gating logic, checked
  `sourceNotFound`/`highlightNotFound` wiring, attempted live
  reproduction on an Awaiting Grossing case) without finding a
  reproducible instance of AI badges showing on a genuinely empty
  Grossing Template. Left unfixed rather than guessed at — needs a
  specific reproduction case from Pete to pin down precisely.

**Verified throughout:** `npx tsc --noEmit -p .` run after every
single change in this batch, zero errors at each step and in the
final, complete state. `useSpecimenBlockManagement.test.ts` (12 tests,
covering the hook modified for item #28) re-run at the end — still
passing.

## ForMedrixAI Store — genuine feature build, real open architecture questions

Built the customer-facing half of the "admin gets an email about a new
model, goes to Validation, downloads it, then starts the study"
workflow described directly. Closed a real gap found while first
investigating the Models admin screen: there was no `create()` method
on the model service at any layer — added it, with `isDefault: false`
and `casesProcessed: 0` always forced regardless of caller input.

New files: `services/models/mockModelStoreService.ts` (the store
catalog + download + mock authorization),
`components/ValidationStudies/ModelStoreModal.tsx` (browse/download
UI). Wired into `StudyFormModal`'s "AI Model Being Validated" field.

**Two genuinely open architectural questions surfaced by this feature,
not resolved — see `services/models/STORE_INTEGRATION_NOTES.md` for
the full detail:**

1. **Tenant scoping.** The local "adopted models" catalog has zero
   tenant isolation right now — a single global `localStorage` key,
   matching the rest of the mock layer. Checked `firestore.rules`
   directly: it already defines `organisationId` as the real tenant
   boundary for collections like cases, but says nothing about models
   at all. This isn't a mock shortcut masking a decision that's
   already been made — it's an undesigned gap at the real schema
   level. Two live options documented in the integration notes
   (fully tenant-scoped vs. global catalog with per-tenant adoption
   list); neither implemented yet.
2. **Store authorization.** `checkStoreAuthorization()` is a single
   hardcoded boolean (`MOCK_ORG_HAS_STORE_LICENSE`) standing in for
   what should be a real, authenticated check that the *organization*
   (not just the user's PathScribe role — that's the separate,
   already-existing `isAdmin` gate) has an active ForMedrixAI
   subscription. Whether different subscription tiers should see
   different catalog subsets is a real, undecided product question.

Both mock authorization states verified live (authorized: catalog
browses and downloads correctly; unauthorized: distinct locked state
with 🔒 and clear explanation, matching the app's existing
`isAdmin`-gate visual pattern).

**Also fixed in the same pass:** modal close-button (✕) positioning —
`.ps-modal-dark-header` had no `justify-content`, so title + close
button sat side-by-side instead of the button landing in the corner.
Checked all 11 places this shared header class is used before fixing
it — several (e.g. "Discard changes?") have no close button at all,
so the fix is scoped to `.ps-modal-dark-header .ps-research-close`
specifically rather than added to the header itself, which would have
broken those.

**Recurring, unresolved TypeScript quirk, noted honestly:** a
discriminated-union narrowing failure on `ServiceResult<T>` recurred
three separate times while building this (across `download()`,
`getAvailable()`, and the UI's own handling of both) — reproducible
regardless of `T`, regardless of `if (!x.ok)` vs `if (x.ok){}else{}`
style, and persists even with the exact interface-annotation pattern
already proven working elsewhere in this codebase
(`mockModelService: IModelService`). Worked around consistently with
explicit property-check narrowing and type assertions after
confirming the runtime logic was correct each time. Root cause not
found — flagged for whoever next touches `ServiceResult` narrowing in
this codebase, rather than left silently patched-around.

## #109 — resolved: found the real root cause, a genuine React Strict Mode bug

"Timeout worked, however, it did not capture or present me with the
change dialog that I was expecting when I reentered the case." The
underlying infrastructure (`saveDraft`/`getDraft`/`clearDraft`,
`useDraftCache.ts`, `DraftRecoveryModal`) all genuinely existed and
were genuinely wired into `SynopticReportPage.tsx` — reproduced the
bug live first to confirm it was real, then isolated the cause layer
by layer rather than guess: confirmed the service itself always
successfully found an injected draft, confirmed the modal component
itself had no rendering bug, then added temporary debug logging
directly into the hook to observe its actual runtime sequence.

Real root cause: a redundant `checkedKeyRef` guard in
`useDraftCache.ts`, meant to prevent re-checking for a draft, was
already fully redundant with React's own effect dependency array —
and actively broke React 18 Strict Mode's mount → cleanup → re-mount
cycle (active in this app's real root, `main.tsx`). The first
invocation started the real `getDraft()` call and set the guard ref;
Strict Mode's cleanup marked that same closure `cancelled`; the
second, surviving invocation saw the ref already set and skipped
calling `getDraft()` again entirely; the first call's promise then
resolved successfully but was discarded because its own closure had
already been cancelled. The draft was being found and silently thrown
away on every single re-entry, every time, unconditionally — this
wasn't a timing edge case, the feature never worked at all under
Strict Mode.

Fixed by removing the redundant guard. Verified precisely, not just
recompiled:
- Reproduced the bug live with a genuinely injected draft (correct
  user id + case id key, confirmed via real login), confirmed the
  restore modal failed to appear
- Isolated the layer: confirmed the service call succeeded
  independently via direct dynamic import before touching any UI code
- Added temporary debug logging to observe the actual double-invoke
  sequence and confirm the theory precisely, then removed it
- Fixed the hook, re-ran the identical reproduction — modal now
  appears with the correct saved-at timestamp, and clicking Restore
  correctly closes it
- Wrote a real regression test (`useDraftCache.test.ts`, 3 tests)
  specifically covering rendering inside `React.StrictMode` — the
  exact condition that exposed this
- **Proved the test is meaningful, not just passing by coincidence:**
  temporarily reintroduced the exact original bug, confirmed only the
  Strict-Mode-rendered test case failed (the plain-render case still
  passed, matching the theory precisely), then restored the fix and
  confirmed the restored file was byte-identical to the verified
  working version

Full test suite: 662/662 real tests passing (3 new), same one
pre-existing, unrelated Firestore-emulator failure as every other
check this session. `npx tsc --noEmit -p .` clean throughout.

## #69 — resolved: real searchable combobox, not a quick fix

Built `components/Common/SearchableCombobox.tsx` — genuinely extends
`Dropdown.tsx` in the same folder, whose own header comment explicitly
invited this ("Extend if a future use case genuinely needs more")
rather than being a disconnected new component. Wired into
`CrosswalkSection.tsx`'s "Resolves to specimen type" field, replacing
the plain `<select>` over 60+ real dictionary entries.

Real "contains" search, not just label matching — also searches each
entry's synonyms. Verified this isn't cosmetic: searching "renal"
surfaces "Kidney Biopsy, Native," whose own display name and sublabel
contain no such text at all; it only matches via its synonym "Renal
Biopsy, Native." Full keyboard navigation (Arrow Up/Down, Enter,
Escape) verified live, including confirming the correct option
highights before Enter commits it. Trigger now shows the selected
label persistently once chosen, unlike `Dropdown.tsx`'s deliberate
always-a-placeholder behavior.

Verified: `npx tsc --noEmit -p .` clean; full suite 659/659 real tests
passing (same pre-existing, unrelated Firestore-emulator failure as
every other check this session).


