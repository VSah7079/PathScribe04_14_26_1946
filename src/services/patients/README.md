# services/patients/

Real Master Patient Index (MPI) — the missing piece found while tracing
why "Patient History" couldn't reliably surface a patient's prior cases:
`Case.patient.id` was generated as `` `OPAT-${caseId.slice(4)}` ``,
derived from the CASE, not the PERSON. The same real-world patient with
two different cases got two completely unrelated `Patient.id` values —
there was no actual person-level identity anywhere in the data model,
only whatever the MRN text field happened to match (and per the same
investigation, MRN alone doesn't meet the Joint Commission's
two-identifier minimum for patient-identification-critical actions,
explicitly including laboratory specimens and requisitions).

**Pattern:** Standard interface/mock pattern — no firestore stub yet,
added when this folder existed for less than one session; follow the
established convention (see `services/README.md`) when the real backend
is built.

## Files

- **`IPatientIndexService.ts`** — The contract. `resolveOrCreatePatient()`
  is the real accession-time entry point: reuse an existing identity on a
  confident match, create a new one on a confident non-match, and — the
  genuinely load-bearing part — return `'ambiguous'` rather than
  silently guessing when a match is partial (MRN matches but DOB/name
  doesn't, or name+DOB matches under a different MRN). `confirmAsNewPatient`
  and `mergeIntoExistingPatient` are the two real resolutions a human
  admin can apply to an ambiguous record via
  `components/QualityAssurance/PatientMatchReviewSection.tsx`.
- **`mockPatientIndexService.ts`** — `localStorage`-backed implementation
  of the matching algorithm above. Deliberately deterministic, not
  probabilistic — a real production-grade EMPI product (4medica and
  similar) does weighted, probabilistic candidate scoring across many
  demographic fields, a substantial engineering effort in its own right
  and not what's built here. What's built is the real, correct
  foundation a future probabilistic layer would sit on top of: an actual
  persistent per-organisation identity, checked on every accession, with
  anything not confidently resolvable routed to a human rather than
  silently auto-matched or silently duplicated. `mergeIntoExistingPatient`
  genuinely repoints every case built under the provisional identity
  (via `services/cases/CaseRouter.ts`, with a real retry-once on a
  genuine `ConcurrencyConflictError`) — a merge that only updated the MPI
  record and left cases still split across two ids would be cosmetic,
  not a real fix.
- **`mockPatientIndexService.test.ts`** — Real tests, including one that
  actually creates a case under a provisional identity via the real
  `mockCaseService` and verifies the merge genuinely repoints it — not a
  mocked assertion that a function was called.

## Real fix: the Link feature, distinct from Merge — per direct discussion

The real answer to "can two records from different EMR systems be connected without a human-required merge": yes, and it needed a genuinely distinct concept, not a reuse of Merge. A Merge means one record was a mistake — collapse it, repoint every case, the old id stops being a valid ongoing match target. A Link means two records are each real, independently-valid identities (e.g. the same real patient referred to this lab by two different, unrelated EMR systems, each with its own real, ongoing MRN) that a human has confirmed represent the same person — **neither is deprecated**, both keep matching their own future orders.

- **`linkPatients()`** / **`getLinkedPatientIds()`** / **`listLinks()`** — the real, new methods. `getLinkedPatientIds()` walks the full real link graph (A-B, B-C chains transitively include C for a query on A), not just one hop.
- Real UI: `components/QualityAssurance/PatientMatchReviewSection.tsx` now has a real third action — "Link — same patient, different source" — alongside the existing Confirm-as-new and Merge, with its own real confirmation dialog explaining the distinction.

## Real, independent bug found and fixed while building the above

`mergedInto` was set by `mergeIntoExistingPatient` but never actually *read* by the matching logic itself. A real order arriving later under the same, now-merged-away MRN would have matched the stale, deprecated record directly — silently undoing the merge for that new case. Fixed via `resolveToCanonicalRecord()`, which follows the real chain (recursively, guarded against a corrupted circular chain) to whatever a record was actually, currently merged into, before using it as a match. Verified with a real regression test proving a later order under the old MRN correctly resolves to the real, current target.

## Real fix: "Patient History" now actually queries by real patient identity

Found via a direct question about how case-searching actually worked: it didn't use the real MPI at all. `MOCK_PRIOR_PATHOLOGY[mrn]` was a hardcoded object, completely disconnected from this service.

- **`patientHistoryQuery.ts`** — `queryRealPatientHistory()` filters real cases by real `patient.id`, including every identity returned by `getLinkedPatientIds()` — the actual point of the Link feature: a confirmed link now has a real, visible effect on what history displays, not just on the MPI record itself. `toPatientHistoryCase()` maps real `Case` fields (`diagnostic.synoptic.biomarkers`, `grossDescription`, etc.) honestly; fields with no real, reliable source (comment, tags, nodes) are left genuinely empty, never fabricated.
- Real consumer: `components/PatientHistory/PatientHistoryModal.tsx`, now takes a real `patientId` prop and fetches real history via `caseRouter` + the real MPI, replacing the synchronous, hardcoded lookup. The two-identifier safety gate now also requires a real `patientId` — a case predating the real MPI shows no history rather than falling back to a demographic guess.

## Real fix: the multi-authority identifier crosswalk — the rest of Phase 0

Per direct follow-up on the phased plan, and a real, honest consequence of the enterprise-wide scoping fix above: widening the match pool to the whole lab enterprise correctly fixed under-matching across referring hospitals, but increased a different, real risk — two DIFFERENT real people at two DIFFERENT hospitals whose own MRN schemes happen to produce the same string now share one matching pool, with `MasterPatientRecord.mrn`'s single string giving no way to tell them apart.

- **`PatientIdentifier`** — real, per-authority crosswalk row (`patientId`, `assigningAuthority`, `identifierValue`, `source: 'resolution' | 'manual'`).
- **`resolveOrCreatePatient()` now checks this crosswalk FIRST**, before the older, less-precise bare-MRN match — an exact `(assigningAuthority, mrn)` hit is real, structured proof of which source system issued it, not just a string that happens to match. Falls through to the prior behavior when `assigningAuthority` isn't provided (real backward compatibility — manual entry, older integrations).
- **Real, honest test proving the actual fix**: two different real people, same colliding MRN string, different real authorities — the system never silently matches them. It correctly falls back to `'ambiguous'` (flagged for a human) when no crosswalk entry yet exists for that specific authority, rather than a confident guess in either direction. An earlier draft of this same test asserted a confident `'created'` outcome instead — caught and corrected before delivery, since that would have been the *less* safe behavior, not the fix.
- **Real consumer, wired in**: `pages/AccessionPage/AccessionPage.tsx` now passes `originOrganisation.id` as `assigningAuthority` — the exact same value that was wrongly used as the MPI *scope* itself before the earlier enterprise-scoping fix. It finds its correct, real home here instead.
- **Phase 2 update**: `mergeIntoExistingPatient()`/`linkPatients()`/`addIdentifier()` — all three originally built for the human-driven review UI — are now also the real, direct target of `services/hl7/processPatientManagementMessage.ts`'s inbound A40/A24/A47 processing. A real merge or link triggered by an actual ADT event repoints real cases and records real crosswalk entries through the exact same, already-tested code paths a human clicking through the review UI uses — not a second, parallel implementation.

## Real fix, Phase 3: `updateDemographics()` — the actual missing "update" half of ADT^A08

Investigating idempotency & sequence control (the original spec's own framing) surfaced something more foundational than expected: `resolveOrCreatePatient()`'s `'matched'` outcome never actually wrote new demographic data back to an existing record — it only confirmed identity and returned the existing, unchanged record. This meant a real A08 ("Update Patient Information") had genuinely no effect at all before this fix; the new data it carried was silently discarded every time.

- **`MasterPatientRecord.lastEventAt`** — real, new field: the source-system EVN-2 timestamp of the most recent ADT event that actually updated this record, distinct from `updatedAt` (which only tracks when this system last wrote, not when the real-world event occurred).
- **`updateDemographics()`** — the real, new operation. Enforces real sequence control: an incoming event's timestamp is only applied if genuinely newer than the record's current `lastEventAt`. A stale, out-of-order event (network delay, retry, re-delivery) is honestly rejected — logged, never silently applied over newer state. Returns whether the update was actually applied, so a caller can tell "changed" from "correctly ignored" apart.
- **Real design incompatibility found and fixed while wiring this into `processAdtMessage.ts`**: A08 originally resolved identity through the same full, name-verified `resolveOrCreatePatient()` flow A01/A04 use. But an A08's entire point may be that the patient's name just legitimately changed — comparing the incoming (new) name against the currently-stored (pre-update) name would flag every real demographic change as a name mismatch, incorrectly routing it to the ambiguous/review queue instead of applying it. Fixed: A08 now resolves via the precise crosswalk lookup (`resolveByIdentifier`) instead, since an update event is, like a merge/link event, inherently about an already-known identity — not a "might be a new patient" moment where name verification is the right, important behavior (which A01/A04 still correctly apply).

## Real feature, per direct confirmation: working through the full list of ADT demographic/identity trigger events

`MasterPatientRecord` and `updateDemographics()` extended with `address` (PID-11), `phone` (PID-13), `maritalStatus` (PID-16, HL7 Table 0002 — genuinely site-extensible, guided free text not a closed enum), `aliases` (PID-9, real repeating field — REPLACES the array wholesale when present in a message rather than appending, since PID-9 carries the complete, current set as of that message, not an incremental delta), and `deceased`/`deathDateTime` (PID-29/30 — `deceased` is a real boolean, genuinely `undefined` — never assumed `false` — until a real message says so either way). Every field follows the same "only what's genuinely present in the update changes, everything else is left as-is" posture already established for `Encounter.updateMetadata()`.

**A21/A23, investigated and correctly NOT built**: verified directly against six independent real HL7 v2 references that neither is a real "Deceased" event in the standard (A21 is "leave of absence," A23 is "delete a patient record"). PID-29/30 flowing through the existing A08/A03 paths above is the real, standard-compliant mechanism — no separate event handling needed.

**`moveCaseToPatient()`**, built for ADT^A43 (Move Patient Information), per direct architecture confirmation — genuinely distinct from `mergeIntoExistingPatient()`: moves exactly one, specific `Case` from a patient it was wrongly attached to over to the correct one; NEITHER identity is retired, both stay real, separate, independently-active people. Validates the case genuinely belongs to the claimed source before moving (which also naturally blocks double-moving an already-moved case). A new, properly-typed `Patient.CaseMoved` event was added to `services/events/`'s real `PatientEvent` union rather than reaching for an `as any` cast. See `services/hl7/README.md` for the full A43 integration, and `services/interfaceExceptions/README.md` for the real fallback when a message can't be safely auto-resolved.

**`flagForReview()`**, added for Phase A of the "Interface Exception & Case-Binding Module," per direct architecture confirmation: a real, narrow gap found while fixing A40/A24/A47/A43's own "never fabricate an identity" check. `resolveOrCreatePatient()`'s `'created'` outcome (unlike `'ambiguous'`, which already sets `needsReview` via `createProvisional()`) produces an ordinary, entirely unflagged record. When `services/hl7/processPatientManagementMessage.ts` determines after the fact that a just-created record shouldn't be trusted as a real, confirmed identity for the event that triggered its creation, it calls this to mark the record `needsReview` with a clear, honest reason — never deletes it (no `delete()`/`remove()` method exists on this service at all, deliberately, matching the same "kept, not deleted; a real, traceable fact" posture already applied to merged records).

**`breakGlassRebind()`**, Phase B of the "Interface Exception & Case-Binding Module," per direct confirmation: a genuinely different real operation from both `moveCaseToPatient()` and `mergeIntoExistingPatient()` — attaches a Case created under a temporary/downtime placeholder identity (e.g. `DOE^JOHN_1234`) to the real, confirmed EHR patient once it's known. Semantically a MERGE, not a move — a downtime placeholder isn't a real, separate person the way A43's source/target are; it's the SAME real person, temporarily unidentified — so this wraps `mergeIntoExistingPatient()` internally (every real Case under the placeholder repoints, the placeholder itself retires via `mergedInto`) rather than reinventing repoint logic. `mergeIntoExistingPatient()`'s own return type grew a real `caseIds: string[]` alongside its existing `casesRepointed` count, a safe, additive change, so the immutable audit payload below can name every real case, not just count them.

Real, load-bearing restrictions, enforced at the service layer (not just the UI — a real API/service caller must satisfy the same rules a human operator does):
- Only succeeds when the source record is genuinely flagged `MasterPatientRecord.isDowntimeRecord: true` — refuses to run on an arbitrary patient, which is what makes this "restricted" rather than a second, parallel way to perform an ordinary merge.
- Requires a real reason code from the standard taxonomy (`types/patients/BreakGlassReasonCode.ts` — 7 codes across 3 categories: system/network outages, clinical emergency/unidentified patients, and lab administrative corrections) AND a free-text justification of at least `BREAK_GLASS_MIN_NOTE_LENGTH` (10) characters — a bare code alone is refused.
- Logs one real, immutable audit payload per rebind (`mpi.breakglass.rebind`, a dedicated event type distinct from an ordinary `mpi.match.merged`, so a real compliance review can find break-glass actions on their own): original MRN, new MRN, every real case id repointed, user id, timestamp, reason code, and notes.

`MasterPatientRecord.isDowntimeRecord`/`downtimeReasonCode` are set only via an explicit, human choice at accession time (`PatientMatchCandidate.isDowntimeRecord`/`downtimeReasonCode`, threaded through `resolveOrCreatePatient()`) — deliberately never inferred from a name pattern, since a real patient could legitimately be named "John Doe."

Two new, narrow query methods power the restricted rebind UI: `listDowntimeRecords()` (genuinely flagged AND not-yet-`mergedInto`, so a resolved record correctly disappears from the "still needs a rebind" list) and `searchPatients()` (a real, general, case-insensitive name/MRN substring search — deliberately simple, since this is a human-driven lookup step, not an identity-resolution algorithm). Neither existed on this service before; no general "search all patients" capability had ever been built.

**`components/Audit/BreakGlassRebindModal.tsx`** — the restricted UI, per direct confirmation. Gated to `isAdmin` at both the trigger button and the render itself (defense in depth) in `pages/AuditLogPage.tsx`, only surfaced alongside the related "🔌 Interfaces" pill. Real flow: select a genuinely-flagged downtime record → search and select the real, confirmed target → reason code (pre-filled from the downtime record's own original reason as a sensible default, since a rebind is often for the exact same real reason the placeholder existed for — but changeable) → free-text justification with live character-count feedback → an explicit "Review & Confirm" step before the irreversible action fires. `pages/AccessionPage/AccessionPage.tsx` gained the other real half: a deliberately de-emphasized checkbox (reused the existing `.ps-accession-checkbox-row` class, not new CSS) for marking a new accession as a downtime placeholder at intake, with the same real reason-code dropdown appearing once checked.

## Phase 4: real-time event broadcasting

`resolveOrCreatePatient()` (all three real success paths), `mergeIntoExistingPatient()`, `linkPatients()`, and `updateDemographics()` (only when actually applied) now publish real, typed events via `services/events/mockPatientEventBus.ts` — see that folder's own README for the full event catalogue and the real, end-to-end tests proving the wiring works, not just the bus mechanics in isolation.

## Real, critical safety fix, found while building Phase 1's inbound path

Building `services/hl7/`'s inbound ADT ingestion surfaced a real gap in the "crosswalk-first" check above: an exact `(assigningAuthority, mrn)` hit was being trusted completely, with no real DOB/name verification — unlike the older, bare-MRN fallback path, which already correctly required both (the same Joint Commission two-identifier discipline). A source system sending the same real `(authority, mrn)` pair for what's now a genuinely different real person (name/DOB disagree) is exactly the kind of real data-quality problem this whole system exists to catch — before this fix, the crosswalk hit alone would have silently, confidently matched the wrong person. Fixed: a crosswalk hit now also requires DOB+name agreement before returning `'matched'`; disagreement correctly falls through to the same `'ambiguous'`/review path the bare-MRN check already used. Directly tested.

Also fixed in the same pass: an ambiguous/provisional record now gets its own primary identifier recorded in the crosswalk immediately (via a new, shared `recordIdentifierInternal()` helper both `addIdentifier()` and `createProvisional()` use) — a provisional record already gets a real, usable `patientId`, so it should benefit from precise crosswalk matching on its next order while still awaiting review, not just after a human resolves it.

## Notes

- **Deliberately MPI, not EMPI** — scoped per `organisationId`, not
  global across every PathScribe customer. A record belonging to a
  different organisation is never a valid match, full stop, regardless
  of how well anything else lines up — you would not want one lab
  organisation's patients cross-matched against a completely different,
  unrelated organisation's; that's not deduplication, that's a real
  privacy problem. Verified by a real test confirming identical
  demographics in two different orgs correctly create two separate
  identities, and never appear in each other's review queues.
- **Real, critical bug found and fixed, from a direct follow-up
  question about whether the MPI/EMPI distinction could actually cause
  a problem.** The real accession-time call
  (`pages/AccessionPage/AccessionPage.tsx`) was passing
  `originOrganisation.id` — the specific *referring* hospital/clinic for
  this one case — as `organisationId`, not this lab's own stable
  identity. Confirmed directly against real seed data
  (`services/organisation/`'s own `OrganisationType` values:
  `health_system`, `nhs_foundation_trust`, `independent_lab` — each a
  distinct referring institution, not "this PathScribe tenant"). Real
  consequence: the same real patient referred to the same lab by two
  different hospitals would have incorrectly gotten two separate MPI
  identities — directly undermining the reason this whole system
  exists. Fixed to use `Organisation.enterpriseId` — the real, already-
  resolved "this lab's own stable tenant" identifier `Case.originEnterpriseId`
  itself already uses — via the new, tested
  `resolveMpiScopeEnterpriseId()` (`services/organisation/organisationService.ts`).
  The real service's own test suite and matching logic were untouched
  and correct throughout; only the value passed in at the one real call
  site was wrong.
- Consumed by `pages/AccessionPage/AccessionPage.tsx` (the real
  accession-time call) and
  `components/QualityAssurance/PatientMatchReviewSection.tsx` (the real
  review queue) — see that file's own README entry for the UI side.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*
