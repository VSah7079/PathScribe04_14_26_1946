# services/auth/

Case-level access control and institution/session resolution — NOT authentication (login) itself.

**Pattern:** Does not follow interface/mock/firestore — this is access-control logic, not a swappable data service.

## Files

- **`caseAccessControl.ts`** — Real enforcement of who can see which cases (org boundary, pediatric access gating, Orchestration/Outreach visibility).
- **`institutionService.ts`** — Session/institution resolution — explicitly documents consolidating a prior duplication with caseAccessControl.ts's own session logic (good example of the codebase catching and fixing its own drift).

## Notes

- NOTE: services/authorization/ (a similarly-named, EMPTY folder) was found and deleted during the July 2026 review — don't recreate it without a real reason; auth/ is the real, single home for this concern.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*