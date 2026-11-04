// src/types/case/Margin.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 480 — Structured Inking, Module 1 (PS-359 follow-up; Pete's own
// requirement: "Margin and Ink Application Data Model"). Models a surgical/
// pathology margin as a real entity distinct from the physical tissue block
// it's examined on, with its own append-only history of ink applications —
// never a flat text summary (the pre-existing
// `Case.diagnostic.margins?: string` is a free-text report-level summary
// field, genuinely unrelated; this is the real, structured, per-margin
// record behind it).
//
// Hierarchical association, per Pete's spec: Case → Specimen → Tissue Block
// → Margin, "at the Tissue Block level (or parent Specimen level, depending
// on grossing protocol)." Rather than guess which one a given protocol uses,
// `margins?: Margin[]` is added to BOTH `HistologyBlock` and `Specimen`
// (Specimen.ts) — a protocol that inks before blocking records margins on
// the specimen directly; one that inks per-cassette records them on the
// block. Never both for the same margin. Matrix blocks (MatrixBlock.ts)
// don't get this field this batch — a shared cassette's margins, if a real
// protocol ever needs them, is a further extension, not attempted.
//
// Scope, this batch (Pete's own choice, via AskUserQuestion): the data model,
// the append-only recording service (services/grossing/recordMarginInkApplication.ts),
// the severity-engine resolution logic (services/grossing/resolveInkingValidationSeverity.ts),
// and the minimal site-settings record for inking_validation_mode
// (services/siteSettings/). No grossing-screen UI and no ink-color admin
// palette yet — both deferred to their own later batch(es), same staged
// pattern the autopsy module's own gates/UI followed (Modules 1-6).
// ─────────────────────────────────────────────────────────────────────────────

/** Whether a margin has actually been examined yet. Real, honest default is
 *  'pending' — a margin isn't "examined" just because it exists as a record. */
export type MarginExaminationStatus = 'pending' | 'examined';

/**
 * One real application of ink to a margin — never overwritten, never
 * removed; a margin re-inked with a second color gets a second entry, so
 * the full history (what was applied, when, by whom) is always on record.
 * Per Pete's own acceptance criteria: adding a secondary color must never
 * change the margin's own identity or erase what came before it.
 */
export interface MarginInkApplication {
  id: string;
  /** Hex (`#00AEEF`) or a standardized palette reference — this batch
   *  stores whatever string the caller supplies; validating it against a
   *  real, site-managed palette is the ink-color admin list, a later
   *  batch's own scope (see services/grossing/README.md). */
  colorCode: string;
  colorName: string;
  appliedAt: string;
  /** Who physically applied it — same "name, not a separate id" convention
   *  as every other append-only clinical log in this app (e.g.
   *  AutopsyOrganTag.recordedByName). */
  appliedByName: string;
}

/**
 * A real anatomical margin, distinct from the tissue block/specimen it's
 * examined on. `orientation`/`laterality` are free text, like
 * `HistologyBlock.tissueDescription` and `SpecimenCollection.laterality`
 * elsewhere in this file's own sibling types — real-world margin naming
 * genuinely varies by specialty and protocol too much for a closed enum.
 */
export interface Margin {
  id: string;
  /** e.g. "Lateral", "Deep", "Proximal" — free text; see above. */
  name: string;
  orientation?: string;
  laterality?: string;
  examinationStatus: MarginExaminationStatus;
  /** Oldest first — the margin's own real, append-only ink history. Never
   *  empty-vs-undefined ambiguity: always a real array, even when empty. */
  inkApplications: MarginInkApplication[];
}
