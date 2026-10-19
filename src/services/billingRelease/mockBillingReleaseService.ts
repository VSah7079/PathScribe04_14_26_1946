// src/services/billingRelease/mockBillingReleaseService.ts
// Batch 619 (PS-800): browser-storage backed billing release rules. Every change needs
// config:billing-release:manage (guardConfigWrites, audited). Nothing here holds patient data.
import { storageGet, storageSet } from '../mockStorage';
import type { ServiceResult } from '../types';
import type { IBillingReleaseService } from './IBillingReleaseService';
import { seedRules, validateRule, type BillingReleaseRule } from './billingRelease';
import { guardConfigWrites } from '../authorization/guardConfigWrites';

export const BILLING_RELEASE_KEY = 'billing_release_rules_v1';

const load = () => storageGet<BillingReleaseRule[]>(BILLING_RELEASE_KEY, seedRules('2026-10-19T00:00:00.000Z'));
const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const newId = () => `brr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const unchecked: IBillingReleaseService = {
  async getAll() { return ok(load()); },
  async getForFacility(facilityId) { return ok(load().filter(r => r.facilityId === facilityId)); },
  async set(input) {
    const problems = validateRule(input);
    if (problems.length) return err(`Rule refused: ${problems.join(', ')}`);
    const all = load();
    if (input.id && !all.some(r => r.id === input.id)) return err('NOT_FOUND');
    const rule: BillingReleaseRule = { id: input.id ?? newId(), facilityId: input.facilityId, criteria: input.criteria, action: input.action, updatedAt: new Date().toISOString() };
    storageSet(BILLING_RELEASE_KEY, input.id ? all.map(r => (r.id === rule.id ? rule : r)) : [...all, rule]);
    return ok(rule);
  },
  async remove(id) {
    const all = load();
    if (!all.some(r => r.id === id)) return err('NOT_FOUND');
    storageSet(BILLING_RELEASE_KEY, all.filter(r => r.id !== id));
    return ok(undefined as void);
  },
};

export const mockBillingReleaseService: IBillingReleaseService = guardConfigWrites(unchecked, [
  ['config:billing-release:manage', ['set', 'remove']],
]);
