// src/types/intraop/IntraoperativeEntry.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real data model for the mobile Intraop Pre-Check capture flow's desktop
// side — the "Unlinked Intraoperative Entries" queue. An entry is created
// at the bench (mobile capture, not built in this pass — see the
// conversation that shaped this), lives here unmerged until a formal LIS
// accession arrives, then gets merged into the real case.
//
// Milestones are workflow tracking, not a hard gate — logged in real
// sequence with real timestamps, including explicit skip reasons when a
// step is deliberately bypassed (e.g. "Direct to Frozen" on dense,
// fibrotic tissue that won't yield a usable touch prep). The desktop
// merge screen is where that sequence becomes visible to someone with
// full case context, not a blocking check at capture time — a stressed
// resident at a messy bench should never be locked out of logging the
// next real step.
// ─────────────────────────────────────────────────────────────────────────────

export type MilestoneType =
  | 'gross_logged'
  | 'touch_prep_performed'
  | 'touch_prep_skipped'
  | 'frozen_section_cut';

export type SkipReason = 'fibrotic_scant' | 'direct_to_frozen' | 'other';

export interface MilestoneEntry {
  id: string;
  milestone: MilestoneType;
  timestamp: string;
  /** Only present on touch_prep_skipped — the "active override" the
   *  clinical case for this design specifically called for: a
   *  conscious 1-tap decision, not a silent skip. */
  skipReason?: SkipReason;
  skipReasonNote?: string; // free text for the 'other' case
}

export interface PatientMatchInfo {
  /** How the patient was identified at the bench — a scanned barcode is
   *  deterministic; an ADT match is a real hospital feed lookup. Both
   *  are meaningfully more reliable than voice-captured MRN, which this
   *  model deliberately doesn't support as a primary identification path. */
  source: 'barcode' | 'adt_match';
  /** Left loosely typed — a real barcode payload or ADT response shape
   *  isn't settled yet; this is what's actually known: name + MRN once
   *  decoded/matched. */
  patientName: string;
  mrn: string;
  confirmedAt: string;
}

export interface IntraoperativeEntry {
  id: string;
  patientMatch: PatientMatchInfo;
  orNumber: string;
  surgeon: string;
  /** e.g. "Specimen A: Left breast, margins" */
  specimenLabel: string;
  arrivalTimestamp: string; // TAT baseline, per the original spec
  milestones: MilestoneEntry[];
  preliminaryCytologyDictation?: string;
  /** Phase 1 of a real two-phase gross description model — rapid,
   *  high-velocity capture at the bench: dimensions/weight, which
   *  blocks were frozen and from where, orientation/sutures applied by
   *  the surgeon. Not the formal, standard-compliant gross description
   *  — that's Phase 2, finalized later at the desktop after merge, in
   *  the case's own real Gross Description field (cassette mapping,
   *  fixative times, remaining sections for permanent). This field is
   *  the seed the merge pipeline hands to that later step, not the
   *  final text itself. Required before any other milestone can be
   *  logged — see the hard gate in mockIntraoperativeService's
   *  addMilestone — because it's what justifies, clinically, why
   *  specific tissue got frozen in the first place. */
  quickGrossDictation?: string;
  /** The actual diagnostic conclusion reached at frozen section — e.g.
   *  "Invasive carcinoma, margins negative" or "Deferred to permanent."
   *  Deliberately separate from quickGrossDictation (a physical,
   *  descriptive observation, not a diagnosis) and from
   *  verbalReportLog's free-text note (what was said to the surgeon, which may echo this but isn't
   *  structured enough to reliably compare against anything later).
   *  This is the field the Frozen-to-Permanent Reconciliation Gate
   *  actually needs — a clean, dedicated diagnosis to check against the
   *  final permanent diagnosis, not something extracted from mixed-
   *  purpose text. */
  frozenSectionDiagnosis?: string;
  verbalReportLog?: { timestamp: string; note: string };
  status: 'pending' | 'merged';
  /** Set once merged — which real case this entry's data was folded into. */
  mergedIntoCaseId?: string;
  mergedAt?: string;
  createdAt: string;
}

/** A candidate real case the queue's matcher thinks this entry might
 *  belong to, with the specific reason so the clerk/pathologist doing
 *  the merge can see *why* it was suggested, not just that it was. */
export interface MatchCandidate {
  caseId: string;
  matchType: 'mrn_exact' | 'fuzzy';
  /** e.g. "MRN exact match" or "Last name + surgeon + arrived within 40 min" */
  matchReason: string;
  confidence: 'high' | 'medium';
}

/** The inverse direction of MatchCandidate — given a case that was just
 *  formally accessioned, a pending intraop entry that might belong to
 *  it, with the full entry attached (not just an ID) since the caller
 *  — AccessionPage's post-submit merge prompt — needs the entry's real
 *  content to show, not just a reference to look up separately. */
export interface EntryMatch {
  entry: IntraoperativeEntry;
  matchType: 'mrn_exact' | 'fuzzy';
  matchReason: string;
  confidence: 'high' | 'medium';
}
