# Organ maps: the API contract

**Status:** specification for the API server team. The browser side is built and tested (Batch 461: the shared engine and the prostate maps; Batch 462: breast); the endpoints below are not built yet. Today the settings are kept in browser storage and the report figures on the case record (mock services).
**Decisions (Pete, Oct 5, 2026):** PI-RADS v2.1 with 41 sectors, drawn as PathScribe's own schematic; a biopsy core map and a prostatectomy sector map; colours, patterns and legend wording configurable by enterprise, jurisdiction and facility, each change behind its own capability and audited; every colour paired with a pattern; the "Opt-In Companion" panel; "Insert into Report" optional per case, a fixed snapshot, locked at sign-out; PathScribe map questions plus lab bindings.
**Breast (Pete, Oct 5, 2026):** foci recorded in a grid (a row per focus: type, clock position, distance from the nipple, size); the six oriented margins as an unfolded specimen diagram, invasive carcinoma and DCIS separately; the close-margin threshold set per site, 2 mm by default.

## 1. The rule: the map comes from the synoptic answers

**The cancer data on a map is the synoptic report's data.** A map has no data and no Save of its own: it is worked out, every time, from the answers of the synoptic it sits beside (`Case.synopticReports[].answers`). Change an answer and the map changes. The only things stored for maps are:

- how they look (colours, patterns, legend wording, by layer: §3);
- which synoptic questions feed them, for a lab's own template (bindings: §4);
- the image a pathologist chose to put in the report (a snapshot: §5).

So the server never needs a "map" table of case data, and nothing a map shows can disagree with the signed synoptic.

## 2. Where the decisions are today (and move to the server)

All in `src/services/organMapping/`, pure and tested; the server takes them over as they stand:

| File | Decides |
|---|---|
| `prostateSectors.ts` | The 41 PI-RADS v2.1 sectors (`r|l_base|mid|apex_<zone>`, base with CZ, plus `r_sv`, `l_sv`, `us`); the 12 systematic biopsy sites and 3 targeted |
| `prostateGeometry.ts` | PathScribe's own schematic (not ACR artwork): slice and cell shapes, captions |
| `resolveProstateMap.ts` | The map from the answers: tumour sectors take the Grade Group (1 → GG1, 2 → GG2, 3–5 → GG≥3; tumour with no Grade Group yet → "carcinoma"); seminal vesicle invasion marks its side; extraprostatic extension and a positive margin are outlines over their sectors. Biopsy: a cell per site from the Core results grid; several cores at one site show the most severe core (then the higher Grade Group, with its Gleason score) and the greatest % and length of the positive cores, whatever the order of the parts; a site with no core is "not sampled"; a targeted site only when sampled. The fingerprint (SHA-256 of what is shown, not of the colours) |
| `organMapScheme.ts` | The built-in colours and patterns; resolving the layers key by key (facility over jurisdiction over enterprise over built-in); validation |
| `organMapBindings.ts` | PathScribe's own map questions bind themselves (option ids `psmap_*`); a lab's stored binding wins; validation against the template |
| `organMapFigures.ts` | The report image: state (none, current, stale, locked), insert and remove, the version record with hashes, the PDF payload |
| `organMapDrawing.ts`, `organMapLabels.ts` | The standalone print SVG and the words on it, in the report language |
| `organMapConfig.ts` | The two Configuration saves (check, validate, store, audit) |
| `breastGeometry.ts` (Batch 462) | The breast schematic: a clock face as viewed facing the patient (12 hour sectors and a central zone, quadrant lines), where a focus is drawn from its clock position and distance, which quadrant an hour is in for each side, and the six-face margin diagram (medial and lateral swap with the side) |
| `resolveBreastMap.ts` (Batch 462) | The breast map from the answers: an hour (or the central zone) takes its most severe tumour, invasive over DCIS (calcifications alone leave it benign; every focus with a type and a clock position is also a numbered marker, fanned out so none hides another); margins: 0 mm (on ink) positive, under the site's threshold close, otherwise clear, blank or negative not given; several rows bound to one face show the closest; invasive and DCIS separately |
| `mapResolveShared.ts` (Batch 462) | What the resolvers share: reading answers, severity, the legend, the fingerprint (now including breast markers and the side) |

## 3. Colours and patterns

```
GET    /api/organ-maps/scheme?facilityId=…          → { scheme, sources }   (resolved for that facility and its jurisdiction)
GET    /api/organ-maps/scheme-layers                → { enterprise?, jurisdictions?: {code: layer}, facilities?: {id: layer} }
PUT    /api/organ-maps/scheme-layers/enterprise     body: layer
PUT    /api/organ-maps/scheme-layers/jurisdictions/{code}
PUT    /api/organ-maps/scheme-layers/facilities/{facilityId}
DELETE (same three paths)                           → back to inherited
```

A layer is `Partial<Record<key, { colour?: '#rrggbb', pattern?: 'solid'|'hatch'|'dots'|'crosshatch'|'none', label?: string }>>` plus `thresholds?: { breastCloseMarginMm?, polypInvolvedMarginMm?, polypInvolvedMarginOperator?, rectalCrmInvolvedMm?, rectalCrmInvolvedOperator?, oralInvolvedMarginMm?, oralInvolvedMarginOperator?, oralCloseMarginMm?, oralCloseMarginOperator?, renalParenchymalInvolvedMm?, renalParenchymalInvolvedOperator?, renalSoftTissueInvolvedMm?, renalSoftTissueInvolvedOperator? }` (Batches 462, 464, 465, 466). Keys: `benign`, `notSampled`, `tumour`, `gg1`, `gg2`, `ggHigh`, `epe`, `positiveMargin`, for breast `invasive`, `dcis`, `calcifications`, `marginClear`, `marginClose`, `marginPositive`, for Mohs `residualTumour`, `perineural`, and for colorectal `adenoma`, `adenomaAtMargin`; for head and neck (Batch 465) `dysplasiaAtMargin` (dysplasia at the oral mucosal margin), `eneMinor` and `eneMajor` (ENEmi / ENEma, outlined; ENEma heavier). Every overlay outline is drawn over a white halo, on screen and in the report image, so it keeps its contrast on any fill (Batch 465); Batch 465b (Pete): the halo has two layers — a thin dark edge (0.5 unit each side, 60% opacity) outside the white — so it also reads on dark screen themes and light print. The white halo is about 1.5 units each side of the outline (wider than the 1 px Pete suggested, so it still shows under the 3–5 unit outlines).

**Thresholds (Batch 462, Pete: per site, 2 mm by default).** `breastCloseMarginMm`: a breast margin nearer than this, but not on ink, is "close". It layers like the colours (facility over jurisdiction over enterprise over PathScribe's 2 mm), is changed with the same capability and audited with the same before → after. Validated 0.1–10 mm. Changing it can change what a map shows, so an inserted report image becomes "out of date" like any other change. SQL: `OrganMapThreshold (Scope, ScopeId, ThresholdKey NVARCHAR(64), Value DECIMAL(5,2), UpdatedBy, UpdatedAt)`; `GET /api/organ-maps/scheme` also returns `{ thresholds, thresholdSources }`.

**Involved-margin rules (Batch 464, Pete).** Each is a distance and an operator, layered the same way and set at site level only (enterprise, jurisdiction, facility), never per user, "to prevent intra-departmental inconsistency":

| Pete's parameter | Key | Default | Range |
|---|---|---|---|
| `MalignantPolyp_InvolvedMargin_Threshold_mm` | `polypInvolvedMarginMm` | 1.0 | 0–10 mm (decimal) |
| its operator (`LESS_THAN_OR_EQUAL`, `LESS_THAN`, `EQUAL_TO`) | `polypInvolvedMarginOperator` | `lte` | `lte`, `lt`, `eq` |
| rectal CRM threshold | `rectalCrmInvolvedMm` | 1.0 | 0–10 mm |
| its operator | `rectalCrmInvolvedOperator` | `lte` | `lte`, `lt`, `eq` |

**Oral cavity margin rules (Batch 465, Pete: RCPath — involved < 1 mm, close 1–5 mm).** Two more rows, each a distance and an operator, layered and set per site the same way:

| Key | Default | Range |
|---|---|---|
| `oralInvolvedMarginMm` / `oralInvolvedMarginOperator` | 1 / `lt` | 0–10 mm |
| `oralCloseMarginMm` / `oralCloseMarginOperator` | 5 / `lte` | 0–20 mm |

So by default a margin is involved below 1 mm, close from 1 mm to 5 mm inclusive, clear beyond 5 mm. An oral margin is involved by the involved rule (0 mm always), else close by the close rule, else clear (`oralMarginCategory` in `resolveHeadNeckMap.ts`). The map prints both rules.

**Kidney margin rules (Batch 466, Pete).** The soft tissue (perinephric / Gerota's) margin of a radical nephrectomy and the parenchymal margin of a partial one are judged by their distance and a site rule, so the status always follows the measurement (Pete: entering 0.0 mm and choosing "not involved" can't happen):

| Pete's parameter | Key | Default | Range |
|---|---|---|---|
| `Renal_Parenchymal_Involved_Threshold_mm` (FLD-SYN-RENAL-CFG-001) | `renalParenchymalInvolvedMm` / `renalParenchymalInvolvedOperator` | 0.0 / `eq` | 0–10 mm |
| `Renal_SoftTissue_Involved_Threshold_mm` (FLD-SYN-RENAL-CFG-002) | `renalSoftTissueInvolvedMm` / `renalSoftTissueInvolvedOperator` | 0.0 / `eq` | 0–10 mm |

Involved when `marginInvolved(distance, threshold, operator)` says so (with the defaults: on ink); otherwise clear. "=" goes only with 0 mm, as for the other rules. The renal vein and ureteral margins are recorded by their status (involved / not involved), as CAP asks; they have no distance rule.

**Validation with what a layer inherits (Batch 465).** `validateOrganMapScheme(layer, inherited)`: a threshold the layer sets is checked together with the values it inherits — a close distance at or below the (own or inherited) involved distance is refused (`closeBelowInvolved`; Batch 465b, Pete: strictly involved < close), and so is "=" set on its own against an inherited distance other than 0 (`equalsNeedsZero`). The save resolves what the layer inherits (a facility's from its jurisdiction, which the caller passes as `facilityJurisdiction`).

**Conflicts a higher layer causes (Batch 465b, Pete).** After every save, `organMapThresholdConflicts(layers, facilityJurisdictions)` checks each layer that sets an oral distance against what it now inherits; one whose involved distance is at or above its close distance is a conflict. The save goes ahead and returns them as `warnings` (`{ scope, involvedMm, closeMm }`); the audit detail names them; Configuration shows a standing warning for each ("{scope}: the oral cavity involved distance (X mm) is not below the close distance (Y mm). Reconcile its rules…") until the layer is reconciled. Pete's `[CONFIG_CONFLICT: …]` wording is a translated message here, not a code string. Server: return the same list from the save and from `GET /api/organ-maps/scheme-layers` (`conflicts`).

**Fallback guardrail (Batch 465b, Pete).** A map never judges by conflicting rules: `effectiveOralThresholds` keeps the involved rule (the more cautious call) and, when the close distance isn't above it, uses PathScribe's close rule (≤ 5 mm) — or, when even that isn't above the involved distance, calls no margin close. The map's caption says so ("Close ≤ 5 mm (default: site rules conflict)", "No close band (site rules conflict)"); `meta.ruleConflict` = `fallback` | `none`. Any other consumer of these rules must use the same function.

The rule (`marginInvolved(distance, threshold, operator)` in `organMapScheme.ts`): a margin with carcinoma at that distance is **involved** (`≤`: distance ≤ threshold; `<`: below; `=`: exactly — accepted only with 0 mm, "on ink only"); carcinoma at 0 mm (on ink) is always involved, whatever the rule; a missing or negative distance is not judged. A stored value outside 0–10 mm or an unknown operator is ignored when resolving (the layer below stands). The map prints the rule it used ("Margin involved at ≤ 1 mm (site rule)"), so changing a site's rule makes an inserted image out of date. Anything else that judges these margins (automated comments, staging alerts, MDT flags) must call the same rule with the case's facility's active setting. SQL: the operator rows store their value in a `Code NVARCHAR(8)` column of `OrganMapThreshold` (or a sibling table), validated against the three codes.

- **Check:** `config:organ-map-scheme:manage`; for a facility layer, with that facility (facility scope).
- **Validate** (`validateOrganMapScheme`): hex colour; a known pattern; `none` only for `benign` and `notSampled` (every other colour keeps a pattern, so the map reads in black and white and for colour-blind readers); wording at most 40 characters.
- **Audit:** "Organ map colours changed", with the before → after of each key (`organMapSchemeChangeDetail`), only when something changed.
- **SQL:** `OrganMapSchemeLayer (Scope NVARCHAR(16), ScopeId NVARCHAR(64) NULL, StyleKey NVARCHAR(32), Colour CHAR(7) NULL, Pattern NVARCHAR(16) NULL, Label NVARCHAR(40) NULL, UpdatedBy, UpdatedAt)`, primary key (Scope, ScopeId, StyleKey).

## 4. Map bindings

```
GET    /api/organ-maps/bindings                      → { [templateId]: binding }
PUT    /api/organ-maps/bindings/{templateId}         body: binding
DELETE /api/organ-maps/bindings/{templateId}         → back to PathScribe's questions (or no map)
```

PathScribe's own prostate templates carry a section "Anatomical map (PathScribe)" with real values: checkbox questions over the 41 sectors (`psmap_sector_<id>`), Grade Group (`psmap_gg_1..5`), seminal vesicle invasion (`psmap_sv_*`) and, for needle biopsies, the **Core results** grid (`psmap_core_results`, one row per part: site, carcinoma, Gleason primary and secondary, Grade Group, % involvement, length). They need no binding, in a lab's copy too. A lab using its own (licensed CAP) template binds its questions: for each map input the question, and what each of its answers means.

```ts
type OrganMapBinding =
  | { mapType: 'prostateSectors'; tumourSectors?: ChoiceBinding; gradeGroup?: ChoiceBinding; epeSectors?: ChoiceBinding; marginSectors?: ChoiceBinding; svInvasion?: ChoiceBinding }
  | { mapType: 'prostateBiopsy'; coreGrid: { fieldId; columns: { site; cancer; gradeGroup; gleasonPrimary?; gleasonSecondary?; percent?; length? };
                                            values: { site: {optionId: siteId}; cancer: {optionId: 'yes'|'no'}; gradeGroup: {optionId: '1'..'5'}; gleason: {optionId: '3'..'5'} } } };
type ChoiceBinding = { fieldId: string; values: { [optionId: string]: string } };
```

- **Check:** `config:organ-map-bindings:manage`.
- **Validate** (`validateOrganMapBinding`) against the template: every bound question exists (a results grid for the biopsy map, with the site column), each meaning is one the map knows, at least one answer mapped, a tumour-sectors question for the sectors map.
- **Audit:** "Organ map binding changed", before → after.
- **SQL:** `OrganMapBinding (TemplateId NVARCHAR(128) PRIMARY KEY, BindingJson NVARCHAR(MAX), UpdatedBy, UpdatedAt)`.

### Breast bindings (Batch 462)

```ts
{ mapType: 'breastClock';
  side?: ChoiceBinding;                                   // option → 'right' | 'left'
  foci?: { fieldId; columns: { type; clock; distance?; size? };
           values: { type: {optionId: 'invasive'|'dcis'|'calcifications'}; clock: {optionId: '1'…'12'|'central'} } };
  margins?: { fieldId; rows: {rowId: 'superior'|'inferior'|'medial'|'lateral'|'anterior'|'posterior'}; columns: { invasive?; dcis? } } }
```

PathScribe's three breast templates carry "Anatomical map (PathScribe)": the side (`psmap_side_*`), **Tumour foci** (`psmap_breast_foci`, a results grid with six numbered rows: type `psmap_ftype_*`, clock `psmap_clock_1..12|central`, distance cm, size mm) and **Margin distances** (`psmap_breast_margins`, a results grid with a row per oriented margin: invasive and DCIS distance in mm, 0 = on ink). A results grid's rows are the case's parts unless the template gives its own (`rows: { kind: 'numbered', count, label }` or `{ kind: 'fixed', heading, rows }`). A margins grid can be bound only when it has its own rows (`validateOrganMapBinding` refuses a parts-row grid and rows it doesn't have).

### Mohs binding (Batch 463)

```
MohsStagesBinding { mapType: 'mohsStages'; stagesFieldId }   // a question of type spatialStageCanvas
```

PathScribe's "Mohs Micrographic Surgery" synoptic (`mohs_micrographic_surgery`, source PathScribe, copied and changed by a lab like any synoptic) has one such question, `psmap_mohs_stages`, and binds it by default; a lab's copy binds its first `spatialStageCanvas` question. `validateOrganMapBinding` refuses a binding to anything else (`stages`, `fieldMissing`).

**The stage question's answers** (ordinary synoptic answers keyed under the question's id, so storage, PS-71 merging, audit and versions are unchanged; `services/templates/mohsStages.ts`):

| Key | Value |
|---|---|
| `F__stages` | number of stages (1–8) |
| `F__s{n}__positive` | the stage's positive sectors: `c12`, `c1` … `c11`, `deep` |
| `F__s{n}__blocks`, `F__s{n}__time` | blocks cut; excision time (HH:MM, stamped when the stage is added) |
| `F__s{n}__{sector}__block` | the positive sector's block letter |
| `F__s{n}__{sector}__histology` | its histology (free text) |
| `F__s{n}__{sector}__pni` | `yes` when perineural invasion is present |

Pete's rules (Oct 5): marking a sector positive gives it the **default histology** and **no block** (Batch 463b, superseding 463's automatic letter in click order, which wasn't the cutting order): the block is chosen from A up to the stage's blocks cut. Sign-out stops while a positive sector has no block, or one beyond the blocks cut (`mohsBlockProblems`; the server enforces the same at sign-out). The default histology is the label of the answer to the question the canvas names (`defaultHistologyFieldId`, the tumour type; for an "other" answer, the free text of the question shown for it; the template editor's **Default histology from** sets the question, Batch 463b); it can be changed per row. Marking it negative removes its block, histology and perineural invasion. A stage with no positive sector is clear. The server keeps these as rows: `MohsStage (CaseId, InstanceId, StageNumber, ExcisionTime, BlocksCut)` and `MohsPositiveSector (…, StageNumber, SectorId, BlockId, Histology, PerineuralInvasion)`.

**The map:** a disc per stage (four to a row), 12 peripheral clock sectors around the deep margin. A positive sector shows "residual tumour" (with perineural invasion as an outline); every other sector is clear. Captions: the stage, its time, its result (clear, or residual tumour with blocks cut). The fingerprint includes each stage's number, time, blocks and result.

**Result payload** (`SYNOPTIC_RESULT_API.md`): an observation per stage (`F__s{n}`: clear / residual tumour) and per positive sector (`F__s{n}__{sector}`: histology and perineural invasion, `block_id` its block).

**Voice** (FR-05, all five languages; Batch 463b: an optional "block A" / "bloc A" / "Block A" / "blok A" / "블록 A", noon/midnight words as 12 o'clock, Korean number words): "Stage 1, positive at 12 o'clock", "stage 2 deep negative", "stage 2 clear"; French "stade 1 positif à 12 heures", German "Stufe 1 positiv bei 12 Uhr", Dutch "stadium 1 positief op 12 uur", Korean "1단계 12시 양성". The voice provider offers what it heard to the screen first (`services/voice/voiceCommandEvents.ts`, event `pathscribe:voice-command`); the Mohs question parses it (`parseMohsVoiceCommand`) and applies it like a click, or reports that the stage hasn't been added or that nothing changes. Ambiguous commands are not taken (two clock positions, a clock position with "deep", "negative" without a sector): a whole stage is cleared only by its clear word. Words not taken go on to the usual voice commands. Patches are built from the answers at the moment they are applied, so commands in quick succession don't overwrite each other.

### Colorectal bindings (Batch 464)

```
FieldInputsBinding { mapType: 'colorectalPolyp' | 'rectalResection'; inputs: { [input]: { fieldId, values? } } }
```

Each input is a choice question with what each of its answers means (`values`: option id → meaning), or a numeric question (`fieldId` only). The inputs (`FIELD_INPUT_SPECS` in `organMapBindings.ts`):

| Map | Input | Kind | Meanings |
|---|---|---|---|
| polyp | `paris` | choice | `0-Ip`, `0-Isp`, `0-Is`, `0-IIa`, `0-IIb`, `0-IIc`, `0-III` |
| | `invasive` | choice | `yes`, `no` |
| | `depth` | choice | `haggitt1`–`haggitt4`, `sm1`–`sm3` |
| | `deepMarginMm`, `lateralMarginMm` | number (mm) | |
| | `lateralAdenoma` | choice | `present`, `absent` |
| rectal | `quadrants` | choice (several) | `anterior`, `left`, `posterior`, `right`, `circumferential` |
| | `crmMm`, `distalMarginMm` | number (mm) | |
| | `crmQuadrant` | choice | `anterior`, `left`, `posterior`, `right` |
| | `tmePlane` | choice | `mesorectal`, `intramesorectal`, `muscularisPropria` |
| | `reflection` | choice | `above`, `at`, `below` |

PathScribe's questions bind themselves: "Anatomical map (PathScribe)" in **Colorectal Local Excision** (polyp: `psmap_crp_<input>`) and in **Colorectal Resection B** and **Colon Resection** (rectal: `psmap_rec_<input>`); a choice question's options are `<question id>_<meaning>`. Validation: each bound input is a question the template has of the right kind (choice: dropdown, radio, checkboxes; number: numeric or text), a choice input's meanings are known and cover at least one of the question's own answers, and at least one input is bound.

**The polyp map.** Drawn by the Paris type (sessile when none; pedunculated when only a Haggitt level is given). Pedunculated: head, neck, stalk, stalk base (Haggitt 1–4) and the stalk (deep) margin. Otherwise: the lesion in the mucosa, the submucosa beneath it in thirds (Kikuchi sm1–sm3), the lateral (mucosal) margins at both ends and the deep (submucosal) margin. The lesion is adenoma; with invasive carcinoma, the levels it reaches are carcinoma (invasive with no level: the head, or the lesion). Carcinoma is present when that question says so, or — when it is unanswered or not bound — when a depth or a margin distance of carcinoma is given. A margin with carcinoma is involved by the polyp rule, otherwise clear; with no carcinoma the margins are clear of it; no distance, not given. Adenoma at the lateral margin is an outline on both lateral margins. The payload carries `variant` (the Paris type drawn) and `meta` (`paris`, `scale`: haggitt | kikuchi, `rule`, and Batch 466d's `adenomaAtMargin`: present | absent when answered).

**The rectal map.** Cross-section viewed from below (anterior at the top, the patient's right on the viewer's left): the wall in four quadrants (tumour where answered; circumferential = all four), the mesorectum, and the CRM arc. With a CRM distance, the closest quadrant (the one answered, else the tumour's quadrants, else all four) is judged by the CRM rule, the others are clear; when the closest point's position isn't given the caption says so (`meta.crmPosition = 'notGiven'`). Long view: the tumour above, at or below the peritoneal reflection (`variant`; none drawn when not given) and the distal margin, involved only at 0 mm. The TME plane and the rule are printed (`meta`: `tme`, `reflection`, `rule`).

### Head and neck bindings (Batch 465)

Two PathScribe synoptics (Pete: modular, so a composite resection carries both on one case, and copyable like Mohs): **Oral Cavity Resection** and **Neck Dissection**.

**Oral cavity** is a `FieldInputsBinding` (`mapType: 'oralCavity'`, PathScribe questions `psmap_oc_<input>`):

| Input | Kind | Meanings |
|---|---|---|
| `subsites` | choice (several) | `lipUpper`, `lipLower`, `upperAlveolusR/L`, `hardPalate`, `buccalR/L`, `retromolarR/L`, `tongueR/L`, `floorR/L`, `lowerAlveolusR/L` |
| `peripheralMarginMm`, `deepMarginMm`, `doiMm` | number (mm) | |
| `mucosalDysplasia` | choice | `absent`, `lowGrade`, `highGrade` |

The map: the mouth facing the patient (the patient's right on the viewer's left), each subsite carcinoma where answered (the others "not involved, or not in the specimen"); beside it the peripheral (mucosal) and deep margins judged by the oral rules (§3), with dysplasia at the mucosal margin outlined on it. `meta`: `rule` (`lt:1|lt:5`), `doi`, `dysplasia`.

**Neck dissection** reads a results grid:

```
NeckDissectionBinding { mapType: 'neckDissection'; grid?: { fieldId; rows: { [rowId]: 'R_IIa' | … | 'L_VII' }; columns: { positive; examined; largest?; ene? }; eneValues: { [optionId]: 'absent' | 'minor' | 'major' } } }
```

Pete: a grid row per level and side — Ia, Ib, IIa, IIb, III, IV, Va, Vb, VI, VII, right and left (20 rows, fixed). PathScribe's grid `psmap_nd_levels` binds itself (row ids are the level ids; ENE options `psmap_nd_ene_<meaning>`); in a lab's grid any fixed row can be bound to a level, and rows bound to the same level add up (the largest deposit and the worst ENE win). A level shows metastasis when a node is positive (or an ENE or a deposit size is given), no tumour when one or more nodes were examined and none is positive, and "not dissected or not reported" otherwise (an empty row, 0 of 0, only "ENE not identified"; a negative count is ignored). ENE (Pete: AJCC 8th — ENEmi ≤ 2 mm, ENEma > 2 mm beyond the capsule) is an outline, heavier for ENEma. `meta`: total `positive`, `examined`, worst `ene` (`absent` only when some row records ENE, else `notGiven`: the caption then says ENE wasn't recorded). Validation: the grid is one of the template's fixed-row grids, at least one row is bound, every bound row and level is known, the positive and examined columns are numeric columns of the grid (largest optional, numeric), and a bound ENE column is a choice column with meanings for at least one of its own answers and none for answers it doesn't have.

**Copying a map between blocks — Pete's phasing (Oct 6).**
- **Phase 1 (built, Batch 465):** several synoptics on one case (Oral Cavity Resection and Neck Dissection on one accession); every block's or specimen's map answers entered explicitly. Nothing is duplicated in the background, so no margin call carries over to a different cassette by accident.
- **Phase 2 (roadmap, not built):** an explicit **Clone Layout to Block…** action with mandatory pathologist confirmation: a comparison (diff) dialog shows what would be copied (orientation landmarks, margin calls, nodal level layouts, counts) and asks the pathologist to confirm that the copied annotations apply to a distinct physical block before anything is saved; the copy is audited. In PathScribe a map belongs to a synoptic on a part (specimen), not to a block, so this means copying one synoptic's map answers into another part's synoptic (and, for Mohs, one stage's sectors into another); a per-block map would need block-level synoptics first. Needs its own capability (a copy that changes clinical answers) and the PS-71 merge rules.

**Neck counts (Batch 465b, Pete).** In the Neck Dissection template the grid's nodes positive column can't exceed nodes examined in the same row (column property `notMoreThan`): a row breaking it is flagged on the row, and the draft isn't saved, nor the case signed out, until it's corrected. "Total nodes positive" and "Total nodes examined" are calculated from the grid and read-only once the grid has counts (field property `sumOf: { fieldId, columnId }`); while the grid has none they can be entered by hand (totals reported without levels). A template can let them always be entered by hand (`sumOf.override: true`; Batch 466c: set in the Synoptic Editor as the value "Entered by hand, checked against a grid's total"). A total that differs from the grid — hand-entered, or a calculated one stored out of step (e.g. filled from an AI suggestion) — asks the person to reconcile or continue (a warning they can go past) at draft save and at sign-out; the same warning, once gone past, isn't asked again on that page. Only the grid's own rows count (fixed or numbered rows, or the case's parts): a stored cell on a row the grid no longer has is neither checked nor totalled. Pete's `[VALIDATION_ERROR: …]` wording is a translated message here ("Nodes by level, Right level IIa: Nodes positive (3) can't exceed Nodes examined (2).").

**Free-text node counts (Batch 519, PS-494).** Some templates collect lymph node counts as free text (CAP wording allows "cannot be determined" and, for fragmented nodes, "at least N"). A text question marked `nodeCount: true` accepts a whole number of 0 or more, "cannot be determined" (or "cannot be assessed", "indeterminate") and "at least N" (or "≥ N", ">= N"), in all five UI languages (`services/templates/nodeCountText.ts` lists the phrases); anything else blocks draft save and sign-out. `notMoreThan` works as for numeric counts (an exact count, or the N of "at least N", can't exceed an exact limit; "cannot be determined" on either side, or an "at least" limit, skips the check). `atLeastSumOf: [ids]` says a total can't be below the sum of other counts (Breast: total examined ≥ positive A + B + C); skipped when a part is "cannot be determined" or not a count. Seven shipped templates use it (`data/templates/generic/README.md`). **Server requirement (open):** the API server runs the same checks (`parseNodeCount`, `textNodeCountProblem`, `textNodeCountExceeds`, `nodeCountBelowSum`; pure, port as-is) when it saves a draft and when it signs a report, and refuses with the same block kinds (`fieldNotCount`, `fieldExceeds`, `fieldBelowSum`).

### Renal binding (Batch 466)

Pete (Oct 6): the renal resection map from the CAP/ICCR kidney synoptic — compartments, poles and aspect, pT extent, the three margins — in place of R.E.N.A.L./PADUA nephrometry. A `FieldInputsBinding` (`mapType: 'renalResection'`); PathScribe's questions (`psmap_ren_<input>`) are an "Anatomical map (PathScribe)" section of **Kidney Resection**, and the size binds that template's own "Size (cm)" (`FIELD_INPUT_ALIASES`).

| Input | Kind | Meanings |
|---|---|---|
| `procedure` | choice | `partial`, `radical` |
| `kidney` | choice | `right`, `left` |
| `poles` | choice (several) | `upper`, `middle`, `lower` |
| `halves` | choice (several) | `lateral`, `medial` (both when not given) |
| `aspect` | choice (several) | `anterior`, `posterior` |
| `extent` | choice (several) | `limited`, `perinephricFat`, `sinusFat`, `pelvicalyceal`, `renalVein`, `ivcBelow`, `ivcAbove`, `gerota`, `adrenal` (contiguous; a separate adrenal nodule is M1, not extent) |
| `sizeCm` | number (cm) | |
| `veinMargin`, `ureterMargin` | choice | `involved`, `notInvolved` |
| `softTissueMarginMm`, `parenchymalMarginMm` | number (mm) | |

The map: a coronal kidney facing the patient (the right kidney's hilum toward the middle, on the viewer's right; the left kidney mirrored — `variant` `<procedure>|<R|L>`), its upper, middle and lower poles each in a lateral and medial half (tumour where answered); the aspect (Pete: anterior / posterior) marked in the tumour's zones (A, P, A+P) and printed. Around it the pT compartments — perinephric fat, Gerota's fascia, renal sinus fat, pelvicalyceal system, renal vein, vena cava below and above the diaphragm, adrenal — each carcinoma when answered. Beside it the margins (Pete): a radical nephrectomy's renal vein, ureter and perinephric / Gerota's soft tissue margins; a partial nephrectomy's parenchymal resection margin and perinephric / capsular soft tissue margin, each judged by its own rule (Batch 466b: no renal vein or ureter for a partial — they aren't in the specimen — unless the pathologist adds one as a non-standard margin, `extraMargins`: `renalVein`, `ureter`). With the procedure not answered, a parenchymal distance given alone is read as a partial nephrectomy, so it is never ignored. `variant` is `<procedure>|<R|L>|<margin boxes>[|<anatomy>]` (p parenchymal, s soft tissue, v vein, u ureter). Batch 466c: a partial nephrectomy's drawing leaves out the renal vein, the vena cava (with the diaphragm line) and the ureter — the specimen doesn't hold them — unless reported: the vein when its margin was added or carcinoma is in it or the vena cava, the vena cava when carcinoma is in it, the ureter when its margin was added (the anatomy letters v, i, u; their sectors go with them). The adrenal and Gerota's fascia are still drawn for a partial nephrectomy. In the Kidney Resection template the vein and ureter questions are hidden for a partial nephrectomy (unless added as non-standard margins) and the parenchymal question for a radical one (`visibleWhen` with `notAnswerIds` and `or`, Batch 466b); a hidden question's answer is cleared on the form and never printed in the report. Batch 466c: the Synoptic Editor builds these conditions — "when the answer is" or "unless the answer is" (`notAnswerIds`, one answer), plus any number of "or also when" alternatives (`or`, each a question and answer) — so none has to be written in the template file (`services/templates/conditionEdits.ts`). Only a condition it can't show faithfully (several answers for one question, or an alternative that is itself an "unless" or has alternatives) is shown read-only as "Custom condition"; a single `answerIds` entry is read as the answer. A condition still being built (no question or no answer) is ignored by the form rather than hiding its question for good (`isConditionSet`). The size alone (the template's own question) doesn't make a map. The caption prints the pT the extent and size point to (AJCC 8th: pT4 beyond Gerota's or contiguous adrenal; pT3c vena cava above the diaphragm; pT3b below; pT3a renal vein, perinephric or sinus fat, pelvicalyceal system; limited to the kidney — answered as such; a size alone gives no pT — by size, pT1a ≤ 4 cm, pT1b ≤ 7, pT2a ≤ 10, pT2b > 10) — a guide, labelled as such; the report's stage stays the pathologist's answer. `meta`: `procedure`, `rule`, `ruleParenchymal`, `aspect`, `pT` or `pTNeedsSize`, `sizeCm`. (Batch 466c changed a partial nephrectomy's variant and sectors, so a partial nephrectomy figure already inserted in an unsigned report shows as out of date until it is replaced.)

### The template's generic margin questions follow the map (Batch 466b)

Pete (Oct 6): "making data conflicts between the visual map and form inputs structurally impossible" — derive the form from the map, for every mapped organ with margins (renal, colorectal polyp and rectal resection, oral cavity, breast; the prostate, neck dissection and Mohs maps have no margin questions of their own to derive from). A binding may carry `derived: { marginStatus?: { fieldId, values }, marginsInvolved?: { fieldId, values } }`: the template's own "Margin status" question (each answer → `involved` | `close` | `notInvolved`) and "Margin(s) involved" question (each answer → one of the map's margins: renal `renalVein`, `ureter`, `softTissue`, `parenchymal`; polyp `deep`, `lateral`; rectal `crm`, `distal`; oral cavity `peripheral`, `deep`; breast the six faces). The form calculates them from the map whenever the answers change (`organMapDerivedAnswers.derivedMarginAnswers`) and locks them: involved as soon as any margin is involved; otherwise a status only once every margin drawn is reported (a margin with several sectors counts once any is) — close when one is close (or not involved when the question has no close answer), else not involved; while a margin is still blank the locked answers are left empty, never a stale call. Only questions shown are written; the change goes through the form's visibility clearing. A lab binds them in Configuration → Organ maps → Map bindings ("Generic margin questions (calculated from the map)"); the generic templates' answers carry no meaning PathScribe can read, so nothing binds itself. Validation: a choice question the template has, not one of the map's own inputs, with meanings only known ones; the status question needs both an involved and a not-involved answer; the margins involved question is a checkboxes question and not the status question. Pete asked for bi-directional binding; this builds the one direction he chose — the generic questions can't be edited, so they can't disagree. **Sign-out** stops when a synoptic's stored generic answers differ from what its map calculates (`findDerivedMarginConflicts`, e.g. answered before the binding existed); opening the synoptic recalculates them.

**Margins per component (Batch 466d, Pete).** Pete: "the solution needs to handle multi-component pathology natively" — margins are reported per component, as CAP does (the colorectal polypectomy protocol, v4.3.0.0, reports the invasive carcinoma's margins and, separately, "adenoma present at mucosal margin"). `derived` holds up to two pairs: `marginStatus` / `marginsInvolved` — the invasive carcinoma (on a map with one component, renal and rectal, simply the margins) — and `precursorMarginStatus` / `precursorMarginsInvolved` — the precursor, on maps that have one (`PRECURSOR_OF`: the polyp's adenoma, the breast's DCIS, the oral mucosa's dysplasia). Each pair is calculated from its own findings only (`derivedMarginState(payload, component)`): the carcinoma from its margin sectors (a precursor's mark on a sector is ignored; breast `m_<face>_inv`); the precursor from the breast's `m_<face>_dcis` sectors, the polyp's "Adenoma at the lateral margin" answer (`meta.adenomaAtMargin`; margin `lateral`) or the oral cavity's mucosal dysplasia (`meta.dysplasia`; margin `peripheral`) — present → involved, absent → not involved, not answered → no status. Batch 466e (Pete, citing CAP, RCPath, ESP, RCPA and KSP practice): oral dysplasia involves the mucosal margin only when high-grade (severe dysplasia / CIS); low-grade dysplasia at the margin is still drawn on the map (described) but counts as not involved. So adenoma at an edge can never make the carcinoma "involved". Validation refuses a question bound to two roles (`sharedQuestion`: no blanket margin question) and a precursor question on a map without a precursor. This replaces Batch 466c's switch (adenoma at the margin counted as involved), which is gone; a binding still carrying `adenomaAtMarginInvolved` ignores it. **PathScribe's Colorectal Local Excision** template's Margins section is now CAP's two blocks — "Invasive carcinoma margins" (All margins negative for invasive carcinoma / Invasive carcinoma present at margin; shown unless invasive carcinoma is "Not identified"), "Margin(s) involved by invasive carcinoma" (Deep / Peripheral-lateral mucosal) and "Adenoma (non-invasive) margins" (All margins negative for adenoma / Adenoma present at mucosal margin) — replacing three placeholder questions ("Field 1–3"; the distances are the map's own questions). They bind themselves: a field-inputs template's `<prefix>derived_<key>` question, its answer ids ending in their meaning, joins PathScribe's default binding. **Sign-out (Pete: a warning, not a block):** when a synoptic's map records invasive carcinoma and its margins aren't all reported (none involved, a margin still blank), sign-out lists them and asks before going on (`findInvasiveMarginGaps`); the precursor's margins aren't part of it. Each component waits only for margins that can be reported: a breast binding's margins grid rows (with that component's column bound), so a lab grid without the anterior face never holds a status back. A polyp answered as having no invasive carcinoma gives its carcinoma margins no status (not "not involved"). A pedunculated polyp's adenoma at the margin is drawn on its stalk margin (it has no lateral one). `meta.adenomaAtMargin` and `meta.invasiveCarcinoma` are left out of the figure fingerprint (they change nothing drawn).

**Existing bindings (Batch 466d).** (1) PathScribe's own templates with no lab binding take the new questions at once (the default binding is worked out from the template). (2) A stored lab binding is brought up to date when read (`upgradeStoredBinding`): a margin role whose question the template no longer has is dropped, and an empty role is filled from PathScribe's own question for it where the template has one (never a question already bound to another role); map inputs are untouched. (3) A lab binding saved before 466d on a map with a precursor (polyp, breast, oral cavity) still binding its own margin question can't be read per component, so it **waits for review** (`bindingNeedsMarginReview`): its margin questions are neither calculated nor locked; Configuration → Organ maps shows "Margin questions to review" and asks the lab to assign each question to the carcinoma or its precursor; saving marks the binding `marginComponents: true` and calculation resumes (the save is audited, the detail now listing the margin roles). (4) Renal and rectal bindings have one component, so they carry on unchanged.

## 5. The map in the report

```
PUT    /api/cases/{caseId}/organ-map-figures/{instanceId}   body: { mapType, svg, pngDataUrl?, fingerprint }
DELETE /api/cases/{caseId}/organ-map-figures/{instanceId}
```

- Optional, per case: the pathologist presses **Insert into report**. The figure is a **snapshot**: the map drawn in print colours (light, whatever the screen theme), as a standalone SVG, plus a PNG (the PDF embeds the PNG). It records the map's fingerprint.
- When the answers change afterwards, the panel says "Report image is out of date — insert again". Nothing changes the report image by itself.
- **Sign-out stops on an out-of-date image** (`findStaleOrganMapFigures` in `organMapLive.ts`, checked when sign-out is requested and again in `finalizeCase`): the pathologist inserts it again or removes it, so the signed report never carries a map that disagrees with the signed synoptic. The server must make the same check when it signs a report.
- Insert needs the PNG: when the browser can't draw one, nothing is inserted (the PDF would otherwise say nothing).
- The words on the image are in the report's language (the performing lab's), not the user's screen language.
- **Check:** `report:organ-map:insert`, with the case's facility. Refused (`locked`) when the case is finalized, closed, pending release or pending countersign; after sign-out the image changes only through an amendment.
- **Concurrency:** the write is the read-change-save of PS-71 (`updateCaseWithRetry`): only `organMapFigures` changes, against the version read.
- **Audit:** "Organ map inserted into report" / "Organ map removed from report", with the synoptic and the first 12 characters of the fingerprint.
- **Report version (sign-out):** each figure is kept with `svgSha256` and `pngSha256` (`OrganMapFigureVersion`); the version record also carries `pdfSha256`, the SHA-256 of the PDF's bytes as for report documents (*Batch 558 correction:* the browser's store hashed the base64 text before; both are accepted when a version's PDF is read, `reportVersionPdf.ts`). The server computes these hashes itself when it stores the version, and must not accept them from the browser.
- **PDF:** the render payload carries `reportFigures: [{ instanceId, mapType, pngBase64, svg, width, height, notice?, fallbackLines? }]` (the last two since Batch 463, for maps that are part of the report); the PDF renderer (`functions/main.py`, `figure_flows`) draws each after the report body, at most the text width, proportions kept. A figure without a readable PNG is skipped and the report still renders.
- **Maps that are always in the report (Batch 463, Pete: "Always, for Mohs").** Map types in `ORGAN_MAP_AUTO_REPORT` (today only `mohsStages`) are never inserted: the report draws them from the synoptic answers when it is previewed, printed or signed (`organMapAutoFigures.ts`), in the report's language. There is no Insert or Remove button, nothing is stored on the case, and they can't be out of date (sign-out doesn't check them). `insertOrganMapFigure` refuses them. Unlike Insert, an automatic map without a PNG (the browser couldn't draw one) is still kept, as its SVG; the PDF prints a notice with the map's content as text in its place (below). **Server requirement (open, high):** the API server draws the map itself when it builds the PDF (below), never relying on the browser's PNG. At sign-out the version keeps the map as drawn then, with its hashes, like an inserted figure. The server draws the same map from the signed answers when it signs.
- **SQL:** `CaseOrganMapFigure (CaseId, InstanceId, MapType, Svg NVARCHAR(MAX), Png VARBINARY(MAX) NULL, Fingerprint CHAR(64), InsertedBy, InsertedAt)`, primary key (CaseId, InstanceId); `ReportVersionOrganMapFigure (ReportVersionId, InstanceId, …, SvgSha256 CHAR(64), PngSha256 CHAR(64) NULL)`.

### Assist cases: no map in the report; delivery to the laboratory system (Batch 751, Pete, Oct 31, 2026)

Lab Workflow spec section 12. On an Assist case the primary LIS writes the report.

- **Phase 1 (built).** The map is a working aid only: view it, click to jump to the question. `insertOrganMapFigure` and `removeOrganMapFigure` refuse with `lisOwnsReport` (before the permission check, and again at the write). The panel shows "Your laboratory system writes this report." where Insert would be (`OrganMapReportState` `lisOwnsReport`). No figure goes into the PDF payload, a report version or the preview (`organMapReportFigures`, `organMapFiguresForVersion`, `autoOrganMapFigures`), Mohs included. `findStaleOrganMapFigures` returns nothing, so a map never holds up finalising. `report:organ-map:insert` is unchanged for Orchestrator cases. **Server:** apply the same refusal and skip Assist cases in the version's figures.
- **Phase 2 (built in the browser; server Planned).** A per-site setting on the performing lab, `Facility.organMapDelivery { mode: 'off' | 'text' | 'textAndFile', fileFormat: 'png' | 'pdf', destination }`, off by default. `POST /api/facilities/facility/set-organ-map-delivery { id, settings }` needs `config:organ-map-delivery:manage`. The server validates it as `validateOrganMapDelivery` does: a destination is needed only for a file, is at most 300 characters, never holds a user name or password, and is not kept for Off or Text only. The change is audited ("Organ Map Delivery Changed"); `add` and `update` never change the field.
  - **Text:** each Assist result message (`LIS_SYNC`: `final`, `corrected`, `corrected_with_addition`, `new_instance`) carries `organMap: { generatedFrom: 'synoptic answers', mapType, lines[] }`, and `fullPayloadText` ends with `--- ORGAN MAP (generated from the synoptic answers) ---` and the lines. A line per area with a finding (`organMapSectorSummary`); a Mohs map sends its stage lines.
  - **File:** drawn when the result is built, from the workup's final answers, in the report's language, as a PNG or a one-page PDF (`documentRendering/imagePdf.ts`). File name `{accession}_{mapType}_{yyyymmddThhmmssZ}.{png|pdf}`, never a patient name. The result names it (`organMap.file: { fileName, contentType, sha256 }`); the file goes after it as its own `LIS_SYNC` message of kind `organ_map`: `{ kind, caseId, instanceId, destination, organMapFile: { fileName, contentType, base64, sha256, mapType, fingerprint, generatedFrom } }`. The interface engine writes it to the destination. The queue entry keeps `organMapFile { fileName, sha256, fingerprint, mapType, destination }` (the sent record).
  - **Failure:** never blocks finalising and never shows the pathologist an error. A file that can't be drawn is queued FAILED (held); a delivery the engine refuses is FAILED. The outbound queue's retry (`rebuildOrganMapFileMessage`) draws it again from the final answers under the same file name. Audit: "Organ Map File Sent" / "Organ Map File Delivery Failed" (system, no patient name).
  - **Pathologist view:** the panel's quiet line "Map file sent to the laboratory system at (time)" when the workup's latest file is SENT.
  - **Server requirement:** draw the file on the server (the browser can draw it only while a page is open; a release at the end of the buffer with no page open queues it held for retry). `organ_map` entries are not workup versions (`isWorkupMessage`).

### Server-side PDF and map rendering — options (Pete, Oct 5)

Two designs are on the table. Both run inside the ASP.NET Core API server, both are free of revenue-limited licences, and the requirements further down (draw from the signed answers, fonts, the notice, audit) apply to either.

**Option A (Pete's recommendation, second dev note): HTML → PDF through headless Chromium.** The report is an HTML/CSS template (Razor, Fluid or Handlebars) printed to PDF by a headless Chromium driven from .NET: PuppeteerSharp (MIT), Microsoft.Playwright (MIT on NuGet; it bundles the Apache-2.0 Playwright driver; note the older *PlaywrightSharp* package is deprecated) or ChromiumHtmlToPdf (MIT).
- **The map needs no rasterising at all:** the SVG goes into the HTML as is, Chromium draws it, and the PDF keeps it as vector graphics (sharp at any zoom, small). Svg.Skia and the PNG step drop out, and so does most of the "couldn't draw" risk.
- **One layout for preview and PDF:** the report page already has an HTML preview (`pages/ReportPreview/ReportPreviewRenderer.tsx`); the server template can share its structure and CSS, so what the pathologist previews is what prints.
- **What it costs, and must be designed in:**
  - *Operations:* Chromium adds roughly 300–400 MB to the server image, needs memory per page, a pool of browser instances (not one per request), timeouts, and restarts of a hung instance. Run it as a non-root user with its sandbox on (no `--no-sandbox`).
  - *Security patching:* Chromium is a large attack surface and ships security fixes often; the image must be rebuilt on that cadence (a validated-system change-control item).
  - *No network, no scripts:* the page is built from patient data, so block every request (render from a string, intercept and refuse all network fetches), disable JavaScript unless a template needs it, and rely on the template engine's escaping (Razor escapes by default; set Fluid/Handlebars to escape).
  - *Fonts:* same as below: Latin and Hangul fonts installed in the image.
  - *Page furniture:* Chromium's header/footer templates are limited (page X of Y works; complex continuation headers need checking against the cytology template's continuation line, `functions/cytology_report.py`; the browser's `applyContinuationPageHeaders.ts` was removed in Batch 539).
  - *Archival format:* Chromium does not produce PDF/A. If a customer or regulator requires PDF/A for archived reports, a conversion step is needed. Tagged (accessible) PDF output should also be checked.
  - *Hashes:* each PDF is unique (creation date), which is fine: the version stores the hash of the PDF actually produced.

**Option B (first dev note): native drawing, Svg.Skia + a PDF library.** Lighter to run (no browser), but the layout is written in C# code, the map is rasterised, and QuestPDF's free licence has a revenue limit; a PDF library without one (e.g. PdfSharp/MigraDoc, MIT) would be needed instead.

**Decision (Pete, Oct 5): Option A, `Microsoft.Playwright` / headless Chromium, is the production standard for report generation.** The service's controls (pooling, isolation, container) are specified in [`REPORT_RENDERING_SERVICE.md`](REPORT_RENDERING_SERVICE.md). Option B below is kept for reference only. Corrected (superseded): the earlier note in this batch that a .NET server means "not sharp or puppeteer" was about Node.js tools; a headless Chromium driven from .NET (PuppeteerSharp, Microsoft.Playwright) is a valid ASP.NET Core option.

#### Option B detail: Svg.Skia

Pipeline: the API server receives the render request → draws each figure to a PNG with **Svg.Skia / SkiaSharp** → the PDF generator (e.g. QuestPDF) places the image. The browser's PNG (`svgToPng.ts`) stays for the screen preview only; the signed PDF never depends on it.

Requirements (with corrections to the first draft of the spec):
1. **Draw from the signed answers, not the browser's SVG.** At sign-out the server works the map out from the signed synoptic answers itself (the resolver and drawing in `organMapping/` are pure and port as-is) and checks its fingerprint against the one the browser shows. A browser-supplied SVG is untrusted input: if it is ever drawn, refuse anything with external references (`href`/`xlink:href` to a URL, `<image>`, `<script>`, `<foreignObject>`) before loading it. (The SVG comes from `renderOrganMapSvg`; `svgToPng.ts` only turns it into a PNG in the browser.)
2. **Native assets.** SkiaSharp wraps the native Skia library, so it is not pure C#: a Linux container needs `SkiaSharp.NativeAssets.Linux` (or `.NoDependencies`) alongside Svg.Skia. Target .NET 8/9.
3. **Fonts.** The drawing names Helvetica/Arial and carries text in the report's language, Korean included. The server image must have the fonts installed (a Latin sans and a Hangul font; the current PDF renderer embeds Pretendard for Korean), or labels draw as empty boxes. Test with a Korean report.
4. **Print resolution from the print size.** A figure prints at most 170 mm wide; 300 DPI is then about 2,000 px (`170 / 25.4 × 300`), not a fixed 1,200 px.
5. **Fallback: a notice, never a gap (built in Batch 463).** If drawing fails, the PDF prints a boxed notice in the map's place: "Map notice: the map could not be drawn as an image. What it shows:" (`surgicalReportPdf.figureNotDrawn`, in the report's language), followed by the map's content as text (`fallbackLines` on the figure: for Mohs, the stage lines, e.g. "Stage 1, 09:15, 3 blocks cut, residual tumour, 12 o'clock, peripheral, block A, …"; clock positions are written "12 o'clock", never "12:00", which reads as a time). Figures that are part of the report carry `notice: true`; an optional inserted figure with no image is still left out. Today's renderer does this already (`functions/main.py` `figure_notice`).
6. **Audit.** A notice printed instead of a map is recorded on the report version (which map, why) and logged with the request id; the server returns success (the report is still valid), not HTTP 500.
7. **Licence.** QuestPDF's free community licence has a revenue limit; under Option B, prefer a library without one (PdfSharp/MigraDoc, MIT). Option A's libraries are MIT/Apache-2.0.

Reference shape (C#; corrected from the draft: valid `try`, nullable return, logger injected, size from print width):

```csharp
public sealed class OrganMapRasterizer(ILogger<OrganMapRasterizer> log) : IOrganMapRasterizer
{
    /// <summary>The map as a PNG at print resolution, or null when it can't be drawn (the PDF then prints the notice).</summary>
    public byte[]? RenderPng(string svg, double printWidthMm = 170, int dpi = 300)
    {
        try
        {
            using var doc = new SKSvg();
            using var input = new MemoryStream(Encoding.UTF8.GetBytes(svg));
            var picture = doc.Load(input);
            if (picture is null || picture.CullRect.Width <= 0) return null;
            int widthPx = (int)Math.Round(printWidthMm / 25.4 * dpi);
            float scale = widthPx / picture.CullRect.Width;
            using var bitmap = new SKBitmap(widthPx, (int)Math.Ceiling(picture.CullRect.Height * scale));
            using var canvas = new SKCanvas(bitmap);
            canvas.Clear(SKColors.White);
            var matrix = SKMatrix.CreateScale(scale, scale);
            canvas.DrawPicture(picture, ref matrix);
            using var image = SKImage.FromBitmap(bitmap);
            using var png = image.Encode(SKEncodedImageFormat.Png, 100);
            return png.ToArray();
        }
        catch (Exception ex)
        {
            log.LogError(ex, "Organ map could not be drawn for the report PDF");
            return null;
        }
    }
}
```

## 6. Live updates

Two SignalR events on the existing hub (`LIVE_UPDATES_SIGNALR.md`), scoped to the case: `organMapFigureChanged { caseId, instanceId }` and, to configuration screens, `organMapConfigChanged { kind: 'scheme' | 'binding' }`. The map itself needs no event: it follows the synoptic answers, which already travel with the case. The panel's presence slot (who else has the case open) is reserved for PS-71 presence (Batch 469). *Batch 562 status:* still proposed and not built; no screen polls for them. If built, they could be data topics (`LIVE_UPDATES_SIGNALR.md` §14) keyed by the synoptic instance, never by case number. *Batch 572 (Pete, Oct 14, 2026): `organMapFigureChanged` is replaced by the general `caseReport` topic (`LIVE_UPDATES_SIGNALR.md` §14), keyed by the case's support reference and sent after every write to the case, figures included; the open report says "Someone else saved this case". `organMapConfigChanged` stays proposed. The presence slot is Batch 573.*

## 7. Later organs

Each organ adds a map type, its geometry, its resolver and its PathScribe questions behind the same contract: Breast (462, built), Mohs (463, built: §4 Mohs binding), Colorectal (464, built: §4 Colorectal bindings), Head & Neck (465, built: §4 Head and neck bindings), Renal (466, built: §4 Renal binding).

**Planned: Batch 470, structured inking (Pete, Oct 6).** Today inking is free text only (the grossing template's "Orientation / inking" answer and gross descriptions); no map uses ink colours and no check ties ink to a margin call. Pete's specification, to be built after 469:
- **COMP-INK-PROTOCOL**, a shared component bridging Grossing entry (SUB-GROSS-01) to the synoptic panels and organ maps (SUB-SYN-01).
- **FLD-GROSS-INK-001 (`Specimen_Ink_Mapping`):** recorded per specimen/block as surface → colour, e.g. `{ surface: "Deep / Parenchymal", color: "Black", code: "INK_BLK" }`. Colours come from an administrator-controlled list: Black, Blue, Green, Red, Yellow, Orange, Violet/Purple, Uninked.
- **Synoptic margin fields** show the surface's ink beside the label, e.g. "Deep parenchymal margin (black ink)". Organ map legends name each margin's ink.
- **VAL-SIGN-OUT-INK-001** blocks sign-out when a margin is called involved but no ink colour is recorded for that surface at grossing: "Margin called involved on {surface} but no ink color recorded at grossing". It will be a translated message.
- **TC-INK-470-001:** end-to-end test covering ink capture at grossing → synoptic label → map legend → sign-out check, with audit. The rule in §1 holds for all of them.

*(Since partly built, under a different model: Batches 480–484 (PS-359) added margins with append-only ink applications recorded on the grossing screen (`services/grossing/recordMarginInkApplication.ts`), an admin ink-colour palette (`services/inkColors/`), a severity engine, and grossing-complete and sign-out gates with an audited override (`services/grossing/evaluateInkingGate.ts`, `case:inking-gate:override`). Ink shown beside synoptic margin labels and in organ map legends was not found in the code — checked in the Batch 496 README audit.)*
