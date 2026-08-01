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
- Consumed by `pages/AccessionPage/AccessionPage.tsx` (the real
  accession-time call) and
  `components/QualityAssurance/PatientMatchReviewSection.tsx` (the real
  review queue) — see that file's own README entry for the UI side.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*
