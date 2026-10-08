# data/templates/

27 CAP/RCPath-style synoptic reporting protocol templates, split into three subfolders by kind.

## Subfolders

- **`generic/`** (18 files) — the main organ-system protocols (breast, prostate, kidney, lung, colon). Both US CAP and UK RCPath protocols currently live here despite the folder name.
- **`Cytology/`** (5 files) — cytology-specific protocols (FNA, urine).
- **`Grossing/`** (3 files) — grossing-specific templates (fluid cytology, histology-only, standard tissue).

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
*See [data/README.md](../README.md) for the full verification notes (JSON validity, duplicate-ID checks, schema consistency) covering all 27 files.*
