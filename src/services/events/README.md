# services/events/

**New folder**, Phase 4 of the Patient/Encounter Management Subsystem: "the subsystem must publish a real-time event stream for critical patient state changes... to allow other internal microservices to subscribe without polling the database," per the original spec. Gated on nothing by the time this was built — Phase 0-3 already exist as real event *producers*; this folder is the real, missing *distribution* layer.

## Files

- **`IPatientEventBus.ts`** — Real, honest event catalogue: `Patient.Created`, `Patient.Matched`, `Patient.Merged`, `Patient.Linked`, `Patient.Updated`, `Patient.CaseMoved`, `Encounter.Created`, `Encounter.StatusChanged`. Every one corresponds to a real, existing operation in `services/patients/` or `services/encounters/` — nothing speculative. `Patient.CaseMoved` (added per direct architecture confirmation, for ADT^A43) is deliberately distinct from `Patient.Merged` — carries the specific `caseId` that moved plus both real, still-independently-active patient ids, rather than a `casesRepointed` count and a retired source. Deliberately a real, in-memory pub-sub interface for this app's own scope, not a message-broker abstraction — swapping the mock for a real broker-backed implementation later is a one-file change, same pattern as every other service in this codebase.
- **`mockPatientEventBus.ts`** — Real, working pub-sub: `publish()`, `subscribe(type, listener)`, `subscribeAll(listener)`. A misbehaving subscriber that throws never breaks delivery to other subscribers (same "notifications are best-effort" reasoning already applied to `mockAuditService` calls throughout this codebase). `subscribe`/`subscribeAll` return a real, callable unsubscribe function.
- **`mockPatientEventBus.test.ts`** — 6 tests on the bus mechanics alone: typed delivery, cross-type isolation, unsubscribe, `subscribeAll`, multiple subscribers, and the misbehaving-subscriber guarantee.
- **`eventBusIntegration.test.ts`** — **The real proof this is actually wired in**, not just built. 8 end-to-end tests calling the real, unmodified public methods on `mockPatientIndexService`/`mockEncounterService` and asserting a real subscriber actually receives the real event — including the negative cases that matter as much as the positive ones: a rejected, stale demographics/status update never publishes (`applied: false` → no event), and a deduplicated repeat encounter reference never re-publishes `Encounter.Created`.

## Real producers, wired in

- `mockPatientIndexService.ts` — all three real success paths of `resolveOrCreatePatient()` (crosswalk-first match, bare-MRN match, genuine create), plus `mergeIntoExistingPatient()`, `linkPatients()`, and `updateDemographics()` (only when `applied: true`).
- `mockEncounterService.ts` — `resolveOrCreateEncounter()` (only for a genuinely new encounter, never the deduplicated path) and `updateStatus()` (only when `applied: true`).

## Notes

- No real event exists yet for a record entering the review queue (`'ambiguous'` outcome / `createProvisional`) — a real, honest gap, not an oversight. The original spec's own event list was "e.g.," not exhaustive; a `Patient.NeedsReview` event would be a reasonable, real future addition if a downstream consumer (e.g. a real admin notification service) ever needs to react to the queue growing rather than polling it.
- `Encounter.Created`/`Encounter.StatusChanged` fire from EVERY real caller of `resolveOrCreateEncounter()`/`updateStatus()`, not just the ADT-driven path — including `AccessionPage.tsx`'s own direct call, since it goes through the exact same method. Worth confirming this is the intended behavior (every encounter creation broadcasts, regardless of source) if a future consumer ever needs to distinguish "created via inbound ADT" from "created via manual accession."

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file.*
