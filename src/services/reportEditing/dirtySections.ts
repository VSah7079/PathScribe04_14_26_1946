// src/services/reportEditing/dirtySections.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 445: what the report page lists under "unsaved changes" when you try
// to leave. Each edit marks a section by id; the Unsaved Changes dialog shows
// it through `unsavedWarningModal.sections.<id>`. These used to be English
// labels ('Gross description', 'Blocks', …) shown as-is in every language.
// ─────────────────────────────────────────────────────────────────────────────

export const DIRTY_SECTION_IDS = [
  'billingCodeAdded', 'billingCodeCorrected', 'billingCodeRejected', 'billingCodeRemoved',
  'blockEdit', 'blockStatus', 'blocks', 'caseComment', 'codes', 'decantEdit', 'decants',
  'flags', 'grossDescription', 'matrixBlockEdit', 'mergeReview', 'priority', 'reportSequence', 'restoredDraft',
  'specimenComment', 'specimens', 'synopticFields', 'synopticReports', 'team',
  'triageChecklist', 'triageConfirmation', 'triageOverride',
] as const;

export type DirtySectionId = (typeof DIRTY_SECTION_IDS)[number];

/** The ids in a stable order for display (the order they were marked). */
export const dirtySectionList = (marked: Iterable<DirtySectionId>): DirtySectionId[] => Array.from(new Set(marked));
