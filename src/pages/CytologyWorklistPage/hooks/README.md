# pages/CytologyWorklistPage/hooks

| File | What it is |
|---|---|
| `useCytologyRevision.ts` | Runs one correction or addendum on a signed-out cytology report (Batch 390, PS-340): which form is open and what is typed, the signature confirmation, the release, making the corrected review the Final Diagnosis, and the reload. It decides nothing itself: the permission and the mandatory reason are checked in `services/cytology/releaseCytologyCorrection.ts` / `releaseCytologyAddendum.ts`, what a form still needs in `services/fieldRequirements/cytologyChecks.ts`, and the findings and report context in `services/cytology/resolveCytologyRevisionInputs.ts`. |

Tested in `../components/cytologyRevision.test.tsx`.

## Batch 419

`useCytologyRevision` takes `isGynCytology` and, after a correction or addendum is released, calls `submitCytologyRevisionToRegistry` (CORRECTION / AMENDMENT to the screening registry). Failures there don't undo the release.

---
*See [../README.md](../README.md) for how this folder fits the page.*
