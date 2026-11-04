// Batch 605: the demo has no cancer registry. This shows a queued registry report as a simulated submission:
// it marks the entry sent to the (simulated) engine, so it then waits for an answer like a real one, and audits it.
// The audit text holds ids and counts only, no patient data.
import { cancerRegistryOutboundQueueService } from '../cancerRegistry/cancerRegistryOutboundQueueServiceInstance';
import { auditService } from '../auditlog/auditServiceInstance';
import type { CancerRegistryOutboundQueueEntry } from '@/types/case/CancerRegistryOutboundQueueEntry';

export async function listCaseRegistryReports(caseId: string): Promise<CancerRegistryOutboundQueueEntry[]> {
  const r = await cancerRegistryOutboundQueueService.getByCaseId(caseId);
  return r.ok ? r.data : [];
}

export interface SimulatedSubmissionResult { submitted: number; held: number }

export async function submitQueuedRegistryReportsSimulated(caseId: string, actor = 'system'): Promise<SimulatedSubmissionResult> {
  const entries = await listCaseRegistryReports(caseId);
  let submitted = 0;
  let held = 0;
  for (const e of entries) {
    if (e.status !== 'QUEUED') { if (e.status === 'FAILED') held += 1; continue; }
    const r = await cancerRegistryOutboundQueueService.markSent(e.id);
    if (r.ok) {
      submitted += 1;
      auditService.logEvent({ type: 'system', event: 'Simulated Registry Submission', detail: `SIMULATED (no registry): queue entry ${e.id} for registry ${e.registryId} handed to the simulated engine; now awaiting an answer.`, user: actor, caseId, confidence: null });
    }
  }
  return { submitted, held };
}
