// src/services/registrySubmission/recordRegistryAcknowledgementDeps.ts
// Batch 420: the real queues the acknowledgement intake and the 72-hour escalation use.
import type { RegistryAckDeps } from './recordRegistryAcknowledgement';
import { mockCytologyRegistryOutboundQueueService } from '../cytology/mockCytologyRegistryOutboundQueueService';
import { mockCancerRegistryOutboundQueueService } from '../cancerRegistry/mockCancerRegistryOutboundQueueService';
import { mockAuditService } from '../auditlog/mockAuditService';
import type { RegistryRevisionDeps } from './recordRegistryRevision';
import { mockSpecimenDeficiencyService } from '../deficiencies/mockSpecimenDeficiencyService';
import { caseRouter } from '../cases/CaseRouter';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const registryAckDeps: RegistryAckDeps = {
  queues: {
    cytology: {
      getAll: () => mockCytologyRegistryOutboundQueueService.getAll() as any,
      setRegistryStatus: (id, status, ack) => mockCytologyRegistryOutboundQueueService.setRegistryStatus(id, status, ack),
      markFailed: (id, f) => mockCytologyRegistryOutboundQueueService.markFailed(id, f),
    },
    cancer: {
      getAll: () => mockCancerRegistryOutboundQueueService.getAll() as any,
      setRegistryStatus: (id, status, ack) => mockCancerRegistryOutboundQueueService.setRegistryStatus(id, status, ack),
      markFailed: (id, f) => mockCancerRegistryOutboundQueueService.markFailed(id, f),
    },
  },
  logAudit: event => mockAuditService.logEvent(event),
  now: () => new Date(),
};

/**
 * Batch 425: the revision intake. The engine may name the case by accession number;
 * the lookup is internal (system to system), so it bypasses the per-user case filter.
 */
export const registryRevisionDeps: RegistryRevisionDeps = {
  queues: {
    cytology: { getAll: () => mockCytologyRegistryOutboundQueueService.getAll() as any, setRegistryRevisions: (id, r) => mockCytologyRegistryOutboundQueueService.setRegistryRevisions(id, r) },
    cancer: { getAll: () => mockCancerRegistryOutboundQueueService.getAll() as any, setRegistryRevisions: (id, r) => mockCancerRegistryOutboundQueueService.setRegistryRevisions(id, r) },
  },
  caseIdForAccession: async accessionId => {
    const all = await caseRouter.getAll(undefined, { bypassAccessControl: true });
    const found = all.ok ? all.data.find(c => c.id === accessionId || c.accession?.accessionNumber === accessionId || c.accession?.fullAccession === accessionId) : undefined;
    return found?.id;
  },
  raiseDeficiency: d => mockSpecimenDeficiencyService.raise(d as any) as any,
  logAudit: event => mockAuditService.logEvent(event),
  now: () => new Date(),
};
