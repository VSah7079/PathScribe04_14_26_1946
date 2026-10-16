// src/services/aiIntegration/aiVendorPolicyService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 536 (PS-558): the AI vendor policy, kept as configuration
// (Configuration → AI Behavior → AI vendor policy). The rules are in aiVendorPolicy.ts.
//
//   list()           the rules (configuration, shown to anyone who opens the
//                    AI tab);
//   save() / remove() need config:ai-vendor-policy:manage (Admin and Lab
//                    Director by default); each change is audited
//                    (AI_VENDOR_POLICY_CHANGED, before and after);
//   rulesForCheck()  what every AI call is checked against: a system read,
//                    whoever is working;
//   served()         where work comes from: each facility's jurisdiction (and
//                    the facility), and the laboratory's own jurisdiction.
//
// In production the API server holds the policy and its AI proxy makes the
// check (docs/architecture/AI_PROXY.md). Dependencies are passed in.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';
import type { NewAuditLog } from '../auditlog/IAuditService';
import type { Jurisdiction } from '@/types/systemConfig';
import {
  aiVendorPolicyChangeAudit, aiVendorRuleProblem, normalizeAiVendorRule, sameScope, scopeKey,
  type AiVendorRule, type AiVendorRuleProblem, type AiVendorRuleScope,
} from './aiVendorPolicy';

export const AI_VENDOR_POLICY_MANAGE = 'config:ai-vendor-policy:manage';
export const AI_VENDOR_POLICY_STORAGE_KEY = 'pathscribe_ai_vendor_policy';

export type AiVendorPolicyError = 'CONFIG_NOT_PERMITTED' | 'NOT_FOUND' | AiVendorRuleProblem;

export interface ServedFacility { id: string; name: string; jurisdiction: Jurisdiction }

export interface IAiVendorPolicyService {
  list(): Promise<ServiceResult<AiVendorRule[]>>;
  /** Adds the rule for its scope, or replaces it. */
  save(rule: AiVendorRule): Promise<ServiceResult<AiVendorRule[]>>;
  /** Removes a scope's rule (back to "everything allowed" for that scope). */
  remove(scope: AiVendorRuleScope): Promise<ServiceResult<AiVendorRule[]>>;
  rulesForCheck(): Promise<AiVendorRule[]>;
  served(): Promise<{ scopes: AiVendorRuleScope[]; facilities: ServedFacility[]; jurisdictions: Jurisdiction[] }>;
}

export interface AiVendorPolicyDeps {
  read(): AiVendorRule[] | null;
  write(rules: AiVendorRule[]): void;
  enforce(capability: string): Promise<{ allowed: boolean }>;
  audit(entry: NewAuditLog): Promise<unknown>;
  actorName(): string;
  now(): Date;
  facilities(): Promise<ServedFacility[]>;
  /** The laboratory's own jurisdiction (System configuration). */
  defaultJurisdiction(): Jurisdiction;
  refused?(capability: string): void;
}

const fail = <T>(error: AiVendorPolicyError): ServiceResult<T> => ({ ok: false, error });

const sortRules = (rules: AiVendorRule[]) => [...rules].sort((a, b) => scopeKey(a.scope).localeCompare(scopeKey(b.scope)));

export function createAiVendorPolicyService(deps: AiVendorPolicyDeps): IAiVendorPolicyService {
  const current = () => sortRules(deps.read() ?? []);
  const permitted = async () => {
    const decision = await deps.enforce('config:ai-vendor-policy:manage');
    if (!decision.allowed) deps.refused?.(AI_VENDOR_POLICY_MANAGE);
    return decision.allowed;
  };
  const facilityName = async (id: string | undefined) =>
    id ? (await deps.facilities().catch(() => [])).find(f => f.id === id)?.name ?? null : null;

  return {
    async list() { return { ok: true, data: current() }; },

    async save(input) {
      if (!(await permitted())) return fail('CONFIG_NOT_PERMITTED');
      const rule = normalizeAiVendorRule({ ...input, updatedAt: deps.now().toISOString(), updatedBy: deps.actorName() });
      const problem = aiVendorRuleProblem(rule);
      if (problem) return fail(problem);
      const rules = current();
      const before = rules.find(r => sameScope(r.scope, rule.scope)) ?? null;
      const next = sortRules([...rules.filter(r => !sameScope(r.scope, rule.scope)), rule]);
      deps.write(next);
      await deps.audit(aiVendorPolicyChangeAudit(before, rule, deps.actorName(), await facilityName(rule.scope.facilityId))).catch(() => {});
      return { ok: true, data: next };
    },

    async remove(scope) {
      if (!(await permitted())) return fail('CONFIG_NOT_PERMITTED');
      const rules = current();
      const before = rules.find(r => sameScope(r.scope, scope));
      if (!before) return fail('NOT_FOUND');
      const next = rules.filter(r => !sameScope(r.scope, scope));
      deps.write(next);
      await deps.audit(aiVendorPolicyChangeAudit(before, null, deps.actorName(), await facilityName(scope.facilityId))).catch(() => {});
      return { ok: true, data: next };
    },

    async rulesForCheck() { return current(); },

    async served() {
      const facilities = await deps.facilities().catch(() => [] as ServedFacility[]);
      const own = deps.defaultJurisdiction();
      const jurisdictions = [...new Set([own, ...facilities.map(f => f.jurisdiction)])];
      const scopes: AiVendorRuleScope[] = [
        { jurisdiction: own },
        ...facilities.map(f => ({ jurisdiction: f.jurisdiction, facilityId: f.id })),
      ];
      return { scopes, facilities, jurisdictions };
    },
  };
}
