# src/data/

Pure JSON data — 27 CAP/RCPath-style synoptic reporting protocol
templates (breast, prostate, kidney, lung, colon, cytology, and
grossing templates), organized into `templates/generic/` (both US CAP
and UK RCPath protocols currently live here despite the folder name),
`templates/Cytology/`, and `templates/Grossing/`.

No `.ts` files, no business logic — everything here is data, loaded
entirely through direct JSON imports in
`services/templates/templateService.ts`.

## What was checked

Since this is pure clinical protocol content, a full manual review of
correctness (are these templates clinically accurate per current CAP/
RCPath standards) is outside this pass's scope — that's a clinical
question, not a code-quality one. What *is* in scope, and was checked:

- **Every file loads and is actually used.** Confirmed all 27 JSON
  files are genuinely imported by `templateService.ts` (initially
  looked like only 24 were, but that was just an artifact of a
  truncated `head` command while investigating — a full, uncapped
  count confirmed all 27).
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
