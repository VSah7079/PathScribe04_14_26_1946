# services/priority/

Display metadata (label/color/urgency ordering) for the three fixed CasePriority tiers (Routine/Rush/STAT).

**Pattern:** Standard interface/mock/firestore pattern.

## Notes

- Deliberately NOT a full migration to database-driven priority levels — CasePriority itself stays a small fixed union. Its own header documents why (a real ~21-consumer refactor, out of scope for this pass) — this service only adds display backing for the existing three tiers.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*