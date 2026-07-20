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
**Files:** at least `Config/Protocols/SynopticEditor.tsx`,
`Config/Protocols/protocolShared.tsx`, `Config/Templates/TemplateRenderer.tsx`,
`AppShell/AppShell.tsx`, `InternalNotes/InternalNotesDrawer.tsx`,
`EnhancementRequest/EnhancementRequestModal.tsx`, `Editor/PathScribeEditor.tsx`,
`pages/AuditLogPage.tsx`, `pages/WorklistPage/ResourcesModal.tsx`,
`pages/WorklistPage/LogoutWarningModal.tsx`, `pages/ConfigurationPage.tsx`,
`pages/SynopticReportPage/SynopticReportPage.tsx`
**Issue:** `Common/LookupModal.tsx` already provides a shared modal-overlay
shell, but each file above independently reimplements the same
backdrop/blur/close-on-click-outside pattern instead of reusing it. Raised
by Pete — `Common/` being unusually thin for a codebase this size was
itself the tell.
**Cheaper fix path found:** `components/UI/ConfirmModal.tsx` is an already-built, purpose-built shared component ("replaces window.confirm() throughout the app") with exactly 1 real consumer in the entire app. `Flags/FlagManagerModal.tsx` also shows the
codebase already has a *working* shared solution — `pathscribe.css`'s
`ps-modal-dark`/`ps-modal-dark-header`/etc. classes with
`ReactDOM.createPortal`. Most offending files could likely adopt those
existing classes rather than needing a new component built from scratch.
**Status: LOGGED, not attempted.** Real scoped project (~14 call sites),
not a quick fix. See `components/Common/README.md` for full detail.

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
