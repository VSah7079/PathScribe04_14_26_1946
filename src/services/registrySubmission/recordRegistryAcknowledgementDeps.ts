// src/services/registrySubmission/recordRegistryAcknowledgementDeps.ts
// Batch 420: the real queues the acknowledgement intake and the 72-hour escalation use.
import type { RegistryAckDeps } from './recordRegistryAcknowledgement';
import { cytologyRegistryOutboundQueueService } from '../cytology/cytologyRegistryOutboundQueueServiceInstance';
import { cancerRegistryOutboundQueueService } from '../cancerRegistry/cancerRegistryOutboundQueueServiceInstance';
import { auditService } from '../auditlog/auditServiceInstance';
import type { RegistryRevisionDeps } from './recordRegistryRevision';
import { specimenDeficiencyService as mockSpecimenDeficiencyService } from '../deficiencies/specimenDeficiencyServiceInstance';
import { caseRouter } from '../cases/CaseRouter';

export const registryAckDeps: RegistryAckDeps = {
  queues: {
    cytology: {
      getAll: () => cytologyRegistryOutboundQueueService.getAll() as any,
      setRegistryStatus: (id, status, ack) => cytologyRegistryOutboundQueueService.setRegistryStatus(id, status, ack),
      markFailed: (id, f) => cytologyRegistryOutboundQueueService.markFailed(id, f),
    },
    cancer: {
      getAll: () => cancerRegistryOutboundQueueService.getAll() as any,
      setRegistryStatus: (id, status, ack) => cancerRegistryOutboundQueueService.setRegistryStatus(id, status, ack),
      markFailed: (id, f) => cancerRegistryOutboundQueueService.markFailed(id, f),
    },
  },
  logAudit: event => auditService.logEvent(event),
  now: () => new Date(),
};

/**
 * Batch 425: the revision intake. The engine may name the case by accession number;
 * the lookup is internal (system to system), so it bypasses the per-user case filter.
 */
export const registryRevisionDeps: RegistryRevisionDeps = {
  queues: {
    cytology: { getAll: () => cytologyRegistryOutboundQueueService.getAll() as any, setRegistryRevisions: (id, r) => cytologyRegistryOutboundQueueService.setRegistryRevisions(id, r) },
    cancer: { getAll: () => cancerRegistryOutboundQueueService.getAll() as any, setRegistryRevisions: (id, r) => cancerRegistryOutboundQueueService.setRegistryRevisions(id, r) },
  },
  caseIdForAccession: async accessionId => {
    const all = await caseRouter.getAll(undefined, { bypassAccessControl: true });
    const found = all.ok ? all.data.find(c => c.id === accessionId || c.accession?.accessionNumber === accessionId || c.accession?.fullAccession === accessionId) : undefined;
    return found?.id;
  },
  raiseDeficiency: d => mockSpecimenDeficiencyService.raise(d as any) as any,
  logAudit: event => auditService.logEvent(event),
  now: () => new Date(),
};
