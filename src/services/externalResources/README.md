# services/externalResources/

Real, admin-managed reference links (CAP protocols, WHO classification,
internal lab systems, etc.) shown in the Worklist's Resources panel —
replaces a hardcoded object that used to live directly in
`pages/WorklistPage/WorklistPage.tsx`, found broken when its CAP URL
404'd (CAP restructured their site) and there was no way for anyone to
fix it without a code change.

**Pattern:** Standard interface/mock pattern — no firestore stub yet,
added when this folder existed for less than one session; follow the
established convention (see `services/README.md`) when the real backend
is built.

## Files

- **`IExternalResourceService.ts`** — The contract. Two real scope
  levels, matching the same org-default + per-client-override shape
  already established for idle-session-timeout (`services/session/`) and
  the AI orchestrator toggle (`Facility.internalAiOrchestratorEnabled`):
  `'enterprise'` resources are visible to everyone in the organisation,
  `'lab'` resources layer on top for a specific performing lab. Two real
  entry points, deliberately distinct: `listForOrganisation()` is the
  admin-facing view (everything, regardless of scope, for the management
  screen); `resolveForViewer()` is the real viewer-facing one — per a
  direct requirement, it returns only what's actually relevant to a
  specific viewer, never a flat list of every resource any admin
  anywhere has ever created. `performingLabClientIds` is deliberately an
  array, not a single id — found via a direct question about how pool
  cases work: the Worklist has no single case in view, but a viewer's
  actually-visible cases (including pool cases, which can span multiple
  hospitals) can genuinely belong to several different performing labs
  at once, and each of those labs' own resources should surface
  together, not just the first one.
- **`mockExternalResourceService.ts`** — `localStorage`-backed
  implementation. Seeds itself from the same four baseline resources
  that used to be hardcoded (CAP Cancer Protocols — with the corrected,
  verified URL, not the stale one that 404'd — WHO Classification,
  PathologyOutlines, UpToDate), replicated as enterprise-scoped defaults
  for each of the four demo organisations, not one shared global list.
- **`mockExternalResourceService.test.ts`** — Real tests for the
  relevance-filtering behavior specifically, since that was the explicit
  requirement this service exists to satisfy: an enterprise resource
  from a different organisation never surfaces; a lab-scoped resource
  only surfaces for a viewer actually at that lab; a viewer sees both
  their enterprise set and their own lab's additions together.

## Notes

- **Always scoped to a real `organisationId`** — never a global,
  cross-tenant list. The same MPI-not-EMPI reasoning already applied in
  `services/patients/`: a resource created for one organisation must
  never surface for a different, unrelated one.
- Consumed by `pages/WorklistPage/WorklistPage.tsx` (the real Resources
  panel, resolved for the viewer's own organisation plus every
  performing lab their actually-visible cases belong to — computed via
  the same case -> ordering facility -> `resolvePerformingLabFacilityId()`
  chain already established for idle-timeout, just applied across every
  visible case rather than one) and
  `components/Config/System/ExternalResourcesSection.tsx` (the real
  admin CRUD screen — see that file's own README entry).

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*
