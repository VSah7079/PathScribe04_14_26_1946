# components/OrganMap

Batch 461: the anatomical map companion on the report page (Pete's "Opt-In Companion").

- `OrganMapPanel.tsx`: the collapsible panel above the synoptic, opened with the **Map** button (open or closed is remembered per user, `reportAnatomicalMapOpen:<userId>` in `utils/uiPreferences`). It shows the map, the legend, and the report image's state ("In the report", "Report image is out of date — insert again", "In the report, locked at sign-out") with **Insert into report** / **Insert again** / **Remove from report** (`CapabilityButton`, `report:organ-map:insert`; the service checks again). *(Batch 573: the empty presence slot is gone; who else has the case open is shown once, above the report's tabs, `pages/SynopticReportPage/components/CasePresenceStrip.tsx`.)*
- `OrganMapSvg.tsx`: the on-screen drawing. Shapes come from `services/organMapping` (`organMapLayout`); colours are the site's scheme as custom properties on the panel (`organMapSchemeVars` → `--organmap-<key>`), read by the `ps-organmap-*` classes in `pathscribe.css`; a patterned fill is an SVG `fill="url(#…)"` attribute. A sector with a question to jump to is a button: click, Enter or Space asks the page to jump to (and highlight) that synoptic question. Without one (the Configuration preview) sectors are labelled pictures, not tab stops. The short text inside sectors comes translated from `organMapLabels`.

**The map is drawn from the synoptic answers** and has no Save of its own: change an answer and the map changes. The components render only; every decision is in `services/organMapping/` and `pages/SynopticReportPage/hooks/useOrganMap.ts` orchestrates.

Test: `OrganMapPanel.test.tsx`.

## Batch 462

The drawing handles the breast map: the clock face with dashed quadrant lines, the foci as numbered markers (buttons that jump to the Tumour foci question; their names say where they are), the margin diagram, and captions aligned to the corners. New `ps-organmap-*` fill classes for the breast categories.

## Batch 463: Mohs

- `MohsStageCanvas.tsx` (new): one stage's margin (12 clock sectors and the deep margin) drawn with `OrganMapSvg`; no state; emits `onSectorToggle` with the spec's SectorToggleEvent. Sectors are toggles (`aria-pressed`).
- `MohsStagesInput.tsx` (new): the Mohs stage question in the synoptic. Per stage: time, blocks cut, Mark stage clear, the canvas and the checklist (a labelled checkbox per sector, then block, histology and perineural invasion for positive rows); Add / Remove stage; voice commands arrive as the `pathscribe:voice-command` event. Every change is a patch from `services/templates/mohsStages.ts`.
- `OrganMapSvg.tsx`: `layout` (draw a different layout, the single stage) and `pressedOf` props.
- `OrganMapPanel.tsx`: for a map that is always in the report the panel says so and has no Insert / Remove.
- CSS: `ps-mohs-*`, residual-tumour and perineural classes, `ps-organmap-state--auto`.

Tests: `MohsStagesInput.test.tsx` (new).

## Batch 463b

`MohsStagesInput.tsx`: the block is a selector (Unassigned, then A up to the stage's Blocks cut) instead of an automatic letter; a row with no block, or one beyond Blocks cut, is flagged, and the stage shows why. Patches are functions of the answers of the moment (Batch 463 review).

## Batch 464

`OrganMapSvg.tsx` draws the layout for the payload's variant (a polyp's Paris type; a rectal tumour's place by the reflection). CSS for adenoma and adenoma at the margin.

## Batch 465

`OrganMapSvg.tsx`: a white halo under every overlay outline (`ps-organmap-overlay-halo`), so each outline keeps its contrast on any fill; ENEma drawn heavier.

## Batch 465b

`OrganMapSvg.tsx`: the outline halo has two layers, a thin dark edge (`ps-organmap-overlay-edge`) outside the white one, for dark themes and print alike.

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

New test in `OrganMapPanel.test.tsx` for the PS-491 criterion: every patterned colour is drawn with its pattern, and every outline sits on its white halo and dark edge.

## Batch 573

- `OrganMapPanel.tsx`: the empty presence slot (and its CSS) removed; presence is shown above the report's tabs.
