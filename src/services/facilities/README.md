# services/facilities/

The canonical `Facility` entity — replaces `services/clients/`
(`Client`/`clientType: 'internal' | 'external'`) entirely. Not a new
type sitting alongside the old one; the old folder was deleted in the
same change.

**Why this exists, in order:**

1. Internal performing labs and external ordering clients both lived
   on `Client`, distinguished only by `clientType`. Three fields
   (`internalAiOrchestratorEnabled`, `internalAiModelId`,
   `idleTimeoutMinutesOverride`) were genuinely, exclusively
   performing-lab concerns, but existed on every `Client` record
   regardless of type — real domain leakage, confirmed directly by an
   architectural advisement.
2. First fix: pull those three fields into their own, separate
   `services/performingLabs/` service and admin screen. This solved
   the leakage but created a real workflow problem instead — "create
   the internal client, update settings, then go to a separate screen
   to apply them, not a good workflow," confirmed directly.
3. Actual fix, confirmed directly: **"One record per facility.
   Multiple roles attached to that record... This keeps the identity
   unified while allowing the system to treat the facility differently
   depending on context."** `clientType` replaced entirely by
   `roles: FacilityRole[]`; the three fields folded directly back onto
   `Facility`, gated by `roles.includes('performing_lab')` in the UI
   rather than living in a separate service. `services/performingLabs/`
   was deleted in the same change.

## Files

- **`IFacilityService.ts`** — `Facility` type, `FacilityRole` union
  (`performing_lab` | `internal_submitting_location` |
  `internal_ordering_client` | `external_ordering_client` |
  `hl7_routing_endpoint`), `FACILITY_ROLE_LABELS` (display strings),
  and `resolvePerformingLabFacilityId(facility)` — resolves which
  facility's lab actually performs work ordered by the given facility
  (checks `performingLabFacilityId` override, else the facility's own
  id if it holds `performing_lab`, else `undefined`). Pure, data-only;
  never derives anything from session/login context. This function is
  **unchanged in behavior** across every rename this session — it
  always resolved *which* facility performs the work; only where the
  operational settings themselves live has moved (first onto `Client`
  directly, then to `PerformingLabConfig`, now back onto `Facility`
  directly).
- **`mockFacilityService.ts`** — Standard CRUD +
  `findOrCreateByAssigningAuthority()` (the real crosswalk resolution
  used by order intake — no exact match on an incoming order's
  facility code creates a real, `Unverified`, `autoCreated` facility so
  processing can continue, rather than blocking or fabricating a
  match). Seed data migrated 1:1 from the old `Client` seed:
  `clientType: 'external'` → `roles: ['external_ordering_client']`,
  `clientType: 'internal'` → `roles: ['performing_lab']`. One real,
  open question was flagged directly in comments rather than guessed:
  whether Fenwick General/Women's/Children's Hospital should also
  carry `internal_ordering_client` (their own wards originating
  orders) — not added automatically, since that depends on real
  knowledge this session didn't have.

## Consumers

- `components/ClientDictionary/ClientEditorModal.tsx` — the unified
  editor. See that folder's own README for the full tab-gating
  breakdown (which tabs are gated to which roles, and two real bugs
  found and fixed in that gating).
- `components/Config/AI/orchestratorModeConfig.ts` /
  `resolveClientAiModel.ts`, `services/session/mockSessionTimeoutService.ts`,
  `services/reportRelease/mockReportReleaseService.ts` (**NEW, August
  2026** — Post-Sign-Out Release Buffer, `Facility.releaseBufferOverride`)
  — all four resolve their per-facility override the same way:
  `resolvePerformingLabFacilityId()` then a direct read of the field
  off the resolved `Facility`.
- `services/locations/` — `Location` is scoped to `facilityId`,
  referencing this folder's `Facility.id`.

## Notes

- **A real, genuine test bug was caught by this refactor, not just
  compile-time fallout.** One test in `orchestratorModeConfig.test.ts`
  set the old field directly on a `Client` object via an `as any`
  cast — which hid the mismatch from the type checker through an
  entire prior refactor pass, and only surfaced when the assertion
  genuinely failed at runtime. Fixed to use the real, current
  resolution path instead of papering over the type error.
- No Firestore stub exists yet for this folder (mock-only, matching
  most of this codebase's current phase).

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*
