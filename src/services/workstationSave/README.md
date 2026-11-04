**Batch 737:** `runCaseAction.ts`: `SpecimenSaver(specimens, extra?: { matrixBlocks })`, so an action that changes a matrix block saves it in the same case write.

**Batch 724:** the English text now says Microtome, not Microtomy (wording only; routes, keys and stored values unchanged). See `src/i18n/README.md`.

# services/workstationSave/

**Batch 669 (findings ws-8, ws-11).** The one way the bench workstations (Embedding, Slide Distribution, Add-On Orders) save a change to a case, extracted from the pattern the Microtome workstation already followed (Batch 460, PS-71: retry, "Not saved", reload).

## Files

- **`runCaseAction.ts`** (+ `.test.ts`):
  - `runCaseAction(caseId, action, deps)`: reads the newest case and runs `action(current, save)`; `save(specimens)` writes with that read's version. A version conflict re-reads and runs the action again (up to 3 tries, `CASE_WRITE_MAX_ATTEMPTS`), so the action must derive everything from the `current` it is given. Result `status`: `saved`, `unchanged` (the action finished without saving) or `failed` (`reason` `conflict` or `notApplied`, plus `latest`, the stored case to reload from).
  - `saveSpecimenChange(caseId, derive, deps)`: the common case; `derive(current)` returns the full specimen list, or null when the change no longer applies.
  - `saveFailedKey(reason)`: the `workstationSave.conflict` / `workstationSave.notApplied` locale key. `replaceSpecimenById`.
- Work an action does after its save (e-mail, follow-up orders) is not re-run by a retry, and an error thrown there is rethrown untouched (the case was saved, so it is not "Not saved").
- Screen side: `hooks/useWorkstationSave.ts` keeps the translated `saveError` for the page's `role="alert"` banner (`.ps-workstation-save-error`).
- Dependencies are passed in (`CaseWriteDeps`), as with `caseWrite.ts`.

## Not covered

The Microtome workstation keeps its own copy of this pattern (`useMicrotomyWorkstation.ts` `persistOp`, which also has the atomic decant save); moving it onto this service is open.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*

## Batch 729

- `runCaseAction.ts`: `saveCaseChange(caseId, derive, deps)`: the same retry-and-report save for other case fields (a matrix block lives in `Case.matrixBlocks`). Tested.
