# services/labeling/

Batch 715 (Pete, Oct 28 2026): letters or numbers for specimens, blocks and slides.

| File | What it does |
|---|---|
| `labelStyle.ts` | The types (`LabelStyle` = specimen, block, slide, each `letters` or `numbers`), `DEFAULT_LABEL_STYLE` (today's: specimen letters, block numbers, slide numbers), the two old presets (`alpha-specimen`, `numeric-specimen`) and `ownLabelStyle` (what one record sets, the old preset folded in). |
| `resolveLabelStyle.ts` | `resolveLabelStyle(enterprise, facility)` -> `{ specimen, block, slide }`: per level, the facility's own choice, else the enterprise's, else the default. `resolveLabelStyleForFacility` walks ordering client -> performing lab -> enterprise. `labelStyleSources` says where each level comes from. |
| `resolveCaseLabelStyle.ts`, `liveCaseLabelStyle.ts` | The style for a case that already exists: the one saved on the case at accessioning (`Case.labelStyle`, declared in `types/case/CaseLabelStyle.ts`), else looked up from its facility. |
| `labelStyleEditor.ts` | What the facility editor's selectors offer and store (pure). |
| `labelStyleAudit.ts` | The audit entry for changing the choice ("Facility label style changed" / "Enterprise label style changed"). |

The generators are in `utils/specimenLabeling.ts` (`getSpecimenLabel`, `getBlockLabel`, `nextBlockLabel`, `slideLevelText`, `exampleLabels`).

**Where it is set:** Configuration > System > Integrations > Facility Configuration, General tab, "Letters or numbers for labels" (`components/FacilityDictionary/FacilityLabelStyleField.tsx`). The Enterprise facility holds the default; a lab can leave a level on "Same as enterprise" or set its own. Saving needs `config:facilities:manage` (checked in the facility service); the change is audited in `pages/system/FacilityDictionaryPage.tsx`.

**Slides:** the level code in a slide's id and barcode stays `L1`, `L2` whatever the choice (scanning and every existing slide depend on it). "Letters" changes the text printed on the slide label only (`La`, `Lb`), through `slideLevelText`. Screens that list a slide's level still show `L1`.

**New cases only.** The style in force is saved on the case at accessioning; blocks and specimens added later follow it. Nothing already printed, scanned or signed out is relabelled. There is no "Relabel existing" action (not built: it would change barcodes already on tissue).

**Specimen and block of the same kind** (both letters, both numbers) are allowed; the editor warns that `AA` or `11` can be read two ways.

Tests: `resolveLabelStyle.test.ts`, `labeling.more.test.ts`, `utils/specimenLabeling.test.ts`, the Add Block tests in `utils/grossingScreenOperations.test.ts` and `pages/SynopticReportPage/hooks/__tests__/useSpecimenBlockManagement.test.ts`, `components/FacilityDictionary/FacilityLabelStyleField.test.tsx`.

---
*Update this file when the rule, the defaults or where the setting lives changes.*
