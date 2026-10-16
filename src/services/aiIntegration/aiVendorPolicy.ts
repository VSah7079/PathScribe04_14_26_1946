// src/services/aiIntegration/aiVendorPolicy.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 536 (PS-558; Pete, Oct 11, 2026: "PathScribe needs to be AI agnostic
// because certain jurisdictions specify available, or unavailable AI
// vendor"). Which AI services, and which hosting regions, a jurisdiction
// allows, optionally narrowed for one facility. Pure.
//
// A service is named by its request shape (AiProviderId: structured_messages
// is Anthropic, chat_completions OpenAI, chat_completions_managed Azure
// OpenAI, model_gateway AWS Bedrock, structured_content Google Gemini,
// custom a self-hosted model), as everywhere else in the code; the screens
// show the vendor names.
//
//   - No rule for a jurisdiction: everything is allowed, so current sites
//     keep working (Pete's acceptance criterion).
//   - A rule lists the allowed services (null: all of them) and, per service,
//     the allowed hosting regions (absent or empty: any region).
//   - A facility rule narrows its jurisdiction's rule: a call must pass both.
//   - A rule that limits a service's regions refuses a call whose region
//     isn't recorded (deny when it can't be shown to be allowed).
//   - The demonstration service (mock) never leaves the browser: always allowed.
//
// The refusal never switches to another service (no silent fallback): the
// feature carries on without AI and says so.
// ─────────────────────────────────────────────────────────────────────────────

import type { NewAuditLog } from '../auditlog/IAuditService';
import type { Jurisdiction } from '@/types/systemConfig';
import type { AiProviderId } from '@/components/Config/AI/aiProviderConfig';

/** The services a policy can allow (everything but the demonstration mode). */
export const AI_POLICY_SERVICES = [
  'structured_messages', 'chat_completions', 'chat_completions_managed', 'model_gateway', 'structured_content', 'custom',
] as const satisfies readonly AiProviderId[];
export type AiPolicyService = (typeof AI_POLICY_SERVICES)[number];

export interface AiVendorRuleScope {
  jurisdiction: Jurisdiction;
  /** Narrows the jurisdiction's rule for one facility. */
  facilityId?: string;
}

export interface AiVendorRule {
  scope: AiVendorRuleScope;
  /** The allowed services; null allows every service. */
  allowedServices: AiPolicyService[] | null;
  /** Per service, the allowed hosting regions (as the vendor names them). Absent or empty: any region. */
  allowedRegions: Partial<Record<AiPolicyService, string[]>>;
  updatedAt?: string;
  updatedBy?: string;
}

export interface AiCallTarget {
  providerId: AiProviderId;
  /** The hosting region the call goes to, when recorded. */
  region?: string;
}

export type AiVendorRefusal = 'serviceNotAllowed' | 'regionNotAllowed' | 'regionUnknown';

export type AiVendorDecision =
  | { allowed: true }
  | { allowed: false; refusal: AiVendorRefusal; scope: AiVendorRuleScope };

export type AiVendorRuleProblem = 'unknownService' | 'noServices' | 'regionForDisallowedService' | 'blankRegion';

/** Region names compare without case or surrounding spaces. */
export const normalizeRegion = (r: string | undefined | null): string => (r ?? '').trim().toLowerCase();

export const sameScope = (a: AiVendorRuleScope, b: AiVendorRuleScope): boolean =>
  a.jurisdiction === b.jurisdiction && (a.facilityId ?? '') === (b.facilityId ?? '');

export const scopeKey = (s: AiVendorRuleScope): string => `${s.jurisdiction}|${s.facilityId ?? ''}`;

function ruleDecision(rule: AiVendorRule, call: AiCallTarget): AiVendorDecision {
  const service = call.providerId as AiPolicyService;
  if (rule.allowedServices && !rule.allowedServices.includes(service)) return { allowed: false, refusal: 'serviceNotAllowed', scope: rule.scope };
  const regions = (rule.allowedRegions[service] ?? []).map(normalizeRegion).filter(Boolean);
  if (regions.length === 0) return { allowed: true };
  const region = normalizeRegion(call.region);
  if (!region) return { allowed: false, refusal: 'regionUnknown', scope: rule.scope };
  return regions.includes(region) ? { allowed: true } : { allowed: false, refusal: 'regionNotAllowed', scope: rule.scope };
}

/** Whether this call may go out for work in this jurisdiction (and facility). */
export function aiVendorDecision(rules: readonly AiVendorRule[], where: AiVendorRuleScope, call: AiCallTarget): AiVendorDecision {
  if (call.providerId === 'mock') return { allowed: true };
  const applicable = rules.filter(r => r.scope.jurisdiction === where.jurisdiction
    && (!r.scope.facilityId || (where.facilityId && r.scope.facilityId === where.facilityId)));
  // The jurisdiction's own rule first, then the facility's narrowing.
  for (const rule of [...applicable].sort((a, b) => (a.scope.facilityId ? 1 : 0) - (b.scope.facilityId ? 1 : 0))) {
    const decision = ruleDecision(rule, call);
    if (!decision.allowed) return decision;
  }
  return { allowed: true };
}

/**
 * The jurisdictions and facilities served (where work comes from) whose rules
 * refuse this service and region: the warning Configuration → AI Behavior shows before
 * the service is saved. Pure.
 */
export function aiVendorConflicts(
  rules: readonly AiVendorRule[],
  served: readonly AiVendorRuleScope[],
  call: AiCallTarget,
): { scope: AiVendorRuleScope; refusal: AiVendorRefusal }[] {
  const out: { scope: AiVendorRuleScope; refusal: AiVendorRefusal }[] = [];
  const seen = new Set<string>();
  for (const where of served) {
    const d = aiVendorDecision(rules, where, call);
    if (d.allowed === false && !seen.has(scopeKey(d.scope))) {
      seen.add(scopeKey(d.scope));
      out.push({ scope: d.scope, refusal: d.refusal });
    }
  }
  return out;
}

/** Why a rule can't be saved, or null. Pure. */
export function aiVendorRuleProblem(rule: AiVendorRule): AiVendorRuleProblem | null {
  const known = (s: string) => (AI_POLICY_SERVICES as readonly string[]).includes(s);
  if (rule.allowedServices) {
    if (rule.allowedServices.some(s => !known(s))) return 'unknownService';
    if (rule.allowedServices.length === 0) return 'noServices';
  }
  for (const [service, regions] of Object.entries(rule.allowedRegions)) {
    if (!known(service)) return 'unknownService';
    if (!regions || regions.length === 0) continue;
    if (rule.allowedServices && !rule.allowedServices.includes(service as AiPolicyService)) return 'regionForDisallowedService';
    if (regions.some(r => !normalizeRegion(r))) return 'blankRegion';
  }
  return null;
}

/** The rule as stored: regions trimmed, lower case, without repeats; empty lists dropped. Pure. */
export function normalizeAiVendorRule(rule: AiVendorRule): AiVendorRule {
  const allowedRegions: AiVendorRule['allowedRegions'] = {};
  for (const [service, regions] of Object.entries(rule.allowedRegions) as [AiPolicyService, string[] | undefined][]) {
    const clean = [...new Set((regions ?? []).map(normalizeRegion).filter(Boolean))];
    if (clean.length) allowedRegions[service] = clean;
  }
  return {
    scope: rule.scope.facilityId ? { jurisdiction: rule.scope.jurisdiction, facilityId: rule.scope.facilityId } : { jurisdiction: rule.scope.jurisdiction },
    allowedServices: rule.allowedServices ? AI_POLICY_SERVICES.filter(s => rule.allowedServices!.includes(s)) : null,
    allowedRegions,
    ...(rule.updatedAt ? { updatedAt: rule.updatedAt } : {}),
    ...(rule.updatedBy ? { updatedBy: rule.updatedBy } : {}),
  };
}

const describeRule = (r: AiVendorRule | null): string => {
  if (!r) return 'no rule (every AI service allowed)';
  const services = r.allowedServices ? (r.allowedServices.join(', ') || 'none') : 'all services';
  const regions = Object.entries(r.allowedRegions).filter(([, v]) => v?.length).map(([s, v]) => `${s}: ${v!.join(', ')}`);
  return `${services}${regions.length ? `; regions ${regions.join('; ')}` : '; any region'}`;
};

/** The audit entry for a change to a rule (literal English). Pure. */
export function aiVendorPolicyChangeAudit(before: AiVendorRule | null, after: AiVendorRule | null, actorName: string, facilityName?: string | null): NewAuditLog {
  const scope = (after ?? before)!.scope;
  const where = scope.facilityId ? `${scope.jurisdiction}, facility ${facilityName || scope.facilityId}` : scope.jurisdiction;
  return {
    type: 'user', event: 'AI_VENDOR_POLICY_CHANGED', caseId: null, user: actorName, confidence: null,
    detail: `AI vendor policy for ${where}: ${describeRule(before)} → ${describeRule(after)}.`,
  };
}

/** Regions typed as a list ("eu-west-1, eu-central-1"): trimmed, lower case, no blanks or repeats. Pure. */
export function parseRegionList(text: string): string[] {
  return [...new Set(text.split(/[,;\n]/).map(normalizeRegion).filter(Boolean))];
}

export interface AiVendorScopeStatus {
  scope: AiVendorRuleScope;
  rule: AiVendorRule | null;
  /** Whether the service in use may be called for work here. */
  decision: AiVendorDecision;
}

/**
 * For Configuration → AI Behavior: each served jurisdiction, and each facility with a
 * rule of its own, with its rule and whether the service in use is allowed
 * there. Pure.
 */
export function aiVendorScopeStatuses(
  rules: readonly AiVendorRule[], jurisdictions: readonly Jurisdiction[], call: AiCallTarget,
): AiVendorScopeStatus[] {
  const scopes: AiVendorRuleScope[] = [
    ...[...new Set([...jurisdictions, ...rules.map(r => r.scope.jurisdiction)])].sort().map(jurisdiction => ({ jurisdiction })),
    ...rules.filter(r => r.scope.facilityId).map(r => r.scope),
  ];
  return scopes.map(scope => ({
    scope,
    rule: rules.find(r => sameScope(r.scope, scope)) ?? null,
    decision: aiVendorDecision(rules, scope, call),
  }));
}
