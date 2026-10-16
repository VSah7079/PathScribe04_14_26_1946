// src/services/cytology/resolveCytologyCaseReport.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 532 (Pete, Oct 12, 2026): the consolidated cytology case report, from
// the case and its sign-out records. Pure.
//
//   - Every cytology specimen on the case, in case order: the ids the
//     workspace knows (`cytologySpecimenIds`), plus any specimen that has a
//     record, plus any specimen listed as unsigned by an early finalization.
//   - For each, its newest record by signing time: a correction or addendum
//     supersedes the sign-out it follows.
//   - A specimen with no record on an early-finalized case is "not reported",
//     with the finalization's reason (Pete: listed, not left off).
//   - `cytologyCaseReleased`: whether the case has closed (every cytology
//     specimen signed, or finalized early). Nothing is published before.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { CytologySignOutRecord } from '@/types/cytology/CytologySignOutRecord';
import type { CytologyCaseReport, CytologyCaseReportSpecimen } from '@/types/cytology/CytologyCaseReport';

type CaseForReport = Pick<Case, 'id' | 'accession' | 'specimens' | 'cytologyEarlyFinalization'>;

/** The newest record for each specimen (pure). */
export function latestRecordPerSpecimen(records: readonly CytologySignOutRecord[]): Map<string, CytologySignOutRecord> {
  const out = new Map<string, CytologySignOutRecord>();
  for (const r of records) {
    const prev = out.get(r.specimenId);
    if (!prev || String(r.signedAt) > String(prev.signedAt)) out.set(r.specimenId, r);
  }
  return out;
}

export function resolveCytologyCaseReport(
  caseData: CaseForReport,
  records: readonly CytologySignOutRecord[],
  cytologySpecimenIds: readonly string[] = [],
): CytologyCaseReport {
  const latest = latestRecordPerSpecimen(records.filter(r => r.caseId === caseData.id));
  const early = caseData.cytologyEarlyFinalization;
  const ids = new Set<string>([...cytologySpecimenIds, ...latest.keys(), ...(early?.unsignedSpecimenIds ?? [])]);
  const caseOrder = (caseData.specimens ?? []).map(s => s.id);
  const ordered = [...ids].sort((a, b) => {
    const ia = caseOrder.indexOf(a); const ib = caseOrder.indexOf(b);
    return (ia === -1 ? Number.MAX_SAFE_INTEGER : ia) - (ib === -1 ? Number.MAX_SAFE_INTEGER : ib);
  });
  const specimens: CytologyCaseReportSpecimen[] = ordered.map(id => {
    const sp = (caseData.specimens ?? []).find(s => s.id === id) as { label?: string; description?: string } | undefined;
    const record = latest.get(id);
    return {
      specimenId: id, label: sp?.label ?? id, ...(sp?.description ? { description: sp.description } : {}),
      ...(record ? { record } : {}),
      ...(!record && early ? { notReportedReason: early.reason } : {}),
    };
  });
  const firstContent = specimens.find(s => s.record)?.record?.reportContent;
  return {
    caseId: caseData.id,
    accessionNumber: firstContent?.accessionNumber ?? caseData.accession?.fullAccession ?? caseData.id,
    ...(firstContent?.language ? { language: firstContent.language } : {}),
    specimens,
    complete: specimens.length > 0 && specimens.every(s => !!s.record),
  };
}

/** Whether the case has closed: every cytology specimen signed, or finalized early (pure). */
export function cytologyCaseReleased(caseData: Pick<Case, 'status' | 'cytologyEarlyFinalization'>, allSignedOut: boolean): boolean {
  return allSignedOut || !!caseData.cytologyEarlyFinalization;
}
