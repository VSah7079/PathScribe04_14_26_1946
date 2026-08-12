# services/aiBehavior/

Admin-configurable AI behavior settings — confidence thresholds, auto-insert toggles, per-section AI enable/disable.

**Pattern:** Standard interface/mock/firestore pattern.

## Notes

- MINOR: IAIBehaviorService.ts's own header comment has a stale path (says services/aiIntegration/, should say services/aiBehavior/) — cosmetic, worth fixing.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*