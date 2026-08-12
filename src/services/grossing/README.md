# services/grossing/

Grossing template routing evaluation — TYPES ONLY, deliberately.

**Pattern:** Does NOT have a mock implementation file — this is intentional, not a gap.

## Files

- **`IGrossingEvaluationService.ts`** — Its own comment explains: the real implementation is a plain function (evaluateGrossingTemplateAssignment) living in services/cases/mockCaseService.ts, matching the same pattern as evaluateSynopticAssignment. Only the types live here.

## Notes

- Don't 'fix' this by adding a mockGrossingEvaluationService.ts — that would duplicate real logic that deliberately lives in mockCaseService.ts instead.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*