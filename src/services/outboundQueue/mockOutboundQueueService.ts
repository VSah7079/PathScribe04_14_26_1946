// src/services/outboundQueue/mockOutboundQueueService.ts
// Batch 619 (PS-800): the demo's Outbound Queue service: the logic of
// outboundQueueService.ts wired to the app's real queues, charge queue, case
// service, audit service and the signed-in user. Dependencies load on first
// use so importing this file pulls in none of the queue services.
import { readSessionProfile } from '../auth/sessionProfile';
import { outboundQueueDeps } from '../interfaceDispatch/outboundQueueDeps';
import { createMockBillingFeedAdapter } from './billingFeedAdapter';
import { createMockRegistryFeedAdapter } from './registryFeedAdapter';
import { createFeedSources } from './outboundFeedSources';
import { outboundHoldStore } from './outboundHoldStore';
import { createOutboundQueueService } from './outboundQueueService';
import { createScheduleBinding } from './scheduleBinding';
import { withBillingRelease } from '../billingRelease/billingReleaseFeed';
import { billingFactsFor } from '../billingRelease/billingReleaseFacts';
import type { IOutboundQueueService } from './IOutboundQueueService';

const now = () => new Date().toISOString();
const schedules = createScheduleBinding(async () => {
  const { deliveryScheduleService } = await import('../deliverySchedules/deliveryScheduleServiceInstance');
  const all = await deliveryScheduleService.getAll();
  return all.ok ? all.data : [];
}, now);

export const mockOutboundQueueService: IOutboundQueueService = createOutboundQueueService({
  sources: async () => {
    const { outboundChargeQueueService } = await import('../billing/outboundChargeQueueServiceInstance');
    const { cancerRegistryOutboundQueueService } = await import('../cancerRegistry/cancerRegistryOutboundQueueServiceInstance');
    return createFeedSources(outboundQueueDeps, withBillingRelease(createMockBillingFeedAdapter(outboundChargeQueueService, outboundHoldStore), {
      // Batch 619 (PS-800): the billing release rules decide when each charge goes.
      rules: async () => { const { billingReleaseService } = await import('../billingRelease/billingReleaseServiceInstance'); const r = await billingReleaseService.getAll(); return r.ok ? r.data : []; },
      facts: billingFactsFor, holds: outboundHoldStore, now,
    }), createMockRegistryFeedAdapter(cancerRegistryOutboundQueueService));
  },
  holds: outboundHoldStore,
  enforce: outboundQueueDeps.enforce,
  audit: async entry => {
    const { auditService } = await import('../auditlog/auditServiceInstance');
    return auditService.logEvent({ type: 'user', event: entry.event, detail: entry.detail, user: entry.user, caseId: entry.caseId, confidence: null, facilityId: entry.facilityId });
  },
  actorId: () => readSessionProfile()?.id ?? 'unknown',
  actor: () => { const p = readSessionProfile(); return p?.name ?? p?.id ?? 'unknown'; },
  facilityOfCase: async caseId => {
    const { caseService } = await import('../cases/caseServiceInstance');
    const c = await caseService.getCase(caseId) as { order?: { facilityId?: string } } | null | undefined;
    return c?.order?.facilityId;
  },
  scheduledFor: schedules.scheduledFor,
  deadline: schedules.deadline,
  now,
});
