# services/stains/

Stain catalog — THREE distinct sub-concepts bundled in one well-reasoned interface file.

**Pattern:** IStainService.ts intentionally defines three separate interfaces (IStainTypeService, ISectioningProtocolService, IStainOrderMacroService), each with its own correctly-named mock.

## Files

- **`IStainService.ts`** — What stain (type) / how a block is cut (sectioning protocol) / quick-order preset combining one of each (order macro) — three orthogonal concepts, deliberately not merged.
- **`firestoreStainService.ts`** — MINOR: its auto-generated stub comment only names one of the three mocks as 'the active implementation' — should name all three. Cosmetic, self-inflicted during the July 2026 cleanup pass, not yet fixed.

## Notes

- This is the stain CATALOG only — deliberately NOT the same as the Block/Slide model, which is explicitly paused pending a verified Vantage HL7 integration spec (see services/hl7/adapters/vantageAdapter.ts).

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*