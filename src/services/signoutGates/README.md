# services/signoutGates/

PS-359, Batch 383. The decisions behind the two hard-block gates at case sign-out, moved out of their modals (`pages/SynopticReportPage/modals/`). Pure functions, each with a test file.

- **`fixativeGate.ts`** — `fixativeGateMissing` (which Field Requirements are still unmet across the specimens: the fixation time, or confirming none is possible, and optionally a reason), `buildFixativeResolutions` (documented, estimated or unrecoverable, with the reason when given), and the row and resolution types.
- **`preAnalyticGate.ts`** — `preAnalyticGateMissing` (the collection and receipt dates a specimen still needs, and the justification once an override is used), `buildPreAnalyticResolutions`, `emptyPreAnalyticRow`, `preAnalyticRowUsesOverride`, and the row and resolution types.

The rules themselves are in `services/fieldRequirements/` (page "report", group Sign-out gates); the jurisdiction's override label and citation come from `services/billing/resolvePreAnalyticDateGateConfig.ts`.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*
