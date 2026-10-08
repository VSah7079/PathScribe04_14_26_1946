

# services/reportEditing

## Batch 445

`dirtySections.ts`: the sections the report page lists under "unsaved changes" when you try to leave.
- They're ids (`grossDescription`, `blocks`, `team`, …), not English labels.
- The Unsaved Changes dialog shows them through `unsavedWarningModal.sections.<id>`.
- `dirtySections.test.ts` checks every id has its label in all five languages.

## Batch 450 — test evidence for Priority 1 and 2 tickets (PS-317)

`orchestratorSections.ts`: Regen All regenerates sections one at a time (`regenerateSectionsSequentially`), and the per-specimen section labels ("Gross Description — Specimen A: …") are built in `buildManualEntrySections`. **Open:** the " — Specimen " joiner and two engine messages are still hard-coded English.

## Batch 458 — PS-71 (review before saving over someone else's save)

New unsaved-changes section `mergeReview`: changes shown on top of someone else's update, not yet saved.
