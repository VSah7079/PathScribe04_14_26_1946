# services/orderIntake/

The pending-orders queue an accessioner pulls from, and the resolution chain turning a raw external order into real Client/SpecimenCategory references.

**Pattern:** Standard interface/mock pattern (no firestore stub currently).

## Notes

- Multi-step design: raw IncomingOrder never written directly into Case; Client resolution reuses Client.code as the crosswalk key; Specimen resolution needs its own crosswalk since the same external code means different things at different clients.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*