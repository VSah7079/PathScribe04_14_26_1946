// src/services/reports/assistFinalize.ts
// Batch 426: which synoptic workups an Assist case's Finalize makes final. Every draft not excluded at the
// pre-finalisation review becomes 'finalized' (those are the workups sent to the LIS); an excluded one stays a
// draft; one already finalized or awaiting countersign keeps its status. Pure.
import type { SynopticReportInstance } from '@/types/case/Case';

export function finalizedAssistWorkups(reports: SynopticReportInstance[] | undefined, excludedInstanceIds: string[]): SynopticReportInstance[] {
  return (reports ?? []).map(r =>
    r.status === 'draft' && !excludedInstanceIds.includes(r.instanceId) ? { ...r, status: 'finalized' as const } : r);
}
