

# services/reasons

`mockReasonDictionaryService.ts`: one reason dictionary, scoped by category (post-sign-out billing change, addendum, amendment, correction).

## Batch 399

New category **SURGEON_UNAVAILABLE**: why a critical intraoperative result went to a member of the surgical team rather than the operating surgeon (scrubbed in a critical step, communication delegated, intraoperative emergency, not in the room, Other). Seed reasons added after a browser stored its list are now merged in (`withMissingSeedRecords`).

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
