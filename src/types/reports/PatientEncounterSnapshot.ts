// src/types/reports/PatientEncounterSnapshot.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real fix, Phase 5 (Patient/Encounter Management Subsystem): a real,
// immutable snapshot of the resolved patient/encounter context at the
// moment a report version is created (sign-out or amendment release) -
// so a later merge, demographic correction, or discharge never
// silently changes what a signed, historical report legally attested
// to. This is DISTINCT from ReportVersionRecord.pdfBase64: the PDF
// freezes the RENDERED, visual content, but carries no real,
// structured, separately-queryable record of which real patientId/
// encounterId this version resolved to, or what their state was at
// that exact moment - this type is that record.
//
// Real, honest scope: captures identity and encounter STATE, not the
// full real crosswalk history (every known identifier) - the real,
// specific facts that could visibly disagree with a later view of the
// live record if unprotected (name, MRN, DOB, encounter status/
// location), not an exhaustive archival copy of every field that ever
// existed on either entity.
// ─────────────────────────────────────────────────────────────────────────────

export interface PatientEncounterSnapshot {
  /** The real, resolved patientId this version's report was signed
   *  against - NOT re-resolved later; a real reference to who this
   *  was AT THIS MOMENT, even if that same id later gets merged into
   *  a different canonical record. */
  patientId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  /** Genuinely absent for a version created before this field existed,
   *  or a case with no real, resolved encounter. */
  encounterId?: string;
  encounterNumber?: string;
  encounterClass?: string;
  encounterStatus?: string;
  facility?: string;
  ward?: string;
  room?: string;
  bed?: string;
  attendingProvider?: string;
  /** When this snapshot was actually captured - genuinely the same
   *  moment as the real ReportVersionRecord.createdAt it belongs to,
   *  recorded here too so the snapshot is self-contained and doesn't
   *  require joining back to its parent record to be understood. */
  capturedAt: string;
}
