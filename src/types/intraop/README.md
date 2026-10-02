# types/intraop/

Data model for the Intraop Pre-Check capture flow's desktop side — the "Unlinked Intraoperative Entries" queue (`/intraop-queue`).

## Files

- **`IntraoperativeEntry.ts`** — a session created at the bench during a frozen-section/intraop consult, living here unmerged until a formal LIS accession arrives, then merged into the real `Case`.

## Batch 399

`IntraoperativeEntry.ts`: `VerbalReportLog` (who, role, read-back, the critical decision, "Surgeon unavailable") and `VerbalReportInput`; `VerbalReportRecipientRole`. `IntraopCriticalResult.ts`: a critical intraoperative results dictionary entry.

## Batch 400

`VerbalReportLog.dictation` / `VerbalReportInput.dictation`: which fields were filled from dictation, and by AI or rules.

---
*See [types/README.md](../README.md) for how this folder fits the whole types/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master types/README.md if this folder's overall PURPOSE changes.*
