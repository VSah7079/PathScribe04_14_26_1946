# data/templates/generic/

The main organ-system CAP/RCPath synoptic protocol templates. Both US CAP and UK RCPath protocols currently live here despite the folder name — the 7 files carrying a `locale` key are the UK RCPath protocols (see `data/README.md`'s own schema-consistency notes).

## Files

- `breast_dcis_resection.json`, `breast_invasive.json`, `breast_surgical_excision.json`
- `colon_resection.json`, `colorectal_further_investigations.json`, `colorectal_local_excision.json`, `colorectal_resection_b.json`
- `kidney_biopsy.json`, `kidney_resection.json`
- `lung_adeno.json`, `lung_resection.json`
- `prostate_biopsy.json`, `prostate_needle_biopsy.json`, `prostate_radical_prostatectomy.json`, `prostate_resection.json`, `prostate_turp_enucleation.json`
- `skin_melanoma_bx.json`
- `wilms_biopsy.json`, `wilms_resection.json`

## Batch 461: Anatomical map (PathScribe)

`prostate_radical_prostatectomy.json`, `prostate_resection.json`, `prostate_needle_biopsy.json` and `prostate_biopsy.json` gain a section **Anatomical map (PathScribe)** with PathScribe-authored questions and real values (not CAP wording):
- prostatectomy and resection: sectors with tumour, with extraprostatic extension and at a positive margin (checkboxes over the 41 PI-RADS v2.1 sectors, `psmap_sector_<id>`), Grade Group (`psmap_gg_1..5`), seminal vesicle invasion (`psmap_sv_*`);
- needle biopsy: **Core results**, a results grid (`partGrid`) with a row per part: site (`psmap_site_<id>`), carcinoma, Gleason primary and secondary, Grade Group, % involvement, length.

These questions draw the anatomical map: **the map's data comes from these synoptic answers**. Copies keep the ids, so a lab's copy draws the map too; a lab's own template binds its questions in Configuration → Organ maps.

## Batch 462: Anatomical map (PathScribe), breast

`breast_invasive.json`, `breast_dcis_resection.json` and `breast_surgical_excision.json` gain a section **Anatomical map (PathScribe)**: the specimen side (`psmap_side_right|left`); **Tumour foci** (`psmap_breast_foci`, six numbered rows: type `psmap_ftype_invasive|dcis|calcifications`, clock `psmap_clock_1..12|central`, distance from nipple cm, size mm); **Margin distances** (`psmap_breast_margins`, a row per oriented margin: invasive and DCIS distance in mm, 0 = on ink). **The breast map's data comes from these synoptic answers.**

## Batch 463

`mohs_micrographic_surgery.json` (new): PathScribe's Mohs Micrographic Surgery synoptic (source PathScribe; labs copy and change it). Case: site, tumour type, pre-operative size, stain. **Mohs stages** (`psmap_mohs_stages`, `spatialStageCanvas`, default histology from the tumour type). Final: defect size, closure, billing reference. Comments.

## Batch 463b

`mohs_micrographic_surgery.json`: the Mohs stages question is required.

## Batch 464

"Anatomical map (PathScribe)" sections: **Colorectal Local Excision** — Paris classification, invasive carcinoma, depth (Haggitt / Kikuchi), deep and lateral margin distances (mm), adenoma at the lateral margin (`psmap_crp_*`); **Colorectal Resection B** and **Colon Resection** — tumour position (quadrants), CRM closest distance and where, plane of mesorectal excision, relation to the peritoneal reflection, distal margin distance (`psmap_rec_*`).

## Batch 465

PathScribe's head and neck synoptics (source PathScribe, category `HEAD_NECK`): **`oral_cavity_resection.json`** — procedure, laterality, tumour subsites (`psmap_oc_subsites`, checkboxes), size, type, grade, depth of invasion (`psmap_oc_doiMm`), PNI, LVI, worst pattern of invasion, peripheral and deep margin distances (`psmap_oc_peripheralMarginMm`, `psmap_oc_deepMarginMm`), dysplasia at the mucosal margin, bone margin, pT, comments; **`neck_dissection.json`** — side, type, structures, the levels grid `psmap_nd_levels` (20 fixed rows `R_Ia`…`L_VII`; nodes positive, examined, largest deposit mm, ENE `psmap_nd_ene_absent/minor/major`), totals, pN, comments.

## Batch 465b

`neck_dissection.json`: nodes positive can't exceed nodes examined (`notMoreThan`). Total nodes positive and examined are calculated from the levels grid (`sumOf`).

## Batch 466

- **`kidney_resection.json`:** a new "Anatomical map (PathScribe)" section (`psmap_ren_*`) with procedure, kidney, pole(s), lateral/medial, aspect, extent (AJCC 8th compartments), renal vein and ureteral margin status, and the soft tissue and parenchymal margin distances. The lymph node counts are whole numbers.
- **`neck_dissection.json`:** the level counts and totals are whole numbers.

## Batch 466b

- **`kidney_resection.json`:**
  - Renal vein and ureter margin questions are hidden for a partial nephrectomy, unless added under "Add non-standard margin" (new question).
  - The parenchymal question is hidden for a radical nephrectomy.
  - Lymph nodes positive can't exceed lymph nodes examined.
- **Lung, Prostate and Wilms Resection, and Neck Dissection (totals):** positive can't exceed examined.

## Batch 466d

`colorectal_local_excision.json`: the Margins section is now CAP's two blocks. All three questions are calculated from the anatomical map and locked, and bind themselves through the `psmap_crp_derived_*` ids:
- "Invasive carcinoma margins", shown unless invasive carcinoma is "Not identified";
- "Margin(s) involved by invasive carcinoma";
- "Adenoma (non-invasive) margins".

The placeholder questions `peripheral_margin_involvement`, `deep_margin_involvement` and `distance_to_deep_margin_mm` are removed; the distances are the map's own questions.

## Batch 467 — In-house molecular orders

`lung_adeno.json`: "EGFR Mutation Status" is filled from the EGFR mutation PCR result (positive → Detected, negative → Not Detected).

## Batch 467b — Molecular orders: send-out results, plate, sign-out, instrument

- **`colorectal_further_investigations.json`.** The molecular questions get PathScribe-authored labels and values; the option ids are kept, so the seeded answers keep their meaning.
  - BRAF V600E, KRAS and NRAS: Mutation detected / not detected / Test failed / Not tested.
  - MSI: MSI-H / MSI-L / MSS / Test failed / Not tested.
  - Each is bound to its test (`molecularResult`). MSI positive means MSI-H and negative means MSS; MSI-L is entered by hand.
- **`breast_invasive.json`.** HER2 ISH Status is bound to HER2 FISH (positive = amplified).

---
*See [data/README.md](../../README.md) for the full verification notes covering all 27 templates across `data/templates/`.*
