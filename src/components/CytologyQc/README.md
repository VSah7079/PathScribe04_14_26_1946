# components/CytologyQc

**Batch 396** (Pete: "I would not want to force the pathologist to go to 2 screens").
- `CytologyQcCaseBar.tsx`: on the cytology screening page, the case's open QC peer review with Assign to Me, Record Concurrence and Record Discrepancy. After a verdict the page returns to the queue it came from. Uses `hooks/useCytologyQcActions.ts`; the decisions are in `services/cytologyQc/resolveCytologyQcCaseReview.ts`.
- `CytologyQcDiscrepancyModal.tsx`: the discrepancy form, moved out of `pages/CytologyQcQueuePage.tsx` so both screens use it.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
