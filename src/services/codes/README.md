**Batch 649:** `diagnosisCodeApply.ts`: saving diagnosis and procedure codes from the Codes window needs `case:diagnosis-code:apply` (`assertDiagnosisCodeApply`; a refusal keeps the window open with the reason). The cytology Screening page's code save uses the same check (`services/cytology/cytologyCaseActions.ts`).

# services/codes/

Multi-jurisdiction clinical terminology CONFIGURATION — which coding systems (SNOMED/ICD-10 variants/ICD-11) are enabled, per jurisdiction (US/CA/GB/IE).

**Pattern:** Standard interface/mock pattern. NOTE: no firestore stub currently — was present but confirmed genuinely dead/unused and removed July 2026 (unlike its siblings, that one really was orphaned).

## Notes

- Deliberately separate from services/terminologySearch/ (the live REST API search client) — this folder is config/dictionary only, not a search implementation. See terminologySearch/'s own README for why they're split.
- Also deliberately separate from services/diagnosisCodes/ — that's the referring physician's order-time diagnosis code; this is the broader, AI-assisted, multi-standard case-level coding system used near sign-out.

## Batch 450 — test evidence for Priority 1 and 2 tickets (PS-141)

`codeManagerCoding.ts`: the Code Manager's save (`resolveCodeManagerSave`) and reopen (`buildCodeManagerExistingCodes`) decisions, moved out of `SynopticReportPage.tsx`. Specimen SNOMED/ICD-10/ICD-O codes stay on their specimen; the same code twice on one specimen gets two ids.

**Bug fixed:** reopening left out a specimen's ICD-O codes, and the save (which takes the modal's full set) then erased them on every save. Reopen now includes them.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 617 (part A): server versions (PS-514)

`codeService` now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (the mock without an API server address, the server version with one). One route per interface method; the calls are listed in `docs/architecture/CASE_WORKFLOWS_API.md`. The mocks are unchanged. The instance file imports the mock, so a test that loads the mock first may need to load the instance first (the mock can reach `@/services`, which reaches the instance).
