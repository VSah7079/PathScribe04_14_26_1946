# components/QualityAssurance/

QA/compliance aggregate reporting tabs, hosted inside `pages/DeficienciesPage.tsx`
alongside its own deficiency-tracking tabs. Five real, distinct reports —
each measures a genuinely different thing, deliberately not merged into
one generic "QA dashboard" (see each file's own header for why it's
separate from its siblings). **This folder never had a README before
this session** — created now rather than left undocumented, following
this codebase's own stated convention of a README per real folder.

**Pattern:** Not the interface/mock/firestore triplet — these are report
views, not data services. Each tab fetches from the real service(s) it
reports on (`countersignService`, `intraoperativeService`,
`reconciliationService`, `fppeAssignmentService`, `auditService`) plus
`caseRouter.getAll()` for case-level context, and renders real charts/
tables client-side.

## Files

- **`CountersignTurnaroundTab.tsx`** — Department-wide countersign
  turnaround (`countersignedAt - releasedAt`), real changed-field-count
  delta, real feedback text. Answers "how long does a resident's released
  case actually sit before an attending reviews it" — genuinely different
  from the Intraoperative Linkage tab's TAT and the Reconciliation tab's
  concordance rate.
- **`IntraopLinkageTab.tsx`** — Frozen-to-permanent merge tracking —
  pending vs. merged intraoperative entries, real merge-log correlation
  via the audit trail (`Intraop Entry Merged` events).
- **`ReconciliationTab.tsx`** — Frozen/permanent diagnostic concordance
  rate — discordance tracking distinct from the above two.
- **`FppeTrackingTab.tsx`** — Department-wide FPPE/Credentialing Review
  oversight (Joint Commission new-hire credentialing verification, not
  ACGME trainee milestones — a genuinely different regulatory context
  from Countersign Turnaround). The one tab in this folder that does NOT
  fetch case data at all (only `fppeAssignmentService`/
  `subspecialtyService`) — not affected by the tenant-isolation fix
  below, since there's no case-level data in it to scope.
- **`DriftCorrectionTab.tsx`** — **NEW.** Post-finalization drift
  detection/correction — a finalized grossing report whose answers were
  edited after sign-out, and the automatic background correction that
  reverts it to draft. Reads from the same real audit log the case
  services already write into (`auditService.getAuditLogs({ search:
  'Drift' })`), filtered to the exact drift event names — no new backend,
  purely a read view over telemetry added in
  `pages/SynopticReportPage/SynopticReportPage.tsx`'s drift-correction
  effect. Surfaces genuinely unresolved cases (a deferred/failed
  correction never followed by a later successful one for the same case)
  as an explicit, actionable list — not just a historical event log.
- **`QaScopeSwitcher.tsx`** — Shared scope-filter dropdown used by all
  five tabs above (well, four — FppeTrackingTab has no case data to
  scope). **Real fix this session, in two parts:**
  1. Extended `QaScope` with a genuine third `'organisation'` level,
     alongside the existing `'enterprise'` (no filter) and `'client'`
     (referring-provider) levels — these are real, different dimensions:
     a referring client and the lab organisation actually processing
     their case are not the same thing. Added specifically for the Drift
     Correction tab's admin-alert scoping, but benefits all four tabs
     that use this switcher, not just the new one.
  2. The dropdown used to list every organisation/client regardless of
     whether the viewer had any actual data behind them — an
     information-disclosure UX defect (not a data leak — selecting an
     unauthorized option just yielded an empty list — but confusing).
     Now takes an optional `visibleClientIds` prop; each tab derives it
     from its OWN already-scoped case fetch (the real, derivable answer
     to "which clients are relevant to this viewer," since `Client`
     carries no organisation field to filter on directly) and a
     cross-tenant-permitted viewer still sees the full, untruncated list.
- **`qaReportUtils.ts`** — Shared `QaScope` type, `caseMatchesScope()`,
  and `exportQaReportRows()` (the real XLSX export every tab uses).
  `caseMatchesScope()` is where the organisation-level check above
  actually lives — resolves `Case.originHospitalId` through
  `getOrganisationByHospitalId()` (`services/organisation/`), the same
  real chain `services/auth/caseAccessControl.ts` uses as the tenant
  boundary everywhere else in this app, not a separate, second
  definition of "which org owns this case."

## Notes

- **Real tenant-isolation fix, this session — found via a design review,
  not assumed correct beforehand.** All four case-fetching tabs
  (everything above except FppeTrackingTab) were calling
  `bypassAccessControl: true` unconditionally on their `caseRouter.getAll()`
  fetch — real, unscoped multi-tenant PHI reaching the browser before any
  client-side filter ran (CWE-602, not hypothetical: DevTools on any
  standard user's session would show every organisation's case data).
  Fixed: the bypass is now gated behind a real, granular permission
  (`StaffUser.canAccessCrossTenantQa`, or `role: 'superadmin'`) via
  `services/auth/caseAccessControl.ts`'s new `canViewCrossTenantQaData()`
  check. A standard user's fetch is now properly scoped to their own
  organisation by default — the same mechanism already enforced on every
  other case-read path in the app, not a new, separate one invented for
  this folder. Cross-tenant access, when granted, is logged as its own
  distinct auditable event (`qa.cross_tenant_access_executed`) in every
  tab that fetches cases.
- **This is still a client-side-only control, same caveat
  `caseAccessControl.ts` itself documents.** It models the correct SHAPE
  of the access decision; it is not itself a security boundary against a
  modified client. Real server-side query enforcement is tracked as its
  own backend requirement — see `backend-requirements-concurrency-security.md`
  §11 — not yet built.
- **Two ID systems, genuinely different, both real:** `order.clientId`
  (the referring provider who sent a case to the lab) and
  `Case.originHospitalId` → `Organisation.id` (the lab organisation
  actually processing it) are not interchangeable, and `QaScopeSwitcher.tsx`
  now correctly offers both as separate scope levels rather than
  collapsing them into one. See `services/organisation/README.md` for
  the fuller history of how these two concepts ended up disconnected in
  the first place.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
*When this folder's contents change meaningfully, update THIS file.*
