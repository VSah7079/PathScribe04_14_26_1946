// Batch 536 (PS-558): the AI vendor policy per jurisdiction, and the check on every AI call.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  aiVendorConflicts, aiVendorDecision, aiVendorPolicyChangeAudit, aiVendorRuleProblem, aiVendorScopeStatuses, normalizeAiVendorRule, parseRegionList,
  type AiVendorRule,
} from './aiVendorPolicy';
import { createAiVendorPolicyService } from './aiVendorPolicyService';
import { AiNotAvailableError, checkAiCall, isAiNotAvailable, resolveAiCallWhere, type AiCallPolicyDeps } from './aiCallPolicy';
import { callAi } from './aiProviderService';
import { withAiVendorPolicy } from '../ai/withAiVendorPolicy';
import type { IAIProvider } from '../ai/IAIProvider';

const de: AiVendorRule = { scope: { jurisdiction: 'DE' }, allowedServices: ['chat_completions_managed', 'model_gateway'], allowedRegions: { model_gateway: ['eu-central-1'] } };
const deClinic: AiVendorRule = { scope: { jurisdiction: 'DE', facilityId: 'F-BERLIN' }, allowedServices: ['model_gateway'], allowedRegions: {} };

describe('aiVendorDecision (pure)', () => {
  it('no rule for the jurisdiction: everything allowed, so current sites keep working', () => {
    expect(aiVendorDecision([de], { jurisdiction: 'US' }, { providerId: 'structured_messages' })).toEqual({ allowed: true });
  });
  it('a service the jurisdiction doesn\'t list is refused', () => {
    expect(aiVendorDecision([de], { jurisdiction: 'DE' }, { providerId: 'structured_messages' })).toEqual({ allowed: false, refusal: 'serviceNotAllowed', scope: { jurisdiction: 'DE' } });
  });
  it('a limited region: allowed in it (any case), refused elsewhere, refused when the region isn\'t recorded', () => {
    expect(aiVendorDecision([de], { jurisdiction: 'DE' }, { providerId: 'model_gateway', region: ' EU-Central-1 ' }).allowed).toBe(true);
    expect(aiVendorDecision([de], { jurisdiction: 'DE' }, { providerId: 'model_gateway', region: 'us-east-1' })).toMatchObject({ allowed: false, refusal: 'regionNotAllowed' });
    expect(aiVendorDecision([de], { jurisdiction: 'DE' }, { providerId: 'model_gateway' })).toMatchObject({ allowed: false, refusal: 'regionUnknown' });
    expect(aiVendorDecision([de], { jurisdiction: 'DE' }, { providerId: 'chat_completions_managed' }).allowed).toBe(true);
  });
  it('a facility rule narrows its jurisdiction\'s: both must allow; other facilities follow the jurisdiction', () => {
    const rules = [de, deClinic];
    expect(aiVendorDecision(rules, { jurisdiction: 'DE', facilityId: 'F-BERLIN' }, { providerId: 'chat_completions_managed' })).toMatchObject({ allowed: false, scope: { facilityId: 'F-BERLIN' } });
    expect(aiVendorDecision(rules, { jurisdiction: 'DE', facilityId: 'F-BERLIN' }, { providerId: 'model_gateway', region: 'us-east-1' })).toMatchObject({ allowed: false, scope: { jurisdiction: 'DE' }, refusal: 'regionNotAllowed' });
    expect(aiVendorDecision(rules, { jurisdiction: 'DE', facilityId: 'F-MUNICH' }, { providerId: 'chat_completions_managed' }).allowed).toBe(true);
  });
  it('the demonstration service never leaves the browser: always allowed', () => {
    expect(aiVendorDecision([{ ...de, allowedServices: ['custom'] }], { jurisdiction: 'DE' }, { providerId: 'mock' }).allowed).toBe(true);
  });
  it('conflicts for the served places (the warning before saving), each rule once', () => {
    const c = aiVendorConflicts([de], [{ jurisdiction: 'US' }, { jurisdiction: 'DE' }, { jurisdiction: 'DE', facilityId: 'F-1' }], { providerId: 'structured_messages' });
    expect(c).toEqual([{ scope: { jurisdiction: 'DE' }, refusal: 'serviceNotAllowed' }]);
  });
  it('rule problems, normalising, region lists, statuses and the audit text', () => {
    expect(aiVendorRuleProblem({ ...de, allowedServices: [] })).toBe('noServices');
    expect(aiVendorRuleProblem({ ...de, allowedServices: ['nope' as never] })).toBe('unknownService');
    expect(aiVendorRuleProblem({ ...de, allowedServices: ['custom'], allowedRegions: { model_gateway: ['x'] } })).toBe('regionForDisallowedService');
    expect(aiVendorRuleProblem({ ...de, allowedRegions: { model_gateway: [' '] } })).toBe('blankRegion');
    expect(aiVendorRuleProblem(de)).toBeNull();
    expect(normalizeAiVendorRule({ ...de, allowedRegions: { model_gateway: [' EU-Central-1', 'eu-central-1'], custom: [] } }).allowedRegions).toEqual({ model_gateway: ['eu-central-1'] });
    expect(parseRegionList('eu-west-1, EU-WEST-1; uksouth\n')).toEqual(['eu-west-1', 'uksouth']);
    const st = aiVendorScopeStatuses([de, deClinic], ['US'], { providerId: 'model_gateway', region: 'eu-central-1' });
    expect(st.map(s => [s.scope.jurisdiction, s.scope.facilityId ?? '', s.decision.allowed])).toEqual([['DE', '', true], ['US', '', true], ['DE', 'F-BERLIN', true]]);
    const audit = aiVendorPolicyChangeAudit(null, de, 'Admin', null);
    expect(audit).toMatchObject({ event: 'AI_VENDOR_POLICY_CHANGED', user: 'Admin' });
    expect(audit.detail).toContain('no rule (every AI service allowed) → chat_completions_managed, model_gateway; regions model_gateway: eu-central-1');
  });
});

describe('aiVendorPolicyService', () => {
  const make = (allowed: boolean) => {
    let store: AiVendorRule[] | null = null;
    const audits: { event: string; detail: string }[] = [];
    const svc = createAiVendorPolicyService({
      read: () => store, write: r => { store = r; }, enforce: async () => ({ allowed }), audit: async e => { audits.push(e); },
      actorName: () => 'Lab Director', now: () => new Date('2026-10-12T09:00:00Z'),
      facilities: async () => [{ id: 'F-BERLIN', name: 'Klinik Berlin', jurisdiction: 'DE' }, { id: 'F-NY', name: 'NY Lab', jurisdiction: 'US' }],
      defaultJurisdiction: () => 'US',
    });
    return { svc, audits, stored: () => store };
  };
  it('changing a rule needs config:ai-vendor-policy:manage; nothing written when refused', async () => {
    const h = make(false);
    expect(await h.svc.save(de)).toEqual({ ok: false, error: 'CONFIG_NOT_PERMITTED' });
    expect(h.stored()).toBeNull();
  });
  it('save and remove are audited with before and after (facility named); the check reads the same rules', async () => {
    const h = make(true);
    expect((await h.svc.save(deClinic)).ok).toBe(true);
    expect(h.audits[0].detail).toContain('facility Klinik Berlin');
    expect(await h.svc.rulesForCheck()).toEqual([expect.objectContaining({ scope: deClinic.scope, updatedBy: 'Lab Director' })]);
    expect((await h.svc.remove(deClinic.scope)).ok).toBe(true);
    expect(h.audits[1].detail).toContain('→ no rule');
    expect(await h.svc.remove(deClinic.scope)).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
  it('served: the lab\'s own jurisdiction and every facility\'s', async () => {
    const served = await make(true).svc.served();
    expect(served.jurisdictions).toEqual(['US', 'DE']);
    expect(served.scopes).toContainEqual({ jurisdiction: 'DE', facilityId: 'F-BERLIN' });
  });
});

function policyDeps(rules: AiVendorRule[], over: Partial<AiCallPolicyDeps> = {}) {
  const records: Record<string, unknown>[] = [];
  const audits: { event: string; detail: string }[] = [];
  const deps: AiCallPolicyDeps = {
    rules: async () => rules,
    facilityJurisdiction: async id => (id === 'F-BERLIN' ? 'DE' : null),
    caseFacility: async caseId => (caseId === 'CASE-DE' ? 'F-BERLIN' : null),
    defaultJurisdiction: () => 'US',
    record: e => { records.push(e as never); },
    audit: async e => { audits.push(e); },
    ...over,
  };
  return { deps, records, audits };
}

describe('the check before every AI call', () => {
  it('where the work belongs: the jurisdiction given, else the case\'s or facility\'s, else the lab\'s own', async () => {
    const { deps } = policyDeps([]);
    expect(await resolveAiCallWhere({ feature: 'other', jurisdiction: 'FR' }, deps)).toEqual({ jurisdiction: 'FR' });
    expect(await resolveAiCallWhere({ feature: 'other', caseId: 'CASE-DE' }, deps)).toEqual({ jurisdiction: 'DE', facilityId: 'F-BERLIN' });
    expect(await resolveAiCallWhere({ feature: 'other', facilityId: 'F-BERLIN' }, deps)).toEqual({ jurisdiction: 'DE', facilityId: 'F-BERLIN' });
    expect(await resolveAiCallWhere(undefined, deps)).toEqual({ jurisdiction: 'US' });
  });
  it('refused: throws AI_VENDOR_NOT_ALLOWED, records it as refused and audits AI_CALL_REFUSED', async () => {
    const { deps, records, audits } = policyDeps([de]);
    const err = await checkAiCall({ providerId: 'structured_messages', modelId: 'claude' }, { feature: 'clinical-mismatch', caseId: 'CASE-DE' }, deps).catch(e => e);
    expect(err).toBeInstanceOf(AiNotAvailableError);
    expect(isAiNotAvailable(err)).toBe(true);
    expect(err.code).toBe('AI_VENDOR_NOT_ALLOWED');
    expect(records[0]).toMatchObject({ status: 'refused', providerId: 'structured_messages', jurisdiction: 'DE', facilityId: 'F-BERLIN', feature: 'clinical-mismatch', caseId: 'CASE-DE' });
    expect(audits[0].event).toBe('AI_CALL_REFUSED');
  });

  describe('callAi', () => {
    const fetchMock = vi.fn();
    beforeEach(() => {
      fetchMock.mockReset();
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: 'hello' } }] }) });
      vi.stubGlobal('fetch', fetchMock);
    });
    afterEach(() => vi.unstubAllGlobals());

    it('a refused call sends nothing and never switches to another service', async () => {
      const { deps } = policyDeps([de]);
      await expect(callAi({ system: 's', prompt: 'p', configOverride: { providerId: 'chat_completions', modelId: 'gpt' }, context: { feature: 'other', jurisdiction: 'DE' }, policyDeps: deps }))
        .rejects.toMatchObject({ code: 'AI_VENDOR_NOT_ALLOWED' });
      expect(fetchMock).not.toHaveBeenCalled();
    });
    it('an allowed call is sent and recorded with its service, model, hosting region and jurisdiction', async () => {
      const { deps, records } = policyDeps([{ scope: { jurisdiction: 'DE' }, allowedServices: ['chat_completions'], allowedRegions: { chat_completions: ['eu'] } }]);
      const res = await callAi({ system: 's', prompt: 'p', configOverride: { providerId: 'chat_completions', modelId: 'gpt', hostingRegion: 'EU' }, context: { feature: 'coding', facilityId: 'F-BERLIN' }, policyDeps: deps });
      expect(res.text).toBe('hello');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(records[0]).toMatchObject({ status: 'completed', providerId: 'chat_completions', modelId: 'gpt', hostingRegion: 'EU', jurisdiction: 'DE', feature: 'coding' });
    });
    it('a provider setting the request builder sends elsewhere (mock) is checked as the service it really goes to', async () => {
      const { deps } = policyDeps([{ scope: { jurisdiction: 'US' }, allowedServices: ['chat_completions'], allowedRegions: {} }]);
      await expect(callAi({ system: 's', prompt: 'p', configOverride: { providerId: 'mock', modelId: 'm' }, policyDeps: deps })).rejects.toMatchObject({ code: 'AI_VENDOR_NOT_ALLOWED' });
      expect(fetchMock).not.toHaveBeenCalled();
    });
    it('a failed call is recorded as an error and still thrown', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' });
      const { deps, records } = policyDeps([]);
      await expect(callAi({ system: 's', prompt: 'p', configOverride: { providerId: 'chat_completions', modelId: 'gpt' }, policyDeps: deps })).rejects.toThrow('500');
      expect(records[0]).toMatchObject({ status: 'error', jurisdiction: 'US' });
    });
  });

  it('streaming generation (narrative): refused before the provider is asked; the connection test is not a generation', async () => {
    const inner: IAIProvider = {
      providerId: 'structured_messages', modelId: 'claude', displayName: 'Claude',
      generate: vi.fn(), generateStream: vi.fn(), testConnection: vi.fn(async () => ({ ok: true, message: 'ok', latencyMs: 1 })),
    };
    const { deps } = policyDeps([de]);
    const wrapped = withAiVendorPolicy(inner, {}, { feature: 'narrative', caseId: 'CASE-DE' }, deps);
    await expect(wrapped.generateStream({ system: 's', prompt: 'p' }, () => {})).rejects.toBeInstanceOf(AiNotAvailableError);
    expect(inner.generateStream).not.toHaveBeenCalled();
    expect((await wrapped.testConnection()).ok).toBe(true);
    expect(wrapped.providerId).toBe('structured_messages');
  });
});
