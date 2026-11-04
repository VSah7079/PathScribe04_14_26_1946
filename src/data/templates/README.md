**Batch 755b (part 2):** `generic/breast_dcis_resection.json`, `lung_adeno.json`, `kidney_resection.json`, `lung_resection.json`, `skin_melanoma_bx.json`, `colorectal_local_excision.json`, `colorectal_further_investigations.json`, `prostate_resection.json` in PathScribe's own wording.

**Batch 755b (part 1):** `generic/breast_invasive.json`, `colorectal_resection_b.json` and `prostate_biopsy.json` in PathScribe's own wording.

**Batch 755a:** the 19 generic checklists have plain names ("Colon resection", "Radical prostatectomy") and carry a "Demo wording" tag on screen until a pathologist has reviewed their wording. `Autopsy/autopsy_gross_examination.json` is attached to the Video 4 autopsy cases.

**Batch 753:** `generic/prostate_needle_biopsy.json` and `generic/prostate_radical_prostatectomy.json`: PathScribe-authored wording, not CAP or RCPath text (see `generic/README.md`).

**Batch 738:** `generic/colon_resection.json` wording (see `generic/README.md`).

# data/templates/

31 synoptic reporting protocol templates, split into four subfolders by kind.

## Subfolders

- **`generic/`** (22 files) — the main organ-system protocols (breast, prostate, kidney, lung, colon, skin melanoma, Wilms) plus PathScribe-authored Mohs, oral cavity and neck dissection synoptics. Both US CAP and UK RCPath protocols currently live here despite the folder name.
- **`Cytology/`** (5 files) — cytology-specific protocols (FNA, urine, pancreaticobiliary).
- **`Grossing/`** (3 files) — grossing-specific templates (fluid cytology, histology-only, standard tissue).
- **`Autopsy/`** (1 file, plus its test) — `autopsy_gross_examination.json`, the autopsy gross examination template. No README of its own.

*Corrected in the Batch 496 README audit (Oct 9, 2026): 31 templates, `generic/` has 22, and the `Autopsy/` subfolder was missing from this list.*

## Batch 461

The PathScribe prostate templates gain the "Anatomical map (PathScribe)" questions that draw the anatomical map (see `generic/README.md`).

## Batch 463

`generic/mohs_micrographic_surgery.json`: PathScribe's Mohs synoptic.

## Batch 463b

`generic/mohs_micrographic_surgery.json`: the stages question is required.

## Batch 464

`generic/`: colorectal map questions in three templates.

## Batch 465

`generic/`: PathScribe's Oral Cavity Resection and Neck Dissection synoptics.

## Batch 465b

`generic/neck_dissection.json`: count limit and calculated totals.

## Batch 466

`generic/`: Kidney Resection renal map questions; whole-number node counts.

## Batch 466b

`generic/`: partial nephrectomy margins; "can't exceed" on node counts.

## Batch 466d

`generic/colorectal_local_excision.json`: the Margins section is CAP's invasive carcinoma and adenoma blocks, calculated from the map.

## Batch 467 — In-house molecular orders

`generic/lung_adeno.json`: EGFR mutation status bound to the in-house EGFR PCR result.

## Batch 467b — Molecular orders: send-out results, plate, sign-out, instrument

`generic/`: colorectal molecular questions and breast HER2 ISH bound to molecular results.

---
*See [data/README.md](../README.md) for the full verification notes (JSON validity, duplicate-ID checks, schema consistency) covering the templates (written when there were 27; there are 31 now).*

## Batch 519

`generic/`: free-text lymph node counts in seven templates (PS-494). `Cytology/`: on the shared template model and editable in the Synoptic Library (PS-273).
