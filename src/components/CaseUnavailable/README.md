# components/CaseUnavailable

**Batch 396.** `CaseUnavailable.tsx`: the one screen a reader sees when a case can't be opened for them, whether it doesn't exist, belongs to another organisation or is restricted. It says only "You do not have access rights to case …", so it never confirms that a case exists (Pete's privacy model, `docs/architecture/CASE_PRIVACY_MODEL.md`). Used by `pages/FullReportPage.tsx` and `pages/SynopticReportPage/SynopticReportPage.tsx`; the decision is `services/cases/openCaseForView.ts`.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
