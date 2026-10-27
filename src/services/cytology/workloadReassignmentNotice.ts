// src/services/cytology/workloadReassignmentNotice.ts
// Batch 635: which message a blocked cytotechnologist sees, and its numbers. Colleague names are data.
import type { ReassignmentSummary } from './reassignPendingCytologyCases';

export function workloadReassignmentNotice(r: ReassignmentSummary | undefined): { key: string; values: Record<string, string | number> } {
  if (r && r.assigned > 0) return { key: 'cytologyScreening.workload.reassignedSummary', values: { assigned: r.assigned, names: r.colleagueNames.join(', '), pool: r.returnedToPool } };
  return { key: 'cytologyScreening.workload.reassigned', values: {} };
}
