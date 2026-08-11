# services/stains/

Stain catalog — THREE distinct sub-concepts bundled in one well-reasoned interface file.

**Pattern:** IStainService.ts intentionally defines three separate interfaces (IStainTypeService, ISectioningProtocolService, IStainOrderMacroService), each with its own correctly-named mock.

## Files

- **`IStainService.ts`** — What stain (type) / how a block is cut (sectioning protocol) / quick-order preset combining one of each (order macro) — three orthogonal concepts, deliberately not merged.
- **`stainCategoryLookup.ts`** — Closes a real gap `StainOrder.stainName`'s own doc comment had already flagged: no way to resolve a stain's free-typed display name back to its real `StainType` record. `resolveStainType()` — real, case-insensitive name matching, returns the full real record (or null, never a guess). `resolveStainCategory()` is now a thin wrapper on it. Built for `services/billing/codeMapTable.ts`'s `suggestBlockAncillaryCptCodes()`, which needs the full record (not just category) to access `defaultCptCode`.
- **`IStainService.ts`**'s `StainType.defaultCptCode` — **New**, per direct guidance on real IHC coding nuances (a specific antibody billed differently than the generic rule, or a real multiplex panel billed as its own single code like 88344). Real, optional, coder-entered — this app never fabricates the mapping. Editable through this folder's own admin UI (`components/Config/System/StainDictionarySection.tsx`).
- **Real, researched demo data, per direct request.** `mockStainTypeService.ts`'s seed data now carries real `defaultCptCode` values: 88312 for the three special stains, and a real, defensible 88344 for the "p63/CK5/6 Dual Stain" entry — a genuine multiplex case (two separately identifiable antibodies on one slide), verified via direct search, not the generic single-antibody rule. Standard, single-antibody IHC stains (ER/PR/HER2/Ki-67/PD-L1) are deliberately left unassigned, since the generic first/additional rule genuinely applies to them with no real, verified exception.
- **`firestoreStainService.ts`** — MINOR: its auto-generated stub comment only names one of the three mocks as 'the active implementation' — should name all three. Cosmetic, self-inflicted during the July 2026 cleanup pass, not yet fixed.

## Notes

- This is the stain CATALOG only — deliberately NOT the same as the Block/Slide model, which is explicitly paused pending a verified Vantage HL7 integration spec (see services/hl7/adapters/vantageAdapter.ts). **Worth flagging, not yet reconciled**: `types/case/Specimen.ts`'s `HistologyBlock` (with a real `stains: StainOrder[]` field) does genuinely exist and is actively used today — this note may be stale relative to that, or referring to a more specific structural detail this pass didn't investigate. Not resolved here given the scope already covered this pass.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*