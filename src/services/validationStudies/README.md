# services/validationStudies/

Validation Study governance — parallel-run comparison of AI-assisted reporting against existing workflow.

**Pattern:** Standard interface/mock/firestore pattern.

## Notes

- Real governance state machine: draft -> pending_approval -> approved -> active -> closed -> reported. Activation is blocked until committeeApproval is recorded with a valid irbReference — a real gate, not just a status field.

## `resolveActiveStudyId.ts` (Batch 318)

`resolveActiveStudyId(scope, studyService)` returns the active study covering a case (ordering facility, signing pathologist, subspecialty), or undefined. A failed lookup is logged and also returns undefined; a signal is never lost for lack of a study.

Both Level 1 AI-learning captures now use it, so they can't disagree about which study a case belongs to:
- the narrative-edit signals (this lookup used to be inline in `useSignOutWorkflow.ts`);
- the abnormal-detection agreement signals (PS-137).

## Batch 428: Configuration permissions

- `mockValidationStudyService`: `create`, `update`, `submitForReview`, `activate`, `close`, `remove` need `config:validation-studies:manage`.
- `mockValidationStudyService`: `recordApproval` need `validation:approval:record`.

Before, anyone who could open Configuration could change this; now each change is checked in the service (`authorization/guardConfigWrites.ts`, audited) and a refusal changes nothing. Reads are unchanged. Seeds: Admin and Lab Director; see `docs/architecture/AUTHORIZATION_API.md`.

Activation and a recorded committee approval are stored under the signed-in person (`activatedBy`, `committeeApproval.recordedBy`); the screen passed the fixed text 'admin'. Recording the approval is its own capability, `validation:approval:record`.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 514 (PS-269): printed report translated

- **`buildValidationReportHtml.ts`** (+ test): the printed AI validation report, moved out of `ValidationStudiesSection.tsx`. It now prints in the reader's language with dates and percentages in their format (Pete, Oct 10, 2026). It used to be English with an `en-GB` date, on the reasoning that it was a compliance artifact; Pete decided it follows the user's language. Study name, ethics reference and section ids print as recorded, escaped. No inline `style` attributes.
- **`computeValidationStudyGrade.ts`**: returns a translation `key` (`pass` / `conditionalPass` / `furtherReview`) in place of the English `description`. The grade code stored on the study (`finalGrade`, "PASS") is unchanged.
