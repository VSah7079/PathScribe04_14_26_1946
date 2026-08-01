// src/services/patients/IPatientIndexService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real Master Patient Index (MPI) — the missing piece found while tracing
// why "Patient History" couldn't reliably surface a patient's prior
// cases: Case.patient.id was generated as `OPAT-${caseId.slice(4)}`,
// derived from the CASE, not the PERSON. The same real-world patient with
// two different cases got two completely unrelated patient ids — there
// was no actual person-level identity anywhere in the data model, only
// whatever the MRN text field happened to match (and per the same
// investigation, MRN alone doesn't meet the Joint Commission's
// two-identifier minimum for patient-identification-critical actions).
//
// Deliberately MPI, not EMPI: scoped per organisationId, not global
// across every PathScribe customer. You would not want one lab
// organisation's patients cross-matched against a completely different,
// unrelated organisation's — that's not deduplication, that's a real
// privacy violation. A true EMPI (matching across institutions) is a
// substantially different, larger scope than what a single-lab MPI needs,
// and isn't what's being built here.
//
// Deliberately deterministic, not probabilistic: a real production-grade
// EMPI product (4medica and similar) does weighted, probabilistic
// candidate scoring across many demographic fields — a genuinely
// substantial engineering effort in its own right, not something to
// reproduce from scratch in the time available. What's built here is the
// real, correct FOUNDATION that a future probabilistic layer would sit
// on top of: an actual persistent per-organisation patient identity,
// checked on every accession, with anything not confidently resolvable
// deterministically routed to a human for review rather than silently
// auto-matched or silently duplicated. That routing-to-review behavior
// is the genuinely load-bearing safety property here, not the
// specific matching algorithm's sophistication.
// ─────────────────────────────────────────────────────────────────────────────

export interface PatientMatchCandidate {
  organisationId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  /** ISO date */
  dateOfBirth: string;
  /** The accession number of the case triggering this resolution, if
   *  any. Not PHI (AuditLog.caseId's own doc comment: "accession
   *  number — not a direct patient identifier") — threaded through so
   *  the real audit events below can carry a genuine caseId. That
   *  matters for more than completeness: AuditLogPage.tsx's role-based
   *  filter only shows a pathologist-role user events that either have
   *  a real caseId, or whose `user` field exactly matches their own
   *  stored name/email. Without this, every MPI audit event would be
   *  silently invisible to the exact people accessioning the cases that
   *  triggered them. */
  sourceAccession?: string;
}

export type PatientMatchResult =
  | { outcome: 'matched'; patientId: string }
  | { outcome: 'created'; patientId: string }
  /** A real safety outcome, not an error — surfaced when a confident,
   *  deterministic match can't be made either way (e.g. the MRN matches
   *  an existing record but the name/DOB don't, or vice versa). The
   *  caller must NOT silently pick a side, but accessioning also can't
   *  simply halt while a person reviews it — so a real, provisional
   *  MasterPatientRecord is still created and returned as patientId,
   *  explicitly marked needsReview, alongside the existing records that
   *  partially matched (candidatePatientIds) for that reviewer's
   *  context. A real admin resolves this later — either confirming the
   *  provisional record really is a new person, or merging it into one
   *  of the candidates — via listPendingReview below. */
  | { outcome: 'ambiguous'; patientId: string; candidatePatientIds: string[]; reason: string };

export interface MasterPatientRecord {
  /** The real, persistent identity — reused across every case for the
   *  same real-world person within this organisation, never derived
   *  from a case id. */
  id: string;
  organisationId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  createdAt: string;
  updatedAt: string;
  /** True only for a provisional record created from an 'ambiguous'
   *  match outcome — real accessioning couldn't wait on a human review,
   *  so this exists so the case has a valid patient id right away, but
   *  it's flagged for a real admin to resolve (confirm as genuinely new,
   *  or merge into one of reviewCandidateIds). */
  needsReview?: boolean;
  reviewReason?: string;
  reviewCandidateIds?: string[];
  /** The accession number that first triggered this record's creation,
   *  if any — carried through to every later audit event about this
   *  record, per PatientMatchCandidate.sourceAccession's own doc
   *  comment on why. */
  sourceAccession?: string;
  /** Set once a real admin merges this record into another — kept, not
   *  deleted, so "this id used to exist and where it went" remains a
   *  real, traceable fact rather than a silently vanished record. */
  mergedInto?: string;
  mergedAt?: string;
}

export interface IPatientIndexService {
  /** The real accession-time entry point. Looks for an existing person
   *  in this organisation matching the candidate; reuses their id if
   *  confidently found, creates a new persistent identity if confidently
   *  not found, and returns 'ambiguous' — never a silent guess — for
   *  anything in between. */
  resolveOrCreatePatient(candidate: PatientMatchCandidate): Promise<PatientMatchResult>;

  getById(patientId: string): Promise<MasterPatientRecord | null>;

  /** Every record flagged 'ambiguous' at some point, still awaiting a
   *  real person's review — the real work queue this whole safety
   *  property depends on actually being looked at, not just detected. */
  listPendingReview(organisationId: string): Promise<MasterPatientRecord[]>;

  /** A real admin confirms the provisional record genuinely is a
   *  different, new person from every candidate it was flagged against.
   *  Clears the review flag; the record becomes a normal, confirmed
   *  identity going forward. */
  confirmAsNewPatient(patientId: string): Promise<void>;

  /** A real admin confirms the provisional record is actually the SAME
   *  person as an existing one. Repoints every case currently pointing
   *  at the provisional id over to the confirmed id, then marks the
   *  provisional record as merged (kept, not deleted — a real audit
   *  trail of "this id used to exist and where it went" matters here,
   *  the same reasoning already applied to audit logs elsewhere in this
   *  app) rather than erasing it outright. */
  mergeIntoExistingPatient(provisionalPatientId: string, confirmedPatientId: string): Promise<{ casesRepointed: number }>;
}
