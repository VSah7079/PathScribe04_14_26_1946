// src/services/billingRelease/billingReleaseFacts.ts
// Batch 619 (PS-800): the demo's source of the facts the billing release rules need about a charge, read from the case and the
// ledger on first use. Best effort: a fact the case does not carry is left out, and the rules treat it as unknown
// (a rule that names it does not match). The API server supplies the same facts in production (BILLING_RELEASE_API.md).
import type { OutboundFeedEntry } from '../outboundQueue/outboundQueueTypes';
import type { BillingChargeFacts } from './billingRelease';

/** The parts of a case the facts come from. */
interface CaseFactsShape {
  finalizedAt?: string;
  specimenCategory?: string;
  lastRevisionType?: string;
  order?: { facilityId?: string; technicalComponentFacilityId?: string; assignedTo?: string; intakeType?: string; departmentName?: string };
}

export async function billingFactsFor(entry: OutboundFeedEntry): Promise<BillingChargeFacts | undefined> {
  const billingType = entry.billing?.billingType;
  if (!billingType || !entry.caseId) return undefined;
  const { caseService } = await import('../cases/caseServiceInstance');
  const c = (await caseService.getCase(entry.caseId)) as unknown as CaseFactsShape | null | undefined;
  if (!c) return undefined;
  const { resolvePerformingLabFacilityId } = await import('../facilities/IFacilityService');
  const { facilityService } = await import('../facilities/facilityServiceInstance');
  const fac = c.order?.facilityId ? await facilityService.getById(c.order.facilityId) : undefined;
  const performing = fac && 'data' in fac && fac.data ? resolvePerformingLabFacilityId(fac.data) : c.order?.facilityId;
  const amended = !!c.lastRevisionType && c.lastRevisionType !== 'original';
  const split = c.order?.intakeType === 'outside' || /consult/i.test(c.order?.departmentName ?? '');
  return {
    billingType, ...(c.specimenCategory ? { caseType: c.specimenCategory } : {}),
    ...(performing ? { performingFacilityId: performing } : {}), ...(c.order?.facilityId ? { orderingSiteId: c.order.facilityId } : {}),
    ...(c.order?.assignedTo ? { primaryPathologistId: c.order.assignedTo } : {}),
    amended, amendmentDelta: amended && !!c.finalizedAt && entry.queuedAt > c.finalizedAt,
    cptMapped: entry.errorCode !== 'MISSING_ICD10' && entry.errorCode !== 'MISSING_PROVIDER_NPI',
    technicalFacilityMissing: billingType !== '26' && split && !c.order?.technicalComponentFacilityId,
    generatedAt: entry.queuedAt, ...(c.finalizedAt ? { signedOutAt: c.finalizedAt } : {}),
  };
}
