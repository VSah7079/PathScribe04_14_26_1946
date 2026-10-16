# components/ClinicalMismatch/

- **`ClinicalMismatchModal.tsx`**: the pathologist decides a suggested clinical-pathologic mismatch before sign-out (PS-145). The choices are:
  - not a mismatch;
  - a mismatch, resolved (with how);
  - a mismatch, unresolved (with what was found), which recommends a CAPA to the QA lead.

  It records through `clinicalMismatchService.record` (`case:clinical-mismatch:record`).

## Batch 523

Moved here from `pages/SynopticReportPage/modals/`. It is used at three sign-outs:
- surgical (case report page);
- autopsy FAD (case report page);
- cytology (Cytology Workspace, pathologist track).

`discipline` and, for cytology, `specimenId` are recorded with the decision.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*

## Batch 530 (PS-554)

- `ClinicalMismatchAlert.tsx`: Gate A, the inline "AI suggests possible mismatch" alert on the report page; one line with a badge, **Review** opens the details and the decision in place.
- `ClinicalMismatchDecisionForm.tsx`: one-click decision (quick reason and note optional); the choices come from the caller.
- `ClinicalMismatchSummary.tsx`: the suggestion, its confidence and source, and which rule decided what happens.
- `ClinicalMismatchModal.tsx`: now Gate B for a high-risk mismatch only (Resolved or Unresolved); takes an `assessment` instead of a `suggestion`.

## Batch 531

Decisions carry the fingerprint of the text they were made on; `ClinicalMismatchSummary` shows the earlier decision when the alert comes back after a change. `ClinicalMismatchAlert` takes `specimenId` (Cytology Workspace).

## Batch 536 (PS-558)

`ClinicalMismatchSummary.tsx`: a rule-based suggestion made because the jurisdiction's AI vendor policy didn't allow the AI says so (`clinicalMismatch.source.ruleJurisdiction`), inline.
