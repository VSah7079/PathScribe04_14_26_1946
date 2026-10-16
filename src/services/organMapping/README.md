# services/organMapping

Anatomical maps beside the synoptic (Batch 461: the shared engine and the prostate maps; Breast, Mohs, Colorectal, Head & Neck and Renal follow in Batches 462–466).

## The rule: the map comes from the synoptic answers

**The cancer data on a map is the synoptic report's data.** A map has no data and no Save of its own. It is worked out, every time it is drawn, from the answers of the synoptic it sits beside (`Case.synopticReports[].answers`). Change an answer and the map changes. Nothing on a map can disagree with the signed synoptic. The only things stored here are how maps look (colours by layer), which questions feed them (a lab's bindings), and the image a pathologist chose to put in the report.

## Files

| File | What it decides |
|---|---|
| `prostateSectors.ts` | PI-RADS v2.1: 41 sectors (`r|l_base|mid|apex_<zone>`, CZ at the base only, `r_sv`, `l_sv`, `us`); 12 systematic biopsy sites and 3 targeted |
| `prostateGeometry.ts` | PathScribe's own schematic (not ACR artwork): three axial slices (base, mid, apex; anterior at the top, the patient's right on the viewer's left), and the biopsy front view with a cell per site |
| `organMapTypes.ts` | Map types, categories (`benign`, `tumour`, `gg1`, `gg2`, `ggHigh`, `notSampled`), overlays (`epe`, `positiveMargin`), patterns, the payload |
| `resolveProstateMap.ts` | The map from the answers (Grade Group → category; SV invasion; EPE and margin as outlines; biopsy cores by site: the most severe core, then the higher Grade Group, gives the colour, Grade Group and Gleason; % and length are the greatest of the positive cores, whatever the order) and its fingerprint |
| `organMapScheme.ts` | Built-in colours and patterns; layers resolved key by key (facility over jurisdiction over enterprise over built-in); validation (every colour keeps a pattern); `organMapSchemeVars` |
| `organMapBindings.ts` | PathScribe's own map questions bind themselves (`psmap_*` option ids); a lab's stored binding wins; validation against the template |
| `organMapConfig.ts` | The Configuration saves: `saveOrganMapSchemeLayer` (`config:organ-map-scheme:manage`, facility-scoped for a facility layer) and `saveOrganMapBinding` (`config:organ-map-bindings:manage`); each checked, validated, stored, audited |
| `organMapConfigDraft.ts` | The Configuration → Organ maps edits as pure functions (override / inherit a key, preview, bind a question and its answers, a grid's columns) |
| `organMapFigures.ts` | "Insert into report": a snapshot (print SVG + PNG + fingerprint) per synoptic; state none / current / stale / locked; `insertOrganMapFigure` / `removeOrganMapFigure` (`report:organ-map:insert`, refused once signed out, audited); the hashed copies a report version keeps; the PDF payload (`organMapReportFigures`) |
| `organMapDrawing.ts` | Layout per map type, pattern tiles, inline sector text, and the standalone print SVG (white background, colours written in, a white halo on text, legend) |
| `organMapLabels.ts` | Sector names, captions, legend, the short text inside a sector and a sector's summary from the caller's `t()` (the user's language on screen, the report's language on the report image); a site's own legend wording wins |
| `organMapLive.ts` | Wiring: loads a synoptic's template, binding and the facility's colours; the deps for the saves and the figures; `findStaleOrganMapFigures` (sign-out stops while a report image no longer matches its synoptic's answers) |

Screens: `components/OrganMap/` (the panel and the on-screen drawing), `pages/SynopticReportPage/hooks/useOrganMap.ts`, and Configuration → System → Organ maps (`components/Config/System/OrganMapsSection.tsx`, `hooks/useOrganMapConfig.ts`).

API contract for the ASP.NET Core server: `docs/architecture/ORGAN_MAPPING_API.md`.

Tests: `organMapping.test.ts` (sectors, geometry, scheme, bindings, resolver, drawing, labels), `organMapActions.test.ts` (insert/remove, state, version hashes, PDF payload, the Configuration saves), `organMapConfigDraft.test.ts` (the Configuration edits, the results grid, its report text, the demo cases' maps).

## Batch 461

Built as above. Demo: S26-4404 (needle biopsy, Core results grid filled: cores A–C Grade Group 2 on the right, D–F benign) and MFT26-8804 (radical prostatectomy: Grade Group 3 on the right, extension and a positive margin right posterolateral). Open the synoptic and press **Map**.

## User Guide

- **The map's cancer data comes from the synoptic report.** Fill in the synoptic as usual; in PathScribe's prostate templates, the **Anatomical map (PathScribe)** section holds the map questions (the sectors with tumour, extension and a positive margin, Grade Group, seminal vesicle invasion; for needle biopsies the **Core results** grid, a row per core).
- On the report page, press **Map** above the synoptic to open the map beside it (it stays open or closed for you next time). The map changes as soon as an answer changes; there is nothing to save on the map.
- Hover a sector for its name and what it shows (for a core: part, Grade Group, Gleason, % and length). Click it (or Tab to it and press Enter) to jump to the question it comes from, highlighted.
- **Insert into report** (optional) puts the map, in print colours and in the report's language, into the report as a picture. It is a snapshot: if you change an answer afterwards, the panel says "Report image is out of date — insert again", and sign-out waits until you insert it again or remove it. **Remove from report** takes it out. After sign-out the picture is locked; it changes only through an amendment.

## Admin Guide

- Permissions (Role Dictionary): **Insert the anatomical map into the report** (`report:organ-map:insert`, Pathologist, Fellow and Resident to start); **Manage organ-map colours** (`config:organ-map-scheme:manage`) and **Manage organ-map question bindings** (`config:organ-map-bindings:manage`), Admin and Lab Director to start. Every change is in the Audit Log.
- Configuration → System → **Organ maps** → **Colours & patterns**: set colours, patterns and legend wording for the enterprise, a jurisdiction or a facility. A facility uses its own settings, then its jurisdiction's, then the enterprise's, then PathScribe's. Every colour keeps a pattern so maps read in black and white and for colour-blind readers.
- **Map bindings**: PathScribe's prostate templates and copies of them need nothing. If your lab reports prostate cases on its own (for example licensed CAP) template, bind its questions: choose the template and map, then for each map input the question and what each of its answers means. The map then reads those answers.

## Batch 462: Breast

Pete's choices (Oct 5): foci in a grid, a six-face margin diagram, the close-margin threshold per site (2 mm by default). **The map's cancer data comes from the synoptic report**: the breast map is worked out from the synoptic answers every time it is drawn and stores nothing of its own.

| File | What it decides |
|---|---|
| `breastGeometry.ts` | The clock face as viewed facing the patient (12 hour sectors, a central zone, dashed quadrant lines), where a focus is drawn (clock position, distance from the nipple 0–8 cm across the ring), the quadrant of an hour for each side (right breast: 9 o'clock is outer), and the unfolded six-face margin diagram (lateral on the viewer's left for a right breast; each face split invasive / DCIS) |
| `resolveBreastMap.ts` | An hour takes its most severe tumour (invasive over DCIS; calcifications alone leave it benign); every focus with a type and clock position is a numbered marker, fanned out so none hides another; margins: 0 mm positive, under the threshold close, otherwise clear, blank or negative not given; several rows bound to one face show the closest; foci in a parts grid are labelled by part (never the specimen id) |
| `mapResolveShared.ts` | What the resolvers share (moved out of `resolveProstateMap.ts`); the fingerprint now covers markers and side, and is unchanged for prostate maps |
| `resolveProstateMap.ts` | `resolveOrganMap`: the one entry point for every map type (`resolveProstateMap` kept as its old name) |

Also: breast colours (invasive, DCIS, calcifications, margin clear / close / positive) and `thresholds.breastCloseMarginMm` layered like the colours (`organMapScheme.ts`); breast bindings and their validation (`organMapBindings.ts`); the breast words (`organMapLabels.ts`: hours, quadrants, faces, foci, "margin distance not given"); the Configuration edits, the threshold, the breast preview and the breast binding editor helpers (`organMapConfigDraft.ts`). Numbers in the map's words use the reader's number format.

Demo: S26-4401 (left breast, invasive carcinoma and DCIS at 2 o'clock, upper outer; deep margin 2.0 mm, clear at 2 mm, close at 2.5) and S26-4405 (right breast, DCIS with calcifications at 10 o'clock, upper outer; closest margin 3 mm superior).

Test: `breastMap.test.ts`.

### User Guide (breast)

- In PathScribe's breast templates, **Anatomical map (PathScribe)** holds: the specimen side; **Tumour foci** (a row per focus: invasive carcinoma, DCIS or calcifications; clock position as viewed facing the patient; distance from the nipple in cm; size in mm); **Margin distances** (a row per oriented margin: the distance in mm to invasive carcinoma and to DCIS; 0 = at the inked margin; leave blank when not applicable).
- Press **Map**. The clock face shades each hour by the most severe tumour there and marks every focus with its number; the margin diagram shows each margin clear, close or positive. Hover for the details; click to go to the question.

### Admin Guide (breast)

- Configuration → System → Organ maps → **Colours & patterns**: "Breast: a margin is close below (mm)" — **Override here** at the enterprise, a jurisdiction or a facility (2 mm unless set). Changing it can make an inserted report image out of date, like any change to what the map shows. Same permission as the colours (`config:organ-map-scheme:manage`), audited.
- **Map bindings** → choose the map "Breast": bind your own template's side question, a foci grid (type, clock position, distance, size columns and what their answers mean) and a margins grid (it needs its own rows, one per margin; say which margin each row is).

## Batch 463: Mohs

Pete's choices (Oct 5): the stage maps are **always** in the report (no Insert button); each positive sector records its block and histology, with the tumour type as the default histology and the block chosen from the stage's blocks (Batch 463b; superseded: 463's automatic letter in click order); voice in all five languages. The maps are worked out from the Mohs synoptic's answers, like every map.

| File | What it decides |
|---|---|
| `mohsGeometry.ts` (new) | A disc per stage, four to a row: 12 peripheral clock sectors (12 at the top) around the deep margin; each stage's title and result captions and its 12/3/6/9 marks. `mohsSingleStage(n)` is one stage on its own, for the input canvas. |
| `resolveMohsMap.ts` (new) | A positive sector is residual tumour (perineural invasion as an overlay), every other sector clear; per-stage summaries (time, blocks, clear). `mohsStagePayload` draws one stage. |
| `organMapAutoFigures.ts` (new) | Maps that are part of the report (`ORGAN_MAP_AUTO_REPORT`, today Mohs): drawn now from the answers in the report's language (`reports/reportTranslate.ts`) for preview, print and sign-out; they replace anything stored for that synoptic. |
| `organMapTypes.ts` | `mohsStages` map type, `residualTumour` category, `perineural` overlay, `isAutoReportMap`. |
| `organMapScheme.ts` | Built-in colours: residual tumour red (hatched), perineural invasion violet (dots). |
| `organMapBindings.ts` | `MohsStagesBinding` (the stage question); default binding = the template's first `spatialStageCanvas` question; validation. |
| `organMapFigures.ts` | `organMapReportState` ('auto' for automatic maps, 'autoEmpty' before they have data); `insertOrganMapFigure` refuses them. |
| `organMapLive.ts` | `findStaleOrganMapFigures` skips automatic maps (never stale); `loadOrganMapScheme(facilityId)` for the synoptic's canvas. |
| `organMapLabels.ts` | Mohs sector names, inline text (deep, block letter), captions per stage, summaries with block and histology; `organMapSectorShortName` for the checklist rows. |
| `organMapDrawing.ts` | Layout grows with the number of stages. |
| `mapResolveShared.ts` | `residualTumour` severity; the fingerprint can include extra data (the stage summaries). |
| `organMapConfigDraft.ts` | Mohs binding helpers; `organMapMohsPreview`, so the colours screen previews every colour and pattern. |

Tests: `mohsMap.test.ts` (new); `organMapConfigDraft.test.ts` (three previews). Server contract: `docs/architecture/ORGAN_MAPPING_API.md` §4–5.

## Batch 463b

`organMapLive.ts`: `findMohsBlockGaps(caseData)`, the synoptics whose Mohs stage question has a positive sector with no block or one beyond Blocks cut; sign-out stops on them (with the stale-map gate).

## Batch 464: Colorectal

Pete's choices (Oct 5): both maps (polyp, rectal resection); the rectal map as a cross-section and a long view; the malignant-polyp involved margin as a site setting — a distance and an operator (≤, <, =), 1.0 mm with ≤ by default, never per user — and the rectal CRM the same way; optional Insert, like prostate and breast.

| File | What it decides |
|---|---|
| `colorectalGeometry.ts` (new) | The polyp drawn by its Paris type: pedunculated (head, neck, stalk, stalk base = Haggitt 1–4; the stalk margin) or sessile/flat/depressed/excavated (the lesion, the submucosa in Kikuchi thirds, normal tissue either side, lateral and deep margins). The rectum: a cross-section viewed from below (wall, mesorectum, CRM in four quadrants) and a long view (peritoneal reflection, the tumour above/at/below it, the distal margin). |
| `resolveColorectalMap.ts` (new) | Polyp: adenoma lesion; carcinoma down to its Haggitt or Kikuchi level; margins with carcinoma judged by the polyp rule; adenoma at the lateral margin as an overlay. Rectal: tumour quadrants; the CRM at its closest quadrant judged by the CRM rule, the others clear; the tumour on the long view; the distal margin involved only on ink. The payload's `variant` and `meta` (Paris type, TME plane, the rule). |
| `organMapScheme.ts` | `adenoma`, `adenomaAtMargin` colours; the thresholds `polypInvolvedMarginMm`/`Operator` and `rectalCrmInvolvedMm`/`Operator` (`THRESHOLD_ROWS`), validated and audited; `marginInvolved(distance, threshold, operator)`, the one rule for these margins. |
| `organMapBindings.ts` | `FieldInputsBinding` and `FIELD_INPUT_SPECS`: named inputs, each a choice question (with meanings) or a numeric one; PathScribe's `psmap_crp_*` / `psmap_rec_*` questions bind themselves; generic validation. |
| `organMapConfigDraft.ts` | Field-input binding helpers, threshold rows (distance and operator together), colorectal previews. |
| `organMapLabels.ts`, `organMapDrawing.ts` | Colorectal names, captions (Paris type, TME plane, the rule), inline distances; the layout's variant. |

Tests: `colorectalMap.test.ts` (new). Corrected: the protocol registry's field counts for the prostate and breast templates hadn't been raised when Batches 461–462 added their map questions; now they match the templates.

## Batch 465: Head and neck

Pete's choices (Oct 5): two PathScribe synoptics, **Oral Cavity Resection** and **Neck Dissection**, modular and copyable so a composite resection carries both on one case; the neck as a **grid row per level and side** (Ia–VII, right and left) with nodes positive, examined, largest deposit and ENE; ENE as **ENEmi / ENEma** (AJCC 8th, ≤ 2 mm / > 2 mm), ENEma outlined heavier; oral margins **involved < 1 mm, close 1–5 mm** (RCPath), two site settings each a distance and an operator; optional Insert.

| File | What it decides |
|---|---|
| `headNeckGeometry.ts` (new) | The mouth facing the patient (15 AJCC oral subsites, right and left where it matters) with the peripheral and deep margin boxes; the two neck sides, each a lateral view with the front of the neck toward the middle (levels Ia–VII); captions and the mandible guide. |
| `resolveHeadNeckMap.ts` (new) | `oralMarginCategory` (involved, else close, else clear, by the site's rules); `resolveOralCavity` (subsites, margins, dysplasia at the mucosal margin, depth of invasion); `resolveNeckDissection` (rows bound to a level add up, worst ENE and largest deposit win; metastasis / no tumour with nodes examined / not reported; totals and worst ENE, or "not recorded"). |
| `organMapTypes.ts` | Map types `oralCavity`, `neckDissection`; overlays `dysplasiaAtMargin`, `eneMinor`, `eneMajor`; details `nodesPositive`, `nodesExamined`, `largestMm`, `ene`. |
| `organMapScheme.ts` | Their colours; thresholds `oralInvolvedMarginMm` (1, `<`) and `oralCloseMarginMm` (5, `≤`) with operators as two more rows; `validateOrganMapScheme(layer, inherited)` checks a layer's thresholds with what it inherits (`closeBelowInvolved`, and "=" against an inherited distance). |
| `organMapConfig.ts` | `inheritedOrganMapResolution`; the save validates against what the layer inherits (a facility's jurisdiction passed by the caller). |
| `organMapBindings.ts` | The oral cavity as a field-inputs map (`psmap_oc_*`); `NeckDissectionBinding` (grid, rows → levels, columns, ENE meanings); PathScribe's `psmap_nd_levels` grid binds itself; validation (numeric count columns, ENE meanings for the column's own answers). |
| `organMapLabels.ts` | Names, short subsite labels, inline text (margin mm; level and positive/examined), captions (two rule lines, depth, dysplasia; sides, totals and ENE), summaries. |
| `organMapDrawing.ts` | Layouts; a white halo under every overlay outline (all maps), ENEma heavier. |
| `organMapConfigDraft.ts` | Neck binding helpers (`withNeckGrid`, `withNeckRow`, `withNeckColumn`, `withNeckEneValue`), `fieldInputValueKey`, `organMapHeadNeckPreviews`. |

Tests: `headNeckMap.test.ts` (new); `organMapActions.test.ts` (inherited validation on save); `colorectalMap.test.ts`, `organMapConfigDraft.test.ts` (threshold rows, previews). Server contract: `docs/architecture/ORGAN_MAPPING_API.md` §3 and §4 "Head and neck bindings".

## Batch 465b

Pete (Oct 6):
- `organMapScheme.ts`: the involved distance must be strictly below the close distance.
- `organMapConfig.ts`: `organMapThresholdConflicts`. After a save, any layer whose oral rules now conflict with what it inherits is returned as a `warnings` entry, and the audit names the conflicts that save caused.
- `resolveHeadNeckMap.ts`: `effectiveOralThresholds`. A map with conflicting rules keeps the involved rule and uses the default close rule (≤ 5 mm), or calls no margin close. The caption says so (`meta.ruleConflict`).
- `organMapDrawing.ts`: the outline halo has two layers, a thin dark edge outside the white.

## Batch 466: Renal

Pete's choices (Oct 6):
- **Basis:** the renal resection map from the CAP/ICCR kidney synoptic, in place of R.E.N.A.L./PADUA.
- **Margins:** the three margins are renal vein, ureter and soft tissue. In a partial nephrectomy the parenchymal margin takes the soft tissue margin's place.
- **Aspect:** anterior / posterior, marked on the tumour's zones.
- **Margin status:** soft tissue and parenchymal margins are judged by distance and a site rule, 0.0 mm with "=" by default.
- **Questions:** added to Kidney Resection.

| File | What it decides |
|---|---|
| `renalGeometry.ts` (new) | Coronal kidney with poles × lateral/medial halves, the pT compartments, the margin boxes. The left kidney mirrors the right (`variant` `<procedure>|<R/L>`). |
| `resolveRenalMap.ts` (new) | Zones, compartments and margins from the answers. `renalPtFromExtent` is the AJCC 8th pT the extent and size point to: a guide that is printed, not the report's stage. |
| `organMapScheme.ts` | `renalParenchymalInvolvedMm` / `renalSoftTissueInvolvedMm` with operators (0 mm, `eq`), shown as threshold rows. |
| `organMapBindings.ts` | `renalResection` field inputs (`psmap_ren_*`). `FIELD_INPUT_ALIASES` binds the size to the template's own `tumor_size_cm`. |
| `organMapLabels.ts`, `organMapDrawing.ts`, `resolveProstateMap.ts` | Names, inline text, captions, layout, dispatch. |
| `organMapConfigDraft.ts` | `organMapRenalPreviews`. Renal answer meanings named by `fieldInputValueKey`. |

Tests: `renalMap.test.ts` (new); `colorectalMap.test.ts` (threshold rows).

## Batch 466b

Pete (Oct 6):
- **Partial nephrectomy margins:** the parenchymal margin and the perinephric / capsular soft tissue margin, each judged by its own rule. The renal vein and ureter margins are drawn only when added as non-standard margins (`extraMargins`). The variant now carries the margin boxes.
- **`organMapDerived.ts` and `organMapDerivedAnswers.ts` (new):** a binding's `derived` part calculates the template's generic "Margin status" and "Margin(s) involved" questions from the map, for every mapped organ, and those questions are locked on the form. They are validated with the binding (`bindingInputFieldIds`).
- **`organMapConfigDraft.ts`:** derived binding helpers.

## Batch 466c

- **Partial nephrectomy anatomy.** `renalGeometry.ts` takes an optional fourth variant segment of anatomy letters: v renal vein, i vena cava below and above the diaphragm, u ureter (`RENAL_OPTIONAL_ANATOMY`, `renalCompartmentsDrawn`). A partial nephrectomy draws them only when they're reported:
  - the vein when its margin was added, or carcinoma is in it or the vena cava;
  - the vena cava (with the diaphragm line and caption) when carcinoma is in it;
  - the ureter when its margin was added.

  `resolveRenalMap.ts` works out the letters and drops the hidden compartments' sectors. A radical nephrectomy draws everything. The adrenal and Gerota's fascia are still drawn for a partial nephrectomy.
- **Adenoma at the polyp margin.** (Replaced in Batch 466d: this switch is gone — margins are reported per component, so adenoma at the margin sets the adenoma margins, never the carcinoma's.) In 466c, adenoma at a colorectal polyp's lateral margin counted as the lateral margin involved in the derived margin answers, with a lab switch to turn it off.
- Tests: `renalMap.test.ts` and `organMapDerived.test.ts`.

## Batch 466d — margins per component (Pete)

- `organMapDerived.ts`: the derived margin questions are per component. `marginStatus` / `marginsInvolved` are the invasive carcinoma's; `precursorMarginStatus` / `precursorMarginsInvolved` are the precursor's on maps that have one (`PRECURSOR_OF`: polyp adenoma, breast DCIS, oral dysplasia). `derivedMarginState(payload, component, scope)` reads each from its own findings only. `invasiveMarginGaps` feeds the sign-out warning. `validateDerivedBindings` refuses one question in two roles (`sharedQuestion`) and a precursor role on a one-component map. Batch 466c's adenoma switch is removed.
- `organMapBindings.ts`:
  - `pathScribeDefaultBinding` binds `<prefix>derived_<key>` questions;
  - `upgradeStoredBinding` brings a stored binding up to date (drops roles on removed questions, fills empty roles from PathScribe's);
  - `bindingNeedsMarginReview` holds a pre-466d lab binding on a precursor map until the lab assigns its questions;
  - the audit detail lists margin roles.
- `organMapConfigDraft.ts`: role labels (`derivedKeyLabelKey`), a `needsReview` status, and a draft that confirms per component. `organMapConfig.ts`: saving stamps `marginComponents`.
- `resolveColorectalMap.ts`:
  - `meta.adenomaAtMargin` and `meta.invasiveCarcinoma`, both left out of the fingerprint;
  - a pedunculated polyp's adenoma at the margin is drawn on the stalk margin.
- `organMapLive.ts`: `findInvasiveMarginGaps`, a sign-out warning (not a block, Pete) when invasive carcinoma is recorded and its margins aren't all reported. Breast counts only the faces the lab's grid has.
- `organMapLabels.ts`: `invasiveMarginGapsMessage`.
- Tests: `organMapDerived.test.ts`.

## Batch 466e

`organMapDerived.ts`: oral cavity dysplasia involves the mucosal margin only when high-grade (Pete). Low-grade dysplasia there is still drawn on the map, but counts as not involved.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 511 (PS-478): full strict type-checking

One test (`organMapDerived.test.ts`) types its payloads. No code change.
