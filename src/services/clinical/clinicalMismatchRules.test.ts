import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import {
  DEFAULT_CLINICAL_MISMATCH_RULES, evaluateClinicalMismatch, clinicalMismatchRuleProblem, withDefaultRules,
  newSpecimenRule, clinicalMismatchRuleChangeAudit, type ClinicalMismatchRule,
} from './clinicalMismatchRules';
import { createClinicalMismatchRuleService } from './clinicalMismatchRuleService';
import { roleCapabilityProblem } from '../authorization/roleCapabilityRules';

const rules = withDefaultRules([]);

// Batch 679: these tests cover the score-driven thresholds and Block rules, which belong to the clinical_support profile.
beforeAll(() => { vi.stubEnv('VITE_REGULATORY_PROFILE', 'clinical_support'); });
afterAll(() => { vi.unstubAllEnvs(); });

describe('mismatch rules: the starting rules (PS-554, Pete, Oct 11)', () => {
  it('five rules for all specimen types, display from 60%', () => {
    expect(DEFAULT_CLINICAL_MISMATCH_RULES.map(r => [r.category, r.actionThreshold, r.actionType, r.minimumDisplayThreshold])).toEqual([
      ['unexpected-malignancy', 70, 'block', 60],
      ['cause-of-death', 70, 'block', 60],
      ['site-or-organ', 65, 'block', 60],
      ['expected-malignancy-absent', null, 'log', 60],
      ['other', 65, 'log', 60],
    ]);
    expect(DEFAULT_CLINICAL_MISMATCH_RULES.every(r => r.specimenTypeId === null)).toBe(true);
  });
  it('a missing rule for all specimen types comes back from the defaults', () => {
    const stored = rules.filter(r => r.category !== 'other');
    expect(withDefaultRules(stored).find(r => r.category === 'other')).toMatchObject({ actionThreshold: 65, actionType: 'log' });
  });
});

describe('mismatch rules: the engine', () => {
  const at = (kind: ClinicalMismatchRule['category'], confidence: number, specimens: (string | null)[] = [], r = rules) =>
    evaluateClinicalMismatch({ kind, confidence }, specimens, r);
  it('below the display threshold: suppressed, nothing shown or logged', () => {
    expect(at('unexpected-malignancy', 59)).toMatchObject({ risk: 'suppressed', display: false, holdsSignOut: false, logToQa: false });
  });
  it('from the display threshold up to the action threshold: alert and QA log, no hold', () => {
    expect(at('unexpected-malignancy', 60)).toMatchObject({ risk: 'low', display: true, holdsSignOut: false, logToQa: true, action: null });
    expect(at('unexpected-malignancy', 69)).toMatchObject({ risk: 'low', holdsSignOut: false });
  });
  it('at or above the action threshold: Block holds sign-out (high risk); Log never does', () => {
    expect(at('unexpected-malignancy', 70)).toMatchObject({ risk: 'high', display: true, holdsSignOut: true, action: 'block' });
    expect(at('cause-of-death', 95)).toMatchObject({ risk: 'high', holdsSignOut: true });
    expect(at('site-or-organ', 65)).toMatchObject({ risk: 'high', holdsSignOut: true });
    expect(at('other', 99)).toMatchObject({ risk: 'low', holdsSignOut: false, action: 'log', logToQa: true });
  });
  it('expected malignancy not found: logged to QA from the display threshold, never held', () => {
    expect(at('expected-malignancy-absent', 60)).toMatchObject({ risk: 'low', action: 'log', holdsSignOut: false });
    expect(at('expected-malignancy-absent', 100)).toMatchObject({ holdsSignOut: false });
  });
  it('Warn alerts without holding', () => {
    const warn = rules.map(r => (r.category === 'unexpected-malignancy' ? { ...r, actionType: 'warn' as const } : r));
    expect(at('unexpected-malignancy', 90, [], warn)).toMatchObject({ risk: 'low', display: true, holdsSignOut: false, action: 'warn' });
  });
  it('a rule for one specimen type takes precedence for that type; with several types the most severe wins', () => {
    const skin = { ...newSpecimenRule('unexpected-malignancy', 'skin', rules), actionType: 'log' as const, minimumDisplayThreshold: 80, actionThreshold: 90 };
    const withSkin = [...rules, skin];
    expect(at('unexpected-malignancy', 75, ['skin'], withSkin)).toMatchObject({ risk: 'suppressed', rule: { id: 'skin:unexpected-malignancy' } });
    expect(at('unexpected-malignancy', 75, ['colon'], withSkin)).toMatchObject({ risk: 'high', rule: { id: 'all:unexpected-malignancy' } });
    expect(at('unexpected-malignancy', 75, ['skin', 'colon'], withSkin)).toMatchObject({ risk: 'high', holdsSignOut: true });
  });
});

describe('mismatch rules: validation and audit', () => {
  const base = rules[0];
  it('thresholds are whole percentages, the action at or above the display; one rule per kind and specimen type', () => {
    expect(clinicalMismatchRuleProblem({ ...base, minimumDisplayThreshold: 101 }, rules)).toBe('thresholdRange');
    expect(clinicalMismatchRuleProblem({ ...base, minimumDisplayThreshold: 60.5 }, rules)).toBe('thresholdRange');
    expect(clinicalMismatchRuleProblem({ ...base, actionThreshold: 50 }, rules)).toBe('actionBelowDisplay');
    expect(clinicalMismatchRuleProblem({ ...base, id: 'x' }, rules)).toBe('duplicate');
    expect(clinicalMismatchRuleProblem({ ...base, actionType: 'stop' as never }, rules)).toBe('unknownAction');
    expect(clinicalMismatchRuleProblem({ ...base, actionThreshold: 75 }, rules)).toBeNull();
  });
  it('the audit entry says what changed, in plain English; nothing when nothing changed', () => {
    expect(clinicalMismatchRuleChangeAudit(base, { ...base, actionThreshold: 75 }, null, 'Dr Lee')).toMatchObject({
      event: 'CLINICAL_MISMATCH_RULE_CHANGED', user: 'Dr Lee',
      detail: 'Rule "unexpected-malignancy" for all specimen types changed: display from 60%, block at 70% → display from 60%, block at 75%.',
    });
    expect(clinicalMismatchRuleChangeAudit(base, { ...base }, null, 'Dr Lee')).toBeNull();
  });
});

describe('mismatch rules service: view and manage are checked, changes audited', () => {
  const make = (granted: string[]) => {
    let stored: ClinicalMismatchRule[] | null = null;
    const audit = vi.fn(async () => undefined);
    const refused = vi.fn();
    const svc = createClinicalMismatchRuleService({
      read: () => stored, write: r => { stored = r; },
      enforce: async c => ({ allowed: granted.includes(c) }),
      audit, actorName: () => 'Dr Admin', specimenName: async id => (id === 'skin' ? 'Skin excision' : null), refused,
    });
    return { svc, audit, refused, stored: () => stored };
  };
  const VIEW = 'config:clinical-mismatch-rules:view';
  const MANAGE = 'config:clinical-mismatch-rules:manage';

  it('reading needs the view capability', async () => {
    expect((await make([]).svc.list())).toEqual({ ok: false, error: 'CONFIG_NOT_PERMITTED' });
    const r = await make([VIEW]).svc.list();
    expect(r.ok && r.data).toHaveLength(5);
  });
  it('changing needs the manage capability; a refusal changes nothing and names the permission', async () => {
    const { svc, refused, stored } = make([VIEW]);
    const r = await svc.save({ ...rules[0], actionThreshold: 80 });
    expect(r).toEqual({ ok: false, error: 'CONFIG_NOT_PERMITTED' });
    expect(refused).toHaveBeenCalledWith(MANAGE);
    expect(stored()).toBeNull();
  });
  it('a change is saved and audited; a rule for one specimen type can be added and removed, the general one only changed', async () => {
    const { svc, audit } = make([VIEW, MANAGE]);
    expect((await svc.save({ ...rules[0], actionThreshold: 80 })).ok).toBe(true);
    expect((await svc.rulesForCheck())[0].actionThreshold).toBe(80);
    const skin = newSpecimenRule('other', 'skin', rules);
    expect((await svc.save(skin)).ok).toBe(true);
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ detail: expect.stringContaining('specimen type Skin excision added') }));
    expect(await svc.remove('all:other')).toEqual({ ok: false, error: 'cannotRemoveDefault' });
    expect((await svc.remove(skin.id)).ok).toBe(true);
    expect(audit).toHaveBeenCalledTimes(3);
    expect(await svc.save({ ...rules[0], actionThreshold: 10 })).toEqual({ ok: false, error: 'actionBelowDisplay' });
  });
  it('the check reads the rules without a person\'s capability', async () => {
    expect(await make([]).svc.rulesForCheck()).toHaveLength(5);
  });
});

describe('granting the rules permissions (Batch 530, Pete: Admin reads them once granted)', () => {
  it('any hospital role, Admin included, can be granted view; manage needs view with it', () => {
    expect(roleCapabilityProblem(['config:clinical-mismatch-rules:view'])).toBeNull();
    expect(roleCapabilityProblem(['config:clinical-mismatch-rules:manage'])).toMatch(/requires config:clinical-mismatch-rules:view/);
    expect(roleCapabilityProblem(['config:clinical-mismatch-rules:manage', 'config:clinical-mismatch-rules:view'])).toBeNull();
  });
});

