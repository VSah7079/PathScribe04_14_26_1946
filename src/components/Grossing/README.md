# components/Grossing

**Batch 397 (PS-359).** `GrossingFieldNote.tsx`: `GrossingFieldNote` says a block field is "Needed before grossing can be completed", and `RequiredMark` is the "*" beside a required label. Used by the block and matrix block editors (piece count and description) and Add Orders. The rule is `services/grossing/grossingCompletion.ts` (`blockGrossingFieldsMissing`).

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
