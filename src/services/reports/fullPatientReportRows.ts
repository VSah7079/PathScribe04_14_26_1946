/**
 * fullPatientReportRows.ts — which rows the Synoptic tab's read-only
 * "Full Patient Report" panel (LeftReportPanel.tsx) shows, in what order,
 * and where each row's text comes from. Moved out of the component
 * (PS-318, Batch 450); behaviour unchanged.
 *
 * Order: Clinical History, Intraoperative Diagnosis, Gross Description,
 * Microscopic Findings, Preliminary Diagnosis, Ancillary Studies.
 * A row whose source is missing has text null; the panel shows its
 * translated "(not recorded)" placeholder for it.
 */
import type { CaseIntraoperativeFinding } from '@/types/intraop/CaseIntraoperativeFinding';
import type { Case } from '@/types/case/Case';
import type { IntraoperativeEntry } from '@/types/intraop/IntraoperativeEntry';

export type FullPatientReportRowId =
  | 'clinicalHistory'
  | 'intraopDiagnosis'
  | 'grossDescription'
  | 'microscopicFindings'
  | 'preliminaryDiagnosis'
  | 'ancillaryStudies';

export interface FullPatientReportRow {
  id: FullPatientReportRowId;
  /** null when nothing is recorded for this row. */
  text: string | null;
}

/**
 * The intraoperative (frozen section) diagnosis lives on the
 * IntraoperativeEntry the case was merged from, not on Case.diagnostic.
 * One line per frozen specimen that has a diagnosis; null when none.
 */
export function resolveIntraopDiagnosisText(
  entries: Pick<IntraoperativeEntry, 'status' | 'mergedIntoCaseId' | 'specimens'>[],
  caseId: string,
  /** Batch 655: the findings copied onto the case at merge (Case.intraoperativeFindings): the permanent copy, used when the session itself is not available. */
  carried?: readonly Pick<CaseIntraoperativeFinding, 'specimenLabel' | 'frozenSectionDiagnosis'>[] | null,
): string | null {
  const mergedSession = entries.find(e => e.status === 'merged' && e.mergedIntoCaseId === caseId);
  const withDx = (mergedSession?.specimens ?? []).filter(s => s.frozenSectionDiagnosis);
  if (withDx.length > 0) return withDx.map(s => `${s.specimenLabel}: ${s.frozenSectionDiagnosis}`).join('\n');
  const kept = (carried ?? []).filter(f => f.frozenSectionDiagnosis);
  return kept.length > 0 ? kept.map(f => `${f.specimenLabel}: ${f.frozenSectionDiagnosis}`).join('\n') : null;
}

export function buildFullPatientReportRows(
  caseData: Case | null,
  intraopDiagnosisText: string | null,
): FullPatientReportRow[] {
  if (!caseData) return [];
  return [
    { id: 'clinicalHistory',      text: caseData.order?.clinicalIndication ?? null },
    { id: 'intraopDiagnosis',     text: intraopDiagnosisText ?? null },
    { id: 'grossDescription',     text: caseData.diagnostic?.grossDescription ?? null },
    { id: 'microscopicFindings',  text: caseData.diagnostic?.microscopicDescription ?? null },
    { id: 'preliminaryDiagnosis', text: caseData.diagnostic?.preliminaryImpression ?? null },
    { id: 'ancillaryStudies',     text: caseData.diagnostic?.ancillaryStudies ?? null },
  ];
}
