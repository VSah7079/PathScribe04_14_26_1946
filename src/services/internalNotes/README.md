# services/internalNotes/

Lab-internal case notes and management reviews — never included in the generated patient report.

**Pattern:** Standard interface/mock/firestore pattern (post-cleanup).

## Files

- **`IInternalNoteService.ts / mockInternalNoteService.ts`** — The real, live system.
- **`ICaseNoteService.ts / firestoreCaseNoteService.ts (DELETED July 2026)`** — A parallel, near-identical legacy lineage for the same concept — deleted after confirming zero real callers besides each other.

## Notes

- If you see 'CaseNote' terminology referenced anywhere, it's stale — the real, current concept is 'InternalNote'.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*