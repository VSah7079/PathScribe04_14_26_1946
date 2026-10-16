// src/services/aiIntegration/aiCallPolicy.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 536 (PS-558): every AI call is checked against the AI vendor policy
// of the jurisdiction the work belongs to, before anything is sent, and
// recorded with its service, model and hosting region.
//
// Where the work belongs (resolveAiCallWhere): the jurisdiction given; else
// the facility's (the facility given, or the case's ordering facility); else
// the laboratory's own jurisdiction (System configuration).
//
// A refused call throws AiNotAvailableError (code AI_VENDOR_NOT_ALLOWED)
// before any request is made, and is recorded ('refused') and audited
// (AI_CALL_REFUSED). It never switches to another service: every caller
// already carries on without AI when a call fails, and a feature that can
// say so shows "AI is not available for this jurisdiction" inline.
//
// The browser's check is the first line; in production the API server's AI
// proxy makes the same check and is the one that counts
// (docs/architecture/AI_PROXY.md). Dependencies are passed in.
// ─────────────────────────────────────────────────────────────────────────────

import type { NewAuditLog } from '../auditlog/IAuditService';
import type { AIAuditEntry } from '../ai/AIAuditLog';
import type { Jurisdiction } from '@/types/systemConfig';
import type { AiProviderId } from '@/components/Config/AI/aiProviderConfig';
import { getCurrentJurisdiction } from '../retentionPolicy/RetentionPolicy';
import { aiVendorDecision, type AiVendorRefusal, type AiVendorRule, type AiVendorRuleScope } from './aiVendorPolicy';

/** What the AI is being asked for (recorded with the call). */
export type AiFeature =
  | 'clinical-mismatch' | 'critical-findings' | 'template-suggestions' | 'synoptic-suggestions' | 'macro-suggestions'
  | 'narrative' | 'dictation' | 'voice' | 'grossing' | 'intraop' | 'coding' | 'case-assist'
  | 'connection-test' | 'ai-instruction-test' | 'other';

export interface AiCallContext {
  feature: AiFeature;
  /** Used only to find the facility; never sent to the AI. */
  caseId?: string;
  facilityId?: string;
  jurisdiction?: Jurisdiction;
}

export const AI_VENDOR_NOT_ALLOWED = 'AI_VENDOR_NOT_ALLOWED';

export class AiNotAvailableError extends Error {
  readonly code = AI_VENDOR_NOT_ALLOWED;
  constructor(readonly refusal: AiVendorRefusal, readonly where: AiVendorRuleScope) {
    super(`AI not available for this jurisdiction (${where.jurisdiction}${where.facilityId ? `, facility ${where.facilityId}` : ''}): ${refusal}.`);
    this.name = 'AiNotAvailableError';
  }
}

export const isAiNotAvailable = (e: unknown): e is AiNotAvailableError =>
  !!e && typeof e === 'object' && (e as { code?: unknown }).code === AI_VENDOR_NOT_ALLOWED;

export interface AiCallTargetDetail {
  providerId: AiProviderId;
  modelId: string;
  region?: string;
}

export interface AiCallPolicyDeps {
  rules(): Promise<AiVendorRule[]>;
  facilityJurisdiction(facilityId: string): Promise<Jurisdiction | null>;
  caseFacility(caseId: string): Promise<string | null>;
  defaultJurisdiction(): Jurisdiction;
  record(entry: Omit<AIAuditEntry, 'id' | 'timestamp'>): void;
  audit(entry: NewAuditLog): Promise<unknown>;
}

/** The jurisdiction (and facility) the work belongs to. */
export async function resolveAiCallWhere(context: AiCallContext | undefined, deps: Pick<AiCallPolicyDeps, 'facilityJurisdiction' | 'caseFacility' | 'defaultJurisdiction'>): Promise<AiVendorRuleScope> {
  const facilityId = context?.facilityId
    ?? (context?.caseId ? await deps.caseFacility(context.caseId).catch(() => null) : null)
    ?? undefined;
  const jurisdiction = context?.jurisdiction
    ?? (facilityId ? await deps.facilityJurisdiction(facilityId).catch(() => null) : null)
    ?? deps.defaultJurisdiction();
  return facilityId ? { jurisdiction, facilityId } : { jurisdiction };
}

const entryBase = (target: AiCallTargetDetail, context: AiCallContext | undefined, where: AiVendorRuleScope) => ({
  caseId: context?.caseId ?? '',
  sectionId: context?.feature ?? 'other',
  sectionTitle: context?.feature ?? 'other',
  providerId: target.providerId,
  modelId: target.modelId,
  jurisdiction: where.jurisdiction,
  feature: context?.feature ?? 'other',
  ...(where.facilityId ? { facilityId: where.facilityId } : {}),
  ...(target.region ? { hostingRegion: target.region } : {}),
});

/**
 * Before a call: where it belongs, and whether the policy allows it there.
 * Throws AiNotAvailableError (recorded and audited) when it doesn't.
 */
export async function checkAiCall(target: AiCallTargetDetail, context: AiCallContext | undefined, deps: AiCallPolicyDeps): Promise<AiVendorRuleScope> {
  const where = await resolveAiCallWhere(context, deps);
  const decision = aiVendorDecision(await deps.rules(), where, target);
  if (decision.allowed === false) {
    try { deps.record({ ...entryBase(target, context, where), status: 'refused', tokensGenerated: 0, latencyMs: 0, error: decision.refusal }); } catch { /* the refusal stands */ }
    await deps.audit({
      type: 'system', event: 'AI_CALL_REFUSED', caseId: context?.caseId ?? null, user: 'system-ai-vendor-policy', confidence: null,
      detail: `AI call for ${context?.feature ?? 'other'} not sent: ${target.providerId} (${target.modelId}${target.region ? `, region ${target.region}` : ', region not recorded'}) is not allowed for ${where.jurisdiction}${where.facilityId ? ` (facility ${where.facilityId})` : ''} by the AI vendor policy rule for ${decision.scope.jurisdiction}${decision.scope.facilityId ? ` / facility ${decision.scope.facilityId}` : ''} (${decision.refusal}).`,
    }).catch(() => {});
    throw new AiNotAvailableError(decision.refusal, where);
  }
  return where;
}

/** After a call: what was used, for the AI audit log. Never throws. */
export function recordAiCall(
  target: AiCallTargetDetail, context: AiCallContext | undefined, where: AiVendorRuleScope,
  outcome: { status: 'completed' | 'error'; latencyMs: number; text?: string; error?: string },
  deps: Pick<AiCallPolicyDeps, 'record'>,
): void {
  try {
    deps.record({
      ...entryBase(target, context, where), status: outcome.status, latencyMs: outcome.latencyMs,
      tokensGenerated: outcome.text ? Math.ceil(outcome.text.length / 4) : 0,
      ...(outcome.error ? { error: outcome.error.slice(0, 200) } : {}),
    });
  } catch { /* recording never breaks the call */ }
}

/** The browser's dependencies (lazy, so callAi stays light). */
export const defaultAiCallPolicyDeps: AiCallPolicyDeps = {
  rules: async () => (await import('./mockAiVendorPolicyService')).mockAiVendorPolicyService.rulesForCheck(),
  facilityJurisdiction: async id => {
    const { mockFacilityService } = await import('../facilities/mockFacilityService');
    const res = await mockFacilityService.getById(id);
    return res.ok ? res.data.jurisdiction ?? null : null;
  },
  caseFacility: async caseId => {
    const { caseRouter } = await import('../cases/CaseRouter');
    const c = await caseRouter.getCase(caseId);
    return c?.order?.facilityId ?? null;
  },
  defaultJurisdiction: () => {
    try { return getCurrentJurisdiction(); } catch { return 'US'; }
  },
  record: entry => { void import('../ai/AIAuditLog').then(m => m.AIAuditLog.record(entry)).catch(() => {}); },
  audit: async entry => (await import('../auditlog/mockAuditService')).mockAuditService.logEvent(entry),
};
