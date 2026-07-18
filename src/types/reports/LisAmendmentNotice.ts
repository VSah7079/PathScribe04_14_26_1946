// src/types/reports/LisAmendmentNotice.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, tracked record of an external correction made directly in the
// LIS — the "Disconnected Modification" risk named earlier: a
// pathologist amends in the LIS without going through PathScribe,
// leaving PathScribe's structured synoptic data stale.
//
// Deliberately narrow in scope: this notice and the urgent message it
// triggers are the ENTIRE automated response. Nothing here ever
// touches synopticReports or invokes AI re-evaluation on its own — the
// pathologist reviews the notice, decides for themselves whether the
// synoptic data needs correcting, and if so, manually starts that
// amendment (which is what actually unlocks the record). AI only
// re-evaluates a case if the pathologist explicitly requests it after
// that point — never as a side effect of an external notice arriving.
// ─────────────────────────────────────────────────────────────────────────────

export type LisAmendmentNoticeStatus =
  | 'pending_review'    // notice received, pathologist hasn't acted yet
  | 'acknowledged'      // pathologist reviewed, decided synoptic data doesn't need changes
  | 'synoptic_amended'  // pathologist reviewed and went on to amend the synoptic report
  | 'dismissed';

export interface LisAmendmentNotice {
  id: string;
  caseId: string;
  /** The pathologist who originally finalized this case — the notice
   *  and urgent message both go to them specifically, not a general
   *  queue, since they're the one who needs to judge whether their own
   *  prior synoptic answers still hold. */
  notifiedPathologistId: string;
  notifiedPathologistName: string;
  /** Free text describing what the LIS reported changed — in a real
   *  integration this would come from the inbound HL7/FHIR message
   *  itself (e.g. an NTE segment or DiagnosticReport note). */
  lisAmendmentSummary: string;
  receivedAt: string;
  status: LisAmendmentNoticeStatus;
  resolvedAt?: string;
}
