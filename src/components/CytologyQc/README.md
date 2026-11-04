# components/CytologyQc

**Batch 396** (Pete: "I would not want to force the pathologist to go to 2 screens").
- `CytologyQcCaseBar.tsx`: on the cytology screening page, the case's open QC peer review with Assign to Me, Record Concurrence and Record Discrepancy. After a verdict the page returns to the queue it came from. Uses `hooks/useCytologyQcActions.ts`; the decisions are in `services/cytologyQc/resolveCytologyQcCaseReview.ts`.
- `CytologyQcDiscrepancyModal.tsx`: the discrepancy form, moved out of `pages/CytologyQcQueuePage.tsx` so both screens use it.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*

## Batch 608

- `CytologyQcCompliancePanel.tsx`: the QC compliance report (the queue's Compliance view).
- `AdvisorySeverityBadge.tsx`: the suggested severity badge (queue rows and the Bethesda review).
- `CytologyScreeningDetailsCard.tsx`: HPV assay, liquid-based platform and the follow-up on a positive HPV result, saved on the specimen.
- `CytologyQcCaseBar.tsx` also says when the reader is outside the case's reviewer pool.

## Batch 669f

`CytologyQcDiscrepancyModal.tsx` (styles in `CytologyQcDiscrepancyModal.css`): the Secondary Diagnostic Code is optional; when it diverges significantly from the primary (`services/cytologyQc/resolveQcCodeDivergence.ts`) the window shows a message in place and Submit becomes Confirm and Submit. An unrecognised secondary code shows the field message `cytologyQcQueue.secondaryUnrecognised` and disables Submit until it is fixed or cleared. `onSubmit` gets a fifth argument, `divergenceConfirmed`. Categories come from `hooks/useCytologyQcCodeCategories.ts`. Test: `CytologyQcDiscrepancyModal.test.tsx`.
