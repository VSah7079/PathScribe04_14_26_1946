# services/reports/

The amendment/versioning system — Pete's actively-developed current work as of July 2026. Three tightly-coupled interfaces correctly bundled together (not a templates/-style bundling mistake).

**Pattern:** Standard interface/mock pattern (no firestore stubs yet — genuinely new work, not a gap).

## Files

- **`IAmendmentService.ts`** — Amendment/addendum draft lifecycle — open-drafts-per-pathologist worklist query, exit-gate rule (an open draft can't be cleared by review, only committed).
- **`ILisAmendmentNoticeService.ts`** — Inbound 'Disconnected Modification' LIS notices requiring pathologist action.
- **`IReportVersionService.ts`** — Version snapshot creation per case.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*