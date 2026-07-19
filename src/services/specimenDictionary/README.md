# services/specimenDictionary/

THE real backend for the Specimen Dictionary (SpecimenEntry) — what Accession, the Synoptic editor, and Search all actually consume.

**Pattern:** Standard interface/mock/firestore pattern (added June 2026, closing a real prior gap).

## Files

- **`ISpecimenDictionaryService.ts`** — Its own header documents the prior gap directly: this dictionary was the one domain NOT following the standard pattern (useSpecimenDictionary.tsx called localStorage directly, inline, no interface). Also independently names services/specimens/ISpecimenService.ts as a properly-shaped but completely dead service that existed alongside it — confirmed and deleted during the July 2026 cleanup, corroborating this file's own documentation.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*