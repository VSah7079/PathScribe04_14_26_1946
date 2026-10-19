# src/services/relatedCases/

Batch 613 (part B). A patient's other released cases, attached to a report at sign-out and printed as a summary. Contract: `docs/architecture/RELATED_CASES_API.md`.

- `relatedCaseTypes.ts`: `RelatedCaseSnapshot` (the text copy of one released case), `RelatedCaseAttachment`, `AmendedRelatedCase`.
- `relatedCaseRules.ts`: pure rules. `findRelatedCandidates` (released, same patient and linked identities, visible to the user, not this case, oldest first), `buildRelatedSnapshot`, `toggleRelatedSelection` (limit 10), `amendedRelatedCases` (frozen attachments only), `relatedCaseTextLines`.
- `relatedCaseAttachments.ts`: the signer's choice per case, in browser storage (`relatedCaseAttachments`, reset by demo reset). `setRelatedCases` needs `report:related-cases:attach` and is refused once frozen; `freezeRelatedCases` runs at sign-out. Audit detail has counts only.
- `loadRelatedCandidates.ts`: loads candidates through the access-controlled case list (no bypass), with each case's intraoperative diagnosis.
- `loadAmendedRelatedCases.ts`: which attached cases have a newer record version since sign-out.
- `patientSummary.ts`: `patient:summary:print` check and audit for the Patient summary print.

Tests sit beside each file.
