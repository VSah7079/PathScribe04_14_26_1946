# services/protocols/

Standalone processing-protocol dictionary (e.g. 'Standard Small Biopsy — 1 block, 1 H&E') — deliberately NOT embedded per specimen type.

**Pattern:** Standard interface/mock/firestore pattern.

## Notes

- Real lab reasoning documented inline: wildly different specimen types often share identical workflows; embedding would mean editing every specimen type individually when a shared routine changes. SpecimenEntry carries only a protocolId reference.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*