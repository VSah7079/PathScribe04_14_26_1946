**Batch 738:** `templates/generic/colon_resection.json`: PathScribe-authored wording and conditional questions (see `templates/generic/README.md`).

# src/data/

Pure JSON data — 31 synoptic reporting protocol templates (breast,
prostate, kidney, lung, colon, head and neck, Mohs, Wilms, cytology,
grossing and autopsy templates), organized into `templates/generic/`
(22 files; both US CAP and UK RCPath protocols currently live here
despite the folder name), `templates/Cytology/` (5),
`templates/Grossing/` (3), and `templates/Autopsy/` (1).

No business logic — everything here is data (the only `.ts` file is
the test `templates/Autopsy/autopsy_gross_examination.test.ts`). All 31
files are loaded through direct JSON imports in
`services/templates/templateService.ts`; the five cytology templates
are also imported by `services/cytology/cytologySynopticTemplateRegistry.ts`.

*Corrected in the Batch 496 README audit (Oct 9, 2026): 31 templates in four folders (was 27 in three — the Autopsy folder and the Mohs, oral cavity and neck dissection templates were added later).*

## What was checked

Since this is pure clinical protocol content, a full manual review of
correctness (are these templates clinically accurate per current CAP/
RCPath standards) is outside this pass's scope — that's a clinical
question, not a code-quality one. What *is* in scope, and was checked:

- **Every file loads and is actually used.** Confirmed all 27 JSON
  files are genuinely imported by `templateService.ts` (initially
  looked like only 24 were, but that was just an artifact of a
  truncated `head` command while investigating — a full, uncapped
  count confirmed all 27). *(Now 31 files, all imported by
  `templateService.ts` — checked in the Batch 496 README audit.)*
- **All 27 files parse as valid JSON.** Zero syntax errors.
- **Zero duplicate template `id` fields** across all 27 files.
- **Zero duplicate field `id`s within any single template.** Worth
  noting how this was verified: an initial pass using a loose
  heuristic ("if it has an `id` and a `label`, count it") flagged 5
  templates with apparent duplicates like `'yes'`/`'no'`/`'other'`
  repeating multiple times. Checked the actual JSON structure before
  reporting anything — these turned out to be legitimately-scoped
  *option* IDs nested inside each field's own `options` array (e.g.
  two completely different fields can each have an option literally
  called `'other'`, and that's correct — each is only meant to be
  unique within its own field, not template-wide). Re-ran the check
  properly scoped to field-level IDs only, confirmed zero genuine
  duplicates. Flagging the correction here since the false positive is
  itself a useful reminder: a `grep`/heuristic hit isn't confirmation
  of a real bug — the `systemActions.ts` internalKey collisions found
  earlier in this review (item #36) were real precisely because they
  were checked against the actual runtime meaning of the field, not
  just flagged by a script and reported as-is.
- **Schema consistency.** 4 distinct top-level key-sets exist across
  the 27 files (some have `locale`, some have `standard`/
  `applicability`, some have neither) — this looks like legitimate
  feature variance (the 7 files with `locale` correspond to the UK
  RCPath protocols, matching the US/UK jurisdiction split established
  throughout this codebase) rather than accidental inconsistency, but
  wasn't verified field-by-field against how `templateService.ts`
  actually consumes each variant.

## Batch 461

`templates/generic/`: the prostate templates' "Anatomical map (PathScribe)" questions.

## Batch 463

New template `templates/generic/mohs_micrographic_surgery.json`.

## Batch 463b

PathScribe's Mohs template: stages question required.

## Batch 464

Colorectal map questions in the generic colorectal templates.

## Batch 465

`templates/generic/`: Oral Cavity Resection and Neck Dissection.

## Batch 465b

`templates/generic/neck_dissection.json`: count limit and calculated totals.

## Batch 466

`templates/generic/`: renal map questions; whole-number node counts.

## Batch 466b

`templates/generic/`: partial nephrectomy margins; node count limits.

## Batch 466d

`templates/generic/colorectal_local_excision.json`: the Margins section is now CAP's two blocks, calculated from the map and locked:
- "Invasive carcinoma margins"
- "Margin(s) involved by invasive carcinoma"
- "Adenoma (non-invasive) margins"

They replace three placeholder questions ("Field 1–3"). The adenoma map question is relabelled "Adenoma at the mucosal margin". The total stays at 40 questions.

## Batch 467 — In-house molecular orders

Lung Adeno's EGFR mutation status is bound to an in-house molecular result (`templates/generic/`).

## Batch 467b — Molecular orders: send-out results, plate, sign-out, instrument

More synoptic questions are filled from molecular results (`templates/generic/`).

## Batch 490 — all ~20 generic templates: real clinical option content + `reportingRole` tagging

Every template in `templates/generic/` had its placeholder dropdown options replaced with real clinical content and semantic staging tags completed — see `templates/generic/README.md`'s own Batch 490 entry for the full breakdown, including the Wilms-tumor staging exception and the disclosed minor gaps.

## Batch 519

`templates/generic/`: lymph node counts in seven templates accept a count, "cannot be determined" or "at least N" (PS-494). `templates/Cytology/`: the five cytology templates are on the shared template model (PS-273).
