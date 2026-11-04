// src/services/intraop/carryIntraopFindingsToCase.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 652: merging an intraoperative session used to link the session to the
// case and carry only the verbal report (into the critical-result record). The
// frozen-section diagnosis text and the photos stayed on the session. This
// copies them onto the case as Case.intraoperativeFindings: labelled
// 'intraoperative', and never written into Case.diagnostic, so the final
// diagnosis is untouched.
//
// Safe to repeat: a finding is identified by session + intraop specimen, and a
// second carry replaces the first (it never duplicates).
// ─────────────────────────────────────────────────────────────────────────────
import type { IntraoperativeEntry } from '@/types/intraop/IntraoperativeEntry';
import type { CaseIntraoperativeFinding } from '@/types/intraop/CaseIntraoperativeFinding';
import type { Case } from '@/types/case/Case';
import { caseRouter } from '../cases/CaseRouter';
import { updateCaseWithRetry } from '../cases/caseWrite';
import { auditService } from '../auditlog/auditServiceInstance';

/** Pure: one finding per specimen that has a frozen diagnosis or any photo. */
export function buildIntraopFindings(entry: IntraoperativeEntry, carriedBy: string, nowIso: string): CaseIntraoperativeFinding[] {
  return entry.specimens
    .filter(sp => (sp.frozenSectionDiagnosis ?? '').trim() !== '' || (sp.digitalAssets ?? []).length > 0)
    .map(sp => ({
      kind: 'intraoperative' as const,
      sessionId: entry.id,
      intraopSpecimenId: sp.id,
      specimenLabel: sp.specimenLabel,
      ...(sp.frozenSectionDiagnosis ? { frozenSectionDiagnosis: sp.frozenSectionDiagnosis } : {}),
      ...(sp.frozenCategory ? { frozenCategory: sp.frozenCategory } : {}),
      ...(sp.frozenDiagnosisRenderedAt ? { frozenDiagnosisRenderedAt: sp.frozenDiagnosisRenderedAt } : {}),
      photos: (sp.digitalAssets ?? []).map(a => ({ ...a })),
      carriedAt: nowIso,
      carriedBy,
    }));
}

/** Pure: replace this session's earlier findings, keep every other session's. */
export function mergeIntraopFindings(existing: readonly CaseIntraoperativeFinding[] | undefined, incoming: readonly CaseIntraoperativeFinding[], sessionId: string): CaseIntraoperativeFinding[] {
  return [...(existing ?? []).filter(f => f.sessionId !== sessionId), ...incoming];
}

/** Service entry: copy the session's frozen diagnoses and photo links onto the case. Never throws. */
export async function carryIntraopFindingsToCase(entry: IntraoperativeEntry, caseId: string, carriedBy: string): Promise<{ ok: boolean; carried: number }> {
  const incoming = buildIntraopFindings(entry, carriedBy, new Date().toISOString());
  if (incoming.length === 0) return { ok: true, carried: 0 };
  try {
    const write = await updateCaseWithRetry(caseId, (current: Case) => ({
      intraoperativeFindings: mergeIntraopFindings(current.intraoperativeFindings, incoming, entry.id),
    }), caseRouter);
    if (write.ok !== true) return { ok: false, carried: 0 };
    const photos = incoming.reduce((n, f) => n + f.photos.length, 0);
    await auditService.logEvent({
      type: 'system',
      event: 'Intraop findings carried to case',
      detail: `Session ${entry.id}: ${incoming.length} intraoperative finding(s) and ${photos} photo link(s) added to case ${caseId} (labelled intraoperative; final diagnosis unchanged)`,
      user: carriedBy,
      caseId,
      confidence: null,
    }).catch(() => {});
    return { ok: true, carried: incoming.length };
  } catch {
    return { ok: false, carried: 0 };
  }
}
