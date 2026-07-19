# services/lisSync/

A small, self-contained mock for ONE specific UI feature — the worklist's 'Data as of / Check now' sync-freshness indicator.

**Pattern:** Deliberately NOT the full interface/mock/firestore triplet — no firestoreLisSyncService.ts exists, and that's intentional (unlike other domains where a missing firestore stub would be a gap).

## Notes

- Don't force this into the standard triplet pattern for consistency's sake alone — it's a narrow, purpose-built demo mock, not a domain with a planned real backend.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*