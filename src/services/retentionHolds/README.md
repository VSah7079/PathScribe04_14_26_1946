# services/retentionHolds

Batch 610 (queue entry #12): the Retention Holds queue (Batch Management → Retention Holds).

- `retentionHoldsQueue.ts`: pure. `computeRetentionHoldsQueue(cases)` lists every ACTIVE retention hold (a released hold never appears), oldest first, with the case accession, reason, note, who placed it and when. `filterRetentionHoldRows` filters by text (accession, the reason's words, who). `retentionHoldCsvRows` builds the CSV rows; the free-text note is not exported because it can name people.
- `loadRetentionHoldsQueue.ts`: reads the cases (without per-user case access, like the disposal queue: holds are a facility-level records task).
- `exportRetentionHoldsQueue.ts`: needs `retention:holds-queue:export`; records the document `retention-holds-queue`. The page calls it through `runExport` (kind `retention.holds-queue`, contract in `services/exports/asyncExportContract.ts`).
- **Release** is the existing `releaseHold('retention', …)` in `services/cases/caseHolds.ts` (`case:retention-hold:release`, release note from Field Requirements, audited, saved against the case version). A server must answer 409 on a stale case version; the browser already re-reads and says so.

*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
