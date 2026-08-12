# services/auth/

Case-level access control and institution/session resolution — NOT authentication (login) itself.

**Pattern:** Does not follow interface/mock/firestore — this is access-control logic, not a swappable data service.

## Files

- **`caseAccessControl.ts`** — Real enforcement of who can see which cases (org boundary, pediatric access gating, Orchestration/Outreach visibility). **Real addition:** `SessionUser` now carries `canAccessCrossTenantQa?: boolean`, and a new `canViewCrossTenantQaData(session)` function checks it (or `role: 'superadmin'`) — a genuinely separate, more granular permission from the existing `superadmin` case-access bypass, matching the established least-privilege pattern (`canViewPediatric`/`canViewOrchestration` on `StaffUser`): someone who legitimately needs cross-tenant QA/compliance reports shouldn't also need full platform-admin case-access privileges as a side effect of that. Built specifically because all four QA tabs in `components/QualityAssurance/` were found calling `bypassAccessControl: true` unconditionally on their case fetch — real, unscoped multi-tenant PHI reaching the browser before any client-side filter ran (a real CWE-602 exposure, not hypothetical). Now gated behind this real permission check instead.
- **`institutionService.ts`** — Session/institution resolution — explicitly documents consolidating a prior duplication with caseAccessControl.ts's own session logic (good example of the codebase catching and fixing its own drift).

## Notes

- NOTE: services/authorization/ (a similarly-named, EMPTY folder) was found and deleted during the July 2026 review — don't recreate it without a real reason; auth/ is the real, single home for this concern.
- **This module's own documented caveat still applies to the cross-tenant QA fix above**: it's a real, correctly-shaped decision, but it's still a client-side check — a modified client can bypass it. The actual security boundary needs server-side query enforcement (see `backend-requirements-concurrency-security.md` §11) — what's built here models the correct shape for the backend team to match, same as every other access decision in this file.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*