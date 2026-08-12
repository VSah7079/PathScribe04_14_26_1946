// src/services/patients/patientHistoryQuery.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real fix, from a direct question about how case-searching actually
// worked: "Patient History" was never actually querying real cases by
// this patient's real, persistent MPI identity - it read from
// MOCK_PRIOR_PATHOLOGY, a hardcoded object keyed by raw MRN text,
// completely disconnected from services/patients/'s real MPI. The
// identity this patient's real cases are actually tagged with
// (Case.patient.id) was sitting right there, unused, for this exact
// purpose.
//
// Also the real point of the Link feature: a "possible link" a human
// has confirmed means two records are the same real person - a real
// history query has to pull cases from every linked identity, not just
// the one id currently on screen, or a confirmed link would have no
// real, visible effect at all.
// ─────────────────────────────────────────────────────────────────────────────

import type { PatientHistoryCase } from '../cases/mockCaseService';

export interface CaseForPatientHistory {
  id: string;
  patient?: { id?: string };
  order?: { receivedDate?: string };
  diagnostic?: {
    primaryDiagnosis?: string;
    issuedDate?: string;
    finalizedBy?: string;
    grossDescription?: string;
    microscopicDescription?: string;
    synoptic?: {
      margins?: string;
      biomarkers?: { er?: string; pr?: string; her2?: string; ki67?: string };
    };
  };
  specimens?: { description?: string }[];
}

/** Real fix: maps a real Case to the real PatientHistoryCase display
 *  shape, using only fields that genuinely exist on Case - never
 *  fabricated. Fields with no honest, reliable source (comment, tags,
 *  nodes) are left as real, honest empty defaults rather than invented
 *  placeholder text. */
export function toPatientHistoryCase(c: CaseForPatientHistory): PatientHistoryCase {
  const biomarkers = c.diagnostic?.synoptic?.biomarkers;
  const receptorParts = [
    biomarkers?.er ? `ER ${biomarkers.er}` : null,
    biomarkers?.pr ? `PR ${biomarkers.pr}` : null,
    biomarkers?.her2 ? `HER2 ${biomarkers.her2}` : null,
  ].filter((s): s is string => s !== null);

  return {
    id: c.id,
    date: c.diagnostic?.issuedDate ?? c.order?.receivedDate ?? '',
    diagnosis: c.diagnostic?.primaryDiagnosis ?? '',
    site: c.specimens?.[0]?.description ?? '',
    procedure: c.specimens?.[0]?.description ?? '',
    physician: c.diagnostic?.finalizedBy ?? '',
    receptors: receptorParts.join(', '),
    ki67: biomarkers?.ki67 ?? '',
    margins: c.diagnostic?.synoptic?.margins ?? '',
    nodes: '', // honest gap: no real, reliable per-case field for this exists yet
    gross: c.diagnostic?.grossDescription ?? '',
    microscopic: c.diagnostic?.microscopicDescription ?? '',
    comment: '', // honest gap: no real, reliable per-case field for this exists yet
    tags: [],
  };
}

/** Real fix: the actual query "Patient History" should have always
 *  been - real cases genuinely belonging to this real patient identity
 *  OR any identity a human has confirmed is the same real person via
 *  linkPatientIds (see mockPatientIndexService.ts's linkPatients /
 *  getLinkedPatientIds). Excludes the case currently being viewed
 *  (excludeCaseId) - "this patient's history" means their OTHER real
 *  cases, not itself. Sorted most-recent-first, matching what a
 *  clinician reviewing history actually wants to see. */
export function queryRealPatientHistory(
  allCases: CaseForPatientHistory[],
  linkedPatientIds: string[],
  excludeCaseId?: string
): PatientHistoryCase[] {
  const idSet = new Set(linkedPatientIds);
  return allCases
    .filter(c => c.id !== excludeCaseId && c.patient?.id && idSet.has(c.patient.id))
    .map(toPatientHistoryCase)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}
