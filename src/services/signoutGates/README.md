**Batch 649:** **`signOutReviewGates.ts`** (`runSignOutReviewGates`) is the one sequence of review checks before a surgical case is signed, run by **both** Assist **Finalize** and Orchestration **Sign Out Case**. Before this, Sign Out Case skipped five of the checks Finalize ran (the active case hold, microscopic documentation, critical findings not yet acknowledged, required fields, and a required field still holding an unverified AI answer). Order, first stop wins: already pending release, active hold, report map out of date, Mohs sector without a block, map-derived margins against the stored answer, count checks, invasive carcinoma margins, molecular result disagreement, microscopic documentation, critical findings, required fields, unverified AI. The hook turns a stop into a toast, a window or a jump to the field; dependencies are passed in. Also here: `synopticFieldProblemsFor`, `findSynopticSignOutFieldProblems`, `findMicroscopicBlockingSpecimens` (moved out of the 1,000-line sign-out hook). Test: `signOutReviewGates.test.ts`; the hook's side is `pages/SynopticReportPage/hooks/__tests__/useSignOutWorkflow.orchestrationGates.test.ts`.

# services/signoutGates/

PS-359, Batch 383. The decisions behind the two hard-block gates at case sign-out, moved out of their modals (`pages/SynopticReportPage/modals/`). Pure functions, each with a test file.

- **`fixativeGate.ts`** — `fixativeGateMissing` (which Field Requirements are still unmet across the specimens: the fixation time, or confirming none is possible, and optionally a reason), `buildFixativeResolutions` (documented, estimated or unrecoverable, with the reason when given), and the row and resolution types.
- **`preAnalyticGate.ts`** — `preAnalyticGateMissing` (the collection and receipt dates a specimen still needs, and the justification once an override is used), `buildPreAnalyticResolutions`, `emptyPreAnalyticRow`, `preAnalyticRowUsesOverride`, and the row and resolution types.

The rules themselves are in `services/fieldRequirements/` (page "report", group Sign-out gates); the jurisdiction's override label and citation come from `services/billing/resolvePreAnalyticDateGateConfig.ts`.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*
