// src/services/reports/resultInstances.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 393 (Pete: "we need the Autopsy reports as well"). Which results a
// release sends to the interface engine. A surgical case sends one ORU^R01 per
// synoptic report (finalized ones for a final, all for a preliminary). An
// autopsy report is one document (the PAD, or the FAD), so an autopsy case
// sends one case-level result, under AUTOPSY_REPORT_INSTANCE_ID, whether or not
// it has synoptic reports. Before this, an autopsy case without a synoptic
// report sent nothing at all, and one with several sent the autopsy report
// once per synoptic report.
// ─────────────────────────────────────────────────────────────────────────────

export const AUTOPSY_REPORT_INSTANCE_ID = 'autopsy-report';

export function isAutopsyCase(caseData: unknown): boolean {
  return !!(caseData as { autopsy?: unknown } | null | undefined)?.autopsy;
}

/** The result ids a FINAL or PRELIMINARY release sends for a case. Pure. */
export function resultInstanceIds(caseData: { synopticReports?: { instanceId: string; status?: string }[] } | null | undefined, resultState: 'FINAL' | 'PRELIMINARY'): string[] {
  if (!caseData) return [];
  if (isAutopsyCase(caseData)) return [AUTOPSY_REPORT_INSTANCE_ID];
  const instances = caseData.synopticReports ?? [];
  return (resultState === 'FINAL' ? instances.filter(r => r.status === 'finalized') : instances).map(r => r.instanceId);
}
