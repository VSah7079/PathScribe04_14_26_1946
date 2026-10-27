**Batch 649:** `AddCodeModal.tsx`: Apply is greyed without `case:diagnosis-code:apply` (the save checks again).

# pages/Synoptic/Codes/

ICD/terminology code application UI for a case or specimen.

## Files

- **`AddCodeModal.tsx`** — Navy design system (matches `FlagManagerModal`). Live terminology search via the NLM API (`codeSearchService`). Left panel: applied codes per case/specimen with strikethrough/undo. Right panel: system tabs + hierarchy filters + live search.
  - Real, per direct guidance: SNOMED/ICD-10/ICD-11/ICD-O AI suggestions are now machine-verified against the real, live terminology search before ever being shown (`filterToVerifiedCodes`, `services/terminologySearch/`) — a hallucinated code is silently dropped before the practitioner's own review, never the other way around. CPT keeps its own, separate, pre-existing re-verification against `CODE_MAP_TABLE`.
  - Real, per direct guidance: both the search-results list and the AI-suggestions panel now flag a code already applied to a *different* specimen/case ("Applied elsewhere") rather than showing it as fresh — previously only checked the currently-selected target. Reuses the already-existing, already-working `moveCode()` (the same reassignment this modal's own drag-and-drop already performs) via a real "Move here" action, rather than a second, separate mechanism.
  - Real, per direct guidance: CAP/RCPath synoptic templates' own embedded per-field/per-option code metadata (`EditorField.snomed`/`.icd`, `FieldOption.snomed`/`.icd` — `components/Config/Protocols/SynopticEditor.tsx`) is now actually applied to the active specimen at the real moment a pathologist approves a synoptic AI suggestion (`RightSynopticPanel.tsx`'s `handleVerify`, `v === 'verified'`) — this data model and its admin-side display already existed, but nothing had ever wired it to a real case before. See `pages/SynopticReportPage/resolveEmbeddedCoding.ts`. Currently inert in practice for every generic/placeholder template (all `snomed`/`icd` values are genuinely empty pending a confirmed CAP/RCPath license — `components/Config/Protocols/README.md`), but will apply automatically the moment real, licensed content replaces those templates in place.
  - Real, per direct guidance: found and fixed a genuine, pre-existing bug this same work surfaced — `handleAddCodesToSpecimens` (`SynopticReportPage.tsx`) took every SNOMED code regardless of its own real `specimenId` and flattened them all into one, undifferentiated case-level list (the exact bug class already fixed for ICD, never fixed for SNOMED). `Specimen.coding` gained a real `snomed` field to make per-specimen storage possible at all. Per direct guidance's own explicit principle: never deduplicated on write — the same real concept can legitimately appear more than once (multiple observations, the same concept on different specimen components, a repeated/updated observation) and a distinct, deduplicated concept SET is a real, separate derivation for analytics/billing only (`deriveUniqueConcepts`, `services/terminologySearch/`), never baked into storage.

## Batch 367 (PS-74): no inline CSS

`AddCodeModal.tsx`: the remaining inline styles moved into `pathscribe.css` classes. Per-instance values (sizes, positions, a colour) are passed as custom properties, and colours are derived with `color-mix()` from `--ps-hue` instead of hex strings built in JSX. The browser checks are listed in the Batch 367 changelog (`src/i18n/README.md`). The app-wide check is `services/styleRules/inlineCss.guard.test.ts`.


## Batch 536 (PS-558)

`AddCodeModal.tsx`: the AI coding call passes its feature and facility, for the jurisdiction's AI vendor policy.

---
*See [pages/README.md](../../README.md) for how this folder fits the whole pages/ layer.*
*When this folder's contents change meaningfully, update THIS file.*

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 567 (WCAG 2.1 AA, 4.1.2)

- `AddCodeModal.tsx`: AI suggestion rows and search results can hold a button (Move here), so they are no longer buttons. Clicking a row still applies its code; the icon at its end is now a button that does the same ("Apply code"), and once applied the "✓ ×n" mark is the button that applies it again (its name keeps the visible text: `addCodeModal.applyAgainLabel`). A row whose code is on another specimen is no longer an empty tab stop.

## Batch 607 (code systems and coding)

- **`useCodePolicy.ts`:** the code-system policy for the lab's jurisdiction (default until loaded). `AddCodeModal.tsx` shows only allowed systems, marks required ones, and refuses a code from a system that is off.
- **`Opcs4Notice.tsx`:** the "needs NHS TRUD licence" notice and a Simulated, read-only sample list.
- **`CaseCodingDisplay.tsx`:** coded entries with release, source and AI detail, and ICD-10 beside ICD-11 (Simulated map). `AddCodeModal` hands the entries back as the third argument of `onAddToSpecimens`; `SynopticReportPage` stores them in `Case.coding.entries`.

## Batch 615 (PS-138): searches for flagged findings

`AddCodeModal` takes `triggerQueries` (matched abnormal-detection triggers). Each shows as a button above the system tabs (`acd-trigger-*` classes); pressing one switches to SNOMED, selects the finding's specimen and fills the search box. Only shown when SNOMED is allowed by the code-system policy. Test: `AddCodeModal.triggers.test.tsx`.

## Batch 651
`AddCodeModal.tsx`: the AI suggestion call moved to `services/coding/aiCodeSuggestions.ts` (the file is shorter by about 180 lines). The applied AI code records the real model and provider; confidence is 0 to 100 (`CaseCodingDisplay` no longer multiplies by 100); an OPCS-4 suggestion shows Simulated and cannot be applied (`addCodeModal.opcs4DemoNotApplicable`).

**Batch 656:** after the AI suggestions arrive the window opens on the code system that has suggestions, and a note shows how many suggested codes could not be verified.

Batch 696: `AiSuggestionMeta.tsx` (with its own CSS) renders the match label or percentage, where the code was taken from, and a check mark for the dictionary check; it was moved out of `AddCodeModal.tsx`, which shrank by one line.
