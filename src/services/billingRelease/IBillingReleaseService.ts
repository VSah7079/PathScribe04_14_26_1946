// src/services/billingRelease/IBillingReleaseService.ts
// Batch 619 (PS-800): the stored billing release rules (enterprise default, performing-facility overrides).
import type { ID, ServiceResult } from '../types';
import type { BillingReleaseRule, BillingReleaseRuleInput } from './billingRelease';

export interface IBillingReleaseService {
  /** Every rule: the enterprise's and each facility's own. */
  getAll(): Promise<ServiceResult<BillingReleaseRule[]>>;
  /** One facility's own rules (not the enterprise rules it falls back to). */
  getForFacility(facilityId: ID): Promise<ServiceResult<BillingReleaseRule[]>>;
  /** Create a rule, or replace the one named by `id`. Refused with a fixed code when the rule is not valid. */
  set(input: BillingReleaseRuleInput): Promise<ServiceResult<BillingReleaseRule>>;
  /** Remove a rule. A facility with no rule of its own follows the enterprise rules again. */
  remove(id: ID): Promise<ServiceResult<void>>;
}
