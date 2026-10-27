// src/types/case/HpvManualEntry.ts
// Batch 630. Where an hrHPV result came from, and the record kept when a person enters one by hand.
// A result from the molecular platform arrives through the interface engine ('INTERFACE'). A result entered by a
// person must name why (one of the manual sources) and is audited with who, when, and what was there before.

export const HPV_MANUAL_SOURCES = [
  'MANUAL_PAPER_REPORT',
  'MANUAL_DOWNTIME_OVERRIDE',
  'MANUAL_PHONE_VERIFICATION',
  'MANUAL_RETROSPECTIVE_ENTRY',
] as const;

export type HpvManualSource = (typeof HPV_MANUAL_SOURCES)[number];
export type HpvResultSource = 'INTERFACE' | HpvManualSource;

/** What a person entered, and what the specimen held just before. */
export interface HpvManualEntryRecord {
  result: 'Positive' | 'Negative';
  source: HpvManualSource;
  enteredById: string;
  enteredByName: string;
  /** ISO-8601 UTC. */
  enteredAt: string;
  /** The result the specimen held before this entry ('none' when it held none). */
  previousResult: string;
  /** Where that earlier result came from ('none' when there was none). */
  previousSource: HpvResultSource | 'none';
}

/** A manual entry that would replace an interface result. It takes effect only when a different authorised person approves it. */
export type HpvPendingOverride = HpvManualEntryRecord;

/** The second person's decision on a pending override. */
export interface HpvOverrideDecision {
  decidedById: string;
  decidedByName: string;
  decidedAt: string;
  decision: 'approved' | 'rejected';
}

// Added to the screening record here (not in Specimen.ts, which is over its size limit and must not grow).
declare module './Specimen' {
  interface CytologyScreeningRecord {
    /** Where the hrHPV result came from ('INTERFACE' for the molecular platform, or a manual source). Absent on results saved before this field. */
    hpvResultSource?: HpvResultSource;
    /** Every manual entry made on this specimen, oldest first, with the result it replaced. */
    hpvManualEntries?: HpvManualEntryRecord[];
    /** A manual entry waiting for a second, different person's approval because it would replace an interface result. */
    hpvPendingOverride?: HpvPendingOverride;
    /** The second person's decisions on pending overrides, oldest first. */
    hpvOverrideDecisions?: HpvOverrideDecision[];
  }
}
