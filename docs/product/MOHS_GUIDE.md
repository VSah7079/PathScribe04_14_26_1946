# Mohs Micrographic Surgery: user and administrator guide (Batch 463, updated 463b)

PathScribe has its own **Mohs Micrographic Surgery** synoptic. A lab copies and changes it like any other synoptic. Its centre is the **Mohs stages** question: each stage's margin drawn as 12 clock sectors around the deep margin, with a checklist beside it. The stage maps are always part of the report.

## For the pathologist or Mohs surgeon

**Recording a stage**
1. Open the case and its Mohs synoptic. Answer the case questions: site, tumour type, pre-operative size, stain.
2. Under **Mohs stages**, press **Add stage 1** when the first layer reaches the lab. The stage is stamped with the time; change it if needed, and enter the blocks cut.
3. Mark where tumour is at the margin, on the map or in the checklist. Both do the same thing:
   - **Map:** click a sector (or the deep centre). Click it again to clear it.
   - **Checklist:** tick "Tumour at margin" on the sector's row. Every sector has a labelled checkbox, so this works with the keyboard and screen readers.
4. Each positive sector gets the **tumour type** as its histology (when the tumour type is "Other", the text typed for it); change it when one stage holds two. Its **block** starts as **Unassigned**: choose it on the row from the stage's blocks (A up to **Blocks cut**; A–Z until Blocks cut is entered), matching the cassette label. One block may cover several sectors. Until every positive sector has a block within the blocks cut, the stage shows a warning, the question counts as incomplete and **sign-out is stopped** (Assist and Orchestration, and a resident's release for countersign). A Blocks cut of 0 counts as not entered. Tick **Perineural invasion** where present; the map outlines it.
5. **Mark stage clear** removes every positive sector of that stage. A stage with nothing positive is clear.
6. Press **Add stage 2** for the next layer, and so on (up to 8). **Remove stage n** removes the last stage and everything recorded for it.
7. Finish with the final defect size, closure and billing reference.

**Voice** (with voice on, in your voice profile's language):

| Language | Examples |
|---|---|
| English | "Stage 1, positive at 12 o'clock, block A" · "Stage 1, positive at noon" · "Stage 1, deep positive" · "Stage 2 clear" |
| French | "Stade 1 positif à 12 heures, bloc A" · "Stade 1 positif à midi" · "Stade 2 sain" |
| German | "Stufe 1 positiv bei 12 Uhr, Block A" · "Stufe 1 positiv mittags" · "Stufe 2 tumorfrei" |
| Dutch | "Stadium 1 positief op 12 uur, blok A" · "Stadium 2 vrij" |
| Korean | "1단계 12시 양성 블록 A" · "일단계 세 시 양성" · "2단계 깨끗" |

A command works like a click, with the histology; say the block ("block A", "bloc A", "Block A", "blok A", "블록 A") to assign it at the same time, or to assign the block of a sector already positive. "Noon"/"midnight", "midi"/"minuit" and "Mittag"/"Mitternacht" mean 12 o'clock (never the deep margin). A stage must be added before it can be spoken to; otherwise the voice bar says so and nothing changes. To be safe, a command is ignored when it could mean two things: two clock positions ("from 12 to 3 o'clock", "at 1 and 2 o'clock"; say each sector separately), a clock position and "deep" together, or "negative" without a sector. Only the clear word ("clear", "sain", "frei"/"tumorfrei", "vrij"/"tumorvrij", "깨끗") clears a whole stage. Korean: hours and stages may be digits (3시, 1단계) or words (세 시, 열두 시 or 열 두 시, 일단계, 십이시; Sino-Korean numbers written together, since "이 단계" means "this stage"); say the deep margin as 심부 or 기저 절제연.

**In the report**
- The **Map** button shows every stage together. The panel says the map is part of the report automatically (once a stage is recorded): there is no Insert button, and it is never out of date.
- Preview, print and sign-out draw the stage maps from the answers at that moment, after the report body, in the report's language. Each stage is captioned with its time and result. The signed version keeps the maps as signed.
- The report text lists each stage: time, blocks cut, clear or residual tumour, and each positive sector with its block, histology and perineural invasion, in the report's language.
- If your browser can't turn the map into an image, the PDF prints a boxed notice in its place, with each stage written out (time, blocks, sectors and blocks). The signed version still keeps the drawing. This is rare; in production the server draws the map.

## For the administrator

- **Your own Mohs template:** copy PathScribe's in Configuration → Protocols and change the questions (add a stain, rename closures, drop the billing reference). Keep one **Mohs stages** question (field type "Mohs stage map"; it can't be added from scratch, so copy PathScribe's template); PathScribe's marks it required. On that question, **Default histology from** chooses which choice question fills a new positive sector's histology (PathScribe's: Tumour type), or None. If that question is deleted or changed to a non-choice type, the editor shows a warning and the template can't be submitted, resubmitted or published until it is fixed (from the editor or the template list).
- **Binding:** Configuration → System → Organ maps → Map bindings. PathScribe's template binds itself. A copy binds its first Mohs stages question; pick another there if your copy has more than one.
- **Colours:** Configuration → System → Organ maps → Colours & patterns. "Residual tumour" and "Perineural invasion" can be set per enterprise, jurisdiction or facility like the other map colours. The preview includes a Mohs map.
- **Permissions:** the Mohs question is part of the synoptic, so whoever can edit the synoptic can record stages. Colours and bindings need `config:organ-map-scheme:manage` and `config:organ-map-bindings:manage`. No new permission was added.

## What it sends

- **Result payload:** an observation per stage (clear / residual tumour) and per positive sector (histology, perineural invasion, block). See `docs/architecture/SYNOPTIC_RESULT_API.md`.
- **Server contract:** `docs/architecture/ORGAN_MAPPING_API.md` §4 (Mohs binding) and §5 (maps that are always in the report).

Korean (and other machine-translated) clinical wording should be reviewed by a native speaker before clinical use.
