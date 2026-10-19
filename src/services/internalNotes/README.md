# services/internalNotes/

Lab-internal case notes and management reviews — never included in the generated patient report.

**Pattern:** Interface/mock only (post-cleanup); there is no firestore stub in this folder.

*Corrected in the Batch 496 README audit (Oct 9, 2026): the folder has no firestore file.*

## Files

- **`IInternalNoteService.ts / mockInternalNoteService.ts`** — The real, live system.
- **`ICaseNoteService.ts / firestoreCaseNoteService.ts (DELETED July 2026)`** — A parallel, near-identical legacy lineage for the same concept — deleted after confirming zero real callers besides each other.

## Notes

- If you see 'CaseNote' terminology referenced anywhere, it's stale — the real, current concept is 'InternalNote'.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 617 (part B): server version (PS-514)

The internal notes service now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are in `docs/architecture/DELEGATIONS_NOTES_API.md`.
