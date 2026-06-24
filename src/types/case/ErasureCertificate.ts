// src/types/case/ErasureCertificate.ts
// ─────────────────────────────────────────────────────────────
// Proof that a GDPR Article 17 ("right to erasure") request was
// executed — WITHOUT itself becoming a record of which case or
// patient was erased. caseId/patientId are stored only as one-way
// hashes, specifically so this certificate can't be used to
// reverse-engineer what was deleted, while still proving to a
// regulator that the request existed, was authorized, and was
// carried out.
//
// This is a distinct, heavily-gated permission — NOT part of
// normal case access. The expected flow is: customer (Data
// Controller) submits a written erasure request → a ForMedrix
// staff member with the dedicated erasure permission reviews it,
// confirms no retention hold applies, and executes it → this
// certificate is the durable record that the request was handled
// correctly, retained by ForMedrix independently of the (now
// erased) case data.
//
// NOTE: This encodes the technical pattern only. Whether a given
// erasure request must legally be honored, delayed, or refused —
// and the exact retention periods that create a valid Art. 17(3)
// exception — is a legal/compliance determination, not an
// engineering one. Get counsel sign-off on the retention-hold
// rules before this is wired to a real delete.
// ─────────────────────────────────────────────────────────────

export interface ErasureCertificate {
  id: string;

  // ── Deliberately NOT reversible to the real case/patient ───
  /** One-way hash (not the real ID) — proves *an* erasure happened without recording *which* one */
  caseIdHash:    string;
  patientIdHash: string;

  // ── The request ──────────────────────────────────────────
  requestedByCustomerContact: string;
  /** e.g. a ticket or letter reference, for traceability back to the customer's own paper trail */
  requestReference?: string;
  requestReceivedAt:  string;
  legalBasis:         string;  // e.g. "GDPR Art. 17 — Right to Erasure"

  // ── The retention-hold gate ──────────────────────────────
  // Must be checked and confirmed clear before execution — Art.
  // 17(3) permits refusing/delaying erasure where a legal
  // retention obligation still applies. This is a real gate, not
  // a formality.
  retentionHoldCheckedAt: string;
  retentionHoldClear:     boolean;
  retentionHoldNote?:      string; // explanation if not clear (e.g. delayed pending hold expiry)

  // ── Authorization & execution ────────────────────────────
  authorizedByStaffId:   string;
  authorizedByStaffName: string;
  executedAt:            string;
  /** What was actually erased — case record, ReportSnapshots, synoptic data, etc. */
  scopeDescription:      string;
}
