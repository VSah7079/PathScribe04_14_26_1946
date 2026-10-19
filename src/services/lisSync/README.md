# services/lisSync/

A small, self-contained mock for ONE specific UI feature — the worklist's 'Data as of / Check now' sync-freshness indicator.

**Pattern:** Deliberately NOT the full interface/mock/firestore triplet — no firestoreLisSyncService.ts exists, and that's intentional (unlike other domains where a missing firestore stub would be a gap).

## Notes

- Don't force this into the standard triplet pattern for consistency's sake alone — it's a narrow, purpose-built demo mock, not a domain with a planned real backend.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 617 (part B): server version (PS-514)

The LIS sync indicator service now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are in `docs/architecture/EQUIPMENT_MIGRATION_API.md`. The interface (`ILisSyncService`) is new and now holds the types the mock used to export.
