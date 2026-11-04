// src/services/cytology/sweepCytologyHistologyCorrelationCandidates.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 452 (PS-156): candidates used to be looked for once, at cytology
// sign-out, so a biopsy accessioned afterwards was never matched, however
// well inside the clinical window it was taken (Pete's example: biopsy 175
// days after the Pap was collected, 157 days after sign-out). This sweep
// re-checks every abnormal cytology specimen that carries a correlation
// window (stored at sign-out) against the patient's current cases and adds
// any new candidate. Existing candidates, and what reviewers recorded or
// dismissed on them, are left exactly as they are. Pure; the live runner is
// refreshCytologyHistologyCorrelationCandidates in
// cytologyHistologyCorrelationLive.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { otherPatientCasesForCorrelation, resolveCytologyHistologyCorrelationCandidates } from './resolveCytologyHistologyCorrelationCandidates';


export interface CorrelationSweepChange {
  caseId: string;
  /** The case's whole specimen list with the new candidates added. */
  specimens: any[];
  added: { specimenId: string; candidateCaseId: string }[];
}

export function sweepCytologyHistologyCorrelationCandidates(
  allCases: any[],
  dictById: ReadonlyMap<string, { type?: string }>,
  nowIso: string,
): CorrelationSweepChange[] {
  const changes: CorrelationSweepChange[] = [];
  for (const c of allCases) {
    const patientId = c?.patient?.id;
    if (!patientId) continue;
    const specimens: any[] = c.specimens ?? [];
    if (!specimens.some(sp => sp?.cytologyScreening?.histologyCorrelationWindow)) continue;
    const others = otherPatientCasesForCorrelation(allCases, c.id, patientId, dictById);
    const added: CorrelationSweepChange['added'] = [];
    const nextSpecimens = specimens.map(sp => {
      const screening = sp?.cytologyScreening;
      const w = screening?.histologyCorrelationWindow;
      if (!w) return sp;
      const existing: any[] = screening.histologyCorrelationCandidates ?? [];
      const known = new Set(existing.map(x => x.candidateCaseId));
      const fresh = resolveCytologyHistologyCorrelationCandidates(
        [{ reviewId: w.reviewId, caseId: c.id, specimenId: sp.id, diagnosticRank: w.diagnosticRank, window: w }], others,
      ).filter(x => !known.has(x.candidateCaseId));
      if (fresh.length === 0) return sp;
      fresh.forEach(x => added.push({ specimenId: sp.id, candidateCaseId: x.candidateCaseId }));
      return { ...sp, cytologyScreening: { ...screening, histologyCorrelationCandidates: [...existing, ...fresh.map(x => ({ candidateCaseId: x.candidateCaseId, detectedAt: nowIso }))] } };
    });
    if (added.length) changes.push({ caseId: c.id, specimens: nextSpecimens, added });
  }
  return changes;
}
